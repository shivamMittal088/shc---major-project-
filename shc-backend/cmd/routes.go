package main

import (
	handlers "github.com/aj-2000/shc-backend/handlers"
	ah "github.com/aj-2000/shc-backend/handlers/auth-handlers"
	fh "github.com/aj-2000/shc-backend/handlers/file-handlers"
	uh "github.com/aj-2000/shc-backend/handlers/user-handlers"
	"github.com/aj-2000/shc-backend/middlewares"
	services "github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
)

func setupRoutes(app *fiber.App, as *services.AppService) {
	app.Get("/", handlers.Home)

	auth := app.Group("auth")

	auth.Post("otp", func(c fiber.Ctx) error {
		return ah.GenerateOtp(c, as)
	})

	auth.Get("refresh-token", func(c fiber.Ctx) error {
		return ah.RefreshToken(c, as)
	})

	auth.Post("login", func(c fiber.Ctx) error {
		return ah.VerifyOtpAndGetTokens(c, as)
	})

	auth.Delete("logout", func(c fiber.Ctx) error {
		return ah.Logout(c, as)
	})

	api := app.Group("api", func(c fiber.Ctx) error {
		return middlewares.AuthMiddleware(c, as)
	})

	users := api.Group("users")

	users.Get("me", func(c fiber.Ctx) error {
		return uh.GetMe(c, as)
	})

	files := api.Group("files")

	files.Get("/", func(c fiber.Ctx) error {
		return fh.ListFiles(c, as)
	})

	files.Get(":fileId", func(c fiber.Ctx) error {
		return fh.GetFile(c, as)
	})

	files.Patch("toggle-visibility/:fileId", func(c fiber.Ctx) error {
		return fh.ToggleFileVisibility(c, as)
	})

	files.Patch("increment-download-count/:fileId", func(c fiber.Ctx) error {
		return fh.IncrementFileDownloadCount(c, as)
	})

	files.Post("add", func(c fiber.Ctx) error {
		return fh.AddFileToDb(c, as)
	})

	files.Patch("update-upload-status/:fileId", func(c fiber.Ctx) error {
		return fh.UpdateFileUploadStatus(c, as)
	})

	files.Delete("remove/:id", func(c fiber.Ctx) error {
		return fh.RemoveFile(c, as)
	})

	files.Patch("rename/:id", func(c fiber.Ctx) error {
		return fh.RenameFile(c, as)
	})

}
