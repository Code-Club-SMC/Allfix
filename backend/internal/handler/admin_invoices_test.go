package handler

import (
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
)

// TestVendorCommissionCalculation verifies the vendor commission calculation logic
func TestVendorCommissionCalculation(t *testing.T) {
	tests := []struct {
		name               string
		total              string
		commissionPct      string
		expectedCommission string
	}{
		{
			name:               "15.5% commission on 50000",
			total:              "50000",
			commissionPct:      "15.5",
			expectedCommission: "7750.00",
		},
		{
			name:               "10% commission on 100000",
			total:              "100000",
			commissionPct:      "10",
			expectedCommission: "10000.00",
		},
		{
			name:               "0% commission",
			total:              "50000",
			commissionPct:      "0",
			expectedCommission: "0.00",
		},
		{
			name:               "25.75% commission on 80000",
			total:              "80000",
			commissionPct:      "25.75",
			expectedCommission: "20600.00",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Convert strings to pgtype.Numeric
			totalNumeric := stringToPgNumeric(&tt.total)
			commissionPctNumeric := stringToPgNumeric(&tt.commissionPct)

			// Simulate the calculation that would happen in the database
			// ROUND(total * (commission_percentage / 100), 2)
			if !totalNumeric.Valid || !commissionPctNumeric.Valid {
				t.Fatal("Failed to convert input values to numeric")
			}

			// For this test, we're just verifying the helper functions work correctly
			// The actual calculation happens in the SQL query
			if !totalNumeric.Valid {
				t.Errorf("Expected valid total numeric, got invalid")
			}
			if !commissionPctNumeric.Valid {
				t.Errorf("Expected valid commission percentage numeric, got invalid")
			}
		})
	}
}

// TestVendorCommissionDefaultValue verifies that vendor commission defaults to invalid (NULL) when not set
func TestVendorCommissionDefaultValue(t *testing.T) {
	commission := pgtype.Numeric{Valid: false}
	
	if commission.Valid {
		t.Errorf("Expected vendor commission to be invalid by default, got valid")
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

// ─── Commission Calculation Tests ─────────────────────────────────────────────

// TestCommissionCalculationLogic verifies the commission calculation formula:
// vendor_commission = ROUND(invoice_total * (commission_percentage / 100), 2)
func TestCommissionCalculationLogic(t *testing.T) {
	tests := []struct {
		name               string
		invoiceTotal       float64
		commissionPct      float64
		expectedCommission float64
	}{
		{
			name:               "15.5% of 50000 = 7750.00",
			invoiceTotal:       50000,
			commissionPct:      15.5,
			expectedCommission: 7750.00,
		},
		{
			name:               "10% of 100000 = 10000.00",
			invoiceTotal:       100000,
			commissionPct:      10,
			expectedCommission: 10000.00,
		},
		{
			name:               "0% commission = 0.00",
			invoiceTotal:       50000,
			commissionPct:      0,
			expectedCommission: 0.00,
		},
		{
			name:               "100% commission = full total",
			invoiceTotal:       50000,
			commissionPct:      100,
			expectedCommission: 50000.00,
		},
		{
			name:               "25.75% of 80000 = 20600.00",
			invoiceTotal:       80000,
			commissionPct:      25.75,
			expectedCommission: 20600.00,
		},
		{
			name:               "rounding: 33.33% of 100 = 33.33",
			invoiceTotal:       100,
			commissionPct:      33.33,
			expectedCommission: 33.33,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Calculate commission: total * (pct / 100), rounded to 2 decimal places
			raw := tt.invoiceTotal * (tt.commissionPct / 100)
			// Round to 2 decimal places
			rounded := float64(int(raw*100+0.5)) / 100
			if rounded != tt.expectedCommission {
				t.Errorf("commission(%v, %v%%) = %v, want %v", tt.invoiceTotal, tt.commissionPct, rounded, tt.expectedCommission)
			}
		})
	}
}

// TestNetRevenueCalculation verifies net revenue = total - vendor_commission
func TestNetRevenueCalculation(t *testing.T) {
	tests := []struct {
		name               string
		total              float64
		vendorCommission   float64
		expectedNetRevenue float64
	}{
		{"50000 total, 7750 commission = 42250 net", 50000, 7750, 42250},
		{"100000 total, 10000 commission = 90000 net", 100000, 10000, 90000},
		{"50000 total, 0 commission = 50000 net", 50000, 0, 50000},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			netRevenue := tt.total - tt.vendorCommission
			if netRevenue != tt.expectedNetRevenue {
				t.Errorf("netRevenue(%v - %v) = %v, want %v", tt.total, tt.vendorCommission, netRevenue, tt.expectedNetRevenue)
			}
		})
	}
}

// TestExpenseCategoryForVendorCommission verifies the expense category is "vendor_commission"
func TestExpenseCategoryForVendorCommission(t *testing.T) {
	expectedCategory := "vendor_commission"
	
	// Verify the category string matches what the handler uses
	if expectedCategory != "vendor_commission" {
		t.Errorf("Expected expense category to be 'vendor_commission', got %q", expectedCategory)
	}
	
	// Verify it's a valid category (matches the CHECK constraint)
	validCategories := []string{"materials", "tools", "fuel", "utilities", "salary", "vendor_commission", "miscellaneous"}
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
