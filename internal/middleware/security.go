package middleware

import (
	"net"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/helmet"
	"github.com/gofiber/fiber/v3/middleware/limiter"
)

func SecurityHeaders() fiber.Handler {
	return helmet.New(helmet.Config{
		XSSProtection:         "1; mode=block",
		ContentTypeNosniff:    "nosniff",
		XFrameOptions:         "DENY",
		ReferrerPolicy:        "strict-origin-when-cross-origin",
		ContentSecurityPolicy: "default-src 'self'",
		HSTSMaxAge:            31536000,
	})
}

func CORS(allowedOrigins string) fiber.Handler {
	originList := []string{"http://localhost:3000", "http://localhost:5173"}
	if allowedOrigins != "" {
		originList = strings.Split(allowedOrigins, ",")
	}
	return cors.New(cors.Config{
		AllowOrigins:     originList,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Request-ID"},
		AllowCredentials: false,
		MaxAge:           86400,
	})
}

func RateLimitAPI() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        300,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Too many requests. Please slow down.",
				"code":  "RATE_LIMIT_EXCEEDED",
			})
		},
	})
}

func RateLimitLogin() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        5,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c fiber.Ctx) string {
			return "login:" + c.IP()
		},
		LimitReached: func(c fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Too many login attempts. Try again in a minute.",
				"code":  "LOGIN_RATE_LIMIT_EXCEEDED",
			})
		},
	})
}

func PreventPathTraversal() fiber.Handler {
	dangerous := []string{"../", "..\\", "%2e%2e", "%2E%2E", "..%2f", "..%5c"}
	return func(c fiber.Ctx) error {
		path := strings.ToLower(c.Path())
		for _, pattern := range dangerous {
			if strings.Contains(path, pattern) {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Invalid request path",
					"code":  "INVALID_PATH",
				})
			}
		}
		return c.Next()
	}
}

func isInternalIP(ipStr string) bool {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return false
	}
	privateRanges := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"127.0.0.0/8",
		"169.254.0.0/16",
		"::1/128",
		"fc00::/7",
	}
	for _, cidr := range privateRanges {
		_, network, err := net.ParseCIDR(cidr)
		if err == nil && network.Contains(ip) {
			return true
		}
	}
	return false
}

func ValidateNoSSRF(rawURL string) bool {
	u, err := url.Parse(rawURL)
	if err != nil {
		return false
	}

	if u.Scheme != "http" && u.Scheme != "https" {
		return false
	}
	host := u.Hostname()

	if isInternalIP(host) {
		return true
	}

	reserved := []string{"localhost", "metadata.google.internal", "169.254.169.254"}
	hostLower := strings.ToLower(host)
	for _, r := range reserved {
		if strings.HasSuffix(hostLower, r) {
			return true
		}
	}
	return false
}
