package services

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/aj-2000/shc-backend/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type DbService struct {
	Db *gorm.DB
}

type PaginatedResults struct {
	Results      any   `json:"results"`
	TotalResults int64 `json:"total_results"`
	TotalPages   uint  `json:"total_pages"`
	CurrentPage  uint  `json:"current_page"`
	PerPage      uint  `json:"per_page"`
	NextPage     uint  `json:"next_page"`
	PrevPage     uint  `json:"prev_page"`
}

// TODO: if we can improve it -> intitutiveness
func (ds *DbService) Paginated(page int, limit int) *gorm.DB {
	offset := (page - 1) * limit
	return ds.Db.Order("updated_at desc").Offset(offset).Limit(limit)
}

func isEnvTrue(key string) bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	return value == "1" || value == "true" || value == "yes" || value == "on"
}

func NewDbService() *DbService {
	DBURL := fmt.Sprintf("host=%s port=%s user=%s dbname=%s sslmode=disable password=%s", os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"), os.Getenv("DB_NAME"), os.Getenv("DB_PASSWORD"))

	Db, err := gorm.Open(postgres.Open(DBURL), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	if isEnvTrue("SHC_DB_AUTO_MIGRATE") {
		if err := Db.AutoMigrate(&models.User{}, &models.File{}, &models.Session{}); err != nil {
			log.Fatalf("failed to auto-migrate database schema: %v", err)
		}
	}

	return &DbService{
		Db: Db,
	}
}
