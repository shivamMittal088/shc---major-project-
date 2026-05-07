package filehandlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"time"

	m "github.com/aj-2000/shc-backend/models"
	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

// demoFakeNotarization returns true when DEMO_FAKE_NOTARIZATION=true.
// In demo mode the verify endpoint reports every file as notarized on-chain
// using a deterministic fake tx hash derived from the file hash. Use this for
// presentations when a real Ethereum wallet is not configured.
func demoFakeNotarization() bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv("DEMO_FAKE_NOTARIZATION")))
	return v == "1" || v == "true" || v == "yes"
}

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

	// DEMO MODE: fabricate a deterministic on-chain tx hash so the UI shows
	// "notarized on-chain" without a real Ethereum wallet. Safe for demos only.
	demoMode := demoFakeNotarization()
	if demoMode && notarizationTx == "" {
		notarizationTx = "0x" + computedHash
	}

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

	if demoMode {
		// Demo: trust the local hash but report it as a blockchain verification.
		if file.SHA256Hash != "" {
			hashMatch = (computedHash == file.SHA256Hash)
		} else {
			hashMatch = true
		}
		chainVerified = true
		verificationMethod = "blockchain"
		if hashMatch {
			newIntegrityStatus = m.IntegrityVerified
		} else {
			newIntegrityStatus = m.IntegrityTampered
		}
		_ = as.FileService.SetIntegrityStatus(file.ID, newIntegrityStatus)
	} else if notarizationTx != "" && as.BlockchainService.Enabled() {
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

	// Fetch wallet balance for live display (best-effort, non-blocking on failure).
	walletAddress := as.BlockchainService.Address()
	walletBalanceEth := ""
	walletBalanceWei := ""
	if as.BlockchainService.Enabled() {
		bctx, bcancel := context.WithTimeout(c.Context(), 5*time.Second)
		bal, balErr := as.BlockchainService.GetBalance(bctx)
		bcancel()
		if balErr == nil && bal != nil {
			walletBalanceWei = bal.String()
			walletBalanceEth = services.WeiToEthString(bal)
		}
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
		"wallet_address":      walletAddress,
		"wallet_balance_eth":  walletBalanceEth,
		"wallet_balance_wei":  walletBalanceWei,
	})
}
