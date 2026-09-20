package repository

import (
	"app/internal/models"

	"gorm.io/gorm"
)

type ProductRepository interface {
	Create(product *models.Product) error
	GetByIDAndStore(id uint, storeID uint) (*models.Product, error)
	GetAllByStore(storeID uint) ([]models.Product, error)
	UpdateStockWithLock(tx *gorm.DB, productID uint, storeID uint, quantity int) (*models.Product, error)
}

type productRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) ProductRepository {
	return &productRepository{db}
}

func (r *productRepository) Create(product *models.Product) error {
	return r.db.Create(product).Error
}

func (r *productRepository) GetByIDAndStore(id uint, storeID uint) (*models.Product, error) {
	var product models.Product
	err := r.db.Where("id = ? AND store_id = ? AND is_active = ?", id, storeID, true).First(&product).Error
	return &product, err
}

func (r *productRepository) GetAllByStore(storeID uint) ([]models.Product, error) {
	var products []models.Product
	err := r.db.Where("store_id = ? AND is_active = ?", storeID, true).Order("name ASC").Find(&products).Error
	return products, err
}

func (r *productRepository) UpdateStockWithLock(tx *gorm.DB, productID uint, storeID uint, quantity int) (*models.Product, error) {
	var product models.Product

	err := tx.Raw(`
		UPDATE products 
		SET current_stock = current_stock - $1, updated_at = NOW() 
		WHERE id = $2 AND store_id = $3 AND current_stock >= $1 AND is_active = true 
		RETURNING id, current_stock, buy_price, sell_price
	`, quantity, productID, storeID).Scan(&product).Error

	if err != nil {
		return nil, err
	}

	if product.ID == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	return &product, nil
}
