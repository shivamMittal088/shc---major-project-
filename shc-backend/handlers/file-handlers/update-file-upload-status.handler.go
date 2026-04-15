package filehandlers

import (
	"context"
	"crypto/sha256"
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

	// When a file finishes uploading, notarize its SHA-256 hash on-chain asynchronously.
	if body.UploadStatus == m.Uploaded && as.BlockchainService.Enabled() {
		go notarizeUploadedFile(as, file)
	}

	invalidateUserFileCaches(as, userId, true)

	return c.JSON(fiber.Map{
		"id":            file.ID,
		"upload_status": file.UploadStatus,
	})
}

// notarizeUploadedFile fetches the uploaded file bytes, computes SHA-256, and
// submits the hash to Ethereum. The DB is updated with the resulting tx hash.
func notarizeUploadedFile(as *services.AppService, file *m.File) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	fileBytes, err := fetchFileBytes(ctx, as, file)
	if err != nil {
		log.Printf("notarize: failed to fetch file bytes for %s: %v", file.ID, err)
		return
	}

	sum := sha256.Sum256(fileBytes)

	txHash, err := as.BlockchainService.NotarizeHash(ctx, sum[:])
	if err != nil {
		log.Printf("notarize: blockchain submission failed for %s: %v", file.ID, err)
		return
	}

	if err := as.FileService.SetNotarizationTx(file.ID, txHash); err != nil {
		log.Printf("notarize: db update failed for %s: %v", file.ID, err)
		return
	}

	log.Printf("notarize: file %s notarized — tx %s", file.ID, txHash)
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
