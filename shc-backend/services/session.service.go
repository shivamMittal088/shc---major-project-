package services

import (
	"time"

	"github.com/google/uuid"

	m "github.com/aj-2000/shc-backend/models"
	"github.com/aj-2000/shc-backend/utils"
)

type SessionService struct {
	dbService         *DbService
	SessionExpiration time.Duration
	MaxSessions       int
}

func NewSessionService(dbService *DbService) *SessionService {
	return &SessionService{
		dbService:         dbService,
		SessionExpiration: 7 * 24 * time.Hour,
		MaxSessions:       25,
	}
}

func (ss *SessionService) FindSessionById(sessionId uuid.UUID) (*m.Session, error) {
	var session m.Session
	if err := ss.dbService.Db.Where("id = ?", sessionId).First(&session).Error; err != nil {
		return nil, err
	}
	return &session, nil
}

func (ss *SessionService) CreateSession(userId uuid.UUID) (session *m.Session, err error) {
	sessions, err := ss.FindAllSessions(userId)

	if err != nil {
		return nil, err
	}

	if len(sessions) >= ss.MaxSessions {
		if err = ss.DeleteSession(sessions[0].ID); err != nil {
			return nil, err
		}
	}

	sessionKey := utils.GenerateRandomString(32)

	session = &m.Session{
		UserId:     userId,
		SessionKey: sessionKey,
		ExpiresAt:  time.Now().Add(ss.SessionExpiration),
	}

	if err = ss.dbService.Db.Create(&session).Error; err != nil {
		return nil, err
	}

	//To use the sessionKey as a cookie (RefreshToken), we need to set it to the unhashed version
	session.SessionKey = sessionKey

	return session, nil
}

func (ss *SessionService) DeleteSession(sessionId uuid.UUID) error {
	if err := ss.dbService.Db.Where("id = ?", sessionId).Delete(&m.Session{}).Error; err != nil {
		return err
	}
	return nil
}

func (ss *SessionService) FindAllSessions(userId uuid.UUID) ([]m.Session, error) {
	var sessions []m.Session

	err := ss.dbService.Db.Where("user_id = ?", userId).Order("created_at").Find(&sessions).Error

	if err != nil {
		return nil, err
	}

	return sessions, nil
}
