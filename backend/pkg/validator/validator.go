package validator

import (
	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

func Validate(s interface{}) map[string]string {
	err := validate.Struct(s)
	if err == nil {
		return nil
	}
	errors := make(map[string]string)
	for _, e := range err.(validator.ValidationErrors) {
		field := e.Field()
		switch e.Tag() {
		case "required":
			errors[field] = field + " is required"
		case "email":
			errors[field] = field + " must be a valid email"
		case "min":
			errors[field] = field + " is too short (min " + e.Param() + " chars)"
		case "max":
			errors[field] = field + " is too long (max " + e.Param() + " chars)"
		case "gt":
			errors[field] = field + " must be greater than " + e.Param()
		case "gte":
			errors[field] = field + " must be >= " + e.Param()
		default:
			errors[field] = field + " is invalid"
		}
	}
	return errors
}
