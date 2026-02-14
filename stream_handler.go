package main

import (
	"bytes"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// StartMediaServer spins up a dedicated HTTP server for streaming
func StartMediaServer(app *App) {
	mux := http.NewServeMux()

	mux.HandleFunc("/stream/", func(w http.ResponseWriter, r *http.Request) {
		// 1. CORS Headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "*")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// 2. Parse ID (ROBUST VERSION)
		// We expect: /stream/123  OR  /stream/123/chapter1.mp4
		path := strings.TrimPrefix(r.URL.Path, "/stream/")
		parts := strings.Split(path, "/")
		idStr := parts[0]

		fileID, err := strconv.Atoi(idStr)
		if err != nil {
			log.Printf("[MediaServer] Invalid ID format: %s", idStr)
			http.Error(w, "Invalid ID", http.StatusBadRequest)
			return
		}

		// 3. Fetch Blob from the new 'objects' table via the 'files' mapping
		fmt.Printf("[MediaServer] Streaming File ID %d\n", fileID)
		data, mimeType, err := app.db.FetchFileBlob(fileID)
		if err != nil {
			http.Error(w, "Not Found", http.StatusNotFound)
			return
		}

		// 4. Serve Content
		w.Header().Set("Content-Type", mimeType)
		reader := bytes.NewReader(data)
		http.ServeContent(w, r, "", time.Time{}, reader)
	})

	log.Println("[MediaServer] Starting on http://localhost:40001")
	go http.ListenAndServe(":40001", mux)
}
