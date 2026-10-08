package handlers

import (
	"app/internal/config"
	"app/internal/services"
	appvalidator "app/pkg/validator"

	"github.com/gofiber/fiber/v3"
)

type AuthHandler struct {
	authService services.AuthService
	config      config.Config
}

func NewAuthHandler(authService services.AuthService, cfg config.Config) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		config:      cfg,
	}
}

type RegisterRequest struct {
	Name     string `json:"name"     validate:"required,min=2,max=100"`
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required,min=8,max=72"`
}

func (h *AuthHandler) Register(c fiber.Ctx) error {
	var req RegisterRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
			"code":  "INVALID_BODY",
		})
	}

	if errs := appvalidator.Validate(req); errs != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error":  "Validation failed",
			"code":   "VALIDATION_ERROR",
			"fields": errs,
		})
	}

	user, err := h.authService.Register(req.Name, req.Email, req.Password)
	if err != nil {

		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "Registration failed. Email may already be in use.",
			"code":  "REGISTRATION_FAILED",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "User registered successfully",
		"user": fiber.Map{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
		},
	})
}

type LoginRequest struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required,min=1"`
}

func (h *AuthHandler) Login(c fiber.Ctx) error {
	var req LoginRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
			"code":  "INVALID_BODY",
		})
	}

	if errs := appvalidator.Validate(req); errs != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error":  "Validation failed",
			"code":   "VALIDATION_ERROR",
			"fields": errs,
		})
	}

	token, err := h.authService.Login(req.Email, req.Password, h.config.JWTSecret)
	if err != nil {

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid email or password",
			"code":  "AUTH_FAILED",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Login successful",
		"token":   token,
	})
}

func (h *AuthHandler) Me(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	userID, ok := userIDVal.(uint)
	if !ok || userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found", "code": "USER_NOT_FOUND"})
	}

	return c.JSON(fiber.Map{
		"id":    user.ID,
		"name":  user.Name,
		"email": user.Email,
	})
}
