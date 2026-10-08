package middleware

import (
	"log"
	"time"

	"github.com/gofiber/fiber/v3"
)

func RequestLogger() fiber.Handler {
	return func(c fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		latency := time.Since(start)

		status := c.Response().StatusCode()
		method := c.Method()
		path := c.Path()
		ip := c.IP()

		log.Printf("[REQUEST] %s %s | status=%d | latency=%s | ip=%s",
			method, path, status, latency.Round(time.Millisecond), ip)

		return err
	}
}
