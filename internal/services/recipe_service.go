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
	if quantity > 1000000 {
		return nil, errors.New("kuantitas bahan per porsi melebihi batas wajar (maksimal 1.000.000 unit)")
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

	// Jika bahan baku ini sudah ada di dalam resep produk, perbarui kuantitasnya (upsert)
	existing, err := s.recipeRepo.FindItem(productID, rawMaterialID)
	if err == nil && existing != nil && existing.ID > 0 {
		existing.Quantity = quantity
		if err := s.recipeRepo.Update(existing); err != nil {
			return nil, err
		}
		return existing, nil
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
	// Dapatkan info item untuk mengetahui productID sebelum dihapus
	item, err := s.recipeRepo.GetByIDAndStore(storeID, id)
	if err != nil {
		return errors.New("komponen resep tidak ditemukan")
	}
	productID := item.ProductID

	if err := s.recipeRepo.Delete(storeID, id); err != nil {
		return err
	}

	// Cek apakah produk masih memiliki komponen resep lain
	remainingCount, err := s.recipeRepo.CountByProduct(productID)
	if err == nil && remainingCount == 0 {
		// Jika 0 bahan tersisa, reset is_recipe_based kembali ke false agar produk tidak terkunci
		_ = s.productRepo.SetRecipeBased(productID, storeID, false)
	}

	return nil
}
