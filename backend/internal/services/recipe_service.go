package services

import (
	"app/internal/models"
	"app/internal/repository"
)

type RecipeService interface {
	Create(productID, rawMaterialID uint, quantity int) (*models.RecipeItem, error)
	GetByProductID(productID uint) ([]models.RecipeItem, error)
	Delete(id uint) error
	DeleteByProductID(productID uint) error
}

type recipeService struct {
	recipeRepo repository.RecipeRepository
}

func NewRecipeService(recipeRepo repository.RecipeRepository) RecipeService {
	return &recipeService{recipeRepo: recipeRepo}
}

func (s *recipeService) Create(productID, rawMaterialID uint, quantity int) (*models.RecipeItem, error) {
	item := &models.RecipeItem{
		ProductID:     productID,
		RawMaterialID: rawMaterialID,
		Quantity:      quantity,
	}
	err := s.recipeRepo.Create(item)
	return item, err
}

func (s *recipeService) GetByProductID(productID uint) ([]models.RecipeItem, error) {
	return s.recipeRepo.GetByProductID(productID)
}

func (s *recipeService) Delete(id uint) error {
	return s.recipeRepo.Delete(id)
}

func (s *recipeService) DeleteByProductID(productID uint) error {
	return s.recipeRepo.DeleteByProductID(productID)
}
