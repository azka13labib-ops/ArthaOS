package repository

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"app/internal/models"

	"gorm.io/gorm"
)

type SettingsRepository interface {
	// Store settings
	GetSettings(storeID uint) (*models.StoreSettings, error)
	UpsertSettings(settings *models.StoreSettings) error
	UpdateStoreInfo(storeID uint, name, address string) error
	DeleteStore(storeID uint) error

	// User profile
	UpdateUserProfile(userID uint, name string) error
	DeactivateUser(userID uint) error

	// Invite
	CreateInvitation(storeID, invitedBy uint, email, role string) (*models.StoreInvitation, error)
	GetInvitationByToken(token string) (*models.StoreInvitation, error)
	AcceptInvitation(token string, userID uint) error
	ListInvitations(storeID uint) ([]models.StoreInvitation, error)

	// Members
	ListMembers(storeID uint) ([]MemberWithUser, error)
	RemoveMember(storeID, userID uint) error
	UpdateMemberRole(storeID, userID uint, role string) error

	// Push subscriptions
	UpsertPushSubscription(sub *models.PushSubscription) error
	GetPushSubscriptions(storeID uint) ([]models.PushSubscription, error)
	DeletePushSubscription(endpoint string) error
}

// MemberWithUser joins store_members with users for the member list response.
type MemberWithUser struct {
	ID        uint      `json:"id"`
	UserID    uint      `json:"user_id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	JoinedAt  time.Time `json:"joined_at"`
}

type settingsRepository struct {
	db *gorm.DB
}

func NewSettingsRepository(db *gorm.DB) SettingsRepository {
	return &settingsRepository{db}
}

// GetSettings returns the store's settings, creating a default row if none exists.
func (r *settingsRepository) GetSettings(storeID uint) (*models.StoreSettings, error) {
	var s models.StoreSettings
	err := r.db.Where("store_id = ?", storeID).First(&s).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		s = models.StoreSettings{StoreID: storeID}
		if createErr := r.db.Create(&s).Error; createErr != nil {
			return nil, createErr
		}
		return &s, nil
	}
	return &s, err
}

// UpsertSettings saves (or creates) the store settings row.
func (r *settingsRepository) UpsertSettings(settings *models.StoreSettings) error {
	if settings.ID == 0 {
		return r.db.Create(settings).Error
	}
	return r.db.Save(settings).Error
}

// UpdateUserProfile updates a user's display name.
func (r *settingsRepository) UpdateUserProfile(userID uint, name string) error {
	return r.db.Model(&models.User{}).Where("id = ?", userID).Update("name", name).Error
}

// CreateInvitation generates a secure token and creates a new invitation.
func (r *settingsRepository) CreateInvitation(storeID, invitedBy uint, email, role string) (*models.StoreInvitation, error) {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, err
	}

	inv := &models.StoreInvitation{
		StoreID:   storeID,
		InvitedBy: invitedBy,
		Email:     email,
		Role:      role,
		Token:     hex.EncodeToString(tokenBytes),
		ExpiresAt: time.Now().Add(72 * time.Hour),
	}
	return inv, r.db.Create(inv).Error
}

// GetInvitationByToken returns a valid, unaccepted invitation.
func (r *settingsRepository) GetInvitationByToken(token string) (*models.StoreInvitation, error) {
	var inv models.StoreInvitation
	err := r.db.Where("token = ? AND accepted_at IS NULL AND expires_at > ?", token, time.Now()).First(&inv).Error
	return &inv, err
}

// AcceptInvitation marks the invitation as accepted and adds the user as a store member.
func (r *settingsRepository) AcceptInvitation(token string, userID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var inv models.StoreInvitation
		if err := tx.Where("token = ? AND accepted_at IS NULL AND expires_at > ?", token, time.Now()).First(&inv).Error; err != nil {
			return err
		}

		now := time.Now()
		if err := tx.Model(&inv).Update("accepted_at", &now).Error; err != nil {
			return err
		}

		member := models.StoreMember{
			StoreID: inv.StoreID,
			UserID:  userID,
			Role:    inv.Role,
		}
		return tx.Create(&member).Error
	})
}

// ListInvitations returns all invitations for a store.
func (r *settingsRepository) ListInvitations(storeID uint) ([]models.StoreInvitation, error) {
	var invs []models.StoreInvitation
	err := r.db.Where("store_id = ?", storeID).Order("created_at DESC").Find(&invs).Error
	return invs, err
}

// ListMembers returns all members of a store with their user info.
func (r *settingsRepository) ListMembers(storeID uint) ([]MemberWithUser, error) {
	var members []MemberWithUser
	err := r.db.Raw(`
		SELECT sm.id, sm.user_id, u.name, u.email, sm.role, sm.created_at AS joined_at
		FROM store_members sm
		JOIN users u ON u.id = sm.user_id
		WHERE sm.store_id = ?
		ORDER BY sm.created_at ASC
	`, storeID).Scan(&members).Error
	return members, err
}

// RemoveMember removes a non-owner member from a store.
func (r *settingsRepository) RemoveMember(storeID, userID uint) error {
	return r.db.Where("store_id = ? AND user_id = ? AND role != 'owner'", storeID, userID).
		Delete(&models.StoreMember{}).Error
}

// UpdateMemberRole changes a member's role (cannot change the owner's role).
func (r *settingsRepository) UpdateMemberRole(storeID, userID uint, role string) error {
	return r.db.Model(&models.StoreMember{}).
		Where("store_id = ? AND user_id = ? AND role != 'owner'", storeID, userID).
		Update("role", role).Error
}

// UpsertPushSubscription saves a push subscription, updating if endpoint already exists.
func (r *settingsRepository) UpsertPushSubscription(sub *models.PushSubscription) error {
	var existing models.PushSubscription
	err := r.db.Where("endpoint = ?", sub.Endpoint).First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return r.db.Create(sub).Error
	}
	existing.P256dh = sub.P256dh
	existing.Auth = sub.Auth
	existing.UserID = sub.UserID
	existing.StoreID = sub.StoreID
	return r.db.Save(&existing).Error
}

// GetPushSubscriptions returns all push subscriptions for a store.
func (r *settingsRepository) GetPushSubscriptions(storeID uint) ([]models.PushSubscription, error) {
	var subs []models.PushSubscription
	err := r.db.Where("store_id = ?", storeID).Find(&subs).Error
	return subs, err
}

// DeletePushSubscription removes a push subscription by its endpoint URL.
func (r *settingsRepository) DeletePushSubscription(endpoint string) error {
	return r.db.Where("endpoint = ?", endpoint).Delete(&models.PushSubscription{}).Error
}

// UpdateStoreInfo updates store name and address in the stores table.
func (r *settingsRepository) UpdateStoreInfo(storeID uint, name, address string) error {
	updates := map[string]interface{}{}
	if name != "" {
		updates["name"] = name
	}
	if address != "" {
		updates["address"] = address
	}
	if len(updates) == 0 {
		return nil
	}
	return r.db.Model(&models.Store{}).Where("id = ?", storeID).Updates(updates).Error
}

// DeleteStore removes a store and its related memberships.
func (r *settingsRepository) DeleteStore(storeID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("store_id = ?", storeID).Delete(&models.StoreMember{}).Error; err != nil {
			return err
		}
		if err := tx.Where("store_id = ?", storeID).Delete(&models.StoreSettings{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", storeID).Delete(&models.Store{}).Error
	})
}

// DeactivateUser disables/deletes a user account.
func (r *settingsRepository) DeactivateUser(userID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", userID).Delete(&models.StoreMember{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", userID).Delete(&models.User{}).Error
	})
}
