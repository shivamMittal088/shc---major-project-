package filehandlers

import (
	"net/url"
	"time"

	"github.com/aj-2000/shc-backend/services"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"

	"github.com/gofiber/fiber/v3"
)

func GetFile(c fiber.Ctx, as *services.AppService) error {
	fileIdString := c.Params("fileId")
	userIdString := string(c.Request().Header.Peek("user_id"))

	fileId, err := uuid.Parse(fileIdString)

	if err != nil {
		return err
	}

	userId, _ := uuid.Parse(userIdString)

	file, err := as.FileService.FindFileById(fileId)

	if err != nil {
		return err
	}

	if file.UserId != userId && !file.IsPublic {
		return &fiber.Error{Code: fiber.StatusForbidden, Message: "You are not allowed to access this file"}
	}

	if file.ExpiresAt != nil && file.ExpiresAt.Before(time.Now()) {
		return &fiber.Error{Code: fiber.StatusGone, Message: "This file has expired and is no longer available"}
	}

	err = as.FileService.IncrementViewCount(fileId)

	if err != nil {
		return err
	}

	downloadUrl := ""

	if as.S3Service.IsLocalMode() {
		downloadUrl = backendBaseURL(c) + "/api/files/download/" + file.ID.String() + "?download_key=" + url.QueryEscape(file.R2Path)
	} else {
		cachedDownloadURL, cacheErr := as.RedisService.GetCache("download_url_of_" + file.R2Path)

		if cacheErr != nil {
			res, err := as.S3Service.S3PresignClient.PresignGetObject(c.Context(), &s3.GetObjectInput{
				Bucket: aws.String(as.S3Service.BucketName),
				Key:    aws.String(file.R2Path),
			})

			as.RedisService.SetCache("download_url_of_"+file.R2Path, res.URL, time.Duration(880)*time.Second)
			downloadUrl = res.URL

			if err != nil {
				return err
			}
		} else {
			downloadUrl, _ = cachedDownloadURL.(string)
		}
	}

	risk, _ := as.RiskScoringService.Analyze(services.RiskAnalyzeRequest{
		FileID:              file.ID.String(),
		FileURL:             downloadUrl,
		FileName:            file.Name,
		MimeType:            file.MimeType,
		FileSize:            uint64(file.Size),
		UploadSource:        "internal",
		ShareFrequency:      uint64(file.ViewCount),
		DownloadFrequency:   uint64(file.DownloadCount),
		BlockchainIntegrity: string(file.IntegrityStatus),
	})

	return c.JSON(fiber.Map{
		"download_url":    downloadUrl,
		"id":              file.ID,
		"name":            file.Name,
		"size":            file.Size,
		"is_public":       file.IsPublic,
		"mime_type":       file.MimeType,
		"extension":       file.Extension,
		"user_id":         file.UserId,
		"upload_status":   file.UploadStatus,
		"updated_at":      file.UpdatedAt,
		"expires_at":      file.ExpiresAt,
		"notarization_tx": file.NotarizationTx,
		"risk":            risk,
	})
}
