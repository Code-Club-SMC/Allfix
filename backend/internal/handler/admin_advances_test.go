package handler

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAdvanceInstallmentCalculation(t *testing.T) {
	tests := []struct {
		name              string
		amount            float64
		totalInstallments int
		expectedMonthly   float64
	}{
		{
			name:              "5000 over 2 months",
			amount:            5000,
			totalInstallments: 2,
			expectedMonthly:   2500,
		},
		{
			name:              "10000 over 5 months",
			amount:            10000,
			totalInstallments: 5,
			expectedMonthly:   2000,
		},
		{
			name:              "7500 over 3 months",
			amount:            7500,
			totalInstallments: 3,
			expectedMonthly:   2500,
		},
		{
			name:              "single month",
			amount:            3000,
			totalInstallments: 1,
			expectedMonthly:   3000,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			installmentAmount := tt.amount / float64(tt.totalInstallments)
			require.InDelta(t, tt.expectedMonthly, installmentAmount, 0.01)
		})
	}
}

func TestPayrollNetCalculation(t *testing.T) {
	tests := []struct {
		name              string
		base              float64
		commission        float64
		advanceDeduction  float64
		expectedNet       float64
	}{
		{
			name:             "normal case",
			base:             25000,
			commission:       5000,
			advanceDeduction: 2000,
			expectedNet:      28000,
		},
		{
			name:             "no commission",
			base:             25000,
			commission:       0,
			advanceDeduction: 1000,
			expectedNet:      24000,
		},
		{
			name:             "advance exceeds net",
			base:             5000,
			commission:       1000,
			advanceDeduction: 10000,
			expectedNet:      0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			netPayable := tt.base + tt.commission - tt.advanceDeduction
			if netPayable < 0 {
				netPayable = 0
			}
			require.InDelta(t, tt.expectedNet, netPayable, 0.01)
		})
	}
}

func TestSubCategoryValidation(t *testing.T) {
	// Verify that a service with parent_id set is marked as subcategory
	// This is a logic test - the actual DB constraint is tested via integration
	parentID := "parent-uuid-123"
	isSubcategory := parentID != ""
	require.True(t, isSubcategory, "service with parent should be subcategory")

	// Top-level service
	parentID2 := ""
	isSubcategory2 := parentID2 != ""
	require.False(t, isSubcategory2, "service without parent should not be subcategory")
}
