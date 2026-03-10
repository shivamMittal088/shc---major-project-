package filehandlers

import (
	"fmt"
	"os"
	"strings"

	"github.com/gofiber/fiber/v3"
)

func backendBaseURL(c fiber.Ctx) string {
	baseURL := strings.TrimSpace(os.Getenv("BACKEND_PUBLIC_BASE_URL"))
	if baseURL != "" {
		return strings.TrimRight(baseURL, "/")
	}

	host := c.Get("X-Forwarded-Host")
	if host == "" {
		host = c.Get("Host")
	}

	proto := c.Get("X-Forwarded-Proto")
	if proto == "" {
		proto = c.Protocol()
	}

	return fmt.Sprintf("%s://%s", proto, host)
}
