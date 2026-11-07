package repository

import (
	"app/internal/models"

	"gorm.io/gorm"
)

type RecipeRepository interface {
	Create(recipeItem *models.RecipeItem) error
	GetByIDAndStore(storeID, id uint) (*models.RecipeItem, error)
	GetByProductID(storeID, productID uint) ([]models.RecipeItem, error)
	FindItem(productID, rawMaterialID uint) (*models.RecipeItem, error)
	Update(recipeItem *models.RecipeItem) error
	CountByProduct(productID uint) (int64, error)
	Delete(storeID, id uint) error
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

func (r *recipeRepo) GetByIDAndStore(storeID, id uint) (*models.RecipeItem, error) {
	var item models.RecipeItem
	err := r.db.Joins("JOIN products ON products.id = recipe_items.product_id").
		Where("recipe_items.id = ? AND products.store_id = ?", id, storeID).
		First(&item).Error
	return &item, err
}

func (r *recipeRepo) GetByProductID(storeID, productID uint) ([]models.RecipeItem, error) {
	var items []models.RecipeItem
	err := r.db.Joins("JOIN products ON products.id = recipe_items.product_id").
		Where("recipe_items.product_id = ? AND products.store_id = ?", productID, storeID).
		Preload("RawMaterial").Find(&items).Error
	return items, err
}

func (r *recipeRepo) FindItem(productID, rawMaterialID uint) (*models.RecipeItem, error) {
	var item models.RecipeItem
	err := r.db.Where("product_id = ? AND raw_material_id = ?", productID, rawMaterialID).First(&item).Error
	return &item, err
}

func (r *recipeRepo) Update(recipeItem *models.RecipeItem) error {
	return r.db.Save(recipeItem).Error
}

func (r *recipeRepo) CountByProduct(productID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.RecipeItem{}).Where("product_id = ?", productID).Count(&count).Error
	return count, err
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
