package handlers

import (
	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type getMeResponse struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	FileCount uint      `json:"file_count"`
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

	response := getMeResponse{
		ID:        user.ID,
		Name:      user.Name,
		Email:     user.Email,
		FileCount: user.FileCount,
	}

	_ = as.RedisService.SetJSONCache(cacheKey, response, services.UserSummaryCacheTTL)

	return c.JSON(response)
}
