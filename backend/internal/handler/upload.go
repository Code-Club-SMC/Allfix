package handler

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/AbdulRehman-z/allfix/internal/db/sqlc"
)

type UploadHandler struct {
	uploadDir     string
	q             *db.Queries
	publicBaseURL string
}

func NewUploadHandler(uploadDir string, q *db.Queries, publicBaseURL string) *UploadHandler {
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		slog.Error("could not create upload directory", "error", err, "dir", uploadDir)
	}
	return &UploadHandler{uploadDir: uploadDir, q: q, publicBaseURL: publicBaseURL}
}

// POST /api/admin/upload
func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	// Limit upload size to 10MB
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "file too large or invalid form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "no file uploaded")
		return
	}
	defer file.Close()

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	if !strings.HasPrefix(contentType, "image/") {
		writeError(w, http.StatusBadRequest, "only image files are allowed")
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".jpg"
	}
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	// Create destination file
	dst, err := os.Create(filepath.Join(h.uploadDir, filename))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save file")
		return
	}
	defer dst.Close()

	// Copy file
	size, err := io.Copy(dst, file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save file")
		return
	}

	// Record in database
	h.q.CreateUploadedFile(r.Context(), db.CreateUploadedFileParams{
		FilePath:   fmt.Sprintf("/uploads/%s", filename),
		FileName:   header.Filename,
		MimeType:   contentType,
		SizeBytes:  size,
		UploadedBy: pgtype.UUID{Valid: false},
	})

	// Return the URL path. When a public base URL is configured, return an
	// absolute URL so the frontend can load the file directly from the
	// backend (useful when the backend and frontend are on different
	// origins, e.g. on Render).
	path := fmt.Sprintf("/uploads/%s", filename)
	url := path
	if h.publicBaseURL != "" {
		url = h.publicBaseURL + path
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"url":      url,
		"filename": filename,
	})
}
