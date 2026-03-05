package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PaymentStatus string

const (
	Processing PaymentStatus = "processing"
	Succeeded  PaymentStatus = "approved"
	Aborted    PaymentStatus = "aborted"
	Rejected   PaymentStatus = "rejected"
	Refunded   PaymentStatus = "refunded"
	Pending    PaymentStatus = "pending"
)

type StripeTransaction struct {
	gorm.Model
	ID              uuid.UUID     `gorm:"type:uuid;default:gen_random_uuid()" json:"id"`
	Amount          float64       `gorm:"not null;" json:"amount"`
	Currency        string        `gorm:"not null;" json:"currency"`
	Description     string        `gorm:"size:255;" json:"description"`
	RecieptUrl      string        `gorm:"size:255;" json:"receipt_url"`
	StripeChargeId  string        `gorm:"not null;" json:"stripe_charge_id"`
	PaymentStatus   PaymentStatus `gorm:"size:255;not null;" json:"payment_status"`
	SubscriptionId  uuid.UUID     `gorm:"not null;" json:"subscription_id"`
	TransactionDate time.Time     `gorm:"not null;" json:"transaction_date"`
	UserId          uuid.UUID     `gorm:"not null;uniqueIndex:idx_user_id_stripe_transaction" json:"user_id"`
}
