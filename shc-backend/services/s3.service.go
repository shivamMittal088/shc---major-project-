package services

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Service struct {
	S3              *s3.Client
	S3PresignClient *s3.PresignClient
	BucketName      string
}

func NewS3Service() *S3Service {
	ctx := context.Background()
	accountId := os.Getenv("R2_ACCOUNT_ID")
	accessKeyId := os.Getenv("R2_ACCESS_KEY_ID")
	accessKeySecret := os.Getenv("R2_ACCESS_KEY_SECRET")
	region := os.Getenv("R2_REGION")

	r2Resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL: fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountId),
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
	bucketName := os.Getenv("R2_BUCKET_NAME")

	return &S3Service{
		S3:              newS3,
		S3PresignClient: newS3PresignClient,
		BucketName:      bucketName,
	}
}
