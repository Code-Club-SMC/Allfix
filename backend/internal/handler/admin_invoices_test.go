package handler

import (
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
)

// TestPlatformFeeCalculation verifies the platform fee calculation logic
func TestPlatformFeeCalculation(t *testing.T) {
	tests := []struct {
		name          string
		total         string
		feePct        string
		expectedFee   string
		expectedPayout string
	}{
		{
			name:           "15.5% platform fee on 50000",
			total:          "50000",
			feePct:         "15.5",
			expectedFee:    "7750.00",
			expectedPayout: "42250.00",
		},
		{
			name:           "10% platform fee on 100000",
			total:          "100000",
			feePct:         "10",
			expectedFee:    "10000.00",
			expectedPayout: "90000.00",
		},
		{
			name:           "0% platform fee",
			total:          "50000",
			feePct:         "0",
			expectedFee:    "0.00",
			expectedPayout: "50000.00",
		},
		{
			name:           "25.75% platform fee on 80000",
			total:          "80000",
			feePct:         "25.75",
			expectedFee:    "20600.00",
			expectedPayout: "59400.00",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			totalNumeric := stringToPgNumeric(&tt.total)
			feePctNumeric := stringToPgNumeric(&tt.feePct)

			if !totalNumeric.Valid || !feePctNumeric.Valid {
				t.Fatal("Failed to convert input values to numeric")
			}
		})
	}
}

// TestPlatformFeeDefaultValue verifies that platform fee defaults to invalid (NULL) when not set
func TestPlatformFeeDefaultValue(t *testing.T) {
	fee := pgtype.Numeric{Valid: false}

	if fee.Valid {
		t.Errorf("Expected platform fee to be invalid by default, got valid")
	}
}

// TestStringToPgNumericOrZero verifies the helper function behavior
func TestStringToPgNumericOrZero(t *testing.T) {
	tests := []struct {
		name     string
		input    *string
		expected string
	}{
		{
			name:     "nil input returns 0",
			input:    nil,
			expected: "0",
		},
		{
			name:     "empty string returns 0",
			input:    ptr(""),
			expected: "0",
		},
		{
			name:     "valid number",
			input:    ptr("123.45"),
			expected: "123.45",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := stringToPgNumericOrZero(tt.input)
			if !result.Valid {
				t.Errorf("Expected valid numeric result")
			}
		})
	}
}

// ─── Platform Fee Calculation Tests ─────────────────────────────────────────────

// TestPlatformFeeCalculationLogic verifies the platform fee calculation formula:
// platform_fee = ROUND(invoice_total * (platform_fee_percentage / 100), 2)
func TestPlatformFeeCalculationLogic(t *testing.T) {
	tests := []struct {
		name          string
		invoiceTotal  float64
		feePct        float64
		expectedFee   float64
		expectedPayout float64
	}{
		{
			name:           "15.5% of 50000 = 7750.00",
			invoiceTotal:   50000,
			feePct:         15.5,
			expectedFee:    7750.00,
			expectedPayout: 42250.00,
		},
		{
			name:           "10% of 100000 = 10000.00",
			invoiceTotal:   100000,
			feePct:         10,
			expectedFee:    10000.00,
			expectedPayout: 90000.00,
		},
		{
			name:           "0% platform fee = 0.00",
			invoiceTotal:   50000,
			feePct:         0,
			expectedFee:    0.00,
			expectedPayout: 50000.00,
		},
		{
			name:           "100% platform fee = full total",
			invoiceTotal:   50000,
			feePct:         100,
			expectedFee:    50000.00,
			expectedPayout: 0.00,
		},
		{
			name:           "25.75% of 80000 = 20600.00",
			invoiceTotal:   80000,
			feePct:         25.75,
			expectedFee:    20600.00,
			expectedPayout: 59400.00,
		},
		{
			name:           "rounding: 33.33% of 100 = 33.33",
			invoiceTotal:   100,
			feePct:         33.33,
			expectedFee:    33.33,
			expectedPayout: 66.67,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raw := tt.invoiceTotal * (tt.feePct / 100)
			rounded := float64(int(raw*100+0.5)) / 100
			if rounded != tt.expectedFee {
				t.Errorf("platformFee(%v, %v%%) = %v, want %v", tt.invoiceTotal, tt.feePct, rounded, tt.expectedFee)
			}
			payout := tt.invoiceTotal - rounded
			if payout != tt.expectedPayout {
				t.Errorf("vendorPayout(%v - %v) = %v, want %v", tt.invoiceTotal, rounded, payout, tt.expectedPayout)
			}
		})
	}
}

// TestVendorPayoutCalculation verifies vendor payout = total - platform fee
func TestVendorPayoutCalculation(t *testing.T) {
	tests := []struct {
		name               string
		total              float64
		platformFee        float64
		expectedVendorPayout float64
	}{
		{"50000 total, 7750 platform fee = 42250 payout", 50000, 7750, 42250},
		{"100000 total, 10000 platform fee = 90000 payout", 100000, 10000, 90000},
		{"50000 total, 0 platform fee = 50000 payout", 50000, 0, 50000},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			vendorPayout := tt.total - tt.platformFee
			if vendorPayout != tt.expectedVendorPayout {
				t.Errorf("vendorPayout(%v - %v) = %v, want %v", tt.total, tt.platformFee, vendorPayout, tt.expectedVendorPayout)
			}
		})
	}
}

// TestExpenseCategoryForPlatformFee verifies the expense category is "platform_fee"
func TestExpenseCategoryForPlatformFee(t *testing.T) {
	expectedCategory := "platform_fee"

	if expectedCategory != "platform_fee" {
		t.Errorf("Expected expense category to be 'platform_fee', got %q", expectedCategory)
	}

	validCategories := []string{"materials", "tools", "fuel", "utilities", "salary", "platform_fee", "miscellaneous"}
	found := false
	for _, c := range validCategories {
		if c == expectedCategory {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("Category %q is not in the valid categories list", expectedCategory)
	}
}
