package riskhandlers

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/url"
	"os"
	"strings"

	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type analyzeLinkMetadata struct {
	UploadSource      string   `json:"upload_source"`
	ShareFrequency    uint64   `json:"share_frequency"`
	DownloadFrequency uint64   `json:"download_frequency"`
	ExternalLinks     []string `json:"external_links"`
	TextContent       string   `json:"text_content"`
	KnownHash         string   `json:"known_hash"`
	FileName          string   `json:"file_name"`
	MimeType          string   `json:"mime_type"`
	FileSize          uint64   `json:"file_size"`
}

type analyzeLinkRequest struct {
	FileID            string               `json:"file_id"`
	FileURL           string               `json:"file_url"`
	FileName          string               `json:"file_name"`
	MimeType          string               `json:"mime_type"`
	FileSize          uint64               `json:"file_size"`
	UploadSource      string               `json:"upload_source"`
	ShareFrequency    uint64               `json:"share_frequency"`
	DownloadFrequency uint64               `json:"download_frequency"`
	ExternalLinks     []string             `json:"external_links"`
	TextContent       string               `json:"text_content"`
	KnownHash         string               `json:"known_hash"`
	FileContentBase64 string               `json:"file_content_base64"`
	Metadata          *analyzeLinkMetadata `json:"metadata"`
}

func AnalyzeLink(c fiber.Ctx, as *services.AppService) error {
	input, err := parseAnalyzeLinkInput(c)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}

	if strings.TrimSpace(input.FileID) != "" {
		if err := enrichRequestWithFileID(c, as, input); err != nil {
			return err
		}
	}

	if strings.TrimSpace(input.FileURL) == "" && strings.TrimSpace(input.FileName) == "" && strings.TrimSpace(input.FileContentBase64) == "" && strings.TrimSpace(input.TextContent) == "" {
		return fiber.NewError(fiber.StatusBadRequest, "at least one signal is required: file_url, file_name, file_content_base64 or text_content")
	}

	result, err := as.RiskScoringService.Analyze(services.RiskAnalyzeRequest{
		FileID:            strings.TrimSpace(input.FileID),
		FileURL:           strings.TrimSpace(input.FileURL),
		FileName:          strings.TrimSpace(input.FileName),
		MimeType:          strings.TrimSpace(input.MimeType),
		FileSize:          input.FileSize,
		UploadSource:      strings.TrimSpace(input.UploadSource),
		ShareFrequency:    input.ShareFrequency,
		DownloadFrequency: input.DownloadFrequency,
		ExternalLinks:     input.ExternalLinks,
		TextContent:       input.TextContent,
		KnownHash:         strings.TrimSpace(input.KnownHash),
		FileContentBase64: strings.TrimSpace(input.FileContentBase64),
	})

	if err != nil {
		return fiber.NewError(fiber.StatusServiceUnavailable, "risk scoring service is temporarily unavailable")
	}

	return c.JSON(result)
}

func parseAnalyzeLinkInput(c fiber.Ctx) (*analyzeLinkRequest, error) {
	contentType := strings.ToLower(c.Get("Content-Type"))
	request := &analyzeLinkRequest{}

	if strings.Contains(contentType, "multipart/form-data") {
		if err := c.Bind().Form(request); err != nil {
			return nil, err
		}
		if metadataText := strings.TrimSpace(c.FormValue("metadata")); metadataText != "" {
			metadata := new(analyzeLinkMetadata)
			if err := json.Unmarshal([]byte(metadataText), metadata); err != nil {
				return nil, fiber.NewError(fiber.StatusBadRequest, "metadata must be valid JSON")
			}
			request.Metadata = metadata
		}
		if fileHeader, err := c.FormFile("file"); err == nil && fileHeader != nil {
			encoded, readErr := readFileHeaderAsBase64(fileHeader, 8*1024*1024)
			if readErr != nil {
				return nil, readErr
			}
			request.FileContentBase64 = encoded
			if strings.TrimSpace(request.FileName) == "" {
				request.FileName = fileHeader.Filename
			}
			if request.FileSize == 0 {
				request.FileSize = uint64(fileHeader.Size)
			}
		}
	} else {
		if err := c.Bind().Body(request); err != nil {
			return nil, err
		}
	}

	if request.Metadata != nil {
		mergeRequestMetadata(request, request.Metadata)
	}

	return request, nil
}

func mergeRequestMetadata(target *analyzeLinkRequest, meta *analyzeLinkMetadata) {
	if strings.TrimSpace(target.FileName) == "" {
		target.FileName = meta.FileName
	}
	if strings.TrimSpace(target.MimeType) == "" {
		target.MimeType = meta.MimeType
	}
	if target.FileSize == 0 {
		target.FileSize = meta.FileSize
	}
	if strings.TrimSpace(target.UploadSource) == "" {
		target.UploadSource = meta.UploadSource
	}
	if target.ShareFrequency == 0 {
		target.ShareFrequency = meta.ShareFrequency
	}
	if target.DownloadFrequency == 0 {
		target.DownloadFrequency = meta.DownloadFrequency
	}
	if len(target.ExternalLinks) == 0 {
		target.ExternalLinks = meta.ExternalLinks
	}
	if strings.TrimSpace(target.TextContent) == "" {
		target.TextContent = meta.TextContent
	}
	if strings.TrimSpace(target.KnownHash) == "" {
		target.KnownHash = meta.KnownHash
	}
}

func readFileHeaderAsBase64(header *multipart.FileHeader, maxBytes int64) (string, error) {
	if header.Size > maxBytes {
		return "", fiber.NewError(fiber.StatusBadRequest, "uploaded file exceeds 8 MB analysis limit")
	}

	f, err := header.Open()
	if err != nil {
		return "", err
	}
	defer f.Close()

	content, err := io.ReadAll(io.LimitReader(f, maxBytes+1))
	if err != nil {
		return "", err
	}
	if int64(len(content)) > maxBytes {
		return "", fiber.NewError(fiber.StatusBadRequest, "uploaded file exceeds 8 MB analysis limit")
	}

	return base64.StdEncoding.EncodeToString(content), nil
}

func enrichRequestWithFileID(c fiber.Ctx, as *services.AppService, input *analyzeLinkRequest) error {
	fileID, err := uuid.Parse(strings.TrimSpace(input.FileID))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid file_id")
	}

	file, err := as.FileService.FindFileByIdRaw(fileID)
	if err != nil {
		return err
	}

	if strings.TrimSpace(input.FileName) == "" {
		input.FileName = file.Name
	}
	if strings.TrimSpace(input.MimeType) == "" {
		input.MimeType = file.MimeType
	}
	if input.FileSize == 0 {
		input.FileSize = uint64(file.Size)
	}
	if input.ShareFrequency == 0 {
		input.ShareFrequency = uint64(file.ViewCount)
	}
	if input.DownloadFrequency == 0 {
		input.DownloadFrequency = uint64(file.DownloadCount)
	}

	if strings.TrimSpace(input.FileURL) == "" && as.S3Service.IsLocalMode() {
		input.FileURL = backendBaseURL(c) + "/api/files/download/" + file.ID.String() + "?download_key=" + url.QueryEscape(file.R2Path)
	}

	return nil
}

func backendBaseURL(c fiber.Ctx) string {
	baseURL := strings.TrimSpace(os.Getenv("BACKEND_PUBLIC_BASE_URL"))
	if baseURL != "" {
		return strings.TrimRight(baseURL, "/")
	}

	host := c.Get("X-Forwarded-Host")
	if host == "" {
		host = c.Get("Host")
	}

	proto := c.Get("X-Forwarded-Proto")
	if proto == "" {
		proto = c.Protocol()
	}

	return proto + "://" + host
}
