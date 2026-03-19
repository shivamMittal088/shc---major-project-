package main

import (
	rh "github.com/aj-2000/shc-backend/handlers/risk-handlers"
	services "github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
)

func setupRiskRoutes(app *fiber.App, as *services.AppService) {
	app.Post("/analyze-link", func(c fiber.Ctx) error {
		return rh.AnalyzeLink(c, as)
	})
}
