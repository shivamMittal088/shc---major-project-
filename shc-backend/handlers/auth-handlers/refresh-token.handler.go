package handlers

import (
	"strings"

	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
)

func RefreshToken(c fiber.Ctx, as *services.AppService) error {
	refreshToken := string(c.Request().Header.Peek("Authorization"))
	if refreshToken == "" {
		refreshToken = c.Cookies("__shc_refresh_token")
	}

	refreshToken = strings.TrimPrefix(refreshToken, "Bearer ")

	claim, err := as.AuthService.VerifyRefreshToken(refreshToken)

	if err != nil {
		return c.SendStatus(401)
	}

	tokens, err := as.AuthService.GenerateTokens(claim.ID, claim.Name, claim.Email)

	if err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"refresh_token": tokens.RefreshToken,
		"access_token":  tokens.AccessToken,
		"user": fiber.Map{
			"id":    claim.ID,
			"name":  claim.Name,
			"email": claim.Email,
		},
	})
}
