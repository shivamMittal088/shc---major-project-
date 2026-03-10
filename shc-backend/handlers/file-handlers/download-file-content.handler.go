package filehandlers

import (
	"os"

	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

func DownloadFileContent(c fiber.Ctx, as *services.AppService) error {
	if !as.S3Service.IsLocalMode() {
		return fiber.NewError(fiber.StatusNotFound, "Download endpoint is only available in local storage mode")
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

	downloadKey := c.Query("download_key")
	if downloadKey == "" || downloadKey != file.R2Path {
		return fiber.NewError(fiber.StatusForbidden, "Invalid download key")
	}

	fullPath, err := as.S3Service.ResolveLocalPath(file.R2Path)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid file path")
	}

	fileContent, err := os.ReadFile(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			return fiber.NewError(fiber.StatusNotFound, "File content not found")
		}
		return err
	}

	if file.MimeType != "" {
		c.Set("Content-Type", file.MimeType)
	}

	return c.Send(fileContent)
}
