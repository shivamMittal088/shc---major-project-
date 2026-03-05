package services

type AppService struct {
	DbService               *DbService
	FileService             *FileService
	SubscriptionPlanService *SubscriptionPlanService
	SubscriptionService     *SubscriptionService
	UserService             *UserService
	SessionService          *SessionService
	AuthService             *AuthService
	S3Service               *S3Service
	EmailService            *EmailService
	CronService             *CronService
	RedisService            *RedisService
}

func NewAppService() *AppService {

	dbService := NewDbService()
	subscriptionPlanService := NewSubscriptionPlanService(dbService)
	subscriptionService := NewSubscriptionService(dbService, subscriptionPlanService)
	userService := NewUserService(dbService, subscriptionService)
	fileService := NewFileService(dbService, subscriptionService)
	sessionService := NewSessionService(dbService)
	authService := NewAuthService(userService, sessionService)
	s3Service := NewS3Service()
	emailService := NewEmailService()
	cronService := NewCronService()
	redisService := NewRedisService()

	return &AppService{
		DbService:               dbService,
		FileService:             fileService,
		SubscriptionPlanService: subscriptionPlanService,
		SubscriptionService:     subscriptionService,
		UserService:             userService,
		SessionService:          sessionService,
		AuthService:             authService,
		S3Service:               s3Service,
		EmailService:            emailService,
		CronService:             cronService,
		RedisService:            redisService,
	}
}
