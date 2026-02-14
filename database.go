package main

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite"
)

// --- Domain Models ---

type Library struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	Author      string `json:"author"`
	Description string `json:"description"`
}

type Entry struct {
	ID            int    `json:"id"`
	LibraryID     int    `json:"library_id"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	Number        string `json:"number"`        // Kept from your old MangaEntry
	Comment       string `json:"comment"`       // Kept from your old MangaEntry
	Rank          string `json:"rank"`          // Kept from your old MangaEntry
	TextAlignment string `json:"textAlignment"` // Kept from your old MangaEntry
	// NOTE: Image and Backup BLOBs are removed! They will live in the 'objects' table.
}

type GroupSet struct {
	ID        int    `json:"id"`
	EntryID   int    `json:"entry_id"`
	Title     string `json:"title"`
	Category  string `json:"category"`
	SortOrder int    `json:"sort_order"`
}

type File struct {
	ID         int    `json:"id"`
	GroupSetID int    `json:"groupset_id"`
	Filename   string `json:"filename"`
	MimeType   string `json:"mime_type"`
	SizeBytes  int64  `json:"file_size"`
	SortOrder  int    `json:"sort_order"`
}

// DB handles all direct database interactions
type DB struct {
	conn *sql.DB
}

// InitDB opens the connection and ensures the new schema exists
func InitDB(path string) (*DB, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}

	// 1. Critical performance and relationship Pragmas
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}
	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		return nil, fmt.Errorf("failed to enable WAL mode: %w", err)
	}

	// 2. Initialize the entire unified schema
	if err := createTables(db); err != nil {
		return nil, err
	}

	return &DB{conn: db}, nil
}

func createTables(db *sql.DB) error {
	queries := []string{
		// 1. Top-Level Libraries
		`CREATE TABLE IF NOT EXISTS libraries (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			type TEXT,
			author TEXT,
			description TEXT,
			cover_image BLOB
		);`,

		// 2. Generic Entries (No blobs!)
		`CREATE TABLE IF NOT EXISTS entries (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			library_id INTEGER NOT NULL,
			title TEXT NOT NULL,
			description TEXT,
			number TEXT,
			comment TEXT,
			rank TEXT,
			text_alignment TEXT,
			FOREIGN KEY(library_id) REFERENCES libraries(id) ON DELETE CASCADE
		);`,

		// 3. Groupings (Seasons, Volumes, Cover Art group)
		`CREATE TABLE IF NOT EXISTS group_sets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			entry_id INTEGER NOT NULL,
			title TEXT,
			category TEXT,
			sort_order INTEGER DEFAULT 0,
			FOREIGN KEY(entry_id) REFERENCES entries(id) ON DELETE CASCADE
		);`,

		// 4. File Metadata (Lightning fast to query)
		`CREATE TABLE IF NOT EXISTS files (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			groupset_id INTEGER NOT NULL,
			filename TEXT,
			mime_type TEXT,
			size_bytes INTEGER,
			sort_order INTEGER DEFAULT 0,
			FOREIGN KEY(groupset_id) REFERENCES group_sets(id) ON DELETE CASCADE
		);`,

		// 5. The Pure-SQLite Object Store (1:1 with files)
		`CREATE TABLE IF NOT EXISTS objects (
			file_id INTEGER PRIMARY KEY,
			data BLOB NOT NULL,
			FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
		);`,

		// 6. Tags Definition
		`CREATE TABLE IF NOT EXISTS tags (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			description TEXT,
			icon TEXT
		);`,

		// 7. Tags to Entries mapping
		`CREATE TABLE IF NOT EXISTS entry_tags (
			entry_id INTEGER NOT NULL,
			tag_id INTEGER NOT NULL,
			PRIMARY KEY (entry_id, tag_id),
			FOREIGN KEY(entry_id) REFERENCES entries(id) ON DELETE CASCADE,
			FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
		);`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return fmt.Errorf("failed executing schema query: %w\nQuery: %s", err, query)
		}
	}

	return nil
}

// ==========================================
// LIBRARY QUERIES
// ==========================================

func (db *DB) GetLibraries() ([]Library, error) {
	rows, err := db.conn.Query("SELECT id, name, type FROM libraries ORDER BY name ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var libraries []Library
	for rows.Next() {
		var lib Library
		if err := rows.Scan(&lib.ID, &lib.Name, &lib.Type); err != nil {
			return nil, err
		}
		libraries = append(libraries, lib)
	}
	return libraries, nil
}

func (db *DB) CreateLibrary(name, libType string) error {
	_, err := db.conn.Exec("INSERT INTO libraries (name, type) VALUES (?, ?)", name, libType)
	return err
}

// ==========================================
// ENTRY QUERIES (Lightweight!)
// ==========================================

func (db *DB) GetEntries(libraryID int) ([]Entry, error) {
	// Notice how we don't fetch any heavy images here anymore!
	query := `
		SELECT id, library_id, title, COALESCE(description, ''), 
		       COALESCE(number, ''), COALESCE(comment, ''), 
		       COALESCE(rank, ''), COALESCE(text_alignment, '')
		FROM entries 
		WHERE library_id = ?
		ORDER BY CAST(number AS INTEGER) ASC, title ASC
	`
	rows, err := db.conn.Query(query, libraryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []Entry
	for rows.Next() {
		var e Entry
		if err := rows.Scan(&e.ID, &e.LibraryID, &e.Title, &e.Description, &e.Number, &e.Comment, &e.Rank, &e.TextAlignment); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

func (db *DB) DeleteEntry(id int) error {
	// Since we enabled PRAGMA foreign_keys = ON, deleting this entry
	// will automatically cascade and delete the GroupSets -> Files -> Objects!
	_, err := db.conn.Exec("DELETE FROM entries WHERE id = ?", id)
	return err
}

// ==========================================
// GROUP SET QUERIES
// ==========================================

func (db *DB) GetGroupSets(entryID int) ([]GroupSet, error) {
	query := `
		SELECT id, entry_id, COALESCE(title, ''), COALESCE(category, ''), sort_order 
		FROM group_sets 
		WHERE entry_id = ? 
		ORDER BY sort_order ASC
	`
	rows, err := db.conn.Query(query, entryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []GroupSet
	for rows.Next() {
		var g GroupSet
		if err := rows.Scan(&g.ID, &g.EntryID, &g.Title, &g.Category, &g.SortOrder); err != nil {
			return nil, err
		}
		groups = append(groups, g)
	}
	return groups, nil
}

// CreateEntry inserts a new entry into the database
func (db *DB) CreateEntry(entry Entry) error {
	// Calculate the next 'number' to keep your sorting logic intact if none is provided
	if entry.Number == "" {
		var nextNum int
		err := db.conn.QueryRow("SELECT COALESCE(MAX(CAST(number AS INTEGER)), 0) + 1 FROM entries WHERE library_id = ?", entry.LibraryID).Scan(&nextNum)
		if err == nil {
			entry.Number = fmt.Sprintf("%d", nextNum)
		}
	}

	query := `
		INSERT INTO entries (library_id, title, description, number, comment, rank, text_alignment) 
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`
	_, err := db.conn.Exec(query,
		entry.LibraryID, entry.Title, entry.Description,
		entry.Number, entry.Comment, entry.Rank, entry.TextAlignment,
	)
	return err
}

// UpdateEntry modifies an existing entry
func (db *DB) UpdateEntry(entry Entry) error {
	query := `
		UPDATE entries 
		SET title = ?, description = ?, number = ?, comment = ?, rank = ?, text_alignment = ?
		WHERE id = ?
	`
	_, err := db.conn.Exec(query,
		entry.Title, entry.Description, entry.Number,
		entry.Comment, entry.Rank, entry.TextAlignment,
		entry.ID,
	)
	return err
}

// UpdateEntryOrder processes the drag-and-drop reordering
func (db *DB) UpdateEntryOrder(entries []Entry) error {
	tx, err := db.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("UPDATE entries SET number = ? WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, e := range entries {
		if _, err := stmt.Exec(e.Number, e.ID); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// ==========================================
// FILE QUERIES
// ==========================================

// GetFiles retrieves the lightweight metadata for all files in a specific GroupSet
func (db *DB) GetFiles(groupsetID int) ([]File, error) {
	query := `
		SELECT id, groupset_id, COALESCE(filename, ''), COALESCE(mime_type, ''), size_bytes, sort_order 
		FROM files 
		WHERE groupset_id = ? 
		ORDER BY sort_order ASC, id ASC
	`
	rows, err := db.conn.Query(query, groupsetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []File
	for rows.Next() {
		var f File
		if err := rows.Scan(&f.ID, &f.GroupSetID, &f.Filename, &f.MimeType, &f.SizeBytes, &f.SortOrder); err != nil {
			return nil, err
		}
		files = append(files, f)
	}

	return files, nil
}

func (db *DB) GetLibrary(id int) (*Library, error) {
	var lib Library
	err := db.conn.QueryRow("SELECT id, name, type, COALESCE(author, ''), COALESCE(description, '') FROM libraries WHERE id = ?", id).
		Scan(&lib.ID, &lib.Name, &lib.Type, &lib.Author, &lib.Description)
	return &lib, err
}

func (db *DB) UpdateLibrary(lib Library) error {
	_, err := db.conn.Exec("UPDATE libraries SET name = ?, author = ?, description = ? WHERE id = ?",
		lib.Name, lib.Author, lib.Description, lib.ID)
	return err
}

func (db *DB) UpdateLibraryCover(id int, data []byte) error {
	_, err := db.conn.Exec("UPDATE libraries SET cover_image = ? WHERE id = ?", data, id)
	return err
}
