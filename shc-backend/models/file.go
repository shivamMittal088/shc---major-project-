package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UploadStatus string

const (
	NotStarted UploadStatus = "not_started"
	Uploading  UploadStatus = "uploading"
	Uploaded   UploadStatus = "uploaded"
	Failed     UploadStatus = "failed"
)

// IntegrityStatus reflects the result of blockchain-based integrity verification.
// "unverified" — file has not been notarized or verification has not been run.
// "verified"   — on-chain hash matches the current file bytes (tamper-proof).
// "tampered"   — on-chain hash does NOT match; the file content has changed.
type IntegrityStatus string

const (
	IntegrityUnverified IntegrityStatus = "unverified"
	IntegrityVerified   IntegrityStatus = "verified"
	IntegrityTampered   IntegrityStatus = "tampered"
)

type File struct {
	gorm.Model
	ID              uuid.UUID       `gorm:"type:uuid;default:gen_random_uuid()"  json:"id"`
	UploadStatus    UploadStatus    `gorm:"size:255;not null;default:not_started;" json:"upload_status"`
	Name            string          `gorm:"size:255;not null;" json:"name"`
	Size            uint            `gorm:"not null;" json:"size"`
	IsPublic        bool            `gorm:"not null;default:false;" json:"is_public"`
	MimeType        string          `gorm:"size:255;not null;" json:"mime_type"`
	Extension       string          `gorm:"size:32;not null;" json:"extension"`
	R2Path          string          `gorm:"size:255;not null;" json:"r2_path"`
	ViewCount       uint            `gorm:"not null;default:0;" json:"read_count"`
	DownloadCount   uint            `gorm:"not null;default:0;" json:"download_count"`
	UserId          uuid.UUID       `gorm:"not null;index:idx_user_id_file" json:"user_id"`
	ExpiresAt       *time.Time      `gorm:"index" json:"expires_at"`
	NotarizationTx  string          `gorm:"size:255;default:''" json:"notarization_tx"`
	IntegrityStatus IntegrityStatus `gorm:"size:32;not null;default:'unverified'" json:"integrity_status"`
	// SHA256Hash is the hex-encoded SHA-256 of the file bytes computed at upload
	// time. Used to verify integrity even when blockchain is not configured.
	SHA256Hash string `gorm:"size:64;default:''" json:"sha256_hash"`
}
