package repository

import (
	"time"

	"app/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SocialRepository interface {
	GetOrCreateUsage(storeID uint, yearMonth string) (*models.StoreAIUsage, error)
	IncrementCaptionUsage(storeID uint, yearMonth string) error
	IncrementPostUsage(storeID uint, yearMonth string) error
	SaveCustomAIKey(storeID uint, encryptedKey string, provider string) error
	GetActiveSubscription(storeID uint) (*models.Subscription, error)

	// Account management
	GetAccountByStore(storeID uint) (*models.SocialAccount, error)
	SaveAccount(account *models.SocialAccount) error
	DeleteAccount(storeID uint, id uint) error

	// Post management
	CreatePost(post *models.SocialPost) error
	GetPostByID(storeID uint, id uint) (*models.SocialPost, error)
	ListPosts(storeID uint, limit, offset int) ([]models.SocialPost, int64, error)
	UpdatePost(post *models.SocialPost) error
}

type socialRepository struct {
	db *gorm.DB
}

func NewSocialRepository(db *gorm.DB) SocialRepository {
	return &socialRepository{db: db}
}

func (r *socialRepository) GetOrCreateUsage(storeID uint, yearMonth string) (*models.StoreAIUsage, error) {
	var usage models.StoreAIUsage
	err := r.db.Where("store_id = ? AND year_month = ?", storeID, yearMonth).First(&usage).Error
	if err == nil {
		return &usage, nil
	}

	if err == gorm.ErrRecordNotFound {
		// Also fetch existing BYOK config from any previous month if present
		var previousUsage models.StoreAIUsage
		_ = r.db.Where("store_id = ? AND custom_ai_key_encrypted != ''", storeID).Order("updated_at DESC").First(&previousUsage).Error

		usage = models.StoreAIUsage{
			StoreID:              storeID,
			YearMonth:            yearMonth,
			CaptionCount:         0,
			PostCount:            0,
			CustomAIKeyEncrypted: previousUsage.CustomAIKeyEncrypted,
			CustomAIProvider:     previousUsage.CustomAIProvider,
		}
		if createErr := r.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&usage).Error; createErr != nil {
			return nil, createErr
		}
		// Refetch to guarantee ID is filled
		_ = r.db.Where("store_id = ? AND year_month = ?", storeID, yearMonth).First(&usage)
		return &usage, nil
	}

	return nil, err
}

func (r *socialRepository) IncrementCaptionUsage(storeID uint, yearMonth string) error {
	_, err := r.GetOrCreateUsage(storeID, yearMonth)
	if err != nil {
		return err
	}
	return r.db.Model(&models.StoreAIUsage{}).
		Where("store_id = ? AND year_month = ?", storeID, yearMonth).
		UpdateColumn("caption_count", gorm.Expr("caption_count + 1")).Error
}

func (r *socialRepository) IncrementPostUsage(storeID uint, yearMonth string) error {
	_, err := r.GetOrCreateUsage(storeID, yearMonth)
	if err != nil {
		return err
	}
	return r.db.Model(&models.StoreAIUsage{}).
		Where("store_id = ? AND year_month = ?", storeID, yearMonth).
		UpdateColumn("post_count", gorm.Expr("post_count + 1")).Error
}

func (r *socialRepository) SaveCustomAIKey(storeID uint, encryptedKey string, provider string) error {
	currentMonth := time.Now().Format("2006-01")
	usage, err := r.GetOrCreateUsage(storeID, currentMonth)
	if err != nil {
		return err
	}
	usage.CustomAIKeyEncrypted = encryptedKey
	usage.CustomAIProvider = provider
	return r.db.Save(usage).Error
}

func (r *socialRepository) GetActiveSubscription(storeID uint) (*models.Subscription, error) {
	var sub models.Subscription
	now := time.Now()
	err := r.db.Where("store_id = ? AND status = 'active' AND expires_at > ?", storeID, now).
		Order("expires_at DESC").
		First(&sub).Error
	if err != nil {
		return nil, err
	}
	return &sub, nil
}

func (r *socialRepository) GetAccountByStore(storeID uint) (*models.SocialAccount, error) {
	var acc models.SocialAccount
	err := r.db.Where("store_id = ? AND status = 'active'", storeID).First(&acc).Error
	if err != nil {
		return nil, err
	}
	return &acc, nil
}

func (r *socialRepository) SaveAccount(account *models.SocialAccount) error {
	return r.db.Save(account).Error
}

func (r *socialRepository) DeleteAccount(storeID uint, id uint) error {
	return r.db.Where("store_id = ? AND id = ?", storeID, id).Delete(&models.SocialAccount{}).Error
}

func (r *socialRepository) CreatePost(post *models.SocialPost) error {
	return r.db.Create(post).Error
}

func (r *socialRepository) GetPostByID(storeID uint, id uint) (*models.SocialPost, error) {
	var post models.SocialPost
	err := r.db.Where("store_id = ? AND id = ?", storeID, id).First(&post).Error
	if err != nil {
		return nil, err
	}
	return &post, nil
}

func (r *socialRepository) ListPosts(storeID uint, limit, offset int) ([]models.SocialPost, int64, error) {
	var posts []models.SocialPost
	var total int64

	if err := r.db.Model(&models.SocialPost{}).Where("store_id = ?", storeID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.db.Where("store_id = ?", storeID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&posts).Error

	return posts, total, err
}

func (r *socialRepository) UpdatePost(post *models.SocialPost) error {
	return r.db.Save(post).Error
}
