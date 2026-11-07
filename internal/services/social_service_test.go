package services_test

import (
	"context"
	"os"
	"testing"

	"app/internal/services"
)

type mockLLM struct {
	services.LLMService
}

func (m *mockLLM) GenerateSocialCaption(ctx context.Context, input services.GenerateSocialCaptionInput) (*services.SocialCaptionResult, *services.LLMResponse, error) {
	return &services.SocialCaptionResult{
		Headline:    "Promo Hebat Hari Ini",
		Subheadline: "Dapatkan diskon menarik di toko kami sekarang",
		Caption:     "Nikmati promo hemat hari ini hanya di toko kami!",
		Hashtags:    []string{"#promo", "#umkm", "#hemat"},
	}, &services.LLMResponse{Model: "mock-model", LatencyMs: 10}, nil
}

func TestSocialService_GetTemplates(t *testing.T) {
	svc := services.NewSocialService(nil, nil, nil, nil, nil, nil, nil, nil, "key", "http://localhost:8080", "./uploads/posters")
	templates := svc.GetTemplates()

	if len(templates) < 6 {
		t.Fatalf("Expected at least 6 curated templates, got %d", len(templates))
	}

	foundPromo := false
	foundNew := false
	foundEdu := false

	for _, tmpl := range templates {
		if tmpl.Width != 1080 || tmpl.Height != 1350 {
			t.Errorf("Template %s has wrong dimensions: %dx%d (expected 1080x1350)", tmpl.ID, tmpl.Width, tmpl.Height)
		}
		if tmpl.AspectRatio != "4:5" {
			t.Errorf("Template %s has wrong aspect ratio: %s", tmpl.ID, tmpl.AspectRatio)
		}
		if tmpl.Category == "promo" {
			foundPromo = true
		}
		if tmpl.Category == "new_product" {
			foundNew = true
		}
		if tmpl.Category == "education" {
			foundEdu = true
		}
	}

	if !foundPromo || !foundNew || !foundEdu {
		t.Errorf("Missing required template categories: promo=%v, new=%v, edu=%v", foundPromo, foundNew, foundEdu)
	}
}

func TestSocialService_RenderPoster(t *testing.T) {
	testDir := "./test_uploads_posters"
	defer os.RemoveAll(testDir)

	svc := services.NewSocialService(nil, nil, nil, nil, nil, nil, nil, nil, "key", "http://localhost:8080", testDir)

	req := services.RenderPosterRequest{
		TemplateID:  "promo-deal",
		Headline:    "Diskon Akhir Pekan",
		Subheadline: "Semua varian kopi diskon 20%",
		BrandColor:  "#E11D48",
	}

	res, err := svc.RenderPoster(context.Background(), 1, req)
	if err != nil {
		t.Fatalf("RenderPoster failed: %v", err)
	}

	if res.Width != 1080 || res.Height != 1350 {
		t.Errorf("Expected 1080x1350, got %dx%d", res.Width, res.Height)
	}
	if res.Format != "jpeg" {
		t.Errorf("Expected format jpeg, got %s", res.Format)
	}
	if res.URL == "" || res.FullURL == "" {
		t.Errorf("Expected non-empty URLs")
	}

	// Verify file was actually created on disk
	filePath := testDir + "/" + res.Filename
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		t.Errorf("Rendered file was not found on disk: %s", filePath)
	}

	// Verify 9:16 Story / WA Status dimensions
	storyRes, err := svc.RenderPoster(context.Background(), 1, services.RenderPosterRequest{
		TemplateID:  "editorial-fnb",
		Headline:    "Kopi Susu Gula Aren",
		AspectRatio: "9:16",
		Theme:       "cream",
	})
	if err != nil {
		t.Fatalf("RenderPoster 9:16 failed: %v", err)
	}
	if storyRes.Width != 1080 || storyRes.Height != 1920 {
		t.Errorf("Expected 1080x1920 for 9:16, got %dx%d", storyRes.Width, storyRes.Height)
	}
}
