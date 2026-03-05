package services

import (
	"time"

	m "github.com/aj-2000/shc-backend/models"
	"github.com/google/uuid"
)

type UserService struct {
	dbService           *DbService
	subscriptionService *SubscriptionService
}

func NewUserService(dbService *DbService, subscriptionService *SubscriptionService) *UserService {
	return &UserService{
		dbService:           dbService,
		subscriptionService: subscriptionService,
	}
}

func (us *UserService) CreateUser(user *m.User) (*m.User, error) {

	// TODO: if its validating or not

	currDate := time.Now()

	subscription, err := us.subscriptionService.CreateSubscription("Free", currDate.AddDate(0, 3, 0))
	if err != nil {
		return nil, err
	}

	// TODO: find a cleaner way to do this
	newUserId := uuid.New()
	subscription.UserId = newUserId
	user.Subscription = *subscription
	user.ID = newUserId

	if err := us.dbService.Db.Create(&user).Error; err != nil {
		return nil, err
	}

	return user, nil
}

func (us *UserService) FindUserByEmail(email string) (*m.User, error) {
	var user m.User
	if err := us.dbService.Db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (us *UserService) FindUserById(id uuid.UUID) (*m.User, error) {
	var user m.User
	if err := us.dbService.Db.Preload("Subscription").Where("id = ?", id).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (us *UserService) UpdateAUser(user *m.User) (*m.User, error) {
	// Omit the "Subscription" field while updating
	if err := us.dbService.Db.Model(&user).Omit("Subscription").Updates(&user).Error; err != nil {
		return nil, err
	}

	return user, nil
}
