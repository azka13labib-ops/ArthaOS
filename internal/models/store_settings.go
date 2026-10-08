package models

import (
	"time"
)

// StoreSettings stores all configurable settings for a store as JSON columns.
// This avoids schema migrations every time a new setting is added.
type StoreSettings struct {
	ID      uint `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID uint `gorm:"uniqueIndex;not null"     json:"store_id"`

	// Company profile
	LogoURL string `gorm:"type:text"         json:"logo_url"`

	// Feature flags (stored as booleans)
	FeatureFinancialAnalysis bool `gorm:"default:false" json:"feature_financial_analysis"`
	FeatureCustomBranding    bool `gorm:"default:false" json:"feature_custom_branding"`
	FeatureCRM               bool `gorm:"default:false" json:"feature_crm"`
	FeatureRemoveWatermark   bool `gorm:"default:false" json:"feature_remove_watermark"`
	FeatureTaxCalculation    bool `gorm:"default:false" json:"feature_tax_calculation"`
	FeatureMultiBranch       bool `gorm:"default:false" json:"feature_multi_branch"`
	FeatureLogoOnReceipt     bool `gorm:"default:false" json:"feature_logo_on_receipt"`
	FeatureCustomerMgmt      bool `gorm:"default:false" json:"feature_customer_mgmt"`
	FeatureShiftMgmt         bool `gorm:"default:false" json:"feature_shift_mgmt"`
	FeatureAdvancedStock     bool `gorm:"default:false" json:"feature_advanced_stock"`
	FeatureSmartNotif        bool `gorm:"default:false" json:"feature_smart_notif"`
	FeatureAdvancedPromo     bool `gorm:"default:false" json:"feature_advanced_promo"`

	// Notification preferences
	NotifLowStock          bool  `gorm:"default:false" json:"notif_low_stock"`
	NotifExpiredStock      bool  `gorm:"default:false" json:"notif_expired_stock"`
	NotifDueBill           bool  `gorm:"default:false" json:"notif_due_bill"`
	NotifHighTransaction   bool  `gorm:"default:false" json:"notif_high_transaction"`
	NotifHighTransactionAmt int64 `gorm:"default:500000" json:"notif_high_transaction_amt"`
	NotifHighVoid          bool  `gorm:"default:false" json:"notif_high_void"`
	NotifHighVoidAmt       int64 `gorm:"default:50000"  json:"notif_high_void_amt"`

	// Digital menu
	MenuSlug       string `gorm:"type:varchar(100);uniqueIndex" json:"menu_slug"`
	MenuPublished  bool   `gorm:"default:false"                 json:"menu_published"`
	MenuWANumber   string `gorm:"type:varchar(30)"              json:"menu_wa_number"`
	MenuInstagram  string `gorm:"type:varchar(100)"             json:"menu_instagram"`
	MenuGrabFood   string `gorm:"type:text"                     json:"menu_grabfood"`
	MenuGoFood     string `gorm:"type:text"                     json:"menu_gofood"`
	MenuShopeeFood string `gorm:"type:text"                     json:"menu_shopeefood"`
	MenuDelivery   bool   `gorm:"default:true"                  json:"menu_delivery"`
	MenuPickup     bool   `gorm:"default:false"                 json:"menu_pickup"`
	MenuReservation bool  `gorm:"default:false"                 json:"menu_reservation"`
	MenuWelcomeMsg string `gorm:"type:text"                     json:"menu_welcome_msg"`
	MenuFooterMsg  string `gorm:"type:text"                     json:"menu_footer_msg"`

	// Operating hours (stored as JSON string)
	OperatingHoursJSON string `gorm:"type:text" json:"operating_hours_json"`

	// Lease contract (PSAK 73)
	LeaseStartDate    *time.Time `gorm:"type:date"    json:"lease_start_date"`
	LeaseEndDate      *time.Time `gorm:"type:date"    json:"lease_end_date"`
	LeaseMonthlyCost  int64      `gorm:"default:0"    json:"lease_monthly_cost"`
	LeaseInterestRate float64    `gorm:"default:0"    json:"lease_interest_rate"`

	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}
