package main

import (
	"log"

	"app/internal/models"

	"gorm.io/gorm"
)

func seedCustomers(db *gorm.DB, storeID uint) {
	ptr := func(s string) *string { return &s }
	customers := []models.Customer{
		{StoreID: storeID, Name: "Andi", PhoneNumber: ptr("081234567890")},
		{StoreID: storeID, Name: "Budi", PhoneNumber: ptr("081298765432")},
		{StoreID: storeID, Name: "Citra", PhoneNumber: ptr("081211112222")},
	}
	for _, c := range customers {
		var existing models.Customer
		if err := db.Where("store_id = ? AND name = ?", storeID, c.Name).First(&existing).Error; err != nil {
			db.Create(&c)
		}
	}
	log.Println("Customers seeded.")
}
