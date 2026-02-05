package main

import (
	"context"
	"encoding/base64"
	"encoding/csv"
	"fmt"
	"log"
	"os"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Data models (Shared with Database)
type MangaEntry struct {
	ID            int    `json:"id"`
	Number        string `json:"number"`
	Title         string `json:"title"`
	Comment       string `json:"comment"`
	Rank          string `json:"rank"`
	Image         []byte `json:"image"`
	Description   string `json:"description"`
	Backup        []byte `json:"backup"`
	BackupName    string `json:"backupName"`
	TextAlignment string `json:"textAlignment"` // New Field
}

type CompendiumData struct {
	Title       string `json:"title"`
	Author      string `json:"author"`
	Description string `json:"description"`
	Image       []byte `json:"image"`
}

// App struct
type App struct {
	ctx context.Context
	db  *DB
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// Startup is called when the app starts.
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	// Initialize the Database logic defined in database.go
	database, err := InitDB("./compendium.db")
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	a.db = database
}

// --- Controller Methods (Exposed to Wails) ---

// GetEntries returns the list, optionally filtered
func (a *App) GetEntries(query string) ([]MangaEntry, error) {
	return a.db.FetchEntryList(query)
}

// GetEntryImage returns the base64 string of the image for a specific entry
// The frontend calls this only when needed (Lazy Load)
func (a *App) GetEntryImage(id int) (string, error) {
	bytes, err := a.db.FetchEntryImage(id)
	if err != nil {
		return "", err
	}
	if len(bytes) == 0 {
		return "", nil // or return a default placeholder
	}
	return base64.StdEncoding.EncodeToString(bytes), nil
}

// SaveEntry passes data to the DB
func (a *App) SaveEntry(entry MangaEntry) error {
	// Note: If you send Base64 strings from frontend, you might need to decode them here
	// before passing []byte to DB. Assuming the struct binding handles basic conversion,
	// but often Wails needs explicit Base64 decoding if the frontend sends a string.
	// For now, assuming your existing logic worked with []byte mapping.
	return a.db.SaveEntry(entry)
}

func (a *App) DeleteEntry(id int) error {
	return a.db.DeleteEntry(id)
}

func (a *App) UpdateOrder(entries []MangaEntry) error {
	return a.db.UpdateOrder(entries)
}

func (a *App) GetCompendiumData() (CompendiumData, error) {
	return a.db.FetchCompendiumData()
}

func (a *App) UpdateCompendiumData(data CompendiumData) error {
	return a.db.UpdateCompendium(data)
}

// DownloadBackup retrieves the file blob and prompts user to save
func (a *App) DownloadBackup(id int) (string, error) {
	data, name, err := a.db.FetchEntryBackup(id)
	if err != nil {
		return "", fmt.Errorf("db error: %w", err)
	}
	if len(data) == 0 {
		return "No backup file found.", nil
	}

	savePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: name,
		Title:           "Save Backup File",
	})
	if err != nil || savePath == "" {
		return "Download cancelled.", nil
	}

	if err := os.WriteFile(savePath, data, 0666); err != nil {
		return "", fmt.Errorf("save error: %w", err)
	}

	return fmt.Sprintf("Saved to %s", savePath), nil
}

// ImportLegacyCSV handles the file dialog (Controller) and data parsing
func (a *App) ImportLegacyCSV() (string, error) {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Select Legacy CSV",
		Filters: []runtime.FileFilter{{DisplayName: "CSV", Pattern: "*.csv"}},
	})
	if err != nil || filePath == "" {
		return "Cancelled", nil
	}

	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.Comma = '|'
	reader.LazyQuotes = true
	records, err := reader.ReadAll()
	if err != nil {
		return "", err
	}

	// We can do a quick loop here or move batch insert to DB
	// For simplicity, let's just loop the Save logic or a batch insert
	// But since we separated concerns, let's keep it simple:
	count := 0
	for i, record := range records {
		if i == 0 || len(record) < 4 {
			continue
		}
		// Construct entry and save
		e := MangaEntry{
			Number:  record[0],
			Title:   record[1],
			Comment: record[2],
			Rank:    record[3],
		}
		if err := a.db.SaveEntry(e); err == nil {
			count++
		}
	}
	return fmt.Sprintf("Imported %d entries.", count), nil
}

// --- Media Library Methods ---

// GetMediaGroups returns all seasons/volumes for a specific entry
func (a *App) GetMediaGroups(entryID int) ([]MediaGroup, error) {
	return a.db.FetchGroupsForEntry(entryID)
}

// GetMediaAssets returns all chapters/episodes for a specific group
func (a *App) GetMediaAssets(groupID int) ([]MediaAsset, error) {
	return a.db.FetchAssetsForGroup(groupID)
}

// GetAllLibraryAssets returns EVERYTHING (for your "All Files" view)
func (a *App) GetAllLibraryAssets() ([]MediaAsset, error) {
	return a.db.FetchAllAssets()
}

// SaveMediaGroup creates/updates a container (Volume/Season)
func (a *App) SaveMediaGroup(group MediaGroup) error {
	return a.db.SaveMediaGroup(group)
}

// SaveMediaAsset saves a file to the DB.
// NOTE: For now, we accept the Base64 string from frontend and decode it here.
// In the future "Phase 3", we will stream this differently.
func (a *App) SaveMediaAsset(asset MediaAsset, base64Data string) error {
	// Decode base64 to bytes
	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		// If empty string passed (metadata update only), data will be empty, which is fine
		if base64Data == "" {
			data = []byte{}
		} else {
			return fmt.Errorf("base64 decode error: %w", err)
		}
	}
	return a.db.SaveMediaAsset(asset, data)
}

func (a *App) DeleteMediaGroup(id int) error {
	return a.db.DeleteMediaGroup(id)
}

func (a *App) DeleteMediaAsset(id int) error {
	return a.db.DeleteMediaAsset(id)
}
