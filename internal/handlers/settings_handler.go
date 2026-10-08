package handlers

import (
	"strconv"
	"time"

	"app/internal/config"
	"app/internal/models"
	"app/internal/repository"

	"github.com/gofiber/fiber/v3"
)

type SettingsHandler struct {
	settingsRepo repository.SettingsRepository
	cfg          config.Config
}

func NewSettingsHandler(settingsRepo repository.SettingsRepository, cfg config.Config) *SettingsHandler {
	return &SettingsHandler{settingsRepo: settingsRepo, cfg: cfg}
}

// ─────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────

type UpdateProfileRequest struct {
	Name string `json:"name" validate:"required,min=2,max=100"`
}

// UpdateProfile godoc — PATCH /api/v1/settings/profile
func (h *SettingsHandler) UpdateProfile(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok || userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req UpdateProfileRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.settingsRepo.UpdateUserProfile(userID, req.Name); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update profile"})
	}

	return c.JSON(fiber.Map{"message": "Profile updated"})
}

// ─────────────────────────────────────────────
// STORE SETTINGS (GET / PUT)
// ─────────────────────────────────────────────

// GetSettings godoc — GET /api/v1/stores/:storeId/settings
func (h *SettingsHandler) GetSettings(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	s, err := h.settingsRepo.GetSettings(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch settings"})
	}
	return c.JSON(s)
}

type UpdateStoreInfoRequest struct {
	Name    string `json:"name"`
	Address string `json:"address"`
	LogoURL string `json:"logo_url"`
}

// UpdateStoreInfo godoc — PATCH /api/v1/stores/:storeId/settings/store-info
func (h *SettingsHandler) UpdateStoreInfo(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req UpdateStoreInfoRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Name != "" || req.Address != "" {
		if err := h.settingsRepo.UpdateStoreInfo(storeID, req.Name, req.Address); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update store info"})
		}
	}

	s, err := h.settingsRepo.GetSettings(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch settings"})
	}
	if req.LogoURL != "" {
		s.LogoURL = req.LogoURL
		if err := h.settingsRepo.UpsertSettings(s); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save settings"})
		}
	}
	return c.JSON(fiber.Map{"message": "Store info updated"})
}

// ─────────────────────────────────────────────
// FEATURE FLAGS
// ─────────────────────────────────────────────

type UpdateFeaturesRequest struct {
	FeatureFinancialAnalysis *bool `json:"feature_financial_analysis"`
	FeatureCustomBranding    *bool `json:"feature_custom_branding"`
	FeatureCRM               *bool `json:"feature_crm"`
	FeatureRemoveWatermark   *bool `json:"feature_remove_watermark"`
	FeatureTaxCalculation    *bool `json:"feature_tax_calculation"`
	FeatureMultiBranch       *bool `json:"feature_multi_branch"`
	FeatureLogoOnReceipt     *bool `json:"feature_logo_on_receipt"`
	FeatureCustomerMgmt      *bool `json:"feature_customer_mgmt"`
	FeatureShiftMgmt         *bool `json:"feature_shift_mgmt"`
	FeatureAdvancedStock     *bool `json:"feature_advanced_stock"`
	FeatureSmartNotif        *bool `json:"feature_smart_notif"`
	FeatureAdvancedPromo     *bool `json:"feature_advanced_promo"`
}

// UpdateFeatures godoc — PATCH /api/v1/stores/:storeId/settings/features
func (h *SettingsHandler) UpdateFeatures(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req UpdateFeaturesRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	s, err := h.settingsRepo.GetSettings(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch settings"})
	}

	if req.FeatureFinancialAnalysis != nil {
		s.FeatureFinancialAnalysis = *req.FeatureFinancialAnalysis
	}
	if req.FeatureCustomBranding != nil {
		s.FeatureCustomBranding = *req.FeatureCustomBranding
	}
	if req.FeatureCRM != nil {
		s.FeatureCRM = *req.FeatureCRM
	}
	if req.FeatureRemoveWatermark != nil {
		s.FeatureRemoveWatermark = *req.FeatureRemoveWatermark
	}
	if req.FeatureTaxCalculation != nil {
		s.FeatureTaxCalculation = *req.FeatureTaxCalculation
	}
	if req.FeatureMultiBranch != nil {
		s.FeatureMultiBranch = *req.FeatureMultiBranch
	}
	if req.FeatureLogoOnReceipt != nil {
		s.FeatureLogoOnReceipt = *req.FeatureLogoOnReceipt
	}
	if req.FeatureCustomerMgmt != nil {
		s.FeatureCustomerMgmt = *req.FeatureCustomerMgmt
	}
	if req.FeatureShiftMgmt != nil {
		s.FeatureShiftMgmt = *req.FeatureShiftMgmt
	}
	if req.FeatureAdvancedStock != nil {
		s.FeatureAdvancedStock = *req.FeatureAdvancedStock
	}
	if req.FeatureSmartNotif != nil {
		s.FeatureSmartNotif = *req.FeatureSmartNotif
	}
	if req.FeatureAdvancedPromo != nil {
		s.FeatureAdvancedPromo = *req.FeatureAdvancedPromo
	}

	if err := h.settingsRepo.UpsertSettings(s); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save features"})
	}
	return c.JSON(fiber.Map{"message": "Features updated", "settings": s})
}

// ─────────────────────────────────────────────
// NOTIFICATION SETTINGS
// ─────────────────────────────────────────────

type UpdateNotifRequest struct {
	NotifLowStock           *bool  `json:"notif_low_stock"`
	NotifExpiredStock       *bool  `json:"notif_expired_stock"`
	NotifDueBill            *bool  `json:"notif_due_bill"`
	NotifHighTransaction    *bool  `json:"notif_high_transaction"`
	NotifHighTransactionAmt *int64 `json:"notif_high_transaction_amt"`
	NotifHighVoid           *bool  `json:"notif_high_void"`
	NotifHighVoidAmt        *int64 `json:"notif_high_void_amt"`
}

// UpdateNotifications godoc — PATCH /api/v1/stores/:storeId/settings/notifications
func (h *SettingsHandler) UpdateNotifications(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req UpdateNotifRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	s, err := h.settingsRepo.GetSettings(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch settings"})
	}

	if req.NotifLowStock != nil {
		s.NotifLowStock = *req.NotifLowStock
	}
	if req.NotifExpiredStock != nil {
		s.NotifExpiredStock = *req.NotifExpiredStock
	}
	if req.NotifDueBill != nil {
		s.NotifDueBill = *req.NotifDueBill
	}
	if req.NotifHighTransaction != nil {
		s.NotifHighTransaction = *req.NotifHighTransaction
	}
	if req.NotifHighTransactionAmt != nil {
		s.NotifHighTransactionAmt = *req.NotifHighTransactionAmt
	}
	if req.NotifHighVoid != nil {
		s.NotifHighVoid = *req.NotifHighVoid
	}
	if req.NotifHighVoidAmt != nil {
		s.NotifHighVoidAmt = *req.NotifHighVoidAmt
	}

	if err := h.settingsRepo.UpsertSettings(s); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save notifications"})
	}
	return c.JSON(fiber.Map{"message": "Notification settings updated", "settings": s})
}

// ─────────────────────────────────────────────
// DIGITAL MENU
// ─────────────────────────────────────────────

type UpdateMenuRequest struct {
	MenuSlug        *string `json:"menu_slug"`
	MenuPublished   *bool   `json:"menu_published"`
	MenuWANumber    *string `json:"menu_wa_number"`
	MenuInstagram   *string `json:"menu_instagram"`
	MenuGrabFood    *string `json:"menu_grabfood"`
	MenuGoFood      *string `json:"menu_gofood"`
	MenuShopeeFood  *string `json:"menu_shopeefood"`
	MenuDelivery    *bool   `json:"menu_delivery"`
	MenuPickup      *bool   `json:"menu_pickup"`
	MenuReservation *bool   `json:"menu_reservation"`
	MenuWelcomeMsg  *string `json:"menu_welcome_msg"`
	MenuFooterMsg   *string `json:"menu_footer_msg"`
	// Operating hours JSON string
	OperatingHoursJSON *string `json:"operating_hours_json"`
}

// UpdateMenuSettings godoc — PATCH /api/v1/stores/:storeId/settings/menu
func (h *SettingsHandler) UpdateMenuSettings(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req UpdateMenuRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	s, err := h.settingsRepo.GetSettings(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch settings"})
	}

	if req.MenuSlug != nil {
		s.MenuSlug = *req.MenuSlug
	}
	if req.MenuPublished != nil {
		s.MenuPublished = *req.MenuPublished
	}
	if req.MenuWANumber != nil {
		s.MenuWANumber = *req.MenuWANumber
	}
	if req.MenuInstagram != nil {
		s.MenuInstagram = *req.MenuInstagram
	}
	if req.MenuGrabFood != nil {
		s.MenuGrabFood = *req.MenuGrabFood
	}
	if req.MenuGoFood != nil {
		s.MenuGoFood = *req.MenuGoFood
	}
	if req.MenuShopeeFood != nil {
		s.MenuShopeeFood = *req.MenuShopeeFood
	}
	if req.MenuDelivery != nil {
		s.MenuDelivery = *req.MenuDelivery
	}
	if req.MenuPickup != nil {
		s.MenuPickup = *req.MenuPickup
	}
	if req.MenuReservation != nil {
		s.MenuReservation = *req.MenuReservation
	}
	if req.MenuWelcomeMsg != nil {
		s.MenuWelcomeMsg = *req.MenuWelcomeMsg
	}
	if req.MenuFooterMsg != nil {
		s.MenuFooterMsg = *req.MenuFooterMsg
	}
	if req.OperatingHoursJSON != nil {
		s.OperatingHoursJSON = *req.OperatingHoursJSON
	}

	if err := h.settingsRepo.UpsertSettings(s); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save menu settings"})
	}
	return c.JSON(fiber.Map{"message": "Menu settings updated", "settings": s})
}

// ─────────────────────────────────────────────
// LEASE CONTRACT
// ─────────────────────────────────────────────

type UpdateLeaseRequest struct {
	LeaseStartDate    *string  `json:"lease_start_date"`
	LeaseEndDate      *string  `json:"lease_end_date"`
	LeaseMonthlyCost  *int64   `json:"lease_monthly_cost"`
	LeaseInterestRate *float64 `json:"lease_interest_rate"`
}

// UpdateLease godoc — PATCH /api/v1/stores/:storeId/settings/lease
func (h *SettingsHandler) UpdateLease(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req UpdateLeaseRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	s, err := h.settingsRepo.GetSettings(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch settings"})
	}

	if req.LeaseStartDate != nil {
		t, err := time.Parse("2006-01-02", *req.LeaseStartDate)
		if err == nil {
			s.LeaseStartDate = &t
		}
	}
	if req.LeaseEndDate != nil {
		t, err := time.Parse("2006-01-02", *req.LeaseEndDate)
		if err == nil {
			s.LeaseEndDate = &t
		}
	}
	if req.LeaseMonthlyCost != nil {
		s.LeaseMonthlyCost = *req.LeaseMonthlyCost
	}
	if req.LeaseInterestRate != nil {
		s.LeaseInterestRate = *req.LeaseInterestRate
	}

	if err := h.settingsRepo.UpsertSettings(s); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save lease"})
	}
	return c.JSON(fiber.Map{"message": "Lease contract updated", "settings": s})
}

// ─────────────────────────────────────────────
// MEMBERS & INVITATIONS
// ─────────────────────────────────────────────

// ListMembers godoc — GET /api/v1/stores/:storeId/settings/members
func (h *SettingsHandler) ListMembers(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	members, err := h.settingsRepo.ListMembers(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch members"})
	}
	invitations, err := h.settingsRepo.ListInvitations(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch invitations"})
	}

	return c.JSON(fiber.Map{
		"members":     members,
		"invitations": invitations,
	})
}

type InviteMemberRequest struct {
	Email string `json:"email" validate:"required,email"`
	Role  string `json:"role"  validate:"required,oneof=manager cashier"`
}

// InviteMember godoc — POST /api/v1/stores/:storeId/settings/members/invite
func (h *SettingsHandler) InviteMember(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID, _ := c.Locals("user_id").(uint)

	var req InviteMemberRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	inv, err := h.settingsRepo.CreateInvitation(storeID, userID, req.Email, req.Role)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create invitation"})
	}

	inviteLink := h.cfg.AppBaseURL + "/register?invite=" + inv.Token
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":    "Invitation created",
		"invite_url": inviteLink,
		"token":      inv.Token,
		"expires_at": inv.ExpiresAt,
	})
}

// RemoveMember godoc — DELETE /api/v1/stores/:storeId/settings/members/:userId
func (h *SettingsHandler) RemoveMember(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	uidStr := c.Params("userId")
	uidParsed, e := strconv.ParseUint(uidStr, 10, 64)
	if e != nil || uidParsed == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}
	uid := uint(uidParsed)

	if e := h.settingsRepo.RemoveMember(storeID, uid); e != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to remove member"})
	}
	return c.JSON(fiber.Map{"message": "Member removed"})
}

type UpdateRoleRequest struct {
	Role string `json:"role" validate:"required,oneof=manager cashier"`
}

// UpdateMemberRole godoc — PATCH /api/v1/stores/:storeId/settings/members/:userId/role
func (h *SettingsHandler) UpdateMemberRole(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	uidStr2 := c.Params("userId")
	uidParsed2, e2 := strconv.ParseUint(uidStr2, 10, 64)
	if e2 != nil || uidParsed2 == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}
	uid := uint(uidParsed2)

	var req UpdateRoleRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.settingsRepo.UpdateMemberRole(storeID, uid, req.Role); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update role"})
	}
	return c.JSON(fiber.Map{"message": "Role updated"})
}

// ─────────────────────────────────────────────
// ACCEPT INVITATION (public, used during register)
// ─────────────────────────────────────────────

// GetInvitation godoc — GET /api/v1/invitations/:token
func (h *SettingsHandler) GetInvitation(c fiber.Ctx) error {
	token := c.Params("token")
	inv, err := h.settingsRepo.GetInvitationByToken(token)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Invitation not found or expired"})
	}
	return c.JSON(fiber.Map{
		"email":      inv.Email,
		"role":       inv.Role,
		"store_id":   inv.StoreID,
		"expires_at": inv.ExpiresAt,
	})
}

// AcceptInvitation godoc — POST /api/v1/invitations/:token/accept
func (h *SettingsHandler) AcceptInvitation(c fiber.Ctx) error {
	token := c.Params("token")
	userID, ok := c.Locals("user_id").(uint)
	if !ok || userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if err := h.settingsRepo.AcceptInvitation(token, userID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Failed to accept invitation: " + err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Invitation accepted"})
}

// ─────────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────────

// GetVAPIDPublicKey godoc — GET /api/v1/push/vapid-public-key
func (h *SettingsHandler) GetVAPIDPublicKey(c fiber.Ctx) error {
	return c.JSON(fiber.Map{"public_key": h.cfg.VAPIDPublicKey})
}

type PushSubscribeRequest struct {
	Endpoint string `json:"endpoint" validate:"required"`
	P256dh   string `json:"p256dh"   validate:"required"`
	Auth     string `json:"auth"     validate:"required"`
}

// SubscribePush godoc — POST /api/v1/stores/:storeId/settings/push/subscribe
func (h *SettingsHandler) SubscribePush(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	userID, _ := c.Locals("user_id").(uint)

	var req PushSubscribeRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	sub := &models.PushSubscription{
		UserID:   userID,
		StoreID:  storeID,
		Endpoint: req.Endpoint,
		P256dh:   req.P256dh,
		Auth:     req.Auth,
	}

	if err := h.settingsRepo.UpsertPushSubscription(sub); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save subscription"})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "Push subscription saved"})
}

// UnsubscribePush godoc — POST /api/v1/stores/:storeId/settings/push/unsubscribe
func (h *SettingsHandler) UnsubscribePush(c fiber.Ctx) error {
	var req struct {
		Endpoint string `json:"endpoint"`
	}
	if err := c.Bind().Body(&req); err != nil || req.Endpoint == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "endpoint required"})
	}

	if err := h.settingsRepo.DeletePushSubscription(req.Endpoint); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to remove subscription"})
	}
	return c.JSON(fiber.Map{"message": "Unsubscribed"})
}

// DeleteStore godoc — DELETE /api/v1/stores/:storeId/settings/store
func (h *SettingsHandler) DeleteStore(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if err := h.settingsRepo.DeleteStore(storeID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete store"})
	}
	return c.JSON(fiber.Map{"message": "Store deleted successfully"})
}

// DeactivateAccount godoc — POST /api/v1/settings/deactivate
func (h *SettingsHandler) DeactivateAccount(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok || userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if err := h.settingsRepo.DeactivateUser(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to deactivate account"})
	}
	return c.JSON(fiber.Map{"message": "Account deactivated successfully"})
}
