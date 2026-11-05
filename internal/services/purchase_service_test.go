package services_test

import (
	"testing"

	"app/internal/services"
)

func TestPurchaseService_Validation(t *testing.T) {
	service := services.NewPurchaseService(nil, nil)

	// 1. Validasi tanpa item barang
	_, errNoItems := service.Create(1, services.CreatePurchaseRequest{
		Items: []services.CreatePurchaseItemRequest{},
	})
	if errNoItems == nil || errNoItems.Error() != "faktur pembelian harus memiliki minimal 1 item barang" {
		t.Fatalf("expected 'faktur pembelian harus memiliki minimal 1 item barang', got: %v", errNoItems)
	}

	// 2. Validasi kuantitas item <= 0
	_, errInvalidQty := service.Create(1, services.CreatePurchaseRequest{
		Items: []services.CreatePurchaseItemRequest{
			{ItemName: "Gula Pasir", Quantity: 0, BuyPrice: 12000},
		},
	})
	if errInvalidQty == nil || errInvalidQty.Error() != "kuantitas barang harus lebih dari 0" {
		t.Fatalf("expected 'kuantitas barang harus lebih dari 0', got: %v", errInvalidQty)
	}

	// 3. Validasi harga beli negatif
	_, errNegativePrice := service.Create(1, services.CreatePurchaseRequest{
		Items: []services.CreatePurchaseItemRequest{
			{ItemName: "Gula Pasir", Quantity: 5, BuyPrice: -100},
		},
	})
	if errNegativePrice == nil || errNegativePrice.Error() != "harga beli barang tidak valid" {
		t.Fatalf("expected 'harga beli barang tidak valid', got: %v", errNegativePrice)
	}

	// 4. Validasi pembayaran supplier amount <= 0
	_, errPaymentZero := service.AddPayment(1, 1, services.CreateSupplierPaymentRequest{
		Amount: 0,
	})
	if errPaymentZero == nil || errPaymentZero.Error() != "nominal pembayaran harus lebih dari 0" {
		t.Fatalf("expected 'nominal pembayaran harus lebih dari 0', got: %v", errPaymentZero)
	}
}
