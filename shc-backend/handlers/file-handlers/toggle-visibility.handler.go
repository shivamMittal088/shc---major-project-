package filehandlers

import (
	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

func ToggleFileVisibility(c fiber.Ctx, as *services.AppService) error {
	userIdString := string(c.Request().Header.Peek("user_id"))
	fileIdString := c.Params("fileId")

	userId, err := uuid.Parse(userIdString)
	if err != nil {
		return err
	}

	fileId, err := uuid.Parse(fileIdString)
	if err != nil {
		return err
	}

	file, err := as.FileService.ToggleIsPublic(fileId, userId)

	if err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"id":            file.ID,
		"r2_path":       file.R2Path,
		"name":          file.Name,
		"size":          file.Size,
		"mime_type":     file.MimeType,
		"extension":     file.Extension,
		"user_id":       file.UserId,
		"is_public":     file.IsPublic,
		"upload_status": file.UploadStatus,
		"updated_at":    file.UpdatedAt,
	})
}
