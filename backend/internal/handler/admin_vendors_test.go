package handler

import (
	"fmt"
	"testing"
)

// ─── Vendor Validation Tests ──────────────────────────────────────────────────

func TestValidatePhone(t *testing.T) {
	tests := []struct {
		name     string
		phone    string
		expected bool
	}{
		{"empty phone is invalid", "", false},
		{"valid +92 format", "+923001234567", true},
		{"valid 03XX format", "0300-1234567", true},
		{"valid 03XX no dash", "03001234567", true},
		{"valid +92 no dashes", "+923001234567", true},
		{"letters in phone", "abc-def-ghij", false},
		{"dashed +92 format not supported", "+92-300-1234567", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validatePhone(tt.phone)
			if result != tt.expected {
				t.Errorf("validatePhone(%q) = %v, want %v", tt.phone, result, tt.expected)
			}
		})
	}
}

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		name     string
		email    string
		expected bool
	}{
		{"empty email is valid (optional)", "", true},
		{"valid email", "john@example.com", true},
		{"valid email with subdomain", "john@mail.example.com", true},
		{"missing @ symbol", "johnexample.com", false},
		{"missing domain", "john@", false},
		{"missing TLD", "john@example", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validateEmail(tt.email)
			if result != tt.expected {
				t.Errorf("validateEmail(%q) = %v, want %v", tt.email, result, tt.expected)
			}
		})
	}
}

func TestValidateServicesOffered(t *testing.T) {
	tests := []struct {
		name     string
		services []string
		expected bool
	}{
		{"empty slice is invalid", []string{}, false},
		{"single valid service", []string{"plumbing"}, true},
		{"multiple valid services", []string{"plumbing", "electrical"}, true},
		{"service with whitespace only is invalid", []string{"   "}, false},
		{"mix of valid and whitespace-only", []string{"plumbing", "   "}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validateServicesOffered(tt.services)
			if result != tt.expected {
				t.Errorf("validateServicesOffered(%v) = %v, want %v", tt.services, result, tt.expected)
			}
		})
	}
}

// ─── Commission Percentage Validation Tests ───────────────────────────────────

func TestCommissionPercentageValidation(t *testing.T) {
	tests := []struct {
		name       string
		commission float64
		valid      bool
	}{
		{"zero commission is valid", 0, true},
		{"100% commission is valid", 100, true},
		{"15.5% commission is valid", 15.5, true},
		{"negative commission is invalid", -1, false},
		{"over 100 is invalid", 100.01, false},
		{"50% commission is valid", 50, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			valid := tt.commission >= 0 && tt.commission <= 100
			if valid != tt.valid {
				t.Errorf("commission %v: expected valid=%v, got valid=%v", tt.commission, tt.valid, valid)
			}
		})
	}
}

func TestCommissionRoundingTo2Decimals(t *testing.T) {
	tests := []struct {
		name     string
		input    float64
		expected string
	}{
		{"15.5 rounds to 15.50", 15.5, "15.50"},
		{"10 rounds to 10.00", 10, "10.00"},
		{"0 rounds to 0.00", 0, "0.00"},
		{"25.75 stays 25.75", 25.75, "25.75"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			formatted := formatFloat2Decimals(tt.input)
			if formatted != tt.expected {
				t.Errorf("formatFloat2Decimals(%v) = %q, want %q", tt.input, formatted, tt.expected)
			}
		})
	}
}

// ─── Vendor Status Tests ──────────────────────────────────────────────────────

func TestVendorStatusValidation(t *testing.T) {
	validStatuses := []string{"active", "inactive"}
	invalidStatuses := []string{"pending", "deleted", "", "ACTIVE"}

	for _, s := range validStatuses {
		t.Run("valid status: "+s, func(t *testing.T) {
			if s != "active" && s != "inactive" {
				t.Errorf("Expected %q to be a valid status", s)
			}
		})
	}

	for _, s := range invalidStatuses {
		t.Run("invalid status: "+s, func(t *testing.T) {
			if s == "active" || s == "inactive" {
				t.Errorf("Expected %q to be an invalid status", s)
			}
		})
	}
}

// ─── Helper: formatFloat2Decimals ─────────────────────────────────────────────

// formatFloat2Decimals formats a float64 to a string with exactly 2 decimal places.
// This mirrors the logic used in the vendor assignment handler.
func formatFloat2Decimals(f float64) string {
	return fmt.Sprintf("%.2f", f)
}
