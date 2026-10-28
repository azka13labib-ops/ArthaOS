package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"app/internal/models"
	"app/internal/repository"
	"app/internal/services"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type AIHandler struct {
	llmService   services.LLMService
	productRepo  repository.ProductRepository
	customerRepo repository.CustomerRepository
	storeRepo    repository.StoreRepository
	debtRepo     repository.DebtRepository
	trxRepo      repository.TransactionRepository
	auditRepo    repository.AuditRepository
	db           *gorm.DB
}

func NewAIHandler(
	llmService services.LLMService,
	productRepo repository.ProductRepository,
	customerRepo repository.CustomerRepository,
	storeRepo repository.StoreRepository,
	debtRepo repository.DebtRepository,
	trxRepo repository.TransactionRepository,
	auditRepo repository.AuditRepository,
	db *gorm.DB,
) *AIHandler {
	return &AIHandler{
		llmService:   llmService,
		productRepo:  productRepo,
		customerRepo: customerRepo,
		storeRepo:    storeRepo,
		debtRepo:     debtRepo,
		trxRepo:      trxRepo,
		auditRepo:    auditRepo,
		db:           db,
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
	if err := c.Bind().Body(&req); err != nil || strings.TrimSpace(req.Message) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Pesan pertanyaan wajib diisi",
			"code":  "EMPTY_MESSAGE",
		})
	}
	if len(req.Message) > 4000 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Pesan pertanyaan terlalu panjang (maksimal 4.000 karakter)",
			"code":  "MESSAGE_TOO_LONG",
		})
	}

	ctx, cancel := context.WithTimeout(c.Context(), 20*time.Second)
	defer cancel()

	// Gather context — track each error separately so Copilot knows when data is missing.
	var dataWarnings []string

	products, prodErr := h.productRepo.GetAllByStore(storeID)
	if prodErr != nil {
		log.Printf("[AI WARN] productRepo.GetAllByStore storeID=%d: %v", storeID, prodErr)
		dataWarnings = append(dataWarnings, "data produk tidak tersedia")
	}

	debts, debtErr := h.debtRepo.GetByStore(storeID)
	if debtErr != nil {
		log.Printf("[AI WARN] debtRepo.GetByStore storeID=%d: %v", storeID, debtErr)
		dataWarnings = append(dataWarnings, "data kasbon tidak tersedia")
	}

	// Use aggregate query — NOT latest-20 scan.
	salesAgg, aggErr := h.trxRepo.GetSalesAggregate(storeID)
	if aggErr != nil {
		log.Printf("[AI WARN] trxRepo.GetSalesAggregate storeID=%d: %v", storeID, aggErr)
		dataWarnings = append(dataWarnings, "data omzet tidak tersedia")
	}

	store, storeErr := h.storeRepo.GetByID(storeID)
	if storeErr != nil {
		log.Printf("[AI WARN] storeRepo.GetByID storeID=%d: %v", storeID, storeErr)
		dataWarnings = append(dataWarnings, "data toko tidak tersedia")
	}

	storeName := "Toko ArthaOS"
	if store != nil {
		storeName = store.Name
	}

	var totalOmset int64
	if salesAgg != nil {
		totalOmset = salesAgg.TotalOmset
	}

	var totalDebt int64
	for _, d := range debts {
		if d.Status != "paid" {
			totalDebt += d.RemainingAmount
		}
	}

	// Build context string — explicitly state when data is unavailable.
	// PENTING: Jangan sertakan harga beli (buy_price) atau data pribadi pelanggan untuk melindungi privasi bisnis!
	var ctxParts []string
	ctxParts = append(ctxParts, fmt.Sprintf("Nama Toko: %s", storeName))

	if len(dataWarnings) > 0 {
		ctxParts = append(ctxParts, fmt.Sprintf(
			"PERINGATAN DATA: Sebagian data tidak dapat dimuat (%s). Jangan menjawab seolah data tersebut tersedia.",
			strings.Join(dataWarnings, "; "),
		))
	}

	if aggErr == nil {
		ctxParts = append(ctxParts, fmt.Sprintf("Total Omzet (seluruh periode): Rp %d dari %d transaksi penjualan.", totalOmset, salesAgg.TotalCount))
	}

	if debtErr == nil {
		ctxParts = append(ctxParts, fmt.Sprintf("Total Kasbon Berjalan: Rp %d.", totalDebt))
	}

	if prodErr == nil {
		ctxParts = append(ctxParts, fmt.Sprintf("Jumlah SKU: %d produk.", len(products)))
		if len(products) > 0 {
			var prodSnippet strings.Builder
			prodSnippet.WriteString("Contoh Produk Teratas: ")
			for i, p := range products {
				if i >= 5 {
					break
				}
				stockNote := ""
				if p.CurrentStock <= 0 {
					stockNote = " [STOK HABIS]"
				} else if p.CurrentStock <= 5 {
					stockNote = fmt.Sprintf(" [STOK MENIPIS: %d]", p.CurrentStock)
				}
				prodSnippet.WriteString(fmt.Sprintf("[%s (Stok: %d%s, Jual: Rp %d)] ", p.Name, p.CurrentStock, stockNote, p.SellPrice))
			}
			ctxParts = append(ctxParts, prodSnippet.String())
		}
	}

	contextStr := strings.Join(ctxParts, "\n")

	// History from frontend is untrusted — sanitize roles, cap length and turn counts.
	sanitizedHistory := sanitizeHistory(req.History, 10)

	answer, err := h.llmService.ChatAdvisor(ctx, req.Message, contextStr, sanitizedHistory)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Audit log — fire and forget, don't fail the request.
	userID, _ := c.Locals("user_id").(uint)
	go func() {
		meta := fmt.Sprintf(`{"user_id":%d,"query_len":%d,"model":%q,"tokens":%d,"data_warnings":%q}`,
			userID, len(req.Message), answer.Model, answer.TotalTokens, strings.Join(dataWarnings, ";"))
		if logErr := h.auditRepo.Log(h.db, storeID, "user", "chat_advisor", "ai_chat", userID, &meta); logErr != nil {
			log.Printf("[AI AUDIT ERR] %v", logErr)
		}
	}()

	return c.JSON(fiber.Map{
		"response":      answer.Content,
		"model":         answer.Model,
		"request_id":    answer.RequestID,
		"total_tokens":  answer.TotalTokens,
		"latency_ms":    answer.LatencyMs,
		"timestamp":     time.Now().Format("15:04"),
		"data_warnings": dataWarnings,
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
	if err := c.Bind().Body(&req); err != nil || strings.TrimSpace(req.Message) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Pesan chat wajib diisi",
			"code":  "EMPTY_MESSAGE",
		})
	}
	if len(req.Message) > 4000 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Pesan terlalu panjang (maksimal 4.000 karakter)",
			"code":  "MESSAGE_TOO_LONG",
		})
	}

	ctx, cancel := context.WithTimeout(c.Context(), 20*time.Second)
	defer cancel()

	products, prodErr := h.productRepo.GetAllByStore(storeID)
	if prodErr != nil {
		log.Printf("[AI WARN] ParseOrder productRepo.GetAllByStore storeID=%d: %v", storeID, prodErr)
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Data katalog produk tidak dapat dimuat. Pesanan belum dapat diproses, silakan periksa manual.",
		})
	}

	customers, custErr := h.customerRepo.GetByStore(storeID)
	if custErr != nil {
		log.Printf("[AI WARN] ParseOrder customerRepo.GetByStore storeID=%d: %v", storeID, custErr)
		customers = nil
	}

	// Buat katalog aman: HANYA ID, Nama, Harga Jual, dan Stok. JANGAN kirim Harga Beli!
	type CatalogItem struct {
		ID    uint   `json:"id"`
		Name  string `json:"name"`
		Price int64  `json:"price"`
		Stock int    `json:"stock"`
	}
	var catalog []CatalogItem
	productLookup := make(map[uint]models.Product)
	for _, p := range products {
		catalog = append(catalog, CatalogItem{
			ID:    p.ID,
			Name:  p.Name,
			Price: p.SellPrice,
			Stock: p.CurrentStock,
		})
		productLookup[p.ID] = p
	}

	// Pelanggan aman: HANYA ID dan Nama. JANGAN kirim nomor telepon atau data hutang ke AI!
	type CustomerItem struct {
		ID   uint   `json:"id"`
		Name string `json:"name"`
	}
	var customerList []CustomerItem
	customerLookup := make(map[uint]bool)
	for _, cust := range customers {
		customerList = append(customerList, CustomerItem{
			ID:   cust.ID,
			Name: cust.Name,
		})
		customerLookup[cust.ID] = true
	}

	catJSON, _ := json.Marshal(catalog)
	custJSON, _ := json.Marshal(customerList)

	parsedOrder, err := h.llmService.ParseWhatsAppOrder(ctx, req.Message, string(catJSON), string(custJSON))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// VALIDASI KETAT HASIL AI DI BACKEND:
	// 1. Validasi customer_id terhadap kepemilikan storeID
	if cidVal, ok := parsedOrder["matched_customer_id"]; ok && cidVal != nil {
		if cidFloat, ok := cidVal.(float64); ok {
			cid := uint(cidFloat)
			if !customerLookup[cid] {
				parsedOrder["matched_customer_id"] = nil
			}
		} else {
			parsedOrder["matched_customer_id"] = nil
		}
	}

	// 2. Validasi setiap item: verifikasi kepemilikan toko, harga asli DB, kuantitas positif, dan stok
	warnings := []string{}
	var validatedItems []map[string]interface{}
	var totalCalculated int64 = 0

	if rawItems, ok := parsedOrder["items"].([]interface{}); ok {
		for _, rawItem := range rawItems {
			item, ok := rawItem.(map[string]interface{})
			if !ok {
				continue
			}

			// Validasi matched_product_id
			var matchedProd *models.Product
			if idVal, ok := item["matched_product_id"]; ok && idVal != nil {
				if idFloat, ok := idVal.(float64); ok {
					pid := uint(idFloat)
					if p, exists := productLookup[pid]; exists {
						matchedProd = &p
					}
				}
			}

			// Kuantitas: harus integer >= 1 dan <= 1000
			qty := 1
			if qVal, ok := item["quantity"]; ok {
				if qFloat, ok := qVal.(float64); ok && qFloat >= 1 {
					qty = int(qFloat)
					if qty > 1000 {
						qty = 1000
					}
				}
			}

			var unitPrice int64 = 0
			var prodName string

			if matchedProd != nil {
				// Gunakan data valid dan harga jual asli dari database toko
				prodName = matchedProd.Name
				unitPrice = matchedProd.SellPrice
				item["matched_product_id"] = matchedProd.ID

				// Cek ketersediaan stok
				if matchedProd.CurrentStock <= 0 {
					warnings = append(warnings, fmt.Sprintf("Produk '%s' stok habis di sistem.", matchedProd.Name))
				} else if qty > matchedProd.CurrentStock {
					warnings = append(warnings, fmt.Sprintf("Stok '%s' hanya tersisa %d (diminta %d).", matchedProd.Name, matchedProd.CurrentStock, qty))
				}
			} else {
				// Produk tidak cocok dengan katalog toko
				item["matched_product_id"] = nil
				if nameStr, ok := item["product_name"].(string); ok && strings.TrimSpace(nameStr) != "" {
					prodName = strings.TrimSpace(nameStr)
				} else {
					prodName = "Item Tidak Dikenal"
				}
				if pVal, ok := item["estimated_unit_price"].(float64); ok && pVal >= 0 {
					unitPrice = int64(pVal)
				}
				warnings = append(warnings, fmt.Sprintf("Item '%s' tidak ditemukan di katalog produk toko.", prodName))
			}

			subtotal := int64(qty) * unitPrice
			totalCalculated += subtotal

			item["product_name"] = prodName
			item["quantity"] = qty
			item["estimated_unit_price"] = unitPrice
			item["subtotal"] = subtotal

			validatedItems = append(validatedItems, item)
		}
	}

	parsedOrder["items"] = validatedItems
	parsedOrder["total_estimated_amount"] = totalCalculated
	parsedOrder["needs_verification"] = true
	if len(warnings) > 0 {
		parsedOrder["stock_warnings"] = warnings
	}

	// Audit log
	userID, _ := c.Locals("user_id").(uint)
	go func() {
		confidenceStr := "unknown"
		if cs, ok := parsedOrder["confidence_score"]; ok {
			confidenceStr = fmt.Sprintf("%v", cs)
		}
		meta := fmt.Sprintf(`{"user_id":%d,"msg_len":%d,"confidence":%q,"item_count":%d,"total":%d,"warnings":%d}`,
			userID, len(req.Message), confidenceStr, len(validatedItems), totalCalculated, len(warnings))
		if logErr := h.auditRepo.Log(h.db, storeID, "user", "parse_order", "ai_order", userID, &meta); logErr != nil {
			log.Printf("[AI AUDIT ERR] %v", logErr)
		}
	}()

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
	if err := c.Bind().Body(&req); err != nil || strings.TrimSpace(req.Message) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Pesan pembeli wajib diisi",
			"code":  "EMPTY_MESSAGE",
		})
	}
	if len(req.Message) > 2000 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Pesan terlalu panjang (maksimal 2.000 karakter)",
			"code":  "MESSAGE_TOO_LONG",
		})
	}

	ctx, cancel := context.WithTimeout(c.Context(), 20*time.Second)
	defer cancel()

	products, prodErr := h.productRepo.GetAllByStore(storeID)
	if prodErr != nil {
		log.Printf("[AI WARN] CustomerInquiry productRepo.GetAllByStore storeID=%d: %v", storeID, prodErr)
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Katalog produk tidak dapat dimuat. Silakan coba beberapa saat lagi.",
		})
	}

	store, _ := h.storeRepo.GetByID(storeID)
	storeName := "Toko Kami"
	if store != nil {
		storeName = store.Name
	}

	// Only pass in-stock products — CS bot must not claim availability for empty stock.
	// JANGAN pernah kirim harga beli (buy_price) ke AI!
	type CatalogItem struct {
		ID    uint   `json:"id"`
		Name  string `json:"name"`
		Price int64  `json:"sell_price"`
		Stock int    `json:"current_stock"`
	}
	var inStockCatalog []CatalogItem
	var outOfStockNames []string
	for _, p := range products {
		if p.CurrentStock > 0 {
			inStockCatalog = append(inStockCatalog, CatalogItem{
				ID:    p.ID,
				Name:  p.Name,
				Price: p.SellPrice,
				Stock: p.CurrentStock,
			})
		} else {
			outOfStockNames = append(outOfStockNames, p.Name)
		}
	}

	catJSON, _ := json.Marshal(inStockCatalog)
	outOfStockJSON, _ := json.Marshal(outOfStockNames)

	catalogContext := fmt.Sprintf("Produk Tersedia:\n%s\n\nProduk TIDAK TERSEDIA (stok habis, JANGAN diklaim tersedia):\n%s",
		string(catJSON), string(outOfStockJSON))

	reply, err := h.llmService.CustomerInquiry(ctx, req.Message, catalogContext, storeName)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Audit log
	userID, _ := c.Locals("user_id").(uint)
	go func() {
		meta := fmt.Sprintf(`{"user_id":%d,"msg_len":%d,"model":%q}`, userID, len(req.Message), reply.Model)
		if logErr := h.auditRepo.Log(h.db, storeID, "user", "customer_inquiry", "ai_cs", userID, &meta); logErr != nil {
			log.Printf("[AI AUDIT ERR] %v", logErr)
		}
	}()

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
	if len(req.Prompt) > 1000 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Instruksi promo terlalu panjang (maksimal 1.000 karakter)",
			"code":  "PROMPT_TOO_LONG",
		})
	}
	if len(req.Phone) > 25 {
		req.Phone = req.Phone[:25]
	}

	ctx, cancel := context.WithTimeout(c.Context(), 20*time.Second)
	defer cancel()

	products, _ := h.productRepo.GetAllByStore(storeID)
	store, _ := h.storeRepo.GetByID(storeID)
	storeName := "Toko Kami"
	if store != nil {
		storeName = store.Name
	}

	// PENTING: Jangan kirim seluruh objek models.Product yang berisi buy_price (harga beli)!
	// Hanya kirim nama dan harga jual untuk kebutuhan copy promo.
	type PromoProductDTO struct {
		Name      string `json:"name"`
		SellPrice int64  `json:"price"`
	}
	var promoProds []PromoProductDTO
	for _, p := range products {
		if p.CurrentStock > 0 {
			promoProds = append(promoProds, PromoProductDTO{
				Name:      p.Name,
				SellPrice: p.SellPrice,
			})
		}
	}
	prodJSON, _ := json.Marshal(promoProds)

	promoText, err := h.llmService.GeneratePromo(ctx, req.Prompt, string(prodJSON), storeName, req.Phone)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Audit log
	userID, _ := c.Locals("user_id").(uint)
	go func() {
		meta := fmt.Sprintf(`{"user_id":%d,"prompt_len":%d,"model":%q}`, userID, len(req.Prompt), promoText.Model)
		if logErr := h.auditRepo.Log(h.db, storeID, "user", "generate_promo", "ai_promo", userID, &meta); logErr != nil {
			log.Printf("[AI AUDIT ERR] %v", logErr)
		}
	}()

	return c.JSON(fiber.Map{
		"promo_text":   promoText.Content,
		"model":        promoText.Model,
		"request_id":   promoText.RequestID,
		"total_tokens": promoText.TotalTokens,
		"latency_ms":   promoText.LatencyMs,
	})
}

// sanitizeHistory strips untrusted roles, caps turns and characters, and prevents prompt injection.
func sanitizeHistory(history []services.ChatHistoryItem, maxTurns int) []services.ChatHistoryItem {
	if len(history) > maxTurns {
		history = history[len(history)-maxTurns:]
	}
	result := make([]services.ChatHistoryItem, 0, len(history))
	totalChars := 0
	maxTotalChars := 3000

	for _, h := range history {
		role := strings.ToLower(strings.TrimSpace(h.Role))
		if role != "user" && role != "assistant" {
			continue // Tolak role di luar user dan assistant
		}

		content := strings.TrimSpace(h.Content)
		if len(content) == 0 {
			continue
		}
		if len(content) > 500 {
			content = content[:500] // Maksimal 500 karakter per giliran riwayat
		}

		if totalChars+len(content) > maxTotalChars {
			break
		}
		totalChars += len(content)

		// Drop items that look like system-prompt injection attempts.
		lower := strings.ToLower(content)
		if strings.Contains(lower, "ignore previous") ||
			strings.Contains(lower, "you are now") ||
			strings.Contains(lower, "jailbreak") ||
			strings.Contains(lower, "act as") ||
			strings.Contains(lower, "<system>") ||
			strings.Contains(lower, "[system]") ||
			strings.Contains(lower, "system:") {
			continue
		}
		result = append(result, services.ChatHistoryItem{Role: role, Content: content})
	}
	return result
}
