package services

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

type RiskAnalyzeRequest struct {
	FileID            string   `json:"file_id,omitempty"`
	FileURL           string   `json:"file_url,omitempty"`
	FileName          string   `json:"file_name,omitempty"`
	MimeType          string   `json:"mime_type,omitempty"`
	FileSize          uint64   `json:"file_size,omitempty"`
	UploadSource      string   `json:"upload_source,omitempty"`
	ShareFrequency    uint64   `json:"share_frequency,omitempty"`
	DownloadFrequency uint64   `json:"download_frequency,omitempty"`
	ExternalLinks     []string `json:"external_links,omitempty"`
	TextContent       string   `json:"text_content,omitempty"`
	KnownHash         string   `json:"known_hash,omitempty"`
	FileContentBase64 string   `json:"file_content_base64,omitempty"`
	// BlockchainIntegrity is the result of on-chain hash verification:
	// "verified" — chain confirms file is untampered (reduces risk).
	// "tampered" — chain hash mismatches current bytes (raises risk sharply).
	// "unverified" or "" — no blockchain record yet (neutral).
	BlockchainIntegrity string `json:"blockchain_integrity,omitempty"`
}

type SHAPFeatureContribution struct {
	Feature    string  `json:"feature"`
	FeatureKey string  `json:"feature_key"`
	SHAPValue  float64 `json:"shap_value"`
	Direction  string  `json:"direction"`
	Rank       int     `json:"rank"`
}

type XAIExplanation struct {
	SHAPTopFeatures    []SHAPFeatureContribution `json:"shap_top_features"`
	FaithfulnessScore  *float64                  `json:"faithfulness_score"`
	FaithfulnessDetail []string                  `json:"faithfulness_detail"`
	CoverageGapScore   *float64                  `json:"coverage_gap_score"`
	CoverageGapDetail  []string                  `json:"coverage_gap_detail"`
	SuggestedRules     []string                  `json:"suggested_rules"`
}

type RiskAnalyzeResponse struct {
	RiskScore    int             `json:"risk_score"`
	RiskLevel    string          `json:"risk_level"`
	Explanations []string        `json:"explanations"`
	ModelUsed    string          `json:"model_used"`
	XAI          *XAIExplanation `json:"xai,omitempty"`
	Cached       bool            `json:"cached"`
}

type RiskScoringService struct {
	redisService *RedisService
	httpClient   *http.Client
	baseURL      string
	cacheTTL     time.Duration
}

func NewRiskScoringService(redisService *RedisService) *RiskScoringService {
	baseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("RISK_ML_SERVICE_URL")), "/")
	if baseURL == "" {
		baseURL = "http://localhost:8081"
	}

	cacheTTL := time.Duration(getEnvIntOrDefault("RISK_SCORE_CACHE_TTL_SECONDS", 300)) * time.Second
	timeout := time.Duration(getEnvIntOrDefault("RISK_SERVICE_TIMEOUT_MS", 4000)) * time.Millisecond

	return &RiskScoringService{
		redisService: redisService,
		httpClient: &http.Client{
			Timeout: timeout,
		},
		baseURL:  baseURL,
		cacheTTL: cacheTTL,
	}
}

func (rs *RiskScoringService) Analyze(req RiskAnalyzeRequest) (*RiskAnalyzeResponse, error) {
	normalizedReq := normalizeRiskRequest(req)
	if normalizedReq.FileURL == "" && normalizedReq.FileName == "" && normalizedReq.FileContentBase64 == "" && normalizedReq.TextContent == "" {
		return nil, errors.New("at least one of file_url, file_name, file_content_base64, or text_content is required")
	}

	cacheKey, err := buildRiskCacheKey(normalizedReq)
	if err != nil {
		return nil, err
	}

	var cachedResponse RiskAnalyzeResponse
	if err := rs.redisService.GetJSONCache(cacheKey, &cachedResponse); err == nil {
		cachedResponse.Cached = true
		return &cachedResponse, nil
	}

	response, remoteErr := rs.analyzeWithRemoteModel(normalizedReq)
	if remoteErr != nil {
		localFallback := scoreWithLocalRules(normalizedReq)
		localFallback.Explanations = append(localFallback.Explanations, "ML service unavailable; used local baseline rules")
		response = localFallback
	}

	response.Cached = false
	if response.Explanations == nil {
		response.Explanations = []string{}
	}

	_ = rs.redisService.SetJSONCache(cacheKey, response, rs.cacheTTL)

	return response, nil
}

func (rs *RiskScoringService) analyzeWithRemoteModel(req RiskAnalyzeRequest) (*RiskAnalyzeResponse, error) {
	payload, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest(http.MethodPost, rs.baseURL+"/score", bytes.NewBuffer(payload))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := rs.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, errors.New("risk model service returned a non-success status")
	}

	result := new(RiskAnalyzeResponse)
	if err := json.Unmarshal(body, result); err != nil {
		return nil, err
	}

	result.RiskScore = clampScore(result.RiskScore)
	if strings.TrimSpace(result.RiskLevel) == "" {
		result.RiskLevel = riskLevelFromScore(result.RiskScore)
	}
	if strings.TrimSpace(result.ModelUsed) == "" {
		result.ModelUsed = "remote-hybrid"
	}
	if result.Explanations == nil {
		result.Explanations = []string{}
	}
	if result.XAI != nil {
		if result.XAI.SHAPTopFeatures == nil {
			result.XAI.SHAPTopFeatures = []SHAPFeatureContribution{}
		}
		if result.XAI.FaithfulnessDetail == nil {
			result.XAI.FaithfulnessDetail = []string{}
		}
		if result.XAI.CoverageGapDetail == nil {
			result.XAI.CoverageGapDetail = []string{}
		}
		if result.XAI.SuggestedRules == nil {
			result.XAI.SuggestedRules = []string{}
		}
	}

	return result, nil
}

func normalizeRiskRequest(req RiskAnalyzeRequest) RiskAnalyzeRequest {
	normalized := req
	normalized.FileID = strings.TrimSpace(normalized.FileID)
	normalized.FileURL = strings.TrimSpace(normalized.FileURL)
	normalized.FileName = strings.TrimSpace(normalized.FileName)
	normalized.MimeType = strings.TrimSpace(normalized.MimeType)
	normalized.UploadSource = strings.TrimSpace(normalized.UploadSource)
	normalized.TextContent = strings.TrimSpace(normalized.TextContent)
	normalized.KnownHash = strings.TrimSpace(normalized.KnownHash)
	normalized.FileContentBase64 = strings.TrimSpace(normalized.FileContentBase64)
	normalized.BlockchainIntegrity = strings.TrimSpace(normalized.BlockchainIntegrity)

	cleanedLinks := make([]string, 0, len(normalized.ExternalLinks))
	for _, externalLink := range normalized.ExternalLinks {
		trimmed := strings.TrimSpace(externalLink)
		if trimmed != "" {
			cleanedLinks = append(cleanedLinks, trimmed)
		}
	}
	normalized.ExternalLinks = cleanedLinks

	return normalized
}

func buildRiskCacheKey(req RiskAnalyzeRequest) (string, error) {
	encoded, err := json.Marshal(req)
	if err != nil {
		return "", err
	}
	hash := sha256.Sum256(encoded)
	return "risk_analysis:" + hex.EncodeToString(hash[:]), nil
}

func getEnvIntOrDefault(name string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}
