package services

import (
	"errors"

	"app/internal/models"
	"app/internal/repository"
	jwt_helper "app/pkg/jwt"

	"golang.org/x/crypto/bcrypt"
)

type AuthService interface {
	Register(name, email, password string) (*models.User, error)
	Login(email, password, jwtSecret string) (string, error)
	GetUserByID(id uint) (*models.User, error)
}

type authService struct {
	userRepo repository.UserRepository
}

func NewAuthService(userRepo repository.UserRepository) AuthService {
	return &authService{userRepo}
}

func (s *authService) Register(name, email, password string) (*models.User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Name:         name,
		Email:        email,
		PasswordHash: string(hash),
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *authService) Login(email, password, jwtSecret string) (string, error) {
	user, err := s.userRepo.GetByEmail(email)
	if err != nil {
		return "", errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", errors.New("invalid credentials")
	}

	token, err := jwt_helper.GenerateToken(user.ID, jwtSecret)
	if err != nil {
		return "", err
	}

	return token, nil
}

func (s *authService) GetUserByID(id uint) (*models.User, error) {
	return s.userRepo.GetByID(id)
}
