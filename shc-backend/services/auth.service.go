package services

import (
	"errors"
	"fmt"
	"math/rand"
	"os"
	"time"

	m "github.com/aj-2000/shc-backend/models"
	"github.com/aj-2000/shc-backend/utils"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type AccessTokenClaim struct {
	jwt.RegisteredClaims
	ID        uuid.UUID
	Email     string
	Name      string
	TokenType string
}

type RefreshTokenClaim struct {
	jwt.RegisteredClaims
	ID        uuid.UUID
	SessionId uuid.UUID
	Email     string
	Name      string
	Password  string
	TokenType string
}

type OtpTable struct {
	Email string `json:"email"`
	Otp   int    `json:"otp"`
}

type AuthService struct {
	otpToUserMap            map[string]OtpTable
	JwtSecretKey            string
	JwtAccessTokenExpiresIn time.Duration
	userService             *UserService
	sessoinService          *SessionService
}

type Tokens struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

func NewAuthService(userService *UserService, sessoinService *SessionService) *AuthService {
	return &AuthService{
		otpToUserMap: make(map[string]OtpTable),
		JwtSecretKey: os.Getenv("JWT_SECRET_KEY"),
		// TODO: change this to 15 minutes
		JwtAccessTokenExpiresIn: 1500 * time.Minute,
		userService:             userService,
		sessoinService:          sessoinService,
	}
}

func (a *AuthService) generateAccessToken(id uuid.UUID, name string, email string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256,
		AccessTokenClaim{
			ID:        id,
			Name:      name,
			Email:     email,
			TokenType: "access.token",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(a.JwtAccessTokenExpiresIn)),
				Issuer:    "shc.auth.service",
				IssuedAt:  jwt.NewNumericDate(time.Now()),
			},
		})
	tokenString, err := token.SignedString([]byte(a.JwtSecretKey))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func (a *AuthService) VerifyAccessToken(token string) (*AccessTokenClaim, error) {
	var claim AccessTokenClaim
	parsedToken, err := jwt.ParseWithClaims(token, &claim, func(token *jwt.Token) (interface{}, error) {
		return []byte(a.JwtSecretKey), nil
	})

	if err != nil {
		return nil, errors.New("invalid token")
	}

	if !parsedToken.Valid {
		return nil, errors.New("invalid token")
	}

	if claim.TokenType != "access.token" {
		return nil, errors.New("invalid token")
	}

	u, err := a.userService.FindUserById(claim.ID)

	if err != nil {
		return nil, errors.New("invalid token")
	}

	// Redundant
	claim.Name = u.Name
	claim.Email = u.Email

	return &claim, nil
}

func (a *AuthService) generateRefreshToken(id uuid.UUID, name string, email string, password string, session *m.Session) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256,
		RefreshTokenClaim{
			ID:        id,
			Name:      name,
			Email:     email,
			Password:  password,
			SessionId: session.ID,
			TokenType: "refresh.token",
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(session.ExpiresAt),
				Issuer:    "shc.auth.service",
				IssuedAt:  jwt.NewNumericDate(time.Now()),
			},
		})
	tokenString, err := token.SignedString([]byte(a.JwtSecretKey))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func (a *AuthService) GenerateTokens(userId uuid.UUID, userName string, userEmail string) (*Tokens, error) {
	session, err := a.sessoinService.CreateSession(userId)

	if err != nil {
		return nil, err
	}

	accessToken, err := a.generateAccessToken(userId, userName, userEmail)

	if err != nil {
		return nil, err
	}

	refreshToken, err := a.generateRefreshToken(userId, userName, userEmail, session.SessionKey, session)

	if err != nil {
		return nil, err
	}

	return &Tokens{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (a *AuthService) VerifyRefreshToken(token string) (*RefreshTokenClaim, error) {
	var claim RefreshTokenClaim
	parsedToken, err := jwt.ParseWithClaims(token, &claim, func(token *jwt.Token) (interface{}, error) {
		return []byte(a.JwtSecretKey), nil
	})

	if err != nil {
		return nil, errors.New("invalid token")
	}

	if !parsedToken.Valid {
		return nil, errors.New("invalid token")
	}

	if claim.TokenType != "refresh.token" || claim.Password == "" {
		return nil, errors.New("invalid token")
	}

	session, err := a.sessoinService.FindSessionById(claim.SessionId)

	if err != nil {
		return nil, errors.New("invalid token")
	}

	if err = utils.VerifyPassword(session.SessionKey, claim.Password); err != nil {
		return nil, errors.New("invalid token")
	}

	// TODO: check if checking user is necessary or not
	_, err = a.userService.FindUserById(claim.ID)

	if err != nil {
		return nil, errors.New("invalid token")
	}

	return &claim, nil
}

func (a *AuthService) GenerateOtp(email string) int {
	min := 100000
	max := 999999
	otp := rand.Intn(max-min+1) + min
	a.otpToUserMap[email] = OtpTable{Email: email, Otp: otp}
	return otp
}

func (a *AuthService) VerifyOtp(email string, otp int) error {
	if _, ok := a.otpToUserMap[email]; !ok {
		return errors.New("OTP not found")
	}

	if a.otpToUserMap[email].Otp != otp {
		return errors.New("OTP not matched")
	}

	delete(a.otpToUserMap, email)
	return nil
}

func (a *AuthService) PrintOtpToUserMap() {
	for key, value := range a.otpToUserMap {
		fmt.Println("Key:", key)
		fmt.Println("Value:", value)
		fmt.Println("----------")
	}
}
