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

	authService := services.NewAuthService(userRepo)
	invService := services.NewInventoryService(db, productRepo, invRepo)
	saleService := services.NewSaleService(db, productRepo, trxRepo)
	expenseService := services.NewExpenseService(db, trxRepo)
	customerService := services.NewCustomerService(customerRepo)
	debtService := services.NewDebtService(db, debtRepo, trxRepo)
	reportService := services.NewReportService(db)
	nlpService := services.NewNLPService()
	llmService := services.NewLLMService(cfg.GroqAPIKey, cfg.GeminiAPIKey, cfg.OpenAIAPIKey, cfg.AIProvider)

	authHandler := handlers.NewAuthHandler(authService, cfg)
	productHandler := handlers.NewProductHandler(invService)
	saleHandler := handlers.NewSaleHandler(saleService)
	expenseHandler := handlers.NewExpenseHandler(expenseService)
	customerHandler := handlers.NewCustomerHandler(customerService)
	debtHandler := handlers.NewDebtHandler(debtService)
	reportHandler := handlers.NewReportHandler(reportService)
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

	tenantGroup.Get("/sales", saleHandler.GetAll)
	tenantGroup.Post("/sales", saleHandler.Create)

	tenantGroup.Get("/expenses", expenseHandler.GetAll)
	tenantGroup.Post("/expenses", expenseHandler.Create)

	tenantGroup.Post("/customers", customerHandler.Create)
	tenantGroup.Get("/customers", customerHandler.GetAll)

	tenantGroup.Get("/debts", debtHandler.GetDebts)
	tenantGroup.Post("/debts/:id/payments", debtHandler.PayDebt)

	tenantGroup.Get("/reports/profit-loss", reportHandler.GetProfitLoss)
	tenantGroup.Get("/reports/stock-valuation", reportHandler.GetStockValuation)

	tenantGroup.Post("/whatsapp/link", waHandler.LinkAccount)

	tenantGroup.Post("/ai/chat", aiHandler.Chat)
	tenantGroup.Post("/ai/parse-order", aiHandler.ParseOrder)
	tenantGroup.Post("/ai/inquiry", aiHandler.CustomerInquiry)
	tenantGroup.Post("/ai/generate-promo", aiHandler.GeneratePromo)

	adminGroup := tenantGroup.Group("/admin", middleware.RequireRole("owner"))

	_ = adminGroup
}
