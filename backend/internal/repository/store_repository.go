package repository

import (
	"app/internal/models"

	"gorm.io/gorm"
)

type StoreRepository interface {
	Create(store *models.Store, ownerID uint) error
	GetByID(id uint) (*models.Store, error)
	GetMember(storeID uint, userID uint) (*models.StoreMember, error)
	GetStoresByUserID(userID uint) ([]models.Store, error)
}

type storeRepository struct {
	db *gorm.DB
}

func NewStoreRepository(db *gorm.DB) StoreRepository {
	return &storeRepository{db}
}

func (r *storeRepository) Create(store *models.Store, ownerID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(store).Error; err != nil {
			return err
		}

		member := models.StoreMember{
			StoreID: store.ID,
			UserID:  ownerID,
			Role:    "owner",
		}

		if err := tx.Create(&member).Error; err != nil {
			return err
		}

		return nil
	})
}

func (r *storeRepository) GetByID(id uint) (*models.Store, error) {
	var store models.Store
	err := r.db.First(&store, id).Error
	return &store, err
}

func (r *storeRepository) GetMember(storeID uint, userID uint) (*models.StoreMember, error) {
	var member models.StoreMember
	err := r.db.Where("store_id = ? AND user_id = ?", storeID, userID).First(&member).Error
	return &member, err
}

func (r *storeRepository) GetStoresByUserID(userID uint) ([]models.Store, error) {
	var stores []models.Store
	err := r.db.Joins("JOIN store_members ON store_members.store_id = stores.id").
		Where("store_members.user_id = ?", userID).
		Find(&stores).Error
	return stores, err
}
