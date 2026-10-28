package repository

import (
	"app/internal/models"

	"gorm.io/gorm"
)

type RecipeRepository interface {
	Create(recipeItem *models.RecipeItem) error
	GetByProductID(storeID, productID uint) ([]models.RecipeItem, error)
	Delete(storeID, id uint) error
	DeleteByProductID(productID uint) error
}

type recipeRepo struct {
	db *gorm.DB
}

func NewRecipeRepository(db *gorm.DB) RecipeRepository {
	return &recipeRepo{db: db}
}

func (r *recipeRepo) Create(recipeItem *models.RecipeItem) error {
	return r.db.Create(recipeItem).Error
}

func (r *recipeRepo) GetByProductID(storeID, productID uint) ([]models.RecipeItem, error) {
	var items []models.RecipeItem
	err := r.db.Joins("JOIN products ON products.id = recipe_items.product_id").
		Where("recipe_items.product_id = ? AND products.store_id = ?", productID, storeID).
		Preload("RawMaterial").Find(&items).Error
	return items, err
}

func (r *recipeRepo) Delete(storeID, id uint) error {
	return r.db.Exec(`
		DELETE FROM recipe_items
		USING products
		WHERE recipe_items.id = ?
			AND recipe_items.product_id = products.id
			AND products.store_id = ?
	`, id, storeID).Error
}

func (r *recipeRepo) DeleteByProductID(productID uint) error {
	return r.db.Where("product_id = ?", productID).Delete(&models.RecipeItem{}).Error
}
