package main

import (
	"log"

	"app/internal/models"

	"gorm.io/gorm"
)

func seedRawMaterials(db *gorm.DB, storeID uint) []models.RawMaterial {
	rawMaterials := []models.RawMaterial{
		{StoreID: storeID, Name: "Biji Kopi Arabica", SKU: "RM-KOP-ARB", Unit: "gram", CostPerUnit: 150, CurrentStock: 5000},
		{StoreID: storeID, Name: "Biji Kopi Robusta", SKU: "RM-KOP-ROB", Unit: "gram", CostPerUnit: 100, CurrentStock: 5000},
		{StoreID: storeID, Name: "Gula Aren Cair", SKU: "RM-GLA-ARN", Unit: "ml", CostPerUnit: 20, CurrentStock: 2000},
		{StoreID: storeID, Name: "Susu Full Cream", SKU: "RM-SSU-FLC", Unit: "ml", CostPerUnit: 18, CurrentStock: 5000},
		{StoreID: storeID, Name: "Cup Plastik 16oz", SKU: "RM-CUP-16Z", Unit: "pcs", CostPerUnit: 500, CurrentStock: 200},
	}
	for i, rm := range rawMaterials {
		var existing models.RawMaterial
		if err := db.Where("store_id = ? AND sku = ?", storeID, rm.SKU).First(&existing).Error; err != nil {
			db.Create(&rm)
			rawMaterials[i] = rm
		} else {
			rawMaterials[i] = existing
		}
	}
	log.Println("Raw materials seeded.")
	return rawMaterials
}

func seedProducts(db *gorm.DB, storeID uint) []models.Product {
	products := []models.Product{
		{StoreID: storeID, Name: "Kopi Susu Gula Aren", SKU: "PR-KOP-AREN", BuyPrice: 5000, SellPrice: 15000, CurrentStock: 0, IsActive: true},
		{StoreID: storeID, Name: "Kopi Hitam (Americano)", SKU: "PR-KOP-HTM", BuyPrice: 3000, SellPrice: 12000, CurrentStock: 0, IsActive: true},
		{StoreID: storeID, Name: "Cappuccino", SKU: "PR-CAP-001", BuyPrice: 6000, SellPrice: 18000, CurrentStock: 0, IsActive: true},
	}
	for i, p := range products {
		var existing models.Product
		if err := db.Where("store_id = ? AND sku = ?", storeID, p.SKU).First(&existing).Error; err != nil {
			db.Create(&p)
			products[i] = p
		} else {
			products[i] = existing
		}
	}
	log.Println("Products seeded.")
	return products
}

func seedRecipes(db *gorm.DB, products []models.Product, rawMaterials []models.RawMaterial) {
	getRM := func(sku string) uint {
		for _, rm := range rawMaterials {
			if rm.SKU == sku {
				return rm.ID
			}
		}
		return 0
	}

	recipes := []models.RecipeItem{
		// Kopi Susu Gula Aren
		{ProductID: products[0].ID, RawMaterialID: getRM("RM-KOP-ARB"), Quantity: 15},
		{ProductID: products[0].ID, RawMaterialID: getRM("RM-SSU-FLC"), Quantity: 150},
		{ProductID: products[0].ID, RawMaterialID: getRM("RM-GLA-ARN"), Quantity: 30},
		{ProductID: products[0].ID, RawMaterialID: getRM("RM-CUP-16Z"), Quantity: 1},

		// Kopi Hitam
		{ProductID: products[1].ID, RawMaterialID: getRM("RM-KOP-ROB"), Quantity: 15},
		{ProductID: products[1].ID, RawMaterialID: getRM("RM-CUP-16Z"), Quantity: 1},

		// Cappuccino
		{ProductID: products[2].ID, RawMaterialID: getRM("RM-KOP-ARB"), Quantity: 15},
		{ProductID: products[2].ID, RawMaterialID: getRM("RM-SSU-FLC"), Quantity: 120},
		{ProductID: products[2].ID, RawMaterialID: getRM("RM-CUP-16Z"), Quantity: 1},
	}

	for _, r := range recipes {
		var existing models.RecipeItem
		if err := db.Where("product_id = ? AND raw_material_id = ?", r.ProductID, r.RawMaterialID).First(&existing).Error; err != nil {
			db.Create(&r)
		}
	}
	log.Println("Recipes seeded.")
}
