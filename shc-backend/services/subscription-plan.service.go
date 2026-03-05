package services

import (
	m "github.com/aj-2000/shc-backend/models"
	"github.com/google/uuid"
)

type SubscriptionPlanService struct {
	dbService *DbService
}

func NewSubscriptionPlanService(dbService *DbService) *SubscriptionPlanService {
	return &SubscriptionPlanService{
		dbService: dbService,
	}
}

func (sps *SubscriptionPlanService) FindSubscriptionPlanByName(subscriptionPlanName string) (*m.SubscriptionPlan, error) {
	var subscriptionPlan m.SubscriptionPlan
	if err := sps.dbService.Db.Where("name = ?", subscriptionPlanName).First(&subscriptionPlan).Error; err != nil {
		return nil, err
	}
	return &subscriptionPlan, nil
}

func (sps *SubscriptionPlanService) FindSubscriptionPlanById(subscriptionPlanId uuid.UUID) (*m.SubscriptionPlan, error) {
	var subscriptionPlan m.SubscriptionPlan
	if err := sps.dbService.Db.Where("id = ?", subscriptionPlanId).First(&subscriptionPlan).Error; err != nil {
		return nil, err
	}
	return &subscriptionPlan, nil
}
