package services

import (
	m "github.com/aj-2000/shc-backend/models"
	"github.com/google/uuid"
)

type UserService struct {
	dbService *DbService
}

func NewUserService(dbService *DbService) *UserService {
	return &UserService{
		dbService: dbService,
	}
}

func (us *UserService) CreateUser(user *m.User) (*m.User, error) {
	user.ID = uuid.New()

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
	if err := us.dbService.Db.Where("id = ?", id).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (us *UserService) UpdateAUser(user *m.User) (*m.User, error) {
	if err := us.dbService.Db.Model(&user).Updates(&user).Error; err != nil {
		return nil, err
	}

	return user, nil
}
