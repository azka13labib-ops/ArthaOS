package handlers

import (
	"strings"

	"app/internal/services"
	"github.com/gofiber/fiber/v3"
)

type SocialHandler struct {
	socialService services.SocialService
}

func NewSocialHandler(socialService services.SocialService) *SocialHandler {
	return &SocialHandler{socialService: socialService}
}

func (h *SocialHandler) GetTemplates(c fiber.Ctx) error {
	templates := h.socialService.GetTemplates()
	return c.JSON(fiber.Map{
		"templates": templates,
		"count":     len(templates),
	})
}

func (h *SocialHandler) GetQuota(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	quota, err := h.socialService.GetQuota(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(quota)
}

// GenerateCaption handles POST /api/v1/stores/:storeId/social/captions/generate
func (h *SocialHandler) GenerateCaption(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	userID, _ := c.Locals("user_id").(uint)

	var req services.GenerateCaptionRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Format data request tidak valid",
			"code":  "INVALID_BODY",
		})
	}

	// Validate goal & tone defaults
	if strings.TrimSpace(req.Goal) == "" {
		req.Goal = "promo"
	}
	if strings.TrimSpace(req.Tone) == "" {
		req.Tone = "santai"
	}
	if len(req.ExtraNote) > 1000 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Catatan tambahan maksimal 1.000 karakter",
			"code":  "NOTE_TOO_LONG",
		})
	}

	resp, err := h.socialService.GenerateCaption(c.Context(), storeID, userID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
			"code":  "GENERATION_FAILED",
		})
	}

	return c.JSON(resp)
}

// RenderPoster handles POST /api/v1/stores/:storeId/social/posters/render
func (h *SocialHandler) RenderPoster(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req services.RenderPosterRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Format data request render poster tidak valid",
			"code":  "INVALID_BODY",
		})
	}

	if strings.TrimSpace(req.TemplateID) == "" {
		req.TemplateID = "promo-deal"
	}
	if strings.TrimSpace(req.Headline) == "" {
		req.Headline = "Promo Spesial Hari Ini"
	}

	resp, err := h.socialService.RenderPoster(c.Context(), storeID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
			"code":  "RENDER_FAILED",
		})
	}

	return c.JSON(resp)
}

// SetBYOKKey handles POST /api/v1/stores/:storeId/social/byok (Owner only)
func (h *SocialHandler) SetBYOKKey(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		APIKey   string `json:"api_key"`
		Provider string `json:"provider"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Format payload tidak valid",
		})
	}

	if err := h.socialService.SetBYOKKey(storeID, req.APIKey, req.Provider); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Konfigurasi API Key kustom (BYOK) berhasil disimpan",
		"status":  "success",
	})
}
