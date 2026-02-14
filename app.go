package main

import (
	"context"
	"encoding/csv"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
	db  *DB
}

// NewApp creates a new App application struct
func NewApp(db *DB) *App {
	return &App{
		db: db,
	}
}

// Startup is called when the app starts.
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	// Initialization happens in main.go now, so we just store context here.
}

// ==========================================
// 1. LIBRARIES (The New Top Level)
// ==========================================

func (a *App) GetLibraries() ([]Library, error) {
	// Let's assume you add a simple GetLibraries() to database.go
	return a.db.GetLibraries()
}

func (a *App) CreateLibrary(name, libType string) error {
	return a.db.CreateLibrary(name, libType)
}

// ==========================================
// 2. ENTRIES (Replaces MangaEntry)
// ==========================================

// GetEntries now requires a LibraryID to fetch the correct items
func (a *App) GetEntries(libraryID int) ([]Entry, error) {
	return a.db.GetEntries(libraryID)
}

func (a *App) SaveEntry(entry Entry) error {
	// For the prototype, default to Library 1 if it's missing
	if entry.LibraryID == 0 {
		entry.LibraryID = 1
	}

	if entry.ID == 0 {
		// It's a brand new entry
		return a.db.CreateEntry(entry)
	}

	// It's an existing entry being edited
	return a.db.UpdateEntry(entry)
}

func (a *App) DeleteEntry(id int) error {
	return a.db.DeleteEntry(id)
}

func (a *App) UpdateOrder(entries []Entry) error {
	return a.db.UpdateEntryOrder(entries)
}

// ==========================================
// 3. GROUP SETS (Seasons, Volumes)
// ==========================================

func (a *App) GetGroupSets(entryID int) ([]GroupSet, error) {
	return a.db.GetGroupSets(entryID)
}

func (a *App) CreateGroupSet(entryID int, title, category string) error {
	_, err := a.db.AddGroupSet(entryID, title, category, 0)
	return err
}

// ==========================================
// 4. FILES & OBJECTS (The Heavy Ingestion)
// ==========================================

// ImportFile opens a native OS dialog, reads the file, and stuffs it into SQLite
func (a *App) ImportFile(groupsetID int) error {
	// 1. Open File Dialog via Wails
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Media File to Archive",
	})
	if err != nil || selection == "" {
		return nil // User cancelled
	}

	// 2. Read the massive file into memory
	data, err := os.ReadFile(selection)
	if err != nil {
		return fmt.Errorf("failed to read file: %w", err)
	}

	// 3. Extract Metadata
	filename := filepath.Base(selection)
	sizeBytes := int64(len(data))

	// Detect MimeType
	mimeType := http.DetectContentType(data)
	// http.DetectContentType sometimes falls back to application/octet-stream for mp4/mkv.
	// You might want to add a switch statement here based on filepath.Ext(selection) for better accuracy.

	// 4. Execute the 1:1 Transaction we wrote in media.go
	_, err = a.db.AddFile(groupsetID, filename, mimeType, sizeBytes, data, 0)
	if err != nil {
		return fmt.Errorf("database insertion failed: %w", err)
	}

	return nil
}

// SetCoverImage is a special helper to attach a cover to an Entry
func (a *App) SetCoverImage(entryID int) error {
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Cover Art",
		Filters: []runtime.FileFilter{
			{DisplayName: "Images", Pattern: "*.jpg;*.jpeg;*.png;*.webp"},
		},
	})
	if err != nil || selection == "" {
		return nil
	}

	data, err := os.ReadFile(selection)
	if err != nil {
		return err
	}

	// 1. Create a hidden GroupSet just for Cover Art
	groupID, err := a.db.AddGroupSet(entryID, "Cover Art", "Cover Art", 0)
	if err != nil {
		return err
	}

	// 2. Insert the image blob
	mimeType := http.DetectContentType(data)
	_, err = a.db.AddFile(groupID, filepath.Base(selection), mimeType, int64(len(data)), data, 0)
	return err
}

// ==========================================
// 5. TAGS (Unchanged Frontend API)
// ==========================================

func (a *App) GetAllTags() ([]Tag, error) {
	return a.db.GetAllTags()
}

func (a *App) GetTagsForEntry(entryID int) ([]Tag, error) {
	return a.db.GetTagsForEntry(entryID)
}

func (a *App) UpdateEntryTags(entryID int, tagIDs []int) error {
	return a.db.UpdateEntryTags(entryID, tagIDs)
}

func (a *App) CreateTag(name, description, icon string) error {
	return a.db.CreateTag(name, description, icon)
}

func (a *App) UpdateTag(id int, name, description, icon string) error {
	return a.db.UpdateTag(id, name, description, icon)
}

func (a *App) DeleteTag(id int) error {
	return a.db.DeleteTag(id)
}

// ==========================================
// 6. MEDIA SERVER (New Dedicated Endpoint for Streaming)
// ==========================================

func (a *App) GetFiles(groupsetID int) ([]File, error) {
	return a.db.GetFiles(groupsetID)
}

func (a *App) DeleteGroupSet(id int) error {
	return a.db.DeleteGroupSet(id)
}

func (a *App) DeleteFile(id int) error {
	return a.db.DeleteFile(id)
}

func (a *App) UpdateFileOrder(files []File) error {
	return a.db.UpdateFileOrder(files)
}

// Ensure ExportMediaAsset uses the new FetchFileBlob:
func (a *App) ExportMediaAsset(fileID int, filename string) error {
	data, _, err := a.db.FetchFileBlob(fileID)
	if err != nil {
		return err
	}

	selection, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title: "Save File", DefaultFilename: filename,
	})
	if err != nil || selection == "" {
		return nil
	}

	return os.WriteFile(selection, data, 0644)
}

func (a *App) GetLibrary(id int) (*Library, error) {
	return a.db.GetLibrary(id)
}

func (a *App) UpdateLibrary(lib Library) error {
	return a.db.UpdateLibrary(lib)
}

// SetLibraryCover opens the OS dialog specifically for the Library profile picture
func (a *App) SetLibraryCover(libraryID int) error {
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Select Library Cover Art",
		Filters: []runtime.FileFilter{{DisplayName: "Images", Pattern: "*.jpg;*.jpeg;*.png;*.webp"}},
	})
	if err != nil || selection == "" {
		return nil
	}

	data, err := os.ReadFile(selection)
	if err != nil {
		return err
	}

	return a.db.UpdateLibraryCover(libraryID, data)
}

// ==========================================
// 7. LEGACY CSV IMPORT/EXPORT (For Mass Entry Management)
// ==========================================
func (a *App) ImportLegacyCSV(libraryID int) (string, error) {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Select Legacy CSV",
		Filters: []runtime.FileFilter{{DisplayName: "CSV Text", Pattern: "*.csv;*.txt"}},
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
	reader.Comma = '|' // The classic pipe separator!
	reader.LazyQuotes = true
	records, err := reader.ReadAll()
	if err != nil {
		return "", err
	}

	count := 0
	for i, record := range records {
		// Skip header row or any malformed rows with missing columns
		if i == 0 || len(record) < 4 {
			continue
		}

		entry := Entry{
			LibraryID:     libraryID,
			Number:        record[0],
			Title:         record[1],
			Comment:       record[2],
			Rank:          record[3],
			TextAlignment: "justify", // Default formatting
		}

		if err := a.db.CreateEntry(entry); err == nil {
			count++
		}
	}
	return fmt.Sprintf("Successfully imported %d entries.", count), nil
}

// ExportLibraryCSV generates a pipe-separated backup of your entire library list
func (a *App) ExportLibraryCSV(libraryID int) (string, error) {
	// 1. Fetch all lightweight text entries
	entries, err := a.db.GetEntries(libraryID)
	if err != nil {
		return "", err
	}

	// 2. Open Save Dialog
	savePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save Library Backup (CSV)",
		DefaultFilename: "compendium_backup.csv",
		Filters:         []runtime.FileFilter{{DisplayName: "CSV", Pattern: "*.csv"}},
	})
	if err != nil || savePath == "" {
		return "Cancelled", nil
	}

	// 3. Create the file
	file, err := os.Create(savePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	// 4. Write data with pipe separator
	writer := csv.NewWriter(file)
	writer.Comma = '|'

	// Write Header
	writer.Write([]string{"Number", "Title", "Comment", "Rank"})

	// Write Data Rows
	for _, e := range entries {
		writer.Write([]string{e.Number, e.Title, e.Comment, e.Rank})
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return "", err
	}

	return fmt.Sprintf("Backup successfully saved to %s", savePath), nil
}
