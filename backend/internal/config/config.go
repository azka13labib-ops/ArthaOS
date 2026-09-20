package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL    string
	Port           string
	JWTSecret      string
	AppEnv         string
	AllowedOrigins string
	WebhookSecret  string
	GroqAPIKey     string
	GeminiAPIKey   string
	OpenAIAPIKey   string
	AIProvider     string
}

func LoadConfig() Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	cfg := Config{
		DatabaseURL:    os.Getenv("DB_URL"),
		Port:           os.Getenv("PORT"),
		JWTSecret:      os.Getenv("JWT_SECRET"),
		AppEnv:         os.Getenv("APP_ENV"),
		AllowedOrigins: os.Getenv("ALLOWED_ORIGINS"),
		WebhookSecret:  os.Getenv("WEBHOOK_SECRET"),
		GroqAPIKey:     os.Getenv("GROQ_API_KEY"),
		GeminiAPIKey:   os.Getenv("GEMINI_API_KEY"),
		OpenAIAPIKey:   os.Getenv("OPENAI_API_KEY"),
		AIProvider:     os.Getenv("AI_PROVIDER"),
	}

	if len(cfg.JWTSecret) < 32 {
		log.Fatal("FATAL: JWT_SECRET must be at least 32 characters long. Set a strong secret in .env")
	}

	if cfg.AppEnv == "" {
		cfg.AppEnv = "development"
	}

	return cfg
}

func (c Config) IsProduction() bool {
	return c.AppEnv == "production"
}
