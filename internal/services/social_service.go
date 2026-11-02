package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"image/png"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"app/internal/models"
	"app/internal/repository"
	"app/pkg/crypto"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SocialService interface {
	GetTemplates() []models.PosterTemplate
	GetQuota(storeID uint) (*SocialQuotaResponse, error)
	GenerateCaption(ctx context.Context, storeID uint, userID uint, req GenerateCaptionRequest) (*GenerateCaptionResponse, error)
	RenderPoster(ctx context.Context, storeID uint, req RenderPosterRequest) (*RenderPosterResponse, error)
	SetBYOKKey(storeID uint, apiKey string, provider string) error
}

type SocialQuotaResponse struct {
	Plan         string `json:"plan"`
	YearMonth    string `json:"year_month"`
	CaptionUsed  int    `json:"caption_used"`
	CaptionLimit int    `json:"caption_limit"`
	PostUsed     int    `json:"post_used"`
	PostLimit    int    `json:"post_limit"`
	HasBYOK      bool   `json:"has_byok"`
	CaptionLeft  int    `json:"caption_left"`
	PostLeft     int    `json:"post_left"`
}

type GenerateCaptionRequest struct {
	ProductIDs []uint `json:"product_ids"`
	Goal       string `json:"goal"` // promo, new_product, testimonial, education
	Tone       string `json:"tone"` // santai, profesional, ramah
	ExtraNote  string `json:"extra_note"`
}

type GenerateCaptionResponse struct {
	Caption      string   `json:"caption"`
	Hashtags     []string `json:"hashtags"`
	Headline     string   `json:"headline"`
	Subheadline  string   `json:"subheadline"`
	QuotaLeft    int      `json:"quota_left"`
	IsBYOK       bool     `json:"is_byok"`
	Model        string   `json:"model,omitempty"`
	LatencyMs    int64    `json:"latency_ms,omitempty"`
}

type RenderPosterRequest struct {
	TemplateID  string `json:"template_id"`
	Headline    string `json:"headline"`
	Subheadline string `json:"subheadline"`
	PriceText   string `json:"price_text,omitempty"`
	BrandColor  string `json:"brand_color,omitempty"`
	StoreName   string `json:"store_name,omitempty"`
	ImageData   string `json:"image_data,omitempty"` // Base64 data URL from frontend canvas (optional)
	ImageURL    string `json:"image_url,omitempty"`  // Existing image URL
}

type RenderPosterResponse struct {
	URL        string `json:"url"`
	FullURL    string `json:"full_url"`
	Filename   string `json:"filename"`
	TemplateID string `json:"template_id"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
	Format     string `json:"format"`
	FileSize   int64  `json:"file_size"`
}

type socialService struct {
	db             *gorm.DB
	socialRepo     repository.SocialRepository
	productRepo    repository.ProductRepository
	storeRepo      repository.StoreRepository
	auditRepo      repository.AuditRepository
	llmService     LLMService
	encryptionKey  string
	appBaseURL     string
	uploadsDir     string
}

func NewSocialService(
	db *gorm.DB,
	socialRepo repository.SocialRepository,
	productRepo repository.ProductRepository,
	storeRepo repository.StoreRepository,
	auditRepo repository.AuditRepository,
	llmService LLMService,
	encryptionKey string,
	appBaseURL string,
	uploadsDir string,
) SocialService {
	if uploadsDir == "" {
		uploadsDir = "./uploads/posters"
	}
	_ = os.MkdirAll(uploadsDir, 0755)

	if appBaseURL == "" {
		appBaseURL = "http://localhost:8080"
	}

	return &socialService{
		db:            db,
		socialRepo:    socialRepo,
		productRepo:   productRepo,
		storeRepo:     storeRepo,
		auditRepo:     auditRepo,
		llmService:    llmService,
		encryptionKey: encryptionKey,
		appBaseURL:    strings.TrimSuffix(appBaseURL, "/"),
		uploadsDir:    uploadsDir,
	}
}

func (s *socialService) GetTemplates() []models.PosterTemplate {
	return []models.PosterTemplate{
		{
			ID:                "promo-deal",
			Name:              "Promo Diskon & Flash Sale",
			Category:          "promo",
			DefaultBrandColor: "#E11D48",
			Description:       "Desain tebal berenergi tinggi dengan badge harga dan aksen promo mencolok.",
			AspectRatio:       "4:5",
			Width:             1080,
			Height:            1350,
		},
		{
			ID:                "new-arrival",
			Name:              "Produk Baru & Menu Baru",
			Category:          "new_product",
			DefaultBrandColor: "#4F46E5",
			Description:       "Tampilan modern dan estetik untuk peluncuran menu atau kedatangan stok baru.",
			AspectRatio:       "4:5",
			Width:             1080,
			Height:            1350,
		},
		{
			ID:                "tips-quote",
			Name:              "Tips, Edukasi & Quote Toko",
			Category:          "education",
			DefaultBrandColor: "#059669",
			Description:       "Layout tipografi editorial elegan untuk kutipan inspiratif dan tips pelanggan.",
			AspectRatio:       "4:5",
			Width:             1080,
			Height:            1350,
		},
	}
}

func (s *socialService) getLimitsForPlan(plan string) (int, int) {
	switch strings.ToLower(plan) {
	case "pro":
		return 200, 100 // 200 captions, 100 posts
	case "starter":
		return 50, 30 // 50 captions, 30 posts
	default:
		return 15, 5 // 15 captions, 5 posts (free)
	}
}

func (s *socialService) GetQuota(storeID uint) (*SocialQuotaResponse, error) {
	yearMonth := time.Now().Format("2006-01")
	usage, err := s.socialRepo.GetOrCreateUsage(storeID, yearMonth)
	if err != nil {
		return nil, fmt.Errorf("gagal membaca data kuota toko: %w", err)
	}

	plan := "free"
	sub, subErr := s.socialRepo.GetActiveSubscription(storeID)
	if subErr == nil && sub != nil && sub.Plan != "" {
		plan = sub.Plan
	}

	captionLimit, postLimit := s.getLimitsForPlan(plan)
	hasBYOK := usage.CustomAIKeyEncrypted != ""

	captionLeft := captionLimit - usage.CaptionCount
	if captionLeft < 0 {
		captionLeft = 0
	}
	if hasBYOK {
		captionLeft = 999999 // Unlimited when BYOK is enabled
	}

	postLeft := postLimit - usage.PostCount
	if postLeft < 0 {
		postLeft = 0
	}

	return &SocialQuotaResponse{
		Plan:         plan,
		YearMonth:    yearMonth,
		CaptionUsed:  usage.CaptionCount,
		CaptionLimit: captionLimit,
		PostUsed:     usage.PostCount,
		PostLimit:    postLimit,
		HasBYOK:      hasBYOK,
		CaptionLeft:  captionLeft,
		PostLeft:     postLeft,
	}, nil
}

func (s *socialService) SetBYOKKey(storeID uint, apiKey string, provider string) error {
	apiKey = strings.TrimSpace(apiKey)
	if apiKey == "" {
		return s.socialRepo.SaveCustomAIKey(storeID, "", "")
	}

	encKey := s.encryptionKey
	if encKey == "" {
		encKey = "artha-default-secret-key-32chars!"
	}

	encrypted, err := crypto.Encrypt(encKey, []byte(apiKey))
	if err != nil {
		return fmt.Errorf("gagal mengenkripsi API key: %w", err)
	}

	if provider == "" {
		provider = "groq"
	}

	return s.socialRepo.SaveCustomAIKey(storeID, encrypted, provider)
}

func (s *socialService) GenerateCaption(ctx context.Context, storeID uint, userID uint, req GenerateCaptionRequest) (*GenerateCaptionResponse, error) {
	quota, err := s.GetQuota(storeID)
	if err != nil {
		return nil, err
	}

	if !quota.HasBYOK && quota.CaptionLeft <= 0 {
		return nil, fmt.Errorf("kuota pembuatan caption AI bulan ini telah habis (%d/%d). Silakan upgrade paket langganan atau gunakan API key sendiri (BYOK)", quota.CaptionUsed, quota.CaptionLimit)
	}

	store, err := s.storeRepo.GetByID(storeID)
	if err != nil {
		return nil, fmt.Errorf("data toko tidak ditemukan: %w", err)
	}

	// Fetch selected products
	var productsDTO []SocialProductDTO
	if len(req.ProductIDs) > 0 {
		allProducts, _ := s.productRepo.GetAllByStore(storeID)
		selectedMap := make(map[uint]bool)
		for _, id := range req.ProductIDs {
			selectedMap[id] = true
		}
		for _, p := range allProducts {
			if selectedMap[p.ID] {
				productsDTO = append(productsDTO, SocialProductDTO{
					Name:      p.Name,
					SellPrice: p.SellPrice,
				})
			}
		}
	}

	var customKey string
	if quota.HasBYOK {
		yearMonth := time.Now().Format("2006-01")
		usage, _ := s.socialRepo.GetOrCreateUsage(storeID, yearMonth)
		if usage != nil && usage.CustomAIKeyEncrypted != "" {
			encKey := s.encryptionKey
			if encKey == "" {
				encKey = "artha-default-secret-key-32chars!"
			}
			decrypted, decErr := crypto.Decrypt(encKey, usage.CustomAIKeyEncrypted)
			if decErr == nil {
				customKey = string(decrypted)
			}
		}
	}

	llmInput := GenerateSocialCaptionInput{
		StoreName:   store.Name,
		Goal:        req.Goal,
		Tone:        req.Tone,
		ExtraNote:   req.ExtraNote,
		Products:    productsDTO,
		CustomAIKey: customKey,
	}

	res, llmResp, err := s.llmService.GenerateSocialCaption(ctx, llmInput)
	if err != nil {
		return nil, err
	}

	// Deduct quota if not using BYOK
	currentMonth := time.Now().Format("2006-01")
	if !quota.HasBYOK {
		if incErr := s.socialRepo.IncrementCaptionUsage(storeID, currentMonth); incErr != nil {
			log.Printf("[SOCIAL QUOTA WARN] store %d usage increment error: %v", storeID, incErr)
		}
		quota.CaptionUsed++
		quota.CaptionLeft--
	}

	// Async audit log
	go func() {
		meta := fmt.Sprintf(`{"user_id":%d,"goal":%q,"is_byok":%v,"products_count":%d}`, userID, req.Goal, quota.HasBYOK, len(productsDTO))
		if logErr := s.auditRepo.Log(s.db, storeID, "user", "generate_social_caption", "social", userID, &meta); logErr != nil {
			log.Printf("[AUDIT ERROR] social caption: %v", logErr)
		}
	}()

	resp := &GenerateCaptionResponse{
		Caption:     res.Caption,
		Hashtags:    res.Hashtags,
		Headline:    res.Headline,
		Subheadline: res.Subheadline,
		QuotaLeft:   quota.CaptionLeft,
		IsBYOK:      quota.HasBYOK,
	}
	if llmResp != nil {
		resp.Model = llmResp.Model
		resp.LatencyMs = llmResp.LatencyMs
	}

	return resp, nil
}

func (s *socialService) RenderPoster(ctx context.Context, storeID uint, req RenderPosterRequest) (*RenderPosterResponse, error) {
	_ = ctx
	_ = storeID

	if err := os.MkdirAll(s.uploadsDir, 0755); err != nil {
		return nil, fmt.Errorf("gagal membuat direktori upload: %w", err)
	}

	randomFilename := fmt.Sprintf("%s.jpg", uuid.New().String())
	outputPath := filepath.Join(s.uploadsDir, randomFilename)

	var outputImg image.Image
	var isRendered bool

	// 1. If client provided base64 canvas image data
	if req.ImageData != "" {
		img, err := decodeBase64Image(req.ImageData)
		if err == nil && img != nil {
			outputImg = img
			isRendered = true
		} else {
			log.Printf("[POSTER RENDER WARN] Base64 decode failed, falling back to server render: %v", err)
		}
	}

	// 2. Server-side generator fallback if no client image data was sent
	if !isRendered {
		outputImg = generateServerPoster(req)
	}

	// Save to JPEG file (quality 92 for optimal Instagram compression)
	f, err := os.Create(outputPath)
	if err != nil {
		return nil, fmt.Errorf("gagal menyimpan file poster: %w", err)
	}
	defer f.Close()

	opt := &jpeg.Options{Quality: 92}
	if err := jpeg.Encode(f, outputImg, opt); err != nil {
		return nil, fmt.Errorf("gagal encode poster JPEG: %w", err)
	}

	fi, _ := f.Stat()
	fileSize := int64(0)
	if fi != nil {
		fileSize = fi.Size()
	}

	relativeURL := fmt.Sprintf("/uploads/posters/%s", randomFilename)
	fullURL := fmt.Sprintf("%s%s", s.appBaseURL, relativeURL)

	return &RenderPosterResponse{
		URL:        relativeURL,
		FullURL:    fullURL,
		Filename:   randomFilename,
		TemplateID: req.TemplateID,
		Width:      1080,
		Height:     1350,
		Format:     "jpeg",
		FileSize:   fileSize,
	}, nil
}

func decodeBase64Image(dataURI string) (image.Image, error) {
	// Strip data:image/...;base64,
	commaIdx := strings.Index(dataURI, ",")
	if commaIdx != -1 {
		dataURI = dataURI[commaIdx+1:]
	}

	dataURI = strings.TrimSpace(dataURI)
	rawBytes, err := base64.StdEncoding.DecodeString(dataURI)
	if err != nil {
		return nil, fmt.Errorf("base64 decode error: %w", err)
	}

	// Try JPEG decode first
	img, err := jpeg.Decode(bytes.NewReader(rawBytes))
	if err == nil {
		return img, nil
	}

	// Try PNG decode fallback
	img, err = png.Decode(bytes.NewReader(rawBytes))
	if err == nil {
		return img, nil
	}

	return nil, errors.New("format gambar tidak dikenali (hanya mendukung JPEG atau PNG)")
}

func parseHexColor(hexStr string, defaultColor color.RGBA) color.RGBA {
	hexStr = strings.TrimPrefix(hexStr, "#")
	if len(hexStr) == 6 {
		r, err1 := strconv.ParseUint(hexStr[0:2], 16, 8)
		g, err2 := strconv.ParseUint(hexStr[2:4], 16, 8)
		b, err3 := strconv.ParseUint(hexStr[4:6], 16, 8)
		if err1 == nil && err2 == nil && err3 == nil {
			return color.RGBA{R: uint8(r), G: uint8(g), B: uint8(b), A: 255}
		}
	}
	return defaultColor
}

func generateServerPoster(req RenderPosterRequest) image.Image {
	width := 1080
	height := 1350
	img := image.NewRGBA(image.Rect(0, 0, width, height))

	brandColor := parseHexColor(req.BrandColor, color.RGBA{R: 225, G: 29, B: 72, A: 255}) // Default rose

	// Fill background with a modern gradient dark theme
	for y := 0; y < height; y++ {
		ratio := float64(y) / float64(height)
		// Blend from brand dark tint to deep charcoal
		r := uint8(float64(brandColor.R)*0.25*(1-ratio) + 15*ratio)
		g := uint8(float64(brandColor.G)*0.25*(1-ratio) + 23*ratio)
		b := uint8(float64(brandColor.B)*0.25*(1-ratio) + 42*ratio)
		c := color.RGBA{R: r, G: g, B: b, A: 255}
		for x := 0; x < width; x++ {
			img.Set(x, y, c)
		}
	}

	// Draw top decorative accent bar
	accentBar := image.Rect(0, 0, width, 24)
	draw.Draw(img, accentBar, &image.Uniform{brandColor}, image.Point{}, draw.Src)

	// Draw decorative card in the middle
	cardRect := image.Rect(80, 240, width-80, height-240)
	cardColor := color.RGBA{R: 255, G: 255, B: 255, A: 16}
	draw.Draw(img, cardRect, &image.Uniform{cardColor}, image.Point{}, draw.Over)

	// Draw bottom brand banner
	footerRect := image.Rect(0, height-120, width, height)
	footerColor := color.RGBA{R: 10, G: 15, B: 30, A: 255}
	draw.Draw(img, footerRect, &image.Uniform{footerColor}, image.Point{}, draw.Src)

	return img
}
