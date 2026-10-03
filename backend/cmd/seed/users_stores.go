package main

import (
	"log"

	"app/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func seedUser(db *gorm.DB) models.User {
	email := "azka13labib@gmail.com"
	password := "Azkalabib11"
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	var user models.User
	if err := db.Where("email = ?", email).First(&user).Error; err != nil {
		user = models.User{
			Name:         "Azka Labib",
			Email:        email,
			PasswordHash: string(hash),
		}
		if err := db.Create(&user).Error; err != nil {
			log.Fatalf("Failed to seed user: %v", err)
		}
		log.Println("User created successfully.")
	} else {
		log.Println("User already exists.")
	}
	return user
}

func seedStore(db *gorm.DB) models.Store {
	var store models.Store
	if err := db.Where("name = ?", "Warkop Azka").First(&store).Error; err != nil {
		store = models.Store{
			Name:     "Warkop Azka",
			Address:  "Jl. Kebon Kacang No. 1",
			Timezone: "Asia/Jakarta",
		}
		if err := db.Create(&store).Error; err != nil {
			log.Fatalf("Failed to seed store: %v", err)
		}
		log.Println("Store created successfully.")
	} else {
		log.Println("Store already exists.")
	}
	return store
}

func seedStoreMember(db *gorm.DB, userID, storeID uint) {
	var storeMember models.StoreMember
	if err := db.Where("user_id = ? AND store_id = ?", userID, storeID).First(&storeMember).Error; err != nil {
		storeMember = models.StoreMember{
			UserID:  userID,
			StoreID: storeID,
			Role:    "owner",
		}
		if err := db.Create(&storeMember).Error; err != nil {
			log.Fatalf("Failed to seed store member: %v", err)
		}
		log.Println("Store member created successfully.")
	}
}
