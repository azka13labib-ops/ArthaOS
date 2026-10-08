package handlers

import (
	"app/internal/services"

	"github.com/gofiber/fiber/v3"
)

type SyncHandler struct {
	syncService services.SyncService
}

func NewSyncHandler(syncService services.SyncService) *SyncHandler {
	return &SyncHandler{syncService}
}

func (h *SyncHandler) BatchSync(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req services.BatchSyncRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	resp, err := h.syncService.BatchSync(storeID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to sync data"})
	}

	return c.JSON(resp)
}
