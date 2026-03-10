package filehandlers

import (
	"github.com/aj-2000/shc-backend/services"
	"github.com/google/uuid"
)

func invalidateUserFileCaches(as *services.AppService, userID uuid.UUID, includeSummary bool) {
	_ = as.RedisService.DeleteByPrefix(services.UserFilesCachePrefix(userID))
	if includeSummary {
		_ = as.RedisService.DeleteCache(services.UserSummaryCacheKey(userID))
	}
}
