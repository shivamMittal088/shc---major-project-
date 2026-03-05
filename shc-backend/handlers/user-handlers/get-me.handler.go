package handlers

import (
	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

func GetMe(c fiber.Ctx, as *services.AppService) error {
	userIdString := c.Request().Header.Peek("user_id")

	userId, err := uuid.Parse(string(userIdString))
	if err != nil {
		return err
	}

	user, err := as.UserService.FindUserById(userId)

	if err != nil {
		return err
	}

	subscription, err := as.SubscriptionService.FindSubscriptionByUserId(userId)

	if err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"id":         user.ID,
		"name":       user.Name,
		"email":      user.Email,
		"file_count": user.FileCount,
		"subscription": fiber.Map{
			"id":                      subscription.ID,
			"start_date":              subscription.StartDate,
			"end_date":                subscription.EndDate,
			"status":                  subscription.Status,
			"today_remaining_reads":   subscription.TodayRemainingReads,
			"today_remaining_writes":  subscription.TodayRemainingWrites,
			"storage_remaining_bytes": subscription.StorageRemainingBytes,
			"max_file_size_bytes":     subscription.MaxFileSizeBytes,
			"subscription_plan": fiber.Map{
				"id":                  subscription.SubscriptionPlan.ID,
				"name":                subscription.SubscriptionPlan.Name,
				"max_daily_reads":     subscription.SubscriptionPlan.MaxDailyReads,
				"max_daily_writes":    subscription.SubscriptionPlan.MaxDailyWrites,
				"max_storage_bytes":   subscription.SubscriptionPlan.MaxStorageBytes,
				"max_file_size_bytes": subscription.SubscriptionPlan.MaxFileSizeBytes,
			},
		},
	})
}
