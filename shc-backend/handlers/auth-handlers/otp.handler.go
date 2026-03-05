package handlers

import (
	"log"
	"strconv"

	"github.com/aj-2000/shc-backend/models"
	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
)

func GenerateOtp(c fiber.Ctx, as *services.AppService) error {
	// TODO: is it right to create a new user here?
	user := new(models.User)

	if err := c.Bind().Body(user); err != nil {
		return err
	}

	otp := as.AuthService.GenerateOtp(user.Email)

	if err := as.EmailService.SendEmail([]string{user.Email}, "shc-cli OTP", strconv.Itoa(otp)); err != nil {
		log.Printf("failed to send otp to %s: %v", user.Email, err)
		return &fiber.Error{
			Code:    fiber.StatusServiceUnavailable,
			Message: "OTP service is temporarily unavailable. Please try again shortly.",
		}
	}

	return c.JSON(fiber.Map{
		"message": "OTP sent to your email",
	})
}
