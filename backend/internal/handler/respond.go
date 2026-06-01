package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("encode JSON response", "error", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func writePaginated(w http.ResponseWriter, data any, total int64, page, pageSize int) {
	writeJSON(w, http.StatusOK, map[string]any{
		"data":      data,
		"total":     total,
		"page":      page,
		"pageSize":  pageSize,
		"pageCount": (int(total) + pageSize - 1) / pageSize,
	})
}

func decode[T any](r *http.Request) (T, error) {
	var v T
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		return v, err
	}
	return v, nil
}
