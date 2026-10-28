package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"app/internal/models"
	"app/internal/repository"

	"github.com/SherClockHolmes/webpush-go"
)

type PushPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	URL   string `json:"url,omitempty"`
	Tag   string `json:"tag,omitempty"`
}

type PushService interface {
	SendNotification(sub *models.PushSubscription, payload PushPayload) error
	BroadcastToStore(ctx context.Context, storeID uint, payload PushPayload) error
}

type pushService struct {
	vapidPublicKey  string
	vapidPrivateKey string
	subscriberEmail string
	settingsRepo    repository.SettingsRepository
}

func NewPushService(vapidPublicKey, vapidPrivateKey, subscriberEmail string, settingsRepo repository.SettingsRepository) PushService {
	if subscriberEmail == "" {
		subscriberEmail = "admin@antigravity.local"
	}
	return &pushService{
		vapidPublicKey:  vapidPublicKey,
		vapidPrivateKey: vapidPrivateKey,
		subscriberEmail: subscriberEmail,
		settingsRepo:    settingsRepo,
	}
}

func (s *pushService) SendNotification(sub *models.PushSubscription, payload PushPayload) error {
	if s.vapidPublicKey == "" || s.vapidPrivateKey == "" {
		log.Printf("[WEBPUSH] Skipped: VAPID keys not configured (endpoint: %s)", sub.Endpoint)
		return nil
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal push payload: %w", err)
	}

	subscription := &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: sub.P256dh,
			Auth:   sub.Auth,
		},
	}

	res, err := webpush.SendNotification(payloadBytes, subscription, &webpush.Options{
		Subscriber:      s.subscriberEmail,
		VAPIDPublicKey:  s.vapidPublicKey,
		VAPIDPrivateKey: s.vapidPrivateKey,
		TTL:             60,
	})
	if err != nil {
		return fmt.Errorf("webpush send error: %w", err)
	}
	defer res.Body.Close()

	// RFC 8030 / 8292: 410 Gone or 404 Not Found indicates subscription expired or revoked
	if res.StatusCode == http.StatusGone || res.StatusCode == http.StatusNotFound {
		log.Printf("[WEBPUSH] Subscription expired/revoked (status %d). Pruning endpoint %s", res.StatusCode, sub.Endpoint)
		if s.settingsRepo != nil {
			_ = s.settingsRepo.DeletePushSubscription(sub.Endpoint)
		}
	} else if res.StatusCode >= 400 {
		return fmt.Errorf("webpush server returned status code %d", res.StatusCode)
	}

	return nil
}

func (s *pushService) BroadcastToStore(ctx context.Context, storeID uint, payload PushPayload) error {
	if s.settingsRepo == nil {
		return nil
	}
	subs, err := s.settingsRepo.GetPushSubscriptions(storeID)
	if err != nil {
		return fmt.Errorf("failed to fetch push subscriptions for store %d: %w", storeID, err)
	}

	for _, sub := range subs {
		subCopy := sub
		if err := s.SendNotification(&subCopy, payload); err != nil {
			log.Printf("[WEBPUSH ERROR] failed to deliver to sub ID %d: %v", subCopy.ID, err)
		}
	}
	return nil
}
