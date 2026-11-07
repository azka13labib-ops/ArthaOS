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

type SocialAccountDTO struct {
	ID                uint       `json:"id"`
	StoreID           uint       `json:"store_id"`
	Platform          string     `json:"platform"`
	ExternalAccountID string     `json:"external_account_id"`
	Username          string     `json:"username"`
	TokenExpiresAt    *time.Time `json:"token_expires_at"`
	Status            string     `json:"status"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type SocialService interface {
	GetTemplates() []models.PosterTemplate
	GetQuota(storeID uint) (*SocialQuotaResponse, error)
	GenerateCaption(ctx context.Context, storeID uint, userID uint, req GenerateCaptionRequest) (*GenerateCaptionResponse, error)
	RenderPoster(ctx context.Context, storeID uint, req RenderPosterRequest) (*RenderPosterResponse, error)
	SetBYOKKey(storeID uint, apiKey string, provider string) error

	// Account management (FASE 2)
	GetAccounts(storeID uint) ([]SocialAccountDTO, error)
	GetConnectURL(storeID uint, userID uint) (string, error)
	HandleOAuthCallback(ctx context.Context, code string, state string) (storeID uint, err error)
	DisconnectAccount(storeID uint, accountID uint, userID uint) error
	RefreshExpiringTokens(ctx context.Context) (refreshedCount int, failedCount int, err error)
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
	Theme       string `json:"theme,omitempty"`        // light, cream, dark
	AspectRatio string `json:"aspect_ratio,omitempty"` // 4:5, 9:16, 1:1
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
	db            *gorm.DB
	socialRepo    repository.SocialRepository
	productRepo   repository.ProductRepository
	storeRepo     repository.StoreRepository
	auditRepo     repository.AuditRepository
	llmService    LLMService
	metaService   MetaService
	pushService   PushService
	encryptionKey string
	appBaseURL    string
	uploadsDir    string
}

func NewSocialService(
	db *gorm.DB,
	socialRepo repository.SocialRepository,
	productRepo repository.ProductRepository,
	storeRepo repository.StoreRepository,
	auditRepo repository.AuditRepository,
	llmService LLMService,
	metaService MetaService,
	pushService PushService,
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
		metaService:   metaService,
		pushService:   pushService,
		encryptionKey: encryptionKey,
		appBaseURL:    strings.TrimSuffix(appBaseURL, "/"),
		uploadsDir:    uploadsDir,
	}
}

func (s *socialService) GetTemplates() []models.PosterTemplate {
	return []models.PosterTemplate{
		{
			ID:                "editorial-fnb",
			Name:              "Editorial Kuliner & Kopi",
			Category:          "new_product",
			DefaultBrandColor: "#C2410C",
			DefaultTheme:      "cream",
			DefaultFont:       "editorial",
			Description:       "Gaya menu editorial hangat dengan bingkai foto proporsional dan tipografi serif elegan.",
			AspectRatio:       "4:5",
			Width:             1080,
			Height:            1350,
		},
		{
			ID:                "promo-deal",
			Name:              "Promo Diskon & Harga Coret",
			Category:          "promo",
			DefaultBrandColor: "#E11D48",
			DefaultTheme:      "light",
			DefaultFont:       "promo-bold",
			Description:       "Tata letak ritel tegas dengan sorotan harga coret, kalkulasi persen hemat, dan CTA jelas.",
			AspectRatio:       "4:5",
			Width:             1080,
			Height:            1350,
		},
		{
			ID:                "hero-scrim",
			Name:              "Foto Penuh (Full Hero)",
			Category:          "promo",
			DefaultBrandColor: "#D97706",
			DefaultTheme:      "dark",
			DefaultFont:       "modern",
			Description:       "Foto produk memenuhi kanvas dengan gradasi baca halus untuk tampilan visual maksimal.",
			AspectRatio:       "4:5",
			Width:             1080,
			Height:            1350,
		},
		{
			ID:                "new-arrival",
			Name:              "Katalog Minimalis Bersih",
			Category:          "new_product",
			DefaultBrandColor: "#0F766E",
			DefaultTheme:      "light",
			DefaultFont:       "modern",
			Description:       "Komposisi galeri bersih bergaris tipis untuk produk baru, fesyen, atau katalog toko.",
			AspectRatio:       "4:5",
			Width:             1080,
			Height:            1350,
		},
		{
			ID:                "warm-artisan",
			Name:              "Bingkai Lengkung Artisan",
			Category:          "promo",
			DefaultBrandColor: "#9333EA",
			DefaultTheme:      "cream",
			DefaultFont:       "warm-casual",
			Description:       "Jendela foto lengkung lembut untuk kuliner rumahan, hampers, roti, dan paket spesial.",
			AspectRatio:       "4:5",
			Width:             1080,
			Height:            1350,
		},
		{
			ID:                "tips-quote",
			Name:              "Info Toko & Kutipan",
			Category:          "education",
			DefaultBrandColor: "#2563EB",
			DefaultTheme:      "light",
			DefaultFont:       "editorial",
			Description:       "Fokus tipografi rapi untuk pengumuman jam buka, edukasi pelanggan, dan kutipan brand.",
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

	bounds := outputImg.Bounds()
	renderedWidth := bounds.Dx()
	renderedHeight := bounds.Dy()
	if renderedWidth <= 0 {
		renderedWidth = 1080
	}
	if renderedHeight <= 0 {
		renderedHeight = 1350
	}

	return &RenderPosterResponse{
		URL:        relativeURL,
		FullURL:    fullURL,
		Filename:   randomFilename,
		TemplateID: req.TemplateID,
		Width:      renderedWidth,
		Height:     renderedHeight,
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

func resolvePosterDimensions(aspectRatio string) (int, int) {
	switch strings.TrimSpace(aspectRatio) {
	case "9:16":
		return 1080, 1920
	case "1:1":
		return 1080, 1080
	default:
		return 1080, 1350
	}
}

func generateServerPoster(req RenderPosterRequest) image.Image {
	width, height := resolvePosterDimensions(req.AspectRatio)
	img := image.NewRGBA(image.Rect(0, 0, width, height))

	brandColor := parseHexColor(req.BrandColor, color.RGBA{R: 225, G: 29, B: 72, A: 255})
	theme := strings.ToLower(strings.TrimSpace(req.Theme))

	switch theme {
	case "light":
		bg := color.RGBA{R: 250, G: 249, B: 246, A: 255}
		draw.Draw(img, img.Bounds(), &image.Uniform{bg}, image.Point{}, draw.Src)
		cardColor := color.RGBA{R: 255, G: 255, B: 255, A: 255}
		draw.Draw(img, image.Rect(72, 180, width-72, height-180), &image.Uniform{cardColor}, image.Point{}, draw.Src)
	case "cream":
		bg := color.RGBA{R: 245, G: 239, B: 230, A: 255}
		draw.Draw(img, img.Bounds(), &image.Uniform{bg}, image.Point{}, draw.Src)
		cardColor := color.RGBA{R: 252, G: 248, B: 242, A: 255}
		draw.Draw(img, image.Rect(72, 180, width-72, height-180), &image.Uniform{cardColor}, image.Point{}, draw.Src)
	default:
		for y := 0; y < height; y++ {
			ratio := float64(y) / float64(height)
			r := uint8(float64(brandColor.R)*0.20*(1-ratio) + 16*ratio)
			g := uint8(float64(brandColor.G)*0.20*(1-ratio) + 18*ratio)
			b := uint8(float64(brandColor.B)*0.20*(1-ratio) + 24*ratio)
			c := color.RGBA{R: r, G: g, B: b, A: 255}
			for x := 0; x < width; x++ {
				img.Set(x, y, c)
			}
		}
		cardRect := image.Rect(72, 200, width-72, height-200)
		cardColor := color.RGBA{R: 255, G: 255, B: 255, A: 16}
		draw.Draw(img, cardRect, &image.Uniform{cardColor}, image.Point{}, draw.Over)
	}

	accentBar := image.Rect(0, 0, width, 20)
	draw.Draw(img, accentBar, &image.Uniform{brandColor}, image.Point{}, draw.Src)

	footerRect := image.Rect(72, height-140, width-72, height-60)
	draw.Draw(img, footerRect, &image.Uniform{brandColor}, image.Point{}, draw.Src)

	return img
}

func (s *socialService) GetAccounts(storeID uint) ([]SocialAccountDTO, error) {
	acc, err := s.socialRepo.GetAccountByStore(storeID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return []SocialAccountDTO{}, nil
		}
		return nil, fmt.Errorf("gagal membaca akun sosial toko: %w", err)
	}

	return []SocialAccountDTO{
		{
			ID:                acc.ID,
			StoreID:           acc.StoreID,
			Platform:          acc.Platform,
			ExternalAccountID: acc.ExternalAccountID,
			Username:          acc.Username,
			TokenExpiresAt:    acc.TokenExpiresAt,
			Status:            acc.Status,
			CreatedAt:         acc.CreatedAt,
			UpdatedAt:         acc.UpdatedAt,
		},
	}, nil
}

func (s *socialService) GetConnectURL(storeID uint, userID uint) (string, error) {
	if s.metaService == nil {
		return "", errors.New("layanan Meta belum aktif di server")
	}
	return s.metaService.GenerateAuthURL(storeID, userID)
}

func (s *socialService) HandleOAuthCallback(ctx context.Context, code string, state string) (uint, error) {
	if s.metaService == nil {
		return 0, errors.New("layanan Meta belum aktif di server")
	}

	storeID, userID, err := s.metaService.ValidateState(state)
	if err != nil {
		return 0, fmt.Errorf("validasi state gagal: %w", err)
	}

	token, expiresIn, err := s.metaService.ExchangeCodeForToken(ctx, code)
	if err != nil {
		return storeID, fmt.Errorf("pertukaran token Meta gagal: %w", err)
	}

	accountID, username, err := s.metaService.GetInstagramAccount(ctx, token)
	if err != nil {
		return storeID, err
	}

	encToken, err := crypto.Encrypt(s.encryptionKey, []byte(token))
	if err != nil {
		return storeID, fmt.Errorf("enkripsi token gagal: %w", err)
	}

	expiresAt := time.Now().Add(time.Duration(expiresIn) * time.Second)

	existing, _ := s.socialRepo.GetAccountByStore(storeID)
	if existing != nil {
		existing.ExternalAccountID = accountID
		existing.Username = username
		existing.AccessTokenEncrypted = encToken
		existing.TokenExpiresAt = &expiresAt
		existing.Status = "active"
		if err := s.socialRepo.SaveAccount(existing); err != nil {
			return storeID, fmt.Errorf("gagal memperbarui akun Instagram: %w", err)
		}
	} else {
		newAcc := models.SocialAccount{
			StoreID:              storeID,
			Platform:             "instagram",
			ExternalAccountID:    accountID,
			Username:             username,
			AccessTokenEncrypted: encToken,
			TokenExpiresAt:       &expiresAt,
			Status:               "active",
		}
		if err := s.socialRepo.SaveAccount(&newAcc); err != nil {
			return storeID, fmt.Errorf("gagal menyimpan akun Instagram: %w", err)
		}
	}

	// Audit log
	go func() {
		meta := fmt.Sprintf(`{"user_id":%d,"username":%q,"account_id":%q}`, userID, username, accountID)
		if logErr := s.auditRepo.Log(s.db, storeID, "user", "instagram_connect", "social_account", userID, &meta); logErr != nil {
			log.Printf("[AUDIT ERROR] instagram_connect: %v", logErr)
		}
	}()

	return storeID, nil
}

func (s *socialService) DisconnectAccount(storeID uint, accountID uint, userID uint) error {
	acc, err := s.socialRepo.GetAccountByID(storeID, accountID)
	if err != nil {
		return fmt.Errorf("akun tidak ditemukan: %w", err)
	}

	if err := s.socialRepo.DeleteAccount(storeID, accountID); err != nil {
		return fmt.Errorf("gagal memutuskan akun: %w", err)
	}

	go func() {
		meta := fmt.Sprintf(`{"user_id":%d,"username":%q,"account_id":%q}`, userID, acc.Username, acc.ExternalAccountID)
		if logErr := s.auditRepo.Log(s.db, storeID, "user", "instagram_disconnect", "social_account", userID, &meta); logErr != nil {
			log.Printf("[AUDIT ERROR] instagram_disconnect: %v", logErr)
		}
	}()

	return nil
}

func (s *socialService) RefreshExpiringTokens(ctx context.Context) (int, int, error) {
	if s.metaService == nil {
		return 0, 0, nil
	}

	accounts, err := s.socialRepo.ListExpiringAccounts(7)
	if err != nil {
		return 0, 0, err
	}

	refreshed := 0
	failed := 0

	for _, acc := range accounts {
		tokenBytes, decErr := crypto.Decrypt(s.encryptionKey, acc.AccessTokenEncrypted)
		if decErr != nil {
			log.Printf("[META REFRESH WARN] Decrypt failed for acc %d: %v", acc.ID, decErr)
			acc.Status = "expired"
			_ = s.socialRepo.SaveAccount(&acc)
			failed++
			continue
		}

		newToken, expiresIn, refErr := s.metaService.RefreshToken(ctx, string(tokenBytes))
		if refErr != nil {
			log.Printf("[META REFRESH WARN] Meta API refresh failed for acc @%s: %v", acc.Username, refErr)
			acc.Status = "expired"
			_ = s.socialRepo.SaveAccount(&acc)
			failed++

			if s.pushService != nil {
				_ = s.pushService.BroadcastToStore(ctx, acc.StoreID, PushPayload{
					Title: "Koneksi Instagram Terputus",
					Body:  fmt.Sprintf("Token akun Instagram @%s telah kedaluwarsa. Silakan hubungkan ulang di menu Media Sosial.", acc.Username),
					URL:   "/social",
				})
			}
			continue
		}

		newEnc, encErr := crypto.Encrypt(s.encryptionKey, []byte(newToken))
		if encErr == nil {
			expiresAt := time.Now().Add(time.Duration(expiresIn) * time.Second)
			acc.AccessTokenEncrypted = newEnc
			acc.TokenExpiresAt = &expiresAt
			acc.Status = "active"
			_ = s.socialRepo.SaveAccount(&acc)
			refreshed++
		}
	}

	return refreshed, failed, nil
}
