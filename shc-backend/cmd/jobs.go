package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	m "github.com/aj-2000/shc-backend/models"
	"github.com/aj-2000/shc-backend/services"
)

func runCronJobs(as *services.AppService) {
	as.CronService.AddFunc("@midnight", func() {
		print("Deleting all non-uploaded files")
		err := as.FileService.DeleteAllNonUploadedFiles()
		if err != nil {
			fmt.Println(err)
		}
	})

	as.CronService.AddFunc("@every 1h", func() {
		r2Paths, err := as.FileService.DeleteExpiredFiles()
		if err != nil {
			log.Printf("DeleteExpiredFiles: %v", err)
			return
		}
		for _, key := range r2Paths {
			if err := as.S3Service.DeleteObject(key); err != nil {
				log.Printf("S3 delete failed for key %q: %v", key, err)
			}
		}
		if len(r2Paths) > 0 {
			log.Printf("Deleted %d expired file(s) from storage", len(r2Paths))
		}
	})

	as.CronService.Start()
}

// backfillIntegrityHashes runs once at startup. It finds all uploaded files
// that have no stored SHA-256 hash yet, fetches their bytes, computes the hash,
// stores it, and marks them integrity_status="verified". This covers files that
// were uploaded before the integrity feature was added.
func backfillIntegrityHashes(as *services.AppService) {
	files, err := as.FileService.FindUploadedFilesWithoutHash()
	if err != nil {
		log.Printf("backfill: failed to query files: %v", err)
		return
	}
	if len(files) == 0 {
		log.Println("backfill: all uploaded files already have integrity hashes")
		return
	}

	log.Printf("backfill: computing integrity hashes for %d file(s)...", len(files))

	for _, file := range files {
		func(f m.File) {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
			defer cancel()

			fileBytes, err := fetchBytesForBackfill(ctx, as, &f)
			if err != nil {
				log.Printf("backfill: could not fetch bytes for %s: %v", f.ID, err)
				return
			}

			sum := sha256.Sum256(fileBytes)
			hexHash := hex.EncodeToString(sum[:])

			if err := as.FileService.SetSHA256Hash(f.ID, hexHash); err != nil {
				log.Printf("backfill: failed to store hash for %s: %v", f.ID, err)
				return
			}
			if err := as.FileService.SetIntegrityStatus(f.ID, m.IntegrityVerified); err != nil {
				log.Printf("backfill: failed to set integrity status for %s: %v", f.ID, err)
				return
			}
			log.Printf("backfill: verified %s (%s)", f.ID, f.Name)
		}(file)
	}

	log.Printf("backfill: done")
}

func fetchBytesForBackfill(ctx context.Context, as *services.AppService, file *m.File) ([]byte, error) {
	if as.S3Service.IsLocalMode() {
		fullPath, err := as.S3Service.ResolveLocalPath(file.R2Path)
		if err != nil {
			return nil, err
		}
		return os.ReadFile(fullPath)
	}

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
	var buf []byte
	tmp := make([]byte, 32*1024)
	for {
		n, readErr := resp.Body.Read(tmp)
		if n > 0 {
			buf = append(buf, tmp[:n]...)
		}
		if readErr != nil {
			break
		}
	}
	return buf, nil
}
