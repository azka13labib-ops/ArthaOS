package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"strings"

	"app/internal/services"

	"github.com/gofiber/fiber/v3"
)

type WhatsAppHandler struct {
	nlpService    services.NLPService
	webhookSecret string
}

func NewWhatsAppHandler(nlpService services.NLPService, webhookSecret string) *WhatsAppHandler {
	return &WhatsAppHandler{nlpService, webhookSecret}
}

func (h *WhatsAppHandler) LinkAccount(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	return c.JSON(fiber.Map{
		"store_id": storeID,
		"status":   "pending",
		"qr_url":   "https://dummyimage.com/200x200/000/fff&text=Scan+Me",
	})
}

func (h *WhatsAppHandler) verifyHMACSignature(body []byte, signatureHeader string) bool {
	if h.webhookSecret == "" {

		log.Println("[WARN] WEBHOOK_SECRET not set — skipping webhook signature verification")
		return true
	}

	parts := strings.SplitN(signatureHeader, "=", 2)
	if len(parts) != 2 || parts[0] != "sha256" {
		return false
	}
	expectedSig := parts[1]

	mac := hmac.New(sha256.New, []byte(h.webhookSecret))
	mac.Write(body)
	computedSig := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(computedSig), []byte(expectedSig))
}

func (h *WhatsAppHandler) Webhook(c fiber.Ctx) error {

	rawBody := c.Body()
	signature := c.Get("X-Hub-Signature-256")

	if !h.verifyHMACSignature(rawBody, signature) {
		log.Printf("[SECURITY] Webhook signature mismatch from IP: %s", c.IP())
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid webhook signature",
			"code":  "INVALID_SIGNATURE",
		})
	}

	var payload map[string]interface{}
	if err := c.Bind().Body(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid webhook payload", "code": "INVALID_BODY"})
	}

	if message, ok := payload["message"].(string); ok {
		intent, entities, _ := h.nlpService.ParseMessage(message)
		log.Printf("[WEBHOOK] Intent: %s, Entities: %+v", intent, entities)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "received"})
}
