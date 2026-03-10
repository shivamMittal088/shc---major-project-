package filehandlers

import (
	m "github.com/aj-2000/shc-backend/models"
	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type UpdateFileUploadStatusDto struct {
	UploadStatus m.UploadStatus `json:"upload_status"`
}

func UpdateFileUploadStatus(c fiber.Ctx, as *services.AppService) error {
	fileIdString := c.Params("fileId")
	userIdString := string(c.Request().Header.Peek("user_id"))
	if userIdString == "" {
		return fiber.NewError(fiber.StatusUnauthorized, "Unauthorized")
	}

	fileId, err := uuid.Parse(fileIdString)

	if err != nil {
		return err
	}

	userId, err := uuid.Parse(userIdString)

	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "Unauthorized")

	}

	body := new(UpdateFileUploadStatusDto)

	if err := c.Bind().Body(body); err != nil {
		return err
	}

	file, err := as.FileService.UpdateUploadStatus(userId, fileId, body.UploadStatus)

	if err != nil {
		return err
	}

	invalidateUserFileCaches(as, userId, true)

	return c.JSON(fiber.Map{
		"id":            file.ID,
		"upload_status": file.UploadStatus,
	})

}
