package models

import (
	"time"

	"github.com/aj-2000/shc-backend/utils"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Session struct {
	gorm.Model
	ID         uuid.UUID `gorm:"type:uuid;default:gen_random_uuid()"  json:"id"`
	UserId     uuid.UUID `gorm:"not null;index:idx_user_id_session" json:"user_id"`
	SessionKey string    `gorm:"not null;unique;" json:"session_key"`
	ExpiresAt  time.Time `gorm:"not null;" json:"expires_at"`
}

func (s *Session) BeforeCreate(db *gorm.DB) (err error) {
	hashedSessionKey, err := utils.HashPassword(s.SessionKey)
	if err != nil {
		return err
	}
	s.SessionKey = string(hashedSessionKey)
	return nil
}
