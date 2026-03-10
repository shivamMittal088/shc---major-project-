package services

import (
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	UserSummaryCacheTTL = 30 * time.Second
	UserFilesCacheTTL   = 20 * time.Second
)

func UserSummaryCacheKey(userID uuid.UUID) string {
	return "user_summary:" + userID.String()
}

func UserFilesCacheKey(userID uuid.UUID, search string, language string, page int, limit int) string {
	search = strings.TrimSpace(search)
	language = strings.TrimSpace(language)
	return "user_files:" + userID.String() + ":search=" + url.QueryEscape(search) + ":language=" + url.QueryEscape(language) + ":page=" + intToString(page) + ":limit=" + intToString(limit)
}

func UserFilesCachePrefix(userID uuid.UUID) string {
	return "user_files:" + userID.String() + ":"
}

func intToString(value int) string {
	return strconv.Itoa(value)
}
