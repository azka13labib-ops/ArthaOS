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
	auditRepo := repository.NewAuditRepository()
	purchaseRepo := repository.NewPurchaseRepository(db)

	authService := services.NewAuthService(userRepo)
	invService := services.NewInventoryService(db, productRepo, invRepo)
	saleService := services.NewSaleService(db, productRepo, trxRepo)
	expenseService := services.NewExpenseService(db, trxRepo)
	customerService := services.NewCustomerService(customerRepo)
	debtService := services.NewDebtService(db, debtRepo, trxRepo)
	reportService := services.NewReportService(db)
	rmService := services.NewRawMaterialService(rmRepo)
	recipeService := services.NewRecipeService(recipeRepo, productRepo, rmRepo)
	supplierService := services.NewSupplierService(supplierRepo)
	purchaseService := services.NewPurchaseService(db, purchaseRepo)
	syncService := services.NewSyncService(db, saleService, expenseService)
	nlpService := services.NewNLPService()
	llmService := services.NewLLMService(cfg.GroqAPIKey, cfg.GeminiAPIKey, cfg.OpenAIAPIKey, cfg.AIProvider)

	authHandler := handlers.NewAuthHandler(authService, cfg)
	productHandler := handlers.NewProductHandler(invService, auditRepo, db)
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
	aiHandler := handlers.NewAIHandler(llmService, productRepo, customerRepo, storeRepo, debtRepo, trxRepo, auditRepo, db)

	waHandler := handlers.NewWhatsAppHandler(nlpService, cfg.WebhookSecret)

	api := app.Group("/api/v1")

	authMiddleware := middleware.AuthMiddleware(cfg)
	storeHandler := handlers.NewStoreHandler(storeRepo)
	storeMiddleware := middleware.StoreMiddleware(storeRepo)

	authGroup := api.Group("/auth")
	authGroup.Post("/register", authHandler.Register)
	authGroup.Post("/login", middleware.RateLimitLogin(), authHandler.Login)
	authGroup.Get("/me", authMiddleware, authHandler.Me)

	api.Post("/webhooks/whatsapp", middleware.RateLimitWebhook(), middleware.LimitBodySize(64*1024), waHandler.Webhook)

	storesGroup := api.Group("/stores", authMiddleware)
	storesGroup.Post("/", storeHandler.Create)
	storesGroup.Get("/", storeHandler.List)

	tenantGroup := storesGroup.Group("/:storeId", storeMiddleware)
	tenantGroup.Get("/", storeHandler.GetByID)

	tenantGroup.Get("/products", productHandler.GetAll)
	tenantGroup.Post("/products", middleware.RequireRole("owner", "manager"), productHandler.Create)
	tenantGroup.Post("/products/:id/adjustments", middleware.RequireRole("owner", "manager"), productHandler.AdjustStock)
	tenantGroup.Get("/products/:id/movements", productHandler.GetMovements)

	tenantGroup.Get("/raw-materials", rmHandler.GetAll)
	tenantGroup.Post("/raw-materials", middleware.RequireRole("owner", "manager"), rmHandler.Create)
	tenantGroup.Post("/raw-materials/:id/adjustments", middleware.RequireRole("owner", "manager"), rmHandler.AdjustStock)

	tenantGroup.Get("/products/:product_id/recipes", middleware.RequireRole("owner", "manager"), recipeHandler.GetByProduct)
	tenantGroup.Post("/products/:product_id/recipes", middleware.RequireRole("owner", "manager"), recipeHandler.AddItem)
	tenantGroup.Delete("/recipes/:id", middleware.RequireRole("owner", "manager"), recipeHandler.Delete)

	tenantGroup.Get("/sales", saleHandler.GetAll)
	tenantGroup.Post("/sales", saleHandler.Create)

	tenantGroup.Get("/expenses", middleware.RequireRole("owner", "manager"), expenseHandler.GetAll)
	tenantGroup.Post("/expenses", middleware.RequireRole("owner", "manager"), expenseHandler.Create)

	tenantGroup.Post("/customers", customerHandler.Create)
	tenantGroup.Get("/customers", customerHandler.GetAll)

	tenantGroup.Get("/debts", debtHandler.GetDebts)
	tenantGroup.Post("/debts/:id/payments", debtHandler.PayDebt)

	// Suppliers & Purchases
	tenantGroup.Get("/suppliers", middleware.RequireRole("owner", "manager"), supplierHandler.GetAll)
	tenantGroup.Post("/suppliers", middleware.RequireRole("owner", "manager"), supplierHandler.Create)
	tenantGroup.Get("/suppliers/:id", middleware.RequireRole("owner", "manager"), supplierHandler.GetByID)
	tenantGroup.Put("/suppliers/:id", middleware.RequireRole("owner", "manager"), supplierHandler.Update)
	tenantGroup.Patch("/suppliers/:id", middleware.RequireRole("owner", "manager"), supplierHandler.Update)
	tenantGroup.Delete("/suppliers/:id", middleware.RequireRole("owner", "manager"), supplierHandler.Delete)

	tenantGroup.Get("/purchases", middleware.RequireRole("owner", "manager"), purchaseHandler.GetAll)
	tenantGroup.Post("/purchases", middleware.RequireRole("owner", "manager"), purchaseHandler.Create)
	tenantGroup.Get("/purchases/:id", middleware.RequireRole("owner", "manager"), purchaseHandler.GetByID)

	tenantGroup.Get("/reports/profit-loss", middleware.RequireRole("owner", "manager"), reportHandler.GetProfitLoss)
	tenantGroup.Get("/reports/stock-valuation", middleware.RequireRole("owner", "manager"), reportHandler.GetStockValuation)
	tenantGroup.Get("/reports/cash-flow", middleware.RequireRole("owner", "manager"), reportHandler.GetCashFlow)
	tenantGroup.Get("/reports/dashboard-metrics", middleware.RequireRole("owner", "manager"), reportHandler.GetDashboardMetrics)

	tenantGroup.Post("/sync/batch", syncHandler.BatchSync)

	tenantGroup.Post("/whatsapp/link", waHandler.LinkAccount)

	tenantGroup.Post("/ai/chat", aiHandler.Chat)
	tenantGroup.Post("/ai/parse-order", aiHandler.ParseOrder)
	tenantGroup.Post("/ai/inquiry", aiHandler.CustomerInquiry)
	tenantGroup.Post("/ai/generate-promo", aiHandler.GeneratePromo)

	settingsRepo := repository.NewSettingsRepository(db)
	settingsHandler := handlers.NewSettingsHandler(settingsRepo, cfg, auditRepo, db)

	// Store name update (Owner only)
	storesGroup.Patch("/:storeId/name", storeMiddleware, middleware.RequireRole("owner"), storeHandler.UpdateName)

	// Public invite endpoints (no auth needed to read invite, auth needed to accept)
	api.Get("/invitations/:token", settingsHandler.GetInvitation)
	api.Post("/invitations/:token/accept", authMiddleware, settingsHandler.AcceptInvitation)

	// VAPID public key (auth required, not store-scoped)
	api.Get("/push/vapid-public-key", authMiddleware, settingsHandler.GetVAPIDPublicKey)

	// User profile & account (not store-scoped)
	api.Patch("/settings/profile", authMiddleware, settingsHandler.UpdateProfile)
	api.Post("/settings/deactivate", authMiddleware, settingsHandler.DeactivateAccount)

	// Store-scoped settings (Owner only for mutations & deletion)
	tenantGroup.Get("/settings", settingsHandler.GetSettings)
	tenantGroup.Patch("/settings/store-info", middleware.RequireRole("owner"), settingsHandler.UpdateStoreInfo)
	tenantGroup.Delete("/settings/store", middleware.RequireRole("owner"), settingsHandler.DeleteStore)
	tenantGroup.Patch("/settings/features", middleware.RequireRole("owner"), settingsHandler.UpdateFeatures)
	tenantGroup.Patch("/settings/notifications", middleware.RequireRole("owner"), settingsHandler.UpdateNotifications)
	tenantGroup.Patch("/settings/menu", middleware.RequireRole("owner"), settingsHandler.UpdateMenuSettings)
	tenantGroup.Patch("/settings/lease", middleware.RequireRole("owner"), settingsHandler.UpdateLease)

	// Members (Owner only for modifying members)
	tenantGroup.Get("/settings/members", settingsHandler.ListMembers)
	tenantGroup.Post("/settings/members/invite", middleware.RequireRole("owner"), settingsHandler.InviteMember)
	tenantGroup.Delete("/settings/members/:userId", middleware.RequireRole("owner"), settingsHandler.RemoveMember)
	tenantGroup.Patch("/settings/members/:userId/role", middleware.RequireRole("owner"), settingsHandler.UpdateMemberRole)

	// Browser push subscriptions
	tenantGroup.Post("/settings/push/subscribe", settingsHandler.SubscribePush)
	tenantGroup.Post("/settings/push/unsubscribe", settingsHandler.UnsubscribePush)

	adminGroup := tenantGroup.Group("/admin", middleware.RequireRole("owner"))

	_ = adminGroup
}
