package filehandlers

import (
	"github.com/aj-2000/shc-backend/services"
	"github.com/google/uuid"

	"github.com/gofiber/fiber/v3"
)

func RemoveFile(c fiber.Ctx, as *services.AppService) error {

	fileIdString := c.Params("id")

	fileId, err := uuid.Parse(fileIdString)

	if err != nil {
		return err
	}

	userIdString := string(c.Request().Header.Peek("user_id"))

	userId, err := uuid.Parse(userIdString)

	if err != nil {
		return err
	}

	key, err := as.FileService.DeleteAFile(userId, fileId)

	if err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"key": key,
	})
}
