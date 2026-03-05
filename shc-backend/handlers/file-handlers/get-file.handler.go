package filehandlers

import (
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

	err = as.FileService.IncrementViewCount(fileId)

	if err != nil {
		return err
	}

	downloadUrl, err := as.RedisService.GetCache("download_url_of_" + file.R2Path)

	if err != nil {
		res, err := as.S3Service.S3PresignClient.PresignGetObject(c.Context(), &s3.GetObjectInput{
			Bucket: aws.String(as.S3Service.BucketName),
			Key:    aws.String(file.R2Path),
		})

		as.RedisService.SetCache("download_url_of_"+file.R2Path, res.URL, time.Duration(880)*time.Second)
		downloadUrl = res.URL

		if err != nil {
			return err
		}
	}

	return c.JSON(fiber.Map{
		"download_url":  downloadUrl,
		"id":            file.ID,
		"name":          file.Name,
		"size":          file.Size,
		"is_public":     file.IsPublic,
		"mime_type":     file.MimeType,
		"extension":     file.Extension,
		"user_id":       file.UserId,
		"upload_status": file.UploadStatus,
		"updated_at":    file.UpdatedAt,
	})
}
