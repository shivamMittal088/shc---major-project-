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

func SeedPlans(db *gorm.DB) error {
	plans := []models.SubscriptionPlan{
		{
			Name:             "Free",
			Description:      "Free Plan",
			PriceInr:         0.0,
			MaxStorageBytes:  1000 * 1000 * 1000 * 1, // 1 GB
			MaxFileSizeBytes: 1000 * 1000 * 100,      // 100 MB
			MaxDailyReads:    1000,
			MaxDailyWrites:   20,
		},
		{
			Name:             "Pro",
			Description:      "Pro Plan",
			PriceInr:         49.99,
			MaxStorageBytes:  1000 * 1000 * 1000 * 15, // 15 GB
			MaxFileSizeBytes: 1000 * 1000 * 1000 * 1,  // 1GB
			MaxDailyReads:    10000,
			MaxDailyWrites:   100,
		},
		{
			Name:             "Pro Max",
			Description:      "Pro Max Plan",
			PriceInr:         99.99,
			MaxStorageBytes:  1000 * 1000 * 1000 * 50, // 50 GB
			MaxFileSizeBytes: 1000 * 1000 * 1000 * 5,  // 5 GB
			MaxDailyReads:    20000,
			MaxDailyWrites:   2000,
		},
	}

	// Insert plans into the database
	for _, plan := range plans {
		// Keep plan names unique while allowing value updates.
		result := db.Where(models.SubscriptionPlan{Name: plan.Name}).Assign(plan).FirstOrCreate(&plan)
		if result.Error != nil {
			return result.Error
		}
	}

	fmt.Println("Plans seeded successfully!")
	return nil
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
		if err := Db.AutoMigrate(&models.User{}, &models.File{}, &models.Subscription{}, &models.StripeTransaction{}, &models.SubscriptionPlan{}, &models.Session{}); err != nil {
			log.Fatalf("failed to auto-migrate database schema: %v", err)
		}

		if isEnvTrue("SHC_DB_SEED_PLANS") {
			if err := SeedPlans(Db); err != nil {
				log.Fatalf("failed to seed subscription plans: %v", err)
			}
		}
	}

	return &DbService{
		Db: Db,
	}
}
