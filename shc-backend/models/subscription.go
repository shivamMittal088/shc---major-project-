package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SubscriptionStatus string

const (
	Active   SubscriptionStatus = "active"
	Inactive SubscriptionStatus = "inactive"
	Canceled SubscriptionStatus = "canceled"
)

type Subscription struct {
	gorm.Model
	ID                    uuid.UUID          `gorm:"type:uuid;default:gen_random_uuid()" json:"id"`
	StartDate             time.Time          `gorm:"not null;default:current_timestamp" json:"start_date"`
	EndDate               time.Time          `gorm:"not null;" json:"end_date"`
	TodayRemainingReads   uint               `gorm:"not null;" json:"today_remaining_reads"`
	TodayRemainingWrites  uint               `gorm:"not null;" json:"today_remaining_writes"`
	StorageRemainingBytes uint               `gorm:"not null;" json:"storage_remaining_bytes"`
	MaxFileSizeBytes      uint               `gorm:"not null;" json:"max_file_size_bytes"`
	SubscriptionPlan      SubscriptionPlan   `gorm:"foreignKey:SubscriptionPlanId;references:ID" json:"subscription_plan"`
	SubscriptionPlanId    uuid.UUID          `gorm:"size:255;not null;" json:"subscription_plan_id"`
	Status                SubscriptionStatus `gorm:"size:255;not null;" json:"status"`
	UserId                uuid.UUID          `gorm:"not null;uniqueIndex:idx_user_id_subscription;" json:"user_id"`
}
