package main

import (
	"bytes"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type MediaStreamHandler struct {
	app *App
}

func NewMediaStreamHandler(app *App) *MediaStreamHandler {
	return &MediaStreamHandler{app: app}
}

func (h *MediaStreamHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// 1. Log EVERY request to see if we are even intercepting
	// (Filter out standard assets to avoid spam, show only potential stream candidates)
	if strings.Contains(r.URL.Path, "stream") {
		fmt.Printf("[StreamHandler] Request received: %s | Method: %s\n", r.URL.Path, r.Method)
	}

	// 2. Check prefix
	if !strings.HasPrefix(r.URL.Path, "/stream/") {
		// Pass through to Wails AssetServer
		http.NotFound(w, r)
		return
	}

	// 3. Extract ID
	idStr := strings.TrimPrefix(r.URL.Path, "/stream/")
	assetID, err := strconv.Atoi(idStr)
	if err != nil {
		fmt.Printf("[StreamHandler] ❌ Error: Invalid ID '%s'\n", idStr)
		http.Error(w, "Invalid Asset ID", http.StatusBadRequest)
		return
	}

	// 4. Safety Check: Is DB ready?
	if h.app.db == nil {
		fmt.Println("[StreamHandler] ❌ Error: Database connection is nil!")
		http.Error(w, "Database not initialized", http.StatusInternalServerError)
		return
	}

	// 5. Fetch from DB
	fmt.Printf("[StreamHandler] 🔍 Fetching blob for Asset ID: %d...\n", assetID)
	data, mimeType, err := h.app.db.FetchAssetBlob(assetID)
	if err != nil {
		fmt.Printf("[StreamHandler] ❌ DB Error: %v\n", err)
		http.Error(w, "Asset not found in DB", http.StatusNotFound)
		return
	}

	// 6. Log Success Details
	dataSize := len(data)
	fmt.Printf("[StreamHandler] ✅ Success! Found %d bytes. Mime: %s\n", dataSize, mimeType)

	if dataSize == 0 {
		fmt.Println("[StreamHandler] ⚠️ WARNING: File blob is empty (0 bytes). Did the upload work?")
	}

	// 7. Serve
	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Access-Control-Allow-Origin", "*") // Fix CORS just in case

	reader := bytes.NewReader(data)
	http.ServeContent(w, r, "streamed_video", time.Now(), reader)
}
