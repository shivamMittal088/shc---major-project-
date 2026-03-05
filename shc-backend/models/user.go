package models

import (
	"errors"

	"github.com/badoux/checkmail"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	ID                 uuid.UUID    `gorm:"type:uuid;default:gen_random_uuid()"  json:"id"`
	Name               string       `gorm:"size:255;not null;" json:"name"`
	Email              string       `gorm:"size:100;not null;unique" json:"email"`
	Subscription       Subscription `gorm:"foreignKey:SubscriptionId;references:ID"`
	SubscriptionId     uuid.UUID    `gorm:"size:255;not null;unique;"`
	FileCount          uint         `gorm:"not null;default:0;" json:"file_count"`
	Files              []File
	Sessions           []Session
	StripeTransactions []StripeTransaction
}

func (u *User) Validate(db *gorm.DB) error {
	if u.Name == "" {
		return errors.New("name is required")
	}
	if u.Email == "" {
		return errors.New("email is required")
	}
	if err := checkmail.ValidateFormat(u.Email); err != nil {
		return errors.New("invalid email")
	}
	return nil
}
