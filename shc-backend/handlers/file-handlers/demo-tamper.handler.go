package filehandlers

import (
	"os"

	m "github.com/aj-2000/shc-backend/models"
	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

// DemoTamperFile appends a single null byte to the physical file so the
// SHA-256 no longer matches the stored baseline — demonstrating tamper detection.
// Only works in local storage mode.
func DemoTamperFile(c fiber.Ctx, as *services.AppService) error {
	if !as.S3Service.IsLocalMode() {
		return fiber.NewError(fiber.StatusBadRequest, "Demo tamper is only available in local storage mode")
	}

	fileId, err := uuid.Parse(c.Params("fileId"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid file ID")
	}

	file, err := as.FileService.FindFileById(fileId)
	if err != nil {
		return err
	}

	fullPath, err := as.S3Service.ResolveLocalPath(file.R2Path)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid file path")
	}

	// Append a null byte — changes the SHA-256 without corrupting readability.
	f, err := os.OpenFile(fullPath, os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Could not open file for tampering")
	}
	defer f.Close()

	if _, err := f.Write([]byte{0x00}); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Could not write tamper byte")
	}

	// Mark the DB status as tampered so risk analysis picks it up immediately.
	_ = as.FileService.SetIntegrityStatus(fileId, m.IntegrityTampered)

	// Flush risk cache for this file so the next page load recomputes.
	_ = as.RedisService.DeleteByPrefix("risk_analysis:")

	return c.JSON(fiber.Map{"ok": true, "message": "File tampered — null byte appended"})
}

// DemoRestoreFile removes the last byte appended by DemoTamperFile and
// resets the integrity status back to verified.
func DemoRestoreFile(c fiber.Ctx, as *services.AppService) error {
	if !as.S3Service.IsLocalMode() {
		return fiber.NewError(fiber.StatusBadRequest, "Demo restore is only available in local storage mode")
	}

	fileId, err := uuid.Parse(c.Params("fileId"))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid file ID")
	}

	file, err := as.FileService.FindFileById(fileId)
	if err != nil {
		return err
	}

	fullPath, err := as.S3Service.ResolveLocalPath(file.R2Path)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid file path")
	}

	info, err := os.Stat(fullPath)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Could not stat file")
	}

	if info.Size() == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "File is empty; nothing to restore")
	}

	// Truncate the last byte (the null byte added by DemoTamperFile).
	if err := os.Truncate(fullPath, info.Size()-1); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Could not truncate file")
	}

	// Restore DB integrity status to verified.
	_ = as.FileService.SetIntegrityStatus(fileId, m.IntegrityVerified)

	// Flush risk cache.
	_ = as.RedisService.DeleteByPrefix("risk_analysis:")

	return c.JSON(fiber.Map{"ok": true, "message": "File restored — tamper byte removed"})
}
