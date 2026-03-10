package middlewares

import (
	"regexp"
	"strings"

	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
)

var publicFileReadRoute = regexp.MustCompile(`^/api/files/[0-9a-fA-F-]+$`)
var publicFileDownloadRoute = regexp.MustCompile(`^/api/files/download/[0-9a-fA-F-]+$`)
var publicFileUploadRoute = regexp.MustCompile(`^/api/files/upload/[0-9a-fA-F-]+$`)
var publicDownloadCountRoute = regexp.MustCompile(`^/api/files/increment-download-count/[0-9a-fA-F-]+$`)

func isSemiPublicRoute(method string, path string) bool {
	if method == fiber.MethodGet && publicFileReadRoute.MatchString(path) {
		return true
	}

	if method == fiber.MethodGet && publicFileDownloadRoute.MatchString(path) {
		return true
	}

	if method == fiber.MethodPut && publicFileUploadRoute.MatchString(path) {
		return true
	}

	if method == fiber.MethodPatch && publicDownloadCountRoute.MatchString(path) {
		return true
	}

	return false
}

func AuthMiddleware(c fiber.Ctx, as *services.AppService) error {
	accessToken := string(c.Request().Header.Peek("Authorization"))
	if accessToken == "" {
		accessToken = c.Cookies("__shc_access_token")
	}
	accessToken = strings.TrimPrefix(accessToken, "Bearer ")

	claim, err := as.AuthService.VerifyAccessToken(accessToken)

	path := c.Path()
	semiPublic := isSemiPublicRoute(c.Method(), path)

	if err == nil {

		c.Request().Header.Set("user_id", claim.ID.String())
		c.Request().Header.Set("user_email", claim.Email)
		c.Request().Header.Set("user_name", claim.Name)
		c.Request().Header.Set("token_issuer", claim.Issuer)
		c.Request().Header.Set("token_type", claim.TokenType)
		c.Request().Header.Set("token_expiration_at", claim.ExpiresAt.String())
	}

	if !semiPublic && err != nil {
		return c.SendStatus(401)
	}

	return c.Next()
}
