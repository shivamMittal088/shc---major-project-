package filehandlers

import (
	"errors"
	"os"
	"path/filepath"
	"strings"

	"github.com/aj-2000/shc-backend/services"
	"github.com/google/uuid"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
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
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fiber.NewError(fiber.StatusNotFound, "File not found")
		}
		return err
	}

	if as.S3Service.IsLocalMode() {
		fullPath, pathErr := as.S3Service.ResolveLocalPath(key)
		if pathErr == nil {
			removeErr := os.Remove(fullPath)
			if removeErr != nil && !os.IsNotExist(removeErr) {
				return removeErr
			}

			// Best-effort cleanup for empty parent folders.
			parentDir := filepath.Dir(fullPath)
			if !strings.EqualFold(filepath.Clean(parentDir), filepath.Clean(as.S3Service.LocalStorageDir)) {
				_ = os.Remove(parentDir)
			}
		}
	}

	invalidateUserFileCaches(as, userId, true)

	return c.JSON(fiber.Map{
		"key": key,
	})
}
