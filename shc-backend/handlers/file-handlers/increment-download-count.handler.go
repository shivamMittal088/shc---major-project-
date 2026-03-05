package filehandlers

import (
	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

func IncrementFileDownloadCount(c fiber.Ctx, as *services.AppService) error {

	fileIdString := c.Params("fileId")
	fileId, err := uuid.Parse(fileIdString)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "Invalid file id",
		})
	}

	if err := as.FileService.IncrementDownloadCount(fileId); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "Something went wrong",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Download count incremented",
	})
}
