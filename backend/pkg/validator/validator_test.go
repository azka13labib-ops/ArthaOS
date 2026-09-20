package validator

import (
	"testing"
)

type TestPayload struct {
	Email    string `validate:"required,email"`
	Password string `validate:"required,min=8,max=72"`
	Price    int64  `validate:"gte=0"`
	Qty      int    `validate:"gt=0"`
}

func TestValidate_ValidStruct(t *testing.T) {
	valid := TestPayload{
		Email:    "test@example.com",
		Password: "Password123#",
		Price:    10000,
		Qty:      5,
	}

	errs := Validate(valid)
	if errs != nil {
		t.Errorf("Expected nil errors for valid struct, got %v", errs)
	}
}

func TestValidate_InvalidFields(t *testing.T) {
	invalid := TestPayload{
		Email:    "invalid-email",
		Password: "short",
		Price:    -100,
		Qty:      0,
	}

	errs := Validate(invalid)
	if errs == nil {
		t.Fatal("Expected errors for invalid struct, got nil")
	}

	if _, ok := errs["Email"]; !ok {
		t.Error("Expected error on Email field")
	}
	if _, ok := errs["Password"]; !ok {
		t.Error("Expected error on Password field")
	}
	if _, ok := errs["Price"]; !ok {
		t.Error("Expected error on Price field")
	}
	if _, ok := errs["Qty"]; !ok {
		t.Error("Expected error on Qty field")
	}
}
