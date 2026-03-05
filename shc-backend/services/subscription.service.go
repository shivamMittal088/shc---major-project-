package services

import (
	"errors"
	"time"

	m "github.com/aj-2000/shc-backend/models"
	"github.com/google/uuid"
	"gorm.io/gorm/clause"
)

type SubscriptionService struct {
	dbService               *DbService
	subscriptionPlanService *SubscriptionPlanService
}

func NewSubscriptionService(dbService *DbService, subscriptionPlanService *SubscriptionPlanService) *SubscriptionService {
	return &SubscriptionService{
		dbService:               dbService,
		subscriptionPlanService: subscriptionPlanService,
	}
}

func (ss *SubscriptionService) FindSubscriptionById(subscriptionId uuid.UUID) (*m.Subscription, error) {
	var subscription m.Subscription
	if err := ss.dbService.Db.Where("id = ?", subscriptionId).First(&subscription).Error; err != nil {
		return nil, err
	}
	return &subscription, nil
}

func (ss *SubscriptionService) FindSubscriptionByUserId(userId uuid.UUID) (*m.Subscription, error) {
	var subscription m.Subscription
	if err := ss.dbService.Db.Preload(clause.Associations).Where("user_id = ?", userId).First(&subscription).Error; err != nil {
		return nil, err
	}
	return &subscription, nil
}

func (ss *SubscriptionService) CreateSubscription(subscriptionPlanName string, endDate time.Time) (*m.Subscription, error) {
	subscriptionPlan, err := ss.subscriptionPlanService.FindSubscriptionPlanByName(subscriptionPlanName)
	if err != nil {
		return nil, err
	}

	subscription := m.Subscription{
		EndDate:               endDate,
		SubscriptionPlanId:    subscriptionPlan.ID,
		Status:                m.Active,
		TodayRemainingReads:   subscriptionPlan.MaxDailyReads,
		TodayRemainingWrites:  subscriptionPlan.MaxDailyWrites,
		StorageRemainingBytes: subscriptionPlan.MaxStorageBytes,
		MaxFileSizeBytes:      subscriptionPlan.MaxFileSizeBytes,
	}
	return &subscription, nil
}

func (ss *SubscriptionService) IncrementReads(userId uuid.UUID) error {
	subscription, err := ss.FindSubscriptionByUserId(userId)

	if err != nil {
		return err
	}
	if subscription.TodayRemainingReads > 0 {
		subscription.TodayRemainingReads -= 1
		if err := ss.dbService.Db.Save(subscription).Error; err != nil {
			return err
		}
		return nil
	}

	return errors.New("no remaining reads")
}

func (ss *SubscriptionService) IncrementWrites(userId uuid.UUID, size uint, isAdding bool) error {
	subscription, err := ss.FindSubscriptionByUserId(userId)

	if err != nil {
		return err
	}

	if isAdding {
		if subscription.TodayRemainingWrites > 0 {
			subscription.TodayRemainingWrites -= 1
		} else {
			return errors.New("no remaining writes")
		}

		if subscription.StorageRemainingBytes > size {
			subscription.StorageRemainingBytes -= size
		} else {
			return errors.New("not enough remaining storage")
		}
	} else {
		subscription.TodayRemainingWrites += 1
		subscription.StorageRemainingBytes += size
	}

	if err := ss.dbService.Db.Save(subscription).Error; err != nil {
		return err
	}
	return nil
}

func (ss *SubscriptionService) ResetSubcriptionLimitsOfAllActiveFreeSubscriptions() error {
	subscriptionPlan, err := ss.subscriptionPlanService.FindSubscriptionPlanByName("Free")
	if err != nil {
		return err
	}
	if err := ss.dbService.Db.Model(&m.Subscription{}).
		Where("subscriptions.status = ? AND subscriptions.deleted_at IS NULL", m.Active).
		Updates(map[string]any{
			"today_remaining_reads":   subscriptionPlan.MaxDailyReads,
			"today_remaining_writes":  subscriptionPlan.MaxDailyWrites,
			"storage_remaining_bytes": subscriptionPlan.MaxStorageBytes,
		}).Error; err != nil {
		return err
	}
	return nil
}

// below function is a method of SubscriptionService struct ✅
func (ss *SubscriptionService) DeactivateAllExpiredSubscriptions() error {

	// not understood this query
	// UPDATE Subscription
	// SET status = 'Inactive'
	// WHERE end_date < CURRENT_TIMESTAMP;
	if err := ss.dbService.Db.Model(&m.Subscription{}).
		Where("end_date < ?", time.Now()).
		Updates(map[string]any{
			"status": m.Inactive,
		}).Error; err != nil {

		return err
	}

	return nil
}
