package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SubscriptionPlan struct {
	gorm.Model
	ID               uuid.UUID `gorm:"type:uuid;default:gen_random_uuid()" json:"id"`
	Name             string    `gorm:"size:255;not null;" json:"name"`
	Description      string    `gorm:"size:255;not null;" json:"description"`
	PriceInr         float64   `gorm:"not null;" json:"price_inr"`
	MaxStorageBytes  uint      `gorm:"not null;" json:"max_storage_bytes"`
	MaxFileSizeBytes uint      `gorm:"not null;" json:"max_file_size_bytes"`
	MaxDailyReads    uint      `gorm:"not null;" json:"max_daily_reads"`
	MaxDailyWrites   uint      `gorm:"not null;" json:"max_daily_writes"`
}
