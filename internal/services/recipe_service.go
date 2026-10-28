package services

import (
	"errors"

	"app/internal/models"
	"app/internal/repository"
)

type RecipeService interface {
	Create(storeID, productID, rawMaterialID uint, quantity int) (*models.RecipeItem, error)
	GetByProductID(storeID, productID uint) ([]models.RecipeItem, error)
	Delete(storeID, id uint) error
	DeleteByProductID(productID uint) error
}

type recipeService struct {
	recipeRepo      repository.RecipeRepository
	productRepo     repository.ProductRepository
	rawMaterialRepo repository.RawMaterialRepository
}

func NewRecipeService(recipeRepo repository.RecipeRepository, productRepo repository.ProductRepository, rawMaterialRepo repository.RawMaterialRepository) RecipeService {
	return &recipeService{recipeRepo: recipeRepo, productRepo: productRepo, rawMaterialRepo: rawMaterialRepo}
}

func (s *recipeService) Create(storeID, productID, rawMaterialID uint, quantity int) (*models.RecipeItem, error) {
	if quantity <= 0 {
		return nil, errors.New("recipe quantity must be greater than zero")
	}
	prod, err := s.productRepo.GetByIDAndStore(productID, storeID)
	if err != nil {
		return nil, errors.New("product not found")
	}
	if _, err := s.rawMaterialRepo.GetByID(storeID, rawMaterialID); err != nil {
		return nil, errors.New("raw material not found")
	}

	// Otomatis aktifkan flag is_recipe_based = true jika belum aktif
	if !prod.IsRecipeBased {
		if err := s.productRepo.SetRecipeBased(productID, storeID, true); err != nil {
			return nil, errors.New("failed to enable recipe mode on product")
		}
	}

	item := &models.RecipeItem{
		ProductID:     productID,
		RawMaterialID: rawMaterialID,
		Quantity:      quantity,
	}
	err = s.recipeRepo.Create(item)
	return item, err
}

func (s *recipeService) GetByProductID(storeID, productID uint) ([]models.RecipeItem, error) {
	return s.recipeRepo.GetByProductID(storeID, productID)
}

func (s *recipeService) Delete(storeID, id uint) error {
	return s.recipeRepo.Delete(storeID, id)
}

func (s *recipeService) DeleteByProductID(productID uint) error {
	return s.recipeRepo.DeleteByProductID(productID)
}
