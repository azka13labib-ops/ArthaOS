package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"app/internal/repository"
	"app/internal/services"

	"github.com/gofiber/fiber/v3"
)

type AIHandler struct {
	llmService   services.LLMService
	productRepo  repository.ProductRepository
	customerRepo repository.CustomerRepository
	storeRepo    repository.StoreRepository
	debtRepo     repository.DebtRepository
	trxRepo      repository.TransactionRepository
}

func NewAIHandler(
	llmService services.LLMService,
	productRepo repository.ProductRepository,
	customerRepo repository.CustomerRepository,
	storeRepo repository.StoreRepository,
	debtRepo repository.DebtRepository,
	trxRepo repository.TransactionRepository,
) *AIHandler {
return &AIHandler{
		llmService:   llmService,
		productRepo:  productRepo,
		customerRepo: customerRepo,
		storeRepo:    storeRepo,
		debtRepo:     debtRepo,
		trxRepo:      trxRepo,
	}
}

func (h *AIHandler) Chat(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		Message string                     `json:"message"`
		History []services.ChatHistoryItem `json:"history"`
	}
	if err := c.Bind().Body(&req); err != nil || req.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Pesan pertanyaan wajib diisi"})
	}

	ctx, cancel := context.WithTimeout(c.Context(), 20*time.Second)
	defer cancel()

	// Gather real context
	products, _ := h.productRepo.GetAllByStore(storeID)
	debts, _ := h.debtRepo.GetByStore(storeID)
	sales, _ := h.trxRepo.GetByStore(storeID, 20, 0)
	store, _ := h.storeRepo.GetByID(storeID)

	storeName := "Toko ArthaOS"
	if store != nil {
		storeName = store.Name
	}

	var totalOmset int64
	for _, s := range sales {
		if s.Type == "sale" {
			totalOmset += s.TotalAmount
		}
	}

	var totalDebt int64
	for _, d := range debts {
		if d.Status != "paid" {
			totalDebt += d.RemainingAmount
		}
	}

	prodSummary := fmt.Sprintf("Jumlah SKU: %d produk. Total Omset: Rp %d. Total Kasbon Berjalan: Rp %d.", len(products), totalOmset, totalDebt)
	if len(products) > 0 {
		prodSummary += " Contoh Produk Teratas: "
		for i, p := range products {
			if i >= 5 {
				break
			}
			prodSummary += fmt.Sprintf("[%s (Stok: %d, Beli: Rp %d, Jual: Rp %d)] ", p.Name, p.CurrentStock, p.BuyPrice, p.SellPrice)
		}
	}

	contextStr := fmt.Sprintf("Nama Toko: %s\nRingkasan Metrik: %s", storeName, prodSummary)

	answer, err := h.llmService.ChatAdvisor(ctx, req.Message, contextStr, req.History)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"response":     answer.Content,
		"model":        answer.Model,
		"request_id":   answer.RequestID,
		"total_tokens": answer.TotalTokens,
		"latency_ms":   answer.LatencyMs,
		"timestamp":    time.Now().Format("15:04"),
	})
}

func (h *AIHandler) ParseOrder(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		Message string `json:"message"`
	}
	if err := c.Bind().Body(&req); err != nil || req.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Pesan chat wajib diisi"})
	}

	ctx, cancel := context.WithTimeout(c.Context(), 20*time.Second)
	defer cancel()

	products, _ := h.productRepo.GetAllByStore(storeID)
	customers, _ := h.customerRepo.GetByStore(storeID)

	type CatalogItem struct {
		ID    uint   `json:"id"`
		Name  string `json:"name"`
		Price int64  `json:"price"`
		Stock int    `json:"stock"`
	}
	var catalog []CatalogItem
	for _, p := range products {
		catalog = append(catalog, CatalogItem{
			ID:    p.ID,
			Name:  p.Name,
			Price: p.SellPrice,
			Stock: p.CurrentStock,
		})
	}

	type CustomerItem struct {
		ID   uint   `json:"id"`
		Name string `json:"name"`
	}
	var customerList []CustomerItem
	for _, cust := range customers {
		customerList = append(customerList, CustomerItem{
			ID:   cust.ID,
			Name: cust.Name,
		})
	}

	catJSON, _ := json.Marshal(catalog)
	custJSON, _ := json.Marshal(customerList)

	parsedOrder, err := h.llmService.ParseWhatsAppOrder(ctx, req.Message, string(catJSON), string(custJSON))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(parsedOrder)
}

func (h *AIHandler) CustomerInquiry(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		Message string `json:"message"`
	}
	if err := c.Bind().Body(&req); err != nil || req.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Pesan pembeli wajib diisi"})
	}

	ctx, cancel := context.WithTimeout(c.Context(), 20*time.Second)
	defer cancel()

	products, _ := h.productRepo.GetAllByStore(storeID)
	store, _ := h.storeRepo.GetByID(storeID)
	storeName := "Toko Kami"
	if store != nil {
		storeName = store.Name
	}

	catJSON, _ := json.Marshal(products)

	reply, err := h.llmService.CustomerInquiry(ctx, req.Message, string(catJSON), storeName)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"reply":        reply.Content,
		"model":        reply.Model,
		"request_id":   reply.RequestID,
		"total_tokens": reply.TotalTokens,
		"latency_ms":   reply.LatencyMs,
	})
}

func (h *AIHandler) GeneratePromo(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		Prompt string `json:"prompt"`
		Phone  string `json:"phone"`
	}
	if err := c.Bind().Body(&req); err != nil {
		req.Prompt = "Buatkan promo diskon akhir pekan untuk produk sembako"
	}

	ctx, cancel := context.WithTimeout(c.Context(), 20*time.Second)
	defer cancel()

	products, _ := h.productRepo.GetAllByStore(storeID)
	store, _ := h.storeRepo.GetByID(storeID)
	storeName := "Toko Kami"
	if store != nil {
		storeName = store.Name
	}

	prodJSON, _ := json.Marshal(products)

	promoText, err := h.llmService.GeneratePromo(ctx, req.Prompt, string(prodJSON), storeName, req.Phone)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"promo_text":   promoText.Content,
		"model":        promoText.Model,
		"request_id":   promoText.RequestID,
		"total_tokens": promoText.TotalTokens,
		"latency_ms":   promoText.LatencyMs,
	})
}
