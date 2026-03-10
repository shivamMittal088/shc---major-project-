package filehandlers

import (
	"os"
	"path/filepath"

	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

func UploadFileContent(c fiber.Ctx, as *services.AppService) error {
	if !as.S3Service.IsLocalMode() {
		return fiber.NewError(fiber.StatusNotFound, "Upload endpoint is only available in local storage mode")
	}

	fileIdString := c.Params("fileId")
	fileId, err := uuid.Parse(fileIdString)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid file ID")
	}

	file, err := as.FileService.FindFileByIdRaw(fileId)
	if err != nil {
		return err
	}

	uploadKey := c.Query("upload_key")
	if uploadKey == "" || uploadKey != file.R2Path {
		return fiber.NewError(fiber.StatusForbidden, "Invalid upload key")
	}

	fullPath, err := as.S3Service.ResolveLocalPath(file.R2Path)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid file path")
	}

	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		return err
	}

	if err := os.WriteFile(fullPath, c.Body(), 0o644); err != nil {
		return err
	}

	return c.SendStatus(fiber.StatusOK)
}
