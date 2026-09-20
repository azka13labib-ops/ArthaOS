package middleware

import (
	"testing"
)

func TestValidateNoSSRF(t *testing.T) {
	tests := []struct {
		name   string
		url    string
		isSSRF bool
	}{
		{"Public HTTPS URL", "https://api.whatsapp.com/v1/messages", false},
		{"Public HTTP URL", "http://example.com/webhook", false},
		{"Localhost hostname", "http://localhost:8080/admin", true},
		{"Loopback IPv4", "http://127.0.0.1:3000/internal", true},
		{"Private 10.x IP", "http://10.0.0.1/secret", true},
		{"Private 192.168.x IP", "http://192.168.1.100/router", true},
		{"AWS Metadata endpoint", "http://169.254.169.254/latest/meta-data/", true},
		{"GCP Metadata hostname", "http://metadata.google.internal/computeMetadata/v1/", true},
		{"Non-HTTP scheme", "file:///etc/passwd", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ValidateNoSSRF(tt.url)
			if got != tt.isSSRF {
				t.Errorf("ValidateNoSSRF(%q) = %v; want %v", tt.url, got, tt.isSSRF)
			}
		})
	}
}

func TestIsInternalIP(t *testing.T) {
	tests := []struct {
		ip       string
		expected bool
	}{
		{"127.0.0.1", true},
		{"10.0.0.5", true},
		{"172.16.50.1", true},
		{"192.168.1.1", true},
		{"169.254.1.1", true},
		{"::1", true},
		{"8.8.8.8", false},
		{"1.1.1.1", false},
		{"93.184.216.34", false},
		{"invalid-ip", false},
	}

	for _, tt := range tests {
		t.Run(tt.ip, func(t *testing.T) {
			got := isInternalIP(tt.ip)
			if got != tt.expected {
				t.Errorf("isInternalIP(%q) = %v; want %v", tt.ip, got, tt.expected)
			}
		})
	}
}
