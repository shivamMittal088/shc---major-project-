package handlers

import (
	"time"

	m "github.com/aj-2000/shc-backend/models"
	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type getMeSubscriptionPlanResponse struct {
	ID               uuid.UUID `json:"id"`
	Name             string    `json:"name"`
	MaxDailyReads    uint      `json:"max_daily_reads"`
	MaxDailyWrites   uint      `json:"max_daily_writes"`
	MaxStorageBytes  uint      `json:"max_storage_bytes"`
	MaxFileSizeBytes uint      `json:"max_file_size_bytes"`
}

type getMeSubscriptionResponse struct {
	ID                    uuid.UUID                     `json:"id"`
	StartDate             time.Time                     `json:"start_date"`
	EndDate               time.Time                     `json:"end_date"`
	Status                m.SubscriptionStatus          `json:"status"`
	TodayRemainingReads   uint                          `json:"today_remaining_reads"`
	TodayRemainingWrites  uint                          `json:"today_remaining_writes"`
	StorageRemainingBytes uint                          `json:"storage_remaining_bytes"`
	MaxFileSizeBytes      uint                          `json:"max_file_size_bytes"`
	SubscriptionPlan      getMeSubscriptionPlanResponse `json:"subscription_plan"`
}

type getMeResponse struct {
	ID           uuid.UUID                 `json:"id"`
	Name         string                    `json:"name"`
	Email        string                    `json:"email"`
	FileCount    uint                      `json:"file_count"`
	Subscription getMeSubscriptionResponse `json:"subscription"`
}

func GetMe(c fiber.Ctx, as *services.AppService) error {
	userIdString := c.Request().Header.Peek("user_id")

	userId, err := uuid.Parse(string(userIdString))
	if err != nil {
		return err
	}

	cacheKey := services.UserSummaryCacheKey(userId)
	var cachedResponse getMeResponse
	if err := as.RedisService.GetJSONCache(cacheKey, &cachedResponse); err == nil {
		return c.JSON(cachedResponse)
	}

	user, err := as.UserService.FindUserById(userId)

	if err != nil {
		return err
	}

	subscription, err := as.SubscriptionService.FindSubscriptionByUserId(userId)

	if err != nil {
		return err
	}

	response := getMeResponse{
		ID:        user.ID,
		Name:      user.Name,
		Email:     user.Email,
		FileCount: user.FileCount,
		Subscription: getMeSubscriptionResponse{
			ID:                    subscription.ID,
			StartDate:             subscription.StartDate,
			EndDate:               subscription.EndDate,
			Status:                subscription.Status,
			TodayRemainingReads:   subscription.TodayRemainingReads,
			TodayRemainingWrites:  subscription.TodayRemainingWrites,
			StorageRemainingBytes: subscription.StorageRemainingBytes,
			MaxFileSizeBytes:      subscription.MaxFileSizeBytes,
			SubscriptionPlan: getMeSubscriptionPlanResponse{
				ID:               subscription.SubscriptionPlan.ID,
				Name:             subscription.SubscriptionPlan.Name,
				MaxDailyReads:    subscription.SubscriptionPlan.MaxDailyReads,
				MaxDailyWrites:   subscription.SubscriptionPlan.MaxDailyWrites,
				MaxStorageBytes:  subscription.SubscriptionPlan.MaxStorageBytes,
				MaxFileSizeBytes: subscription.SubscriptionPlan.MaxFileSizeBytes,
			},
		},
	}

	_ = as.RedisService.SetJSONCache(cacheKey, response, services.UserSummaryCacheTTL)

	return c.JSON(response)
}
