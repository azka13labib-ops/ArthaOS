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
	GetByIDAndStoreWithLock(tx *gorm.DB, id uint, storeID uint) (*models.Product, error)
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
	err := r.db.Where("id = ? AND store_id = ? AND is_active = ?", id, storeID, true).Preload("RecipeItems").Preload("RecipeItems.RawMaterial").First(&product).Error
	return &product, err
}

func (r *productRepository) GetAllByStore(storeID uint) ([]models.Product, error) {
	var products []models.Product
	err := r.db.Where("store_id = ? AND is_active = ?", storeID, true).Order("name ASC").Preload("RecipeItems").Preload("RecipeItems.RawMaterial").Find(&products).Error
	return products, err
}

func (r *productRepository) UpdateStockWithLock(tx *gorm.DB, productID uint, storeID uint, quantity int) (*models.Product, error) {
	var product models.Product

	err := tx.Raw(`
		UPDATE products 
		SET current_stock = current_stock - $1, updated_at = NOW() 
		WHERE id = $2 AND store_id = $3 AND current_stock >= $1 AND is_active = true AND is_recipe_based = false
		RETURNING id, current_stock, buy_price, sell_price, is_recipe_based
	`, quantity, productID, storeID).Scan(&product).Error

	if err != nil {
		return nil, err
	}

	if product.ID == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	return &product, nil
}

func (r *productRepository) GetByIDAndStoreWithLock(tx *gorm.DB, id uint, storeID uint) (*models.Product, error) {
	var product models.Product
	err := tx.Raw(`
		SELECT id, current_stock, buy_price, sell_price, is_recipe_based 
		FROM products 
		WHERE id = $1 AND store_id = $2 AND is_active = true 
		FOR UPDATE
	`, id, storeID).Scan(&product).Error

	if err != nil {
		return nil, err
	}
	if product.ID == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	// If it's recipe based, we need to load recipes
	if product.IsRecipeBased {
		err = tx.Preload("RawMaterial").Where("product_id = ?", product.ID).Find(&product.RecipeItems).Error
		if err != nil {
			return nil, err
		}
	}

	return &product, nil
}

