package filehandlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	m "github.com/aj-2000/shc-backend/models"
	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

// VerifyNotarization is a public endpoint. It:
//  1. Looks up the file record (must be public or the caller owns it).
//  2. Fetches the raw file bytes from storage.
//  3. Computes the SHA-256 on-the-fly.
//  4. Queries the Ethereum chain to confirm the on-chain calldata contains
//     "shc:<sha256>" — returning hash_match:true/false as a verifiable result.
//  5. Returns the hash, the stored tx hash, and an Etherscan link so anyone
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

	// Perform integrity verification.
	// Priority 1: on-chain verification via Ethereum (immutable, third-party proof).
	// Priority 2: local hash comparison against the SHA-256 stored at upload time.
	hashMatch := false
	chainVerified := false
	chainError := ""
	verificationMethod := "none"
	newIntegrityStatus := file.IntegrityStatus

	if notarizationTx != "" && as.BlockchainService.Enabled() {
		// On-chain path
		ctx, cancel := context.WithTimeout(c.Context(), 15*time.Second)
		defer cancel()
		match, verifyErr := as.BlockchainService.VerifyOnChain(ctx, notarizationTx, sum[:])
		if verifyErr != nil {
			chainError = verifyErr.Error()
		} else {
			hashMatch = match
			chainVerified = true
			verificationMethod = "blockchain"
			if match {
				newIntegrityStatus = m.IntegrityVerified
			} else {
				newIntegrityStatus = m.IntegrityTampered
			}
			_ = as.FileService.SetIntegrityStatus(file.ID, newIntegrityStatus)
		}
	} else if file.SHA256Hash != "" {
		// Local fallback: compare current bytes against hash stored at upload time.
		hashMatch = (computedHash == file.SHA256Hash)
		chainVerified = true
		verificationMethod = "local"
		if hashMatch {
			newIntegrityStatus = m.IntegrityVerified
		} else {
			newIntegrityStatus = m.IntegrityTampered
		}
		_ = as.FileService.SetIntegrityStatus(file.ID, newIntegrityStatus)
	}

	return c.JSON(fiber.Map{
		"file_id":             file.ID,
		"file_name":           file.Name,
		"sha256":              computedHash,
		"notarization_tx":     notarizationTx,
		"notarized":           notarizationTx != "",
		"hash_match":          hashMatch,
		"chain_verified":      chainVerified,
		"chain_error":         chainError,
		"verification_method": verificationMethod,
		"integrity_status":    newIntegrityStatus,
		"etherscan_url":       etherscanURL,
	})
}
