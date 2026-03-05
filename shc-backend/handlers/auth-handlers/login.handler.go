package handlers

import (
	"strconv"

	m "github.com/aj-2000/shc-backend/models"
	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
)

type CheckOtpRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Otp   string `json:"otp"`
}

func VerifyOtpAndGetTokens(c fiber.Ctx, as *services.AppService) error {
	req := new(CheckOtpRequest)
	if err := c.Bind().Body(req); err != nil {
		return err
	}

	otp, err := strconv.Atoi(req.Otp)

	if err != nil {
		return &fiber.Error{Code: fiber.StatusBadRequest, Message: "Invalid OTP"}
	}

	if err = as.AuthService.VerifyOtp(req.Email, otp); err != nil {
		return &fiber.Error{Code: fiber.StatusUnauthorized, Message: err.Error()}
	}

	var user *m.User

	u, err := as.UserService.FindUserByEmail(req.Email)

	if err != nil {
		user, err = as.UserService.CreateUser(&m.User{Email: req.Email, Name: req.Name})
	} else {
		user, err = as.UserService.UpdateAUser(&m.User{ID: u.ID, Email: req.Email, Name: req.Name})
	}

	if err != nil {
		return err
	}

	tokens, err := as.AuthService.GenerateTokens(user.ID, user.Name, user.Email)

	if err != nil {
		return err
	}

	return c.JSON(fiber.Map{
		"refresh_token": tokens.RefreshToken,
		"access_token":  tokens.AccessToken,
		"name":          user.Name,
		"email":         user.Email,
		"id":            user.ID,
	})
}
