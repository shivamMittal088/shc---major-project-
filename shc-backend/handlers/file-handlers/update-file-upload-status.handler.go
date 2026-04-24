package filehandlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"

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

	// When a file finishes uploading, compute its SHA-256, store it as the
	// integrity baseline, and optionally anchor on Ethereum.
	if body.UploadStatus == m.Uploaded {
		go notarizeUploadedFile(as, file)
	}

	invalidateUserFileCaches(as, userId, true)

	return c.JSON(fiber.Map{
		"id":            file.ID,
		"upload_status": file.UploadStatus,
	})
}

// notarizeUploadedFile computes SHA-256 of the file, stores it in the DB, and
// marks integrity_status = "verified" (local baseline verification). When a
// live Ethereum node is configured it also submits the hash on-chain.
func notarizeUploadedFile(as *services.AppService, file *m.File) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	fileBytes, err := fetchFileBytes(ctx, as, file)
	if err != nil {
		log.Printf("notarize: failed to fetch file bytes for %s: %v", file.ID, err)
		return
	}

	sum := sha256.Sum256(fileBytes)
	hexHash := hex.EncodeToString(sum[:])

	// Always persist the hash — this is the local integrity baseline.
	if err := as.FileService.SetSHA256Hash(file.ID, hexHash); err != nil {
		log.Printf("notarize: sha256 db update failed for %s: %v", file.ID, err)
		return
	}

	// Mark verified immediately — the hash was computed from the just-uploaded
	// bytes, so the file is in a known-good state right now.
	if err := as.FileService.SetIntegrityStatus(file.ID, m.IntegrityVerified); err != nil {
		log.Printf("notarize: integrity status update failed for %s: %v", file.ID, err)
		return
	}

	log.Printf("notarize: file %s locally verified — sha256 %s", file.ID, hexHash)

	// Optional: also anchor on Ethereum for immutable third-party proof.
	if as.BlockchainService.Enabled() {
		txHash, err := as.BlockchainService.NotarizeHash(ctx, sum[:])
		if err != nil {
			log.Printf("notarize: blockchain submission failed for %s: %v", file.ID, err)
			return
		}
		if err := as.FileService.SetNotarizationTx(file.ID, txHash); err != nil {
			log.Printf("notarize: tx db update failed for %s: %v", file.ID, err)
			return
		}
		log.Printf("notarize: file %s also anchored on-chain — tx %s", file.ID, txHash)
	}
}

// fetchFileBytes reads the file content from local disk or Cloudflare R2.
func fetchFileBytes(ctx context.Context, as *services.AppService, file *m.File) ([]byte, error) {
	if as.S3Service.IsLocalMode() {
		fullPath, err := as.S3Service.ResolveLocalPath(file.R2Path)
		if err != nil {
			return nil, err
		}
		return os.ReadFile(fullPath)
	}

	// Cloud mode: generate a short-lived presigned GET URL and stream the bytes.
	res, err := as.S3Service.S3PresignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(as.S3Service.BucketName),
		Key:    aws.String(file.R2Path),
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, res.URL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}
