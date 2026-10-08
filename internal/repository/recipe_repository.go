package repository

import (
	"app/internal/models"

	"gorm.io/gorm"
)

type RecipeRepository interface {
	Create(recipeItem *models.RecipeItem) error
	GetByProductID(productID uint) ([]models.RecipeItem, error)
	Delete(id uint) error
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

func (r *recipeRepo) GetByProductID(productID uint) ([]models.RecipeItem, error) {
	var items []models.RecipeItem
	err := r.db.Where("product_id = ?", productID).Preload("RawMaterial").Find(&items).Error
	return items, err
}

func (r *recipeRepo) Delete(id uint) error {
	return r.db.Where("id = ?", id).Delete(&models.RecipeItem{}).Error
}

func (r *recipeRepo) DeleteByProductID(productID uint) error {
	return r.db.Where("product_id = ?", productID).Delete(&models.RecipeItem{}).Error
}
