package handlers

import (
	"github.com/gofiber/fiber/v3"
)

func Home(c fiber.Ctx) error {
	return c.SendString("API is running!")
}
