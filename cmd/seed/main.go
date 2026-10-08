package main

import (
	"log"

	"app/internal/config"
	"app/internal/database"
)

func main() {
	cfg := config.LoadConfig()
	database.ConnectDB(cfg.DatabaseURL)
	db := database.DB

	log.Println("Starting database seed...")

	user := seedUser(db)
	store := seedStore(db)
	seedStoreMember(db, user.ID, store.ID)
	seedCustomers(db, store.ID)
	
	rawMaterials := seedRawMaterials(db, store.ID)
	products := seedProducts(db, store.ID)
	seedRecipes(db, products, rawMaterials)

	log.Println("Database seed completed successfully! ")
}
