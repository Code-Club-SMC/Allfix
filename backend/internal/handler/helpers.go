package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

func parsePagination(r *http.Request) (page, pageSize int) {
	page = 1
	pageSize = 20

	if p := r.URL.Query().Get("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	if ps := r.URL.Query().Get("pageSize"); ps != "" {
		if v, err := strconv.Atoi(ps); err == nil && v > 0 && v <= 100 {
			pageSize = v
		}
	}
	return
}

func parseUUIDFromPath(r *http.Request, key string) (uuid.UUID, error) {
	return uuid.Parse(chi.URLParam(r, key))
}

func parseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}

func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func parseInt32(s string) *int32 {
	if s == "" {
		return nil
	}
	v, err := strconv.ParseInt(s, 10, 32)
	if err != nil {
		return nil
	}
	v32 := int32(v)
	return &v32
}

// subtractStrings subtracts two decimal strings (used for net profit calc).
// Returns "0" on any parse error.
func subtractStrings(a, b string) string {
	av, err1 := strconv.ParseFloat(a, 64)
	bv, err2 := strconv.ParseFloat(b, 64)
	if err1 != nil || err2 != nil {
		return "0"
	}
	return fmt.Sprintf("%.2f", av-bv)
}

// uuidToPgtype converts a *uuid.UUID to pgtype.UUID.
// Returns {Valid: false} for nil input.
func uuidToPgtype(id *uuid.UUID) pgtype.UUID {
	if id == nil {
		return pgtype.UUID{Valid: false}
	}
	return pgtype.UUID{Bytes: *id, Valid: true}
}

// stringToPgNumeric converts a *string to pgtype.Numeric.
// Returns {Valid: false} for nil or unparseable input.
func stringToPgNumeric(s *string) pgtype.Numeric {
	if s == nil {
		return pgtype.Numeric{Valid: false}
	}
	var n pgtype.Numeric
	if err := n.Scan(*s); err != nil {
		return pgtype.Numeric{Valid: false}
	}
	return n
}

// stringToPgNumericOrZero converts a *string to pgtype.Numeric.
// Treats nil or empty string as "0", preventing NOT NULL violations.
func stringToPgNumericOrZero(s *string) pgtype.Numeric {
	if s == nil || *s == "" {
		zero := "0"
		return stringToPgNumeric(&zero)
	}
	return stringToPgNumeric(s)
}

// stringToPgTime converts a *string in "HH:MM:SS" or "HH:MM" format to pgtype.Time.
// Returns {Valid: false} for nil or unparseable input.
func stringToPgTime(s *string) pgtype.Time {
	if s == nil {
		return pgtype.Time{Valid: false}
	}
	formats := []string{"15:04:05", "15:04"}
	for _, f := range formats {
		t, err := time.Parse(f, *s)
		if err == nil {
			h, m, sec := t.Clock()
			micros := int64(h)*3600*1e6 + int64(m)*60*1e6 + int64(sec)*1e6
			return pgtype.Time{Microseconds: micros, Valid: true}
		}
	}
	return pgtype.Time{Valid: false}
}

func stringToPgDate(s *string) pgtype.Date {
	if s == nil {
		return pgtype.Date{Valid: false}
	}
	t, err := time.Parse("2006-01-02", *s)
	if err != nil {
		return pgtype.Date{Valid: false}
	}
	return pgtype.Date{Time: t, Valid: true}
}

func timeToPgDate(t *time.Time) pgtype.Date {
	if t == nil {
		return pgtype.Date{Valid: false}
	}
	return pgtype.Date{Time: *t, Valid: true}
}

func ptrTimeToTime(t *time.Time) time.Time {
	if t == nil {
		return time.Time{}
	}
	return *t
}

func derefInt32(n *int32) int32 {
	if n == nil {
		return 0
	}
	return *n
}

func ptr[T any](v T) *T { return &v }

func stringToPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func parseInt32WithDefault(s string, defaultVal int32) int32 {
	if s == "" {
		return defaultVal
	}
	v, err := strconv.ParseInt(s, 10, 32)
	if err != nil {
		return defaultVal
	}
	return int32(v)
}

// parseNumeric parses a string to float64, returns 0 on error
func parseNumeric(s string) float64 {
	v, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return v
}

// pgNumericToString converts pgtype.Numeric to string
func pgNumericToString(n pgtype.Numeric) string {
	if !n.Valid {
		return "0"
	}
	f8, _ := n.Float64Value()
	return fmt.Sprintf("%.2f", f8.Float64)
}

// pgNumericToFloat converts pgtype.Numeric to float64
func pgNumericToFloat(n pgtype.Numeric) float64 {
	if !n.Valid {
		return 0
	}
	f8, _ := n.Float64Value()
	return f8.Float64
}

