package filehandlers

import (
	"context"
	"net/url"
	"path/filepath"
	"strings"

	m "github.com/aj-2000/shc-backend/models"
	"github.com/aj-2000/shc-backend/services"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type AddFileDto struct {
	FileName string `json:"file_name"`
	FileSize uint   `json:"file_size"`
	MimeType string `json:"mime_type"`
}

func AddFileToDb(c fiber.Ctx, as *services.AppService) error {
	userIdString := string(c.Request().Header.Peek("user_id"))
	if userIdString == "" {
		return fiber.NewError(fiber.StatusUnauthorized, "Unauthorized")
	}

	userId, err := uuid.Parse(userIdString)

	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "Unauthorized")

	}

	body := new(AddFileDto)

	if err := c.Bind().Body(body); err != nil {
		print("error binding body", err.Error())
		return fiber.NewError(fiber.StatusBadRequest, "Invalid request body")
	}

	if strings.TrimSpace(body.FileName) == "" {
		return fiber.NewError(fiber.StatusBadRequest, "file_name is required")
	}

	fileSize := body.FileSize

	ctx := context.Background()
	key := aws.String(userId.String() + "/" + uuid.NewString() + "_" + strings.Replace(body.FileName, " ", "_", -1))
	uploadURL := ""

	if !as.S3Service.IsLocalMode() {
		res, err := as.S3Service.S3PresignClient.PresignPutObject(ctx, &s3.PutObjectInput{
			Bucket:      aws.String(as.S3Service.BucketName),
			Key:         key,
			ContentType: aws.String(body.MimeType),
			// TODO: add expiration
		})

		if err != nil {
			return err
		}

		uploadURL = res.URL
	}

	extension := strings.TrimPrefix(filepath.Ext(body.FileName), ".")

	newFile := m.File{
		Name:      body.FileName,
		Size:      fileSize,
		Extension: extension,
		MimeType:  body.MimeType,
		R2Path:    *key,
		UserId:    userId,
	}

	f, err := as.FileService.CreateFile(&newFile)

	if err != nil {
		return err
	}

	invalidateUserFileCaches(as, userId, true)

	if as.S3Service.IsLocalMode() {
		uploadURL = backendBaseURL(c) + "/api/files/upload/" + f.ID.String() + "?upload_key=" + url.QueryEscape(f.R2Path)
	}

	//FIXME: two ID?
	return c.JSON(fiber.Map{
		"file_id":    f.ID,
		"file_name":  f.Name,
		"upload_url": uploadURL,
		"is_public":  f.IsPublic,
	})
}
