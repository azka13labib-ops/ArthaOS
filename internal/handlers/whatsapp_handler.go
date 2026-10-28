package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	"app/internal/services"

	"github.com/gofiber/fiber/v3"
)

type WhatsAppHandler struct {
	nlpService    services.NLPService
	webhookSecret string
	seenEvents    sync.Map // key: string (dedupKey), value: time.Time
}

func NewWhatsAppHandler(nlpService services.NLPService, webhookSecret string) *WhatsAppHandler {
	h := &WhatsAppHandler{
		nlpService:    nlpService,
		webhookSecret: webhookSecret,
	}
	return h
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
		log.Println("[SECURITY] WEBHOOK_SECRET not set — rejecting webhook signature verification")
		return false
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
	if h.webhookSecret == "" {
		log.Printf("[SECURITY] Webhook rejected: WEBHOOK_SECRET is not configured from IP: %s", c.IP())
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Webhook secret is not configured",
			"code":  "WEBHOOK_SECRET_NOT_CONFIGURED",
		})
	}

	rawBody := c.Body()
	signature := c.Get("X-Hub-Signature-256")

	if !h.verifyHMACSignature(rawBody, signature) {
		log.Printf("[SECURITY] Webhook signature mismatch from IP: %s", c.IP())
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid webhook signature",
			"code":  "INVALID_SIGNATURE",
		})
	}

	// 1. Timestamp Freshness Check (Header or Payload)
	now := time.Now()
	timestampHeader := c.Get("X-Hub-Timestamp")
	if timestampHeader != "" {
		if tsInt, err := strconv.ParseInt(timestampHeader, 10, 64); err == nil {
			tEvent := time.Unix(tsInt, 0)
			diff := now.Sub(tEvent)
			if diff > 5*time.Minute || diff < -1*time.Minute {
				log.Printf("[SECURITY] Webhook timestamp expired: diff=%v from IP: %s", diff, c.IP())
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Webhook timestamp expired or out of bounds",
					"code":  "TIMESTAMP_OUT_OF_BOUNDS",
				})
			}
		}
	}

	var payload map[string]interface{}
	if err := c.Bind().Body(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid webhook payload", "code": "INVALID_BODY"})
	}

	// Payload-level timestamp check if available
	if tsVal, ok := payload["timestamp"]; ok {
		var tsInt int64
		switch v := tsVal.(type) {
		case float64:
			tsInt = int64(v)
		case int64:
			tsInt = v
		case string:
			tsInt, _ = strconv.ParseInt(v, 10, 64)
		}
		if tsInt > 0 {
			// In case timestamp is in milliseconds
			if tsInt > 1e11 {
				tsInt = tsInt / 1000
			}
			tEvent := time.Unix(tsInt, 0)
			diff := now.Sub(tEvent)
			if diff > 5*time.Minute || diff < -1*time.Minute {
				log.Printf("[SECURITY] Webhook payload timestamp expired: diff=%v from IP: %s", diff, c.IP())
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Webhook payload timestamp expired or out of bounds",
					"code":  "TIMESTAMP_OUT_OF_BOUNDS",
				})
			}
		}
	}

	// 2. Replay Protection: Deduplication via event ID or signature hash
	var dedupKey string
	if eventID, ok := payload["id"].(string); ok && eventID != "" {
		dedupKey = "id:" + eventID
	} else if msgID, ok := payload["message_id"].(string); ok && msgID != "" {
		dedupKey = "mid:" + msgID
	} else {
		// Fallback: hash the signature
		sigHash := sha256.Sum256([]byte(signature))
		dedupKey = "sig:" + hex.EncodeToString(sigHash[:])
	}

	if prevTimeVal, found := h.seenEvents.Load(dedupKey); found {
		if prevTime, ok := prevTimeVal.(time.Time); ok && now.Sub(prevTime) < 10*time.Minute {
			log.Printf("[SECURITY] Webhook replay detected: key=%s from IP: %s", dedupKey, c.IP())
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "Duplicate webhook event (replay detected)",
				"code":  "REPLAY_DETECTED",
			})
		}
	}

	h.seenEvents.Store(dedupKey, now)

	// Clean old events periodically (every 50 requests roughly, or prune entries older than 15 min)
	go h.cleanupSeenEvents(now)

	if message, ok := payload["message"].(string); ok {
		intent, entities, _ := h.nlpService.ParseMessage(message)
		log.Printf("[WEBHOOK] Intent: %s, Entities: %+v", intent, entities)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "received"})
}

func (h *WhatsAppHandler) cleanupSeenEvents(now time.Time) {
	h.seenEvents.Range(func(key, val interface{}) bool {
		if t, ok := val.(time.Time); ok && now.Sub(t) > 15*time.Minute {
			h.seenEvents.Delete(key)
		}
		return true
	})
}
