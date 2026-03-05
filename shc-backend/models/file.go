package models

import (
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

type File struct {
	gorm.Model
	ID            uuid.UUID    `gorm:"type:uuid;default:gen_random_uuid()"  json:"id"`
	UploadStatus  UploadStatus `gorm:"size:255;not null;default:not_started;" json:"upload_status"`
	Name          string       `gorm:"size:255;not null;" json:"name"`
	Size          uint         `gorm:"not null;" json:"size"`
	IsPublic      bool         `gorm:"not null;default:false;" json:"is_public"`
	MimeType      string       `gorm:"size:32;not null;" json:"mime_type"`
	Extension     string       `gorm:"size:32;not null;" json:"extension"`
	R2Path        string       `gorm:"size:255;not null;" json:"r2_path"`
	ViewCount     uint         `gorm:"not null;default:0;" json:"read_count"`
	DownloadCount uint         `gorm:"not null;default:0;" json:"download_count"`
	UserId        uuid.UUID    `gorm:"not null;index:idx_user_id_file" json:"user_id"`
}

func (f *File) AfterCreate(db *gorm.DB) (err error) {
	if err := db.Model(&User{}).Where("id = ?", f.UserId).Update("file_count", gorm.Expr("file_count + ?", 1)).Error; err != nil {
		return err
	}
	return nil
}

// TODO: should we decrease the file count when a file is deleted? or permanently deleted?
func (f *File) AfterDelete(db *gorm.DB) (err error) {
	if err := db.Model(&User{}).Where("id = ?", f.UserId).Update("file_count", gorm.Expr("file_count - ?", 1)).Error; err != nil {
		return err
	}
	return nil
}
