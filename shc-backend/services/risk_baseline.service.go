package services

import (
	"math"
	"strings"
)

var suspiciousExtensions = map[string]struct{}{
	"exe": {},
	"dll": {},
	"scr": {},
	"js":  {},
	"vbs": {},
	"bat": {},
	"cmd": {},
	"ps1": {},
	"jar": {},
	"com": {},
}

var suspiciousKeywords = []string{
	"password",
	"invoice",
	"urgent",
	"verify",
	"bank",
	"wallet",
	"crypto",
	"security update",
	"action required",
}

func scoreWithLocalRules(req RiskAnalyzeRequest) *RiskAnalyzeResponse {
	score := 0
	reasons := make([]string, 0)
	lowerName := strings.ToLower(req.FileName)
	lowerMime := strings.ToLower(req.MimeType)
	lowerText := strings.ToLower(req.TextContent)
	combined := lowerName + "\n" + req.FileURL + "\n" + lowerText

	if ext := strings.TrimPrefix(strings.ToLower(fileExtensionFromName(req.FileName)), "."); ext != "" {
		if _, ok := suspiciousExtensions[ext]; ok {
			score += 30
			reasons = append(reasons, "Suspicious executable/script extension")
		}
	}

	if strings.Contains(lowerMime, "application/x-msdownload") || strings.Contains(lowerMime, "application/x-dosexec") {
		score += 25
		reasons = append(reasons, "MIME type associated with executable payloads")
	}

	if req.FileSize > 100*1024*1024 {
		score += 10
		reasons = append(reasons, "Unusually large file size")
	} else if req.FileSize > 20*1024*1024 && (strings.Contains(lowerMime, "text") || strings.Contains(lowerMime, "json")) {
		score += 8
		reasons = append(reasons, "Size anomaly for textual file type")
	}

	if strings.Contains(lowerMime, "pdf") && strings.Contains(lowerText, "javascript") {
		score += 20
		reasons = append(reasons, "Suspicious script indicators in PDF content")
	}

	if strings.Contains(lowerMime, "officedocument") && (strings.Contains(lowerText, "vba") || strings.Contains(lowerText, "macro")) {
		score += 22
		reasons = append(reasons, "Potential macro indicators in office document")
	}

	if req.UploadSource == "" || strings.EqualFold(req.UploadSource, "unknown") {
		score += 8
		reasons = append(reasons, "Unknown upload source")
	}

	if looksLikeSuspiciousURL(req.FileURL) {
		score += 20
		reasons = append(reasons, "URL/domain appears suspicious")
	}

	if len(req.ExternalLinks) > 0 {
		suspiciousLinkHits := 0
		for _, link := range req.ExternalLinks {
			if looksLikeSuspiciousURL(link) {
				suspiciousLinkHits++
			}
		}
		if suspiciousLinkHits > 0 {
			score += 10 + (suspiciousLinkHits * 4)
			reasons = append(reasons, "Embedded links include low-reputation domains")
		}
	}

	for _, keyword := range suspiciousKeywords {
		if strings.Contains(combined, keyword) {
			score += 6
			reasons = append(reasons, "Contains suspicious keyword: "+keyword)
		}
	}

	if strings.TrimSpace(req.KnownHash) != "" {
		score += 40
		reasons = append(reasons, "Hash matched a known malicious indicator")
	}

	entropy := estimateEntropy([]byte(req.FileContentBase64 + req.TextContent + req.FileName))
	if entropy > 4.7 {
		score += 18
		reasons = append(reasons, "High entropy suggests obfuscation or packed content")
	} else if entropy > 4.0 {
		score += 10
		reasons = append(reasons, "Moderately high entropy")
	}

	if req.ShareFrequency > 120 {
		score += 12
		reasons = append(reasons, "Highly shared file in a short window")
	} else if req.ShareFrequency > 40 {
		score += 7
		reasons = append(reasons, "Unusually frequent sharing")
	}

	if req.DownloadFrequency > 200 {
		score += 12
		reasons = append(reasons, "Unusually high download frequency")
	} else if req.DownloadFrequency > 80 {
		score += 7
		reasons = append(reasons, "Elevated download frequency")
	}

	score = clampScore(score)
	if len(reasons) == 0 {
		reasons = append(reasons, "No high-confidence malicious indicators detected")
	}

	return &RiskAnalyzeResponse{
		RiskScore:    score,
		RiskLevel:    riskLevelFromScore(score),
		Explanations: dedupeReasons(reasons, 5),
		ModelUsed:    "local-rule-baseline",
	}
}

func looksLikeSuspiciousURL(rawURL string) bool {
	value := strings.ToLower(strings.TrimSpace(rawURL))
	if value == "" {
		return false
	}
	if strings.Contains(value, "@") || strings.Contains(value, "bit.ly") || strings.Contains(value, "tinyurl") {
		return true
	}
	if strings.Contains(value, "login") || strings.Contains(value, "verify") || strings.Contains(value, "secure-update") {
		return true
	}
	if strings.Contains(value, ".zip") || strings.Contains(value, ".rar") || strings.Contains(value, ".exe") {
		return true
	}
	return false
}

func fileExtensionFromName(name string) string {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return ""
	}
	idx := strings.LastIndex(trimmed, ".")
	if idx <= 0 || idx == len(trimmed)-1 {
		return ""
	}
	return trimmed[idx:]
}

func estimateEntropy(data []byte) float64 {
	if len(data) == 0 {
		return 0
	}
	frequencies := map[byte]int{}
	for _, b := range data {
		frequencies[b]++
	}
	length := float64(len(data))
	entropy := 0.0
	for _, count := range frequencies {
		p := float64(count) / length
		entropy += -p * (math.Log2(p))
	}
	return entropy
}

func clampScore(score int) int {
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return score
}

func riskLevelFromScore(score int) string {
	if score <= 30 {
		return "Low"
	}
	if score <= 70 {
		return "Medium"
	}
	return "High"
}

func dedupeReasons(reasons []string, max int) []string {
	seen := map[string]struct{}{}
	unique := make([]string, 0, len(reasons))
	for _, reason := range reasons {
		trimmed := strings.TrimSpace(reason)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		unique = append(unique, trimmed)
		if len(unique) == max {
			break
		}
	}
	if len(unique) == 0 {
		return []string{"No strong risk evidence found"}
	}
	return unique
}
