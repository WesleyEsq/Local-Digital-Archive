package main

import (
	"database/sql"
	"fmt"
)

// --- Structs ---

type MediaGroup struct {
	ID        int    `json:"id"`
	EntryID   int    `json:"entry_id"` // Links to the main Manga/Anime entry
	Title     string `json:"title"`    // "Season 1", "Volume 5"
	Category  string `json:"category"` // "season", "volume", "standalone"
	SortOrder int    `json:"sort_order"`
}

type MediaAsset struct {
	ID        int    `json:"id"`
	GroupID   int    `json:"group_id"`
	Title     string `json:"title"`     // "Episode 1", "Chapter 5"
	Filename  string `json:"filename"`  // "vol1_ch5.pdf"
	MimeType  string `json:"mime_type"` // "application/pdf", "video/mp4"
	FileSize  int64  `json:"file_size"`
	SortOrder int    `json:"sort_order"`
	// Note: We do NOT map the BLOB here to avoid passing 2GB files to the frontend JSON.
	// The frontend will access the blob via a URL like /api/asset/{id}
}

// --- Database Logic for Media ---

// CreateMediaTables is called by InitDB to ensure schema exists
func CreateMediaTables(db *sql.DB) error {
	// 1. Media Groups (Containers)
	groupSchema := `
	CREATE TABLE IF NOT EXISTS media_groups (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		entry_id INTEGER NOT NULL,
		title TEXT,
		category TEXT,
		sort_order INTEGER,
		FOREIGN KEY(entry_id) REFERENCES entries(id) ON DELETE CASCADE
	);`
	if _, err := db.Exec(groupSchema); err != nil {
		return fmt.Errorf("error creating media_groups: %w", err)
	}

	// 2. Media Assets (The actual files)
	assetSchema := `
	CREATE TABLE IF NOT EXISTS media_assets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		group_id INTEGER NOT NULL,
		title TEXT,
		filename TEXT,
		mime_type TEXT,
		file_blob BLOB,
		file_size INTEGER,
		sort_order INTEGER,
		FOREIGN KEY(group_id) REFERENCES media_groups(id) ON DELETE CASCADE
	);`
	if _, err := db.Exec(assetSchema); err != nil {
		return fmt.Errorf("error creating media_assets: %w", err)
	}

	return nil
}

// FetchGroupsForEntry gets all seasons/volumes for a specific series
func (db *DB) FetchGroupsForEntry(entryID int) ([]MediaGroup, error) {
	rows, err := db.conn.Query("SELECT id, entry_id, title, category, sort_order FROM media_groups WHERE entry_id = ? ORDER BY sort_order ASC", entryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []MediaGroup
	for rows.Next() {
		var g MediaGroup
		if err := rows.Scan(&g.ID, &g.EntryID, &g.Title, &g.Category, &g.SortOrder); err != nil {
			return nil, err
		}
		groups = append(groups, g)
	}
	return groups, nil
}

// FetchAssetsForGroup gets all episodes/chapters for a specific group
func (db *DB) FetchAssetsForGroup(groupID int) ([]MediaAsset, error) {
	rows, err := db.conn.Query("SELECT id, group_id, title, filename, mime_type, file_size, sort_order FROM media_assets WHERE group_id = ? ORDER BY sort_order ASC", groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []MediaAsset
	for rows.Next() {
		var a MediaAsset
		if err := rows.Scan(&a.ID, &a.GroupID, &a.Title, &a.Filename, &a.MimeType, &a.FileSize, &a.SortOrder); err != nil {
			return nil, err
		}
		assets = append(assets, a)
	}
	return assets, nil
}

// FetchAllAssets returns a flat list of EVERYTHING in the library (for your "Third Page")
func (db *DB) FetchAllAssets() ([]MediaAsset, error) {
	// We might want to JOIN here later to get the Series Name, but for now let's keep it simple
	rows, err := db.conn.Query("SELECT id, group_id, title, filename, mime_type, file_size, sort_order FROM media_assets ORDER BY id DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assets []MediaAsset
	for rows.Next() {
		var a MediaAsset
		if err := rows.Scan(&a.ID, &a.GroupID, &a.Title, &a.Filename, &a.MimeType, &a.FileSize, &a.SortOrder); err != nil {
			return nil, err
		}
		assets = append(assets, a)
	}
	return assets, nil
}

// SaveMediaGroup creates or updates a container
func (db *DB) SaveMediaGroup(group MediaGroup) error {
	if group.ID == 0 {
		_, err := db.conn.Exec("INSERT INTO media_groups (entry_id, title, category, sort_order) VALUES (?, ?, ?, ?)",
			group.EntryID, group.Title, group.Category, group.SortOrder)
		return err
	}
	_, err := db.conn.Exec("UPDATE media_groups SET title=?, category=?, sort_order=? WHERE id=?",
		group.Title, group.Category, group.SortOrder, group.ID)
	return err
}

// SaveMediaAsset inserts the metadata AND the heavy blob
func (db *DB) SaveMediaAsset(asset MediaAsset, data []byte) error {
	// Insert
	if asset.ID == 0 {
		_, err := db.conn.Exec("INSERT INTO media_assets (group_id, title, filename, mime_type, file_blob, file_size, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
			asset.GroupID, asset.Title, asset.Filename, asset.MimeType, data, len(data), asset.SortOrder)
		return err
	}
	// Update (replaces blob only if 'data' is not empty)
	if len(data) > 0 {
		_, err := db.conn.Exec("UPDATE media_assets SET title=?, filename=?, mime_type=?, file_blob=?, file_size=?, sort_order=? WHERE id=?",
			asset.Title, asset.Filename, asset.MimeType, data, len(data), asset.SortOrder, asset.ID)
		return err
	}
	// Update Metadata only
	_, err := db.conn.Exec("UPDATE media_assets SET title=?, filename=?, mime_type=?, sort_order=? WHERE id=?",
		asset.Title, asset.Filename, asset.MimeType, asset.SortOrder, asset.ID)
	return err
}

func (db *DB) DeleteMediaGroup(id int) error {
	// Cascading delete handles the assets automatically if PRAGMA foreign_keys is ON
	_, err := db.conn.Exec("DELETE FROM media_groups WHERE id = ?", id)
	return err
}

func (db *DB) DeleteMediaAsset(id int) error {
	_, err := db.conn.Exec("DELETE FROM media_assets WHERE id = ?", id)
	return err
}
