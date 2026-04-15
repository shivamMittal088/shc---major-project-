package services

import "log"

type AppService struct {
	DbService          *DbService
	FileService        *FileService
	UserService        *UserService
	SessionService     *SessionService
	AuthService        *AuthService
	S3Service          *S3Service
	EmailService       *EmailService
	CronService        *CronService
	RedisService       *RedisService
	RiskScoringService *RiskScoringService
	BlockchainService  *BlockchainService
}

func NewAppService() *AppService {

	dbService := NewDbService()
	userService := NewUserService(dbService)
	fileService := NewFileService(dbService)
	sessionService := NewSessionService(dbService)
	authService := NewAuthService(userService, sessionService)
	s3Service := NewS3Service()
	emailService := NewEmailService()
	cronService := NewCronService()
	redisService := NewRedisService()
	riskScoringService := NewRiskScoringService(redisService)
	blockchainService := NewBlockchainService()

	if err := fileService.SyncAllUserFileCounts(); err != nil {
		log.Fatalf("failed to sync user file counts: %v", err)
	}

	_ = redisService.DeleteByPrefix("user_summary:")

	return &AppService{
		DbService:          dbService,
		FileService:        fileService,
		UserService:        userService,
		SessionService:     sessionService,
		AuthService:        authService,
		S3Service:          s3Service,
		EmailService:       emailService,
		CronService:        cronService,
		RedisService:       redisService,
		RiskScoringService: riskScoringService,
		BlockchainService:  blockchainService,
	}
}
