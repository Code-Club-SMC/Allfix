package handler

import (
	"fmt"
	"testing"

	"github.com/google/uuid"
	"pgregory.net/rapid"
)

// Feature: allfix-backend, Property 1: uuidToPgtype preserves UUID value and validity
// Validates: Requirements 3.1, 3.2, 3.3, 6.1, 6.4
func TestUUIDToPgtype_ValidInput(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		b := rapid.SliceOfN(rapid.Byte(), 16, 16).Draw(t, "bytes")
		var id uuid.UUID
		copy(id[:], b)
		result := uuidToPgtype(&id)
		if !result.Valid {
			t.Fatal("expected Valid=true for non-nil UUID")
		}
		if result.Bytes != id {
			t.Fatal("Bytes mismatch")
		}
	})
}

// Feature: allfix-backend, Property 2: uuidToPgtype nil input produces invalid output
// Validates: Requirements 3.4, 6.5
func TestUUIDToPgtype_NilInput(t *testing.T) {
	result := uuidToPgtype(nil)
	if result.Valid {
		t.Fatal("expected Valid=false for nil input")
	}
}

// Feature: allfix-backend, Property 3: stringToPgNumeric valid input produces valid output
// Validates: Requirements 4.1, 4.2, 6.2, 6.4
func TestStringToPgNumeric_ValidInput(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		intPart := rapid.Int64().Draw(t, "int")
		fracPart := rapid.Uint32Range(0, 99).Draw(t, "frac")
		s := fmt.Sprintf("%d.%02d", intPart, fracPart)
		result := stringToPgNumeric(&s)
		if !result.Valid {
			t.Fatalf("expected Valid=true for %q", s)
		}
	})
}

// Feature: allfix-backend, Property 4: stringToPgNumeric nil or invalid input produces invalid output
// Validates: Requirements 4.3, 4.4, 6.5
func TestStringToPgNumeric_InvalidInput(t *testing.T) {
	if stringToPgNumeric(nil).Valid {
		t.Fatal("expected Valid=false for nil")
	}
	rapid.Check(t, func(t *rapid.T) {
		s := rapid.StringMatching(`[a-zA-Z!@#$%^&*]+`).Draw(t, "invalid")
		result := stringToPgNumeric(&s)
		if result.Valid {
			t.Fatalf("expected Valid=false for non-numeric %q", s)
		}
	})
}

// Feature: allfix-backend, Property 5: stringToPgTime valid input preserves time-of-day
// Validates: Requirements 5.1, 5.2, 6.3, 6.4
func TestStringToPgTime_ValidInput(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		h := rapid.IntRange(0, 23).Draw(t, "hour")
		m := rapid.IntRange(0, 59).Draw(t, "minute")
		sec := rapid.IntRange(0, 59).Draw(t, "second")
		s := fmt.Sprintf("%02d:%02d:%02d", h, m, sec)
		result := stringToPgTime(&s)
		if !result.Valid {
			t.Fatalf("expected Valid=true for %q", s)
		}
		expectedMicros := int64(h)*3600*1e6 + int64(m)*60*1e6 + int64(sec)*1e6
		if result.Microseconds != expectedMicros {
			t.Fatalf("microseconds mismatch: got %d, want %d", result.Microseconds, expectedMicros)
		}
	})
}

// Feature: allfix-backend, Property 6: stringToPgTime nil or invalid input produces invalid output
// Validates: Requirements 5.3, 5.4, 6.5
func TestStringToPgTime_InvalidInput(t *testing.T) {
	if stringToPgTime(nil).Valid {
		t.Fatal("expected Valid=false for nil")
	}
	rapid.Check(t, func(t *rapid.T) {
		s := rapid.StringMatching(`[a-zA-Z!@#$%^&*]+`).Draw(t, "invalid")
		result := stringToPgTime(&s)
		if result.Valid {
			t.Fatalf("expected Valid=false for non-time %q", s)
		}
	})
}
