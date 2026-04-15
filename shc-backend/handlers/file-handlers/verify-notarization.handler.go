package filehandlers

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

// VerifyNotarization is a public endpoint. It:
//  1. Looks up the file record (must be public or the caller owns it).
//  2. Fetches the raw file bytes from storage.
//  3. Computes the SHA-256 on-the-fly.
//  4. Returns the hash, the stored tx hash, and an Etherscan link so anyone
//     can independently confirm the hash was anchored on-chain.
func VerifyNotarization(c fiber.Ctx, as *services.AppService) error {
	fileIdString := c.Params("fileId")
	fileId, err := uuid.Parse(fileIdString)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid file ID")
	}

	file, err := as.FileService.FindFileById(fileId)
	if err != nil {
		return err
	}

	// Only public files can be verified without authentication.
	userIdString := string(c.Request().Header.Peek("user_id"))
	userId, _ := uuid.Parse(userIdString)
	if !file.IsPublic && file.UserId != userId {
		return fiber.NewError(fiber.StatusForbidden, "This file is private")
	}

	fileBytes, err := fetchFileBytes(c.Context(), as, file)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Could not fetch file for verification")
	}

	sum := sha256.Sum256(fileBytes)
	computedHash := hex.EncodeToString(sum[:])

	notarizationTx := file.NotarizationTx
	etherscanURL := ""
	if notarizationTx != "" {
		etherscanURL = fmt.Sprintf("https://sepolia.etherscan.io/tx/%s", notarizationTx)
	}

	// notarized=true means the stored tx hash exists.
	// hash_match is not verifiable here without querying the chain; callers
	// compare computedHash against the calldata of the on-chain tx themselves.
	return c.JSON(fiber.Map{
		"file_id":         file.ID,
		"file_name":       file.Name,
		"sha256":          computedHash,
		"notarization_tx": notarizationTx,
		"notarized":       notarizationTx != "",
		"etherscan_url":   etherscanURL,
		"instructions":    "Open etherscan_url, go to the Input Data tab, decode as UTF-8. It should contain 'shc:' followed by the sha256 value above.",
	})
}
