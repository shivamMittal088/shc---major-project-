package handlers

import (
	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
)

func Home(c fiber.Ctx, as *services.AppService) error {
	response := fiber.Map{
		"message":      "API is running!",
		"storage_mode": as.S3Service.StorageMode,
	}

	if as.S3Service.IsLocalMode() {
		response["local_storage_dir"] = as.S3Service.LocalStorageDir
	}

	return c.JSON(response)
}
