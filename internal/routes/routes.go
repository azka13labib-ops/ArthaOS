package routes

import (
	"app/internal/config"
	"app/internal/handlers"
	"app/internal/middleware"
	"app/internal/repository"
	"app/internal/services"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

func SetupRoutes(app *fiber.App, db *gorm.DB, cfg config.Config) {

	userRepo := repository.NewUserRepository(db)
	storeRepo := repository.NewStoreRepository(db)
	productRepo := repository.NewProductRepository(db)
	invRepo := repository.NewInventoryRepository(db)
	trxRepo := repository.NewTransactionRepository(db)
	customerRepo := repository.NewCustomerRepository(db)
	debtRepo := repository.NewDebtRepository(db)
	rmRepo := repository.NewRawMaterialRepository(db)
	recipeRepo := repository.NewRecipeRepository(db)
	supplierRepo := repository.NewSupplierRepository(db)
	purchaseRepo := repository.NewPurchaseRepository(db)

	authService := services.NewAuthService(userRepo)
	invService := services.NewInventoryService(db, productRepo, invRepo)
	saleService := services.NewSaleService(db, productRepo, trxRepo)
	expenseService := services.NewExpenseService(db, trxRepo)
	customerService := services.NewCustomerService(customerRepo)
	debtService := services.NewDebtService(db, debtRepo, trxRepo)
	reportService := services.NewReportService(db)
	rmService := services.NewRawMaterialService(rmRepo)
	recipeService := services.NewRecipeService(recipeRepo)
	supplierService := services.NewSupplierService(supplierRepo)
	purchaseService := services.NewPurchaseService(db, purchaseRepo)
	syncService := services.NewSyncService(db, saleService, expenseService)
	nlpService := services.NewNLPService()
	llmService := services.NewLLMService(cfg.GroqAPIKey, cfg.GeminiAPIKey, cfg.OpenAIAPIKey, cfg.AIProvider)

	authHandler := handlers.NewAuthHandler(authService, cfg)
	productHandler := handlers.NewProductHandler(invService)
	saleHandler := handlers.NewSaleHandler(saleService)
	expenseHandler := handlers.NewExpenseHandler(expenseService)
	customerHandler := handlers.NewCustomerHandler(customerService)
	debtHandler := handlers.NewDebtHandler(debtService)
	reportHandler := handlers.NewReportHandler(reportService)
	rmHandler := handlers.NewRawMaterialHandler(rmService)
	recipeHandler := handlers.NewRecipeHandler(recipeService)
	supplierHandler := handlers.NewSupplierHandler(supplierService)
	purchaseHandler := handlers.NewPurchaseHandler(purchaseService)
	syncHandler := handlers.NewSyncHandler(syncService)
	aiHandler := handlers.NewAIHandler(llmService, productRepo, customerRepo, storeRepo, debtRepo, trxRepo)

	waHandler := handlers.NewWhatsAppHandler(nlpService, cfg.WebhookSecret)

	api := app.Group("/api/v1")

	authMiddleware := middleware.AuthMiddleware(cfg)
	storeHandler := handlers.NewStoreHandler(storeRepo)
	storeMiddleware := middleware.StoreMiddleware(storeRepo)

	authGroup := api.Group("/auth")
	authGroup.Post("/register", authHandler.Register)
	authGroup.Post("/login", middleware.RateLimitLogin(), authHandler.Login)
	authGroup.Get("/me", authMiddleware, authHandler.Me)

	api.Post("/webhooks/whatsapp", waHandler.Webhook)

	storesGroup := api.Group("/stores", authMiddleware)
	storesGroup.Post("/", storeHandler.Create)
	storesGroup.Get("/", storeHandler.List)

	tenantGroup := storesGroup.Group("/:storeId", storeMiddleware)
	tenantGroup.Get("/", storeHandler.GetByID)

	tenantGroup.Get("/products", productHandler.GetAll)
	tenantGroup.Post("/products", productHandler.Create)
	tenantGroup.Post("/products/:id/adjustments", productHandler.AdjustStock)
	tenantGroup.Get("/products/:id/movements", productHandler.GetMovements)

	tenantGroup.Get("/raw-materials", rmHandler.GetAll)
	tenantGroup.Post("/raw-materials", rmHandler.Create)
	tenantGroup.Post("/raw-materials/:id/adjustments", rmHandler.AdjustStock)

	tenantGroup.Get("/products/:product_id/recipes", recipeHandler.GetByProduct)
	tenantGroup.Post("/products/:product_id/recipes", recipeHandler.AddItem)
	tenantGroup.Delete("/recipes/:id", recipeHandler.Delete)

	tenantGroup.Get("/sales", saleHandler.GetAll)
	tenantGroup.Post("/sales", saleHandler.Create)

	tenantGroup.Get("/expenses", expenseHandler.GetAll)
	tenantGroup.Post("/expenses", expenseHandler.Create)

	tenantGroup.Post("/customers", customerHandler.Create)
	tenantGroup.Get("/customers", customerHandler.GetAll)

	tenantGroup.Get("/debts", debtHandler.GetDebts)
	tenantGroup.Post("/debts/:id/payments", debtHandler.PayDebt)

	// Suppliers & Purchases
	tenantGroup.Get("/suppliers", supplierHandler.GetAll)
	tenantGroup.Post("/suppliers", supplierHandler.Create)
	tenantGroup.Get("/suppliers/:id", supplierHandler.GetByID)
	tenantGroup.Put("/suppliers/:id", supplierHandler.Update)
	tenantGroup.Patch("/suppliers/:id", supplierHandler.Update)
	tenantGroup.Delete("/suppliers/:id", supplierHandler.Delete)

	tenantGroup.Get("/purchases", purchaseHandler.GetAll)
	tenantGroup.Post("/purchases", purchaseHandler.Create)
	tenantGroup.Get("/purchases/:id", purchaseHandler.GetByID)

	tenantGroup.Get("/reports/profit-loss", reportHandler.GetProfitLoss)
	tenantGroup.Get("/reports/stock-valuation", reportHandler.GetStockValuation)
	tenantGroup.Get("/reports/cash-flow", reportHandler.GetCashFlow)
	tenantGroup.Get("/reports/dashboard-metrics", reportHandler.GetDashboardMetrics)

	tenantGroup.Post("/sync/batch", syncHandler.BatchSync)

	tenantGroup.Post("/whatsapp/link", waHandler.LinkAccount)

	tenantGroup.Post("/ai/chat", aiHandler.Chat)
	tenantGroup.Post("/ai/parse-order", aiHandler.ParseOrder)
	tenantGroup.Post("/ai/inquiry", aiHandler.CustomerInquiry)
	tenantGroup.Post("/ai/generate-promo", aiHandler.GeneratePromo)

	settingsRepo := repository.NewSettingsRepository(db)
	settingsHandler := handlers.NewSettingsHandler(settingsRepo, cfg)

	// Store name update
	storesGroup.Patch("/:storeId/name", storeMiddleware, storeHandler.UpdateName)

	// Public invite endpoints (no auth needed to read invite, auth needed to accept)
	api.Get("/invitations/:token", settingsHandler.GetInvitation)
	api.Post("/invitations/:token/accept", authMiddleware, settingsHandler.AcceptInvitation)

	// VAPID public key (auth required, not store-scoped)
	api.Get("/push/vapid-public-key", authMiddleware, settingsHandler.GetVAPIDPublicKey)

	// User profile & account (not store-scoped)
	api.Patch("/settings/profile", authMiddleware, settingsHandler.UpdateProfile)
	api.Post("/settings/deactivate", authMiddleware, settingsHandler.DeactivateAccount)

	// Store-scoped settings
	tenantGroup.Get("/settings", settingsHandler.GetSettings)
	tenantGroup.Patch("/settings/store-info", settingsHandler.UpdateStoreInfo)
	tenantGroup.Delete("/settings/store", settingsHandler.DeleteStore)
	tenantGroup.Patch("/settings/features", settingsHandler.UpdateFeatures)
	tenantGroup.Patch("/settings/notifications", settingsHandler.UpdateNotifications)
	tenantGroup.Patch("/settings/menu", settingsHandler.UpdateMenuSettings)
	tenantGroup.Patch("/settings/lease", settingsHandler.UpdateLease)

	// Members
	tenantGroup.Get("/settings/members", settingsHandler.ListMembers)
	tenantGroup.Post("/settings/members/invite", settingsHandler.InviteMember)
	tenantGroup.Delete("/settings/members/:userId", settingsHandler.RemoveMember)
	tenantGroup.Patch("/settings/members/:userId/role", settingsHandler.UpdateMemberRole)

	// Browser push subscriptions
	tenantGroup.Post("/settings/push/subscribe", settingsHandler.SubscribePush)
	tenantGroup.Post("/settings/push/unsubscribe", settingsHandler.UnsubscribePush)

	adminGroup := tenantGroup.Group("/admin", middleware.RequireRole("owner"))

	_ = adminGroup
}
