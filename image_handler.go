package main

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"

	lru "github.com/hashicorp/golang-lru/v2"
)

type ImageHandler struct {
	db    *sql.DB
	cache *lru.Cache[int, []byte]
}

func NewImageHandler(db *sql.DB) *ImageHandler {
	cache, _ := lru.New[int, []byte](100)
	return &ImageHandler{
		db:    db,
		cache: cache,
	}
}

// AssetMiddleware intercepts requests to /images/
func (h *ImageHandler) AssetMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/images/") {
			h.ServeHTTP(w, r)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (h *ImageHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// 1. Parse Entry ID

	// Special case: if the path is /images/library/{id}, we fetch the library cover instead
	if strings.HasPrefix(r.URL.Path, "/images/library/") {
		libIdStr := strings.TrimPrefix(r.URL.Path, "/images/library/")
		libId, _ := strconv.Atoi(libIdStr)

		var imgBytes []byte
		err := h.db.QueryRow("SELECT cover_image FROM libraries WHERE id = ?", libId).Scan(&imgBytes)
		if err == nil && len(imgBytes) > 0 {
			w.Header().Set("Content-Type", "image/jpeg")
			w.Write(imgBytes)
			return
		}
		http.NotFound(w, r)
		return
	}

	// Normal case: /images/{entryId}
	// Step 1: Extract Entry ID from URL
	idStr := strings.TrimPrefix(r.URL.Path, "/images/")
	entryID, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid Entry ID", http.StatusBadRequest)
		return
	}

	// 2. Check Cache
	if imgBytes, ok := h.cache.Get(entryID); ok {
		w.Header().Set("Content-Type", "image/jpeg") // Assuming covers are jpeg
		w.Header().Set("Cache-Control", "public, max-age=3600")
		w.Write(imgBytes)
		return
	}

	// 3. Database Lookup (Traversing the hierarchy)
	var imgBytes []byte

	// We look for a file belonging to a GroupSet labeled 'Cover Art' for this Entry
	query := `
		SELECT o.data 
		FROM objects o
		JOIN files f ON f.id = o.file_id
		JOIN group_sets g ON g.id = f.groupset_id
		WHERE g.entry_id = ? AND g.category = 'Cover Art'
		LIMIT 1
	`

	err = h.db.QueryRow(query, entryID).Scan(&imgBytes)

	if err != nil {
		if err == sql.ErrNoRows {
			println("Image Handler: Cover Art not found for Entry ID:", entryID)
			http.NotFound(w, r)
		} else {
			println("Image Handler DB Error:", err.Error())
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
		return
	}

	// 4. Save to Cache and Serve
	h.cache.Add(entryID, imgBytes)
	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.Write(imgBytes)
}
