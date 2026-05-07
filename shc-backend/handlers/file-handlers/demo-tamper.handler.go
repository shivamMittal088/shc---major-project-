package filehandlers

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
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

	// Restore by truncating trailing bytes one at a time until the SHA-256
	// matches the baseline stored at upload. This handles the case where the
	// user clicked Tamper multiple times and the file has multiple junk bytes
	// appended. We cap iterations to a sensible maximum so we never destroy a
	// file that was modified for some other reason.
	const maxTrim = 64
	currentSize := info.Size()
	baseline := file.SHA256Hash
	matched := false

	if baseline == "" {
		// No baseline recorded — fall back to the legacy behavior of removing
		// just the last byte.
		if err := os.Truncate(fullPath, currentSize-1); err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Could not truncate file")
		}
	} else {
		for i := 0; i < maxTrim && currentSize > 0; i++ {
			// Compute current SHA-256.
			f, err := os.Open(fullPath)
			if err != nil {
				return fiber.NewError(fiber.StatusInternalServerError, "Could not open file")
			}
			h := sha256.New()
			if _, err := io.Copy(h, f); err != nil {
				f.Close()
				return fiber.NewError(fiber.StatusInternalServerError, "Could not hash file")
			}
			f.Close()

			if hex.EncodeToString(h.Sum(nil)) == baseline {
				matched = true
				break
			}

			// Trim one trailing byte and try again.
			currentSize--
			if err := os.Truncate(fullPath, currentSize); err != nil {
				return fiber.NewError(fiber.StatusInternalServerError, "Could not truncate file")
			}
		}

		if !matched {
			// Final hash check after the loop (covers the case where the very
			// last truncation produced the matching state).
			f, err := os.Open(fullPath)
			if err == nil {
				h := sha256.New()
				_, _ = io.Copy(h, f)
				f.Close()
				if hex.EncodeToString(h.Sum(nil)) == baseline {
					matched = true
				}
			}
		}
	}

	// Restore DB integrity status to verified.
	_ = as.FileService.SetIntegrityStatus(fileId, m.IntegrityVerified)

	// Flush risk cache.
	_ = as.RedisService.DeleteByPrefix("risk_analysis:")

	return c.JSON(fiber.Map{"ok": true, "message": "File restored — tamper byte removed"})
}
