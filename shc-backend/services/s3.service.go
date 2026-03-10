package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Service struct {
	S3              *s3.Client
	S3PresignClient *s3.PresignClient
	BucketName      string
	StorageMode     string
	LocalStorageDir string
}

func getFirstNonEmptyEnv(names ...string) string {
	for _, name := range names {
		value := strings.TrimSpace(os.Getenv(name))
		if value != "" {
			return value
		}
	}
	return ""
}

func mustEnv(value string, missing *[]string, names ...string) string {
	if strings.TrimSpace(value) == "" {
		*missing = append(*missing, strings.Join(names, "|"))
	}
	return value
}

func (s *S3Service) IsLocalMode() bool {
	return s != nil && s.StorageMode == "local"
}

func (s *S3Service) ResolveLocalPath(objectKey string) (string, error) {
	if !s.IsLocalMode() {
		return "", errors.New("local storage mode is not enabled")
	}

	cleanedKey := filepath.Clean(objectKey)
	if cleanedKey == "." || strings.HasPrefix(cleanedKey, "..") {
		return "", errors.New("invalid object key")
	}

	baseDir := filepath.Clean(s.LocalStorageDir)
	fullPath := filepath.Join(baseDir, cleanedKey)
	rel, err := filepath.Rel(baseDir, fullPath)
	if err != nil {
		return "", err
	}
	if strings.HasPrefix(rel, "..") {
		return "", errors.New("invalid object key")
	}

	return fullPath, nil
}

func NewS3Service() *S3Service {
	ctx := context.Background()
	missing := make([]string, 0)
	storageMode := strings.ToLower(strings.TrimSpace(os.Getenv("SHC_STORAGE_MODE")))

	if storageMode == "local" {
		localDir := strings.TrimSpace(os.Getenv("SHC_LOCAL_STORAGE_DIR"))
		if localDir == "" {
			localDir = ".storage"
		}

		if !filepath.IsAbs(localDir) {
			wd, err := os.Getwd()
			if err != nil {
				log.Fatal(err)
			}
			localDir = filepath.Join(wd, localDir)
		}

		if err := os.MkdirAll(localDir, 0o755); err != nil {
			log.Fatal(err)
		}

		bucketName := getFirstNonEmptyEnv("S3_BUCKET_NAME", "R2_BUCKET_NAME")
		if bucketName == "" {
			bucketName = "local-bucket"
		}

		log.Printf("storage mode: local (dir=%s bucket=%s)", filepath.Clean(localDir), bucketName)

		return &S3Service{
			BucketName:      bucketName,
			StorageMode:     "local",
			LocalStorageDir: filepath.Clean(localDir),
		}
	}

	endpointURL := strings.TrimSpace(os.Getenv("S3_ENDPOINT_URL"))
	accessKeyId := getFirstNonEmptyEnv("S3_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID")
	accessKeySecret := getFirstNonEmptyEnv("S3_ACCESS_KEY_SECRET", "R2_ACCESS_KEY_SECRET")
	bucketName := getFirstNonEmptyEnv("S3_BUCKET_NAME", "R2_BUCKET_NAME")
	region := getFirstNonEmptyEnv("S3_REGION", "R2_REGION")

	if endpointURL == "" {
		accountId := strings.TrimSpace(os.Getenv("R2_ACCOUNT_ID"))
		mustEnv(accountId, &missing, "R2_ACCOUNT_ID")
		if accountId != "" {
			endpointURL = fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountId)
		}
		mustEnv(accessKeyId, &missing, "R2_ACCESS_KEY_ID")
		mustEnv(accessKeySecret, &missing, "R2_ACCESS_KEY_SECRET")
		mustEnv(region, &missing, "R2_REGION")
		mustEnv(bucketName, &missing, "R2_BUCKET_NAME")
	} else {
		mustEnv(accessKeyId, &missing, "S3_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID")
		mustEnv(accessKeySecret, &missing, "S3_ACCESS_KEY_SECRET", "R2_ACCESS_KEY_SECRET")
		mustEnv(bucketName, &missing, "S3_BUCKET_NAME", "R2_BUCKET_NAME")
		if region == "" {
			region = "us-east-1"
		}
	}

	if len(missing) > 0 {
		log.Fatalf("missing required object storage env vars: %s", strings.Join(missing, ", "))
	}

	r2Resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL: endpointURL,
		}, nil
	})

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithEndpointResolverWithOptions(r2Resolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyId, accessKeySecret, "")),
		config.WithRegion(region),
	)

	if err != nil {
		log.Fatal(err)
	}

	newS3 := s3.NewFromConfig(cfg)
	newS3PresignClient := s3.NewPresignClient(newS3)
	log.Printf("storage mode: object (bucket=%s endpoint=%s)", bucketName, endpointURL)

	return &S3Service{
		S3:              newS3,
		S3PresignClient: newS3PresignClient,
		BucketName:      bucketName,
		StorageMode:     "object",
	}
}
