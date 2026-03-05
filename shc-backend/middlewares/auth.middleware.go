package middlewares

import (
	"regexp"
	"strings"

	"github.com/aj-2000/shc-backend/services"
	"github.com/gofiber/fiber/v3"
)

var SemiPublicRoutes = []*regexp.Regexp{
	regexp.MustCompile(`/api/files/.*`),
}

func AuthMiddleware(c fiber.Ctx, as *services.AppService) error {
	accessToken := string(c.Request().Header.Peek("Authorization"))
	if accessToken == "" {
		accessToken = c.Cookies("__shc_access_token")
	}
	accessToken = strings.TrimPrefix(accessToken, "Bearer ")

	claim, err := as.AuthService.VerifyAccessToken(accessToken)

	path := c.Path()
	semiPublic := false
	for _, route := range SemiPublicRoutes {
		if route.MatchString(path) {
			semiPublic = true
			break
		}
	}

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
