package main

import (
	"database/sql"
	"fmt"
	"strconv"

	_ "modernc.org/sqlite"
)

// DB handles all direct database interactions
type DB struct {
	conn *sql.DB
}

// InitDB opens the connection and ensures schema exists
func InitDB(path string) (*DB, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}

	// IMPORTANT: Enable Foreign Keys for Cascade Delete to work!
	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		return nil, fmt.Errorf("failed to enable foreign keys: %w", err)
	}

	// Initialize standard tables
	if err := createTables(db); err != nil {
		return nil, err
	}

	// Initialize NEW media tables (defined in media.go)
	if err := CreateMediaTables(db); err != nil {
		return nil, err
	}

	// Apply patches...
	if err := patchSchema(db); err != nil {
		return nil, err
	}

	return &DB{conn: db}, nil
}

func createTables(db *sql.DB) error {
	entriesSchema := `
	CREATE TABLE IF NOT EXISTS entries (
		id INTEGER NOT NULL PRIMARY KEY,
		number TEXT NOT NULL,
		title TEXT,
		comment TEXT,
		rank TEXT,
		description TEXT,
		image BLOB,
		backup BLOB,
		backup_name TEXT,
		text_alignment TEXT DEFAULT 'center' 
	);`
	if _, err := db.Exec(entriesSchema); err != nil {
		return fmt.Errorf("error creating entries table: %w", err)
	}

	compendiumSchema := `
	CREATE TABLE IF NOT EXISTS compendium_data (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		title TEXT,
		author TEXT,
		description TEXT,
		image BLOB
	);`
	if _, err := db.Exec(compendiumSchema); err != nil {
		return fmt.Errorf("error creating compendium table: %w", err)
	}

	var count int
	_ = db.QueryRow("SELECT COUNT(*) FROM compendium_data WHERE id = 1").Scan(&count)
	if count == 0 {
		_, _ = db.Exec("INSERT INTO compendium_data (id, title, author, description) VALUES (?, ?, ?, ?)",
			1, "My Yuri Collection", "Your Name", "A personal list of all the Girls' Love media I've enjoyed.")
	}

	return nil
}

// patchSchema evolves the database structure without losing data
func patchSchema(db *sql.DB) error {
	// Check if 'text_alignment' column exists
	var count int
	err := db.QueryRow("SELECT count(*) FROM pragma_table_info('entries') WHERE name = 'text_alignment'").Scan(&count)
	if err != nil {
		return err
	}

	// If not, add it safely
	if count == 0 {
		_, err = db.Exec("ALTER TABLE entries ADD COLUMN text_alignment TEXT DEFAULT 'center'")
		if err != nil {
			return fmt.Errorf("failed to add text_alignment column: %w", err)
		}
	}
	return nil
}

// --- Data Retrieval Methods ---

func (db *DB) FetchEntryList(query string) ([]MangaEntry, error) {
	sqlStmt := "SELECT id, number, title, comment, rank, description, backup_name, text_alignment FROM entries"
	args := []interface{}{}

	// Add filter if query exists
	if query != "" {
		sqlStmt += " WHERE title LIKE ? OR comment LIKE ?"
		wildcard := "%" + query + "%"
		args = append(args, wildcard, wildcard)
	}

	sqlStmt += " ORDER BY CAST(number AS INTEGER) ASC"

	rows, err := db.conn.Query(sqlStmt, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []MangaEntry
	for rows.Next() {
		var e MangaEntry
		var description sql.NullString
		var backupName sql.NullString
		var align sql.NullString

		if err := rows.Scan(&e.ID, &e.Number, &e.Title, &e.Comment, &e.Rank, &description, &backupName, &align); err != nil {
			return nil, err
		}
		e.Description = description.String
		e.BackupName = backupName.String
		e.TextAlignment = align.String
		if e.TextAlignment == "" {
			e.TextAlignment = "center"
		}
		e.Image = []byte{}
		e.Backup = []byte{}

		entries = append(entries, e)
	}
	return entries, nil
}

func (db *DB) FetchEntryImage(id int) ([]byte, error) {
	var image sql.Null[[]byte]
	err := db.conn.QueryRow("SELECT image FROM entries WHERE id = ?", id).Scan(&image)
	if err != nil {
		return nil, err
	}
	if image.Valid {
		return image.V, nil
	}
	return nil, nil
}

func (db *DB) FetchEntryBackup(id int) ([]byte, string, error) {
	var backup sql.Null[[]byte]
	var name sql.NullString
	err := db.conn.QueryRow("SELECT backup, backup_name FROM entries WHERE id = ?", id).Scan(&backup, &name)
	if err != nil {
		return nil, "", err
	}
	if backup.Valid {
		return backup.V, name.String, nil
	}
	return nil, "", nil
}

func (db *DB) FetchCompendiumData() (CompendiumData, error) {
	var data CompendiumData
	var image sql.Null[[]byte]
	err := db.conn.QueryRow("SELECT title, author, description, image FROM compendium_data WHERE id = 1").Scan(
		&data.Title, &data.Author, &data.Description, &image,
	)
	if image.Valid {
		data.Image = image.V
	}
	return data, err
}

// --- Data Modification Methods ---

func (db *DB) UpdateCompendium(data CompendiumData) error {
	_, err := db.conn.Exec("UPDATE compendium_data SET title = ?, author = ?, description = ?, image = ? WHERE id = 1",
		data.Title, data.Author, data.Description, data.Image)
	return err
}

func (db *DB) SaveEntry(entry MangaEntry) error {
	newNum, err := strconv.Atoi(entry.Number)
	if err != nil {
		return fmt.Errorf("invalid number: %v", err)
	}

	// Default alignment if missing
	if entry.TextAlignment == "" {
		entry.TextAlignment = "center"
	}

	tx, err := db.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var oldNum int = -1
	if entry.ID != 0 {
		var oldNumStr string
		err := tx.QueryRow("SELECT number FROM entries WHERE id = ?", entry.ID).Scan(&oldNumStr)
		if err == nil {
			oldNum, _ = strconv.Atoi(oldNumStr)
		}
	}

	if newNum != oldNum {
		_, err = tx.Exec("UPDATE entries SET number = CAST(number AS INTEGER) + 1 WHERE CAST(number AS INTEGER) >= ?", newNum)
		if err != nil {
			return err
		}
	}

	// Insert or Update - Added text_alignment to queries
	if entry.ID == 0 {
		_, err = tx.Exec("INSERT INTO entries (number, title, comment, rank, description, image, backup, backup_name, text_alignment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			entry.Number, entry.Title, entry.Comment, entry.Rank, entry.Description, entry.Image, entry.Backup, entry.BackupName, entry.TextAlignment)
	} else {
		if len(entry.Backup) > 0 && len(entry.Image) > 0 {
			_, err = tx.Exec("UPDATE entries SET number = ?, title = ?, comment = ?, rank = ?, description = ?, image = ?, backup = ?, backup_name = ?, text_alignment = ? WHERE id = ?",
				entry.Number, entry.Title, entry.Comment, entry.Rank, entry.Description, entry.Image, entry.Backup, entry.BackupName, entry.TextAlignment, entry.ID)
		} else if len(entry.Image) > 0 {
			_, err = tx.Exec("UPDATE entries SET number = ?, title = ?, comment = ?, rank = ?, description = ?, image = ?, backup_name = ?, text_alignment = ? WHERE id = ?",
				entry.Number, entry.Title, entry.Comment, entry.Rank, entry.Description, entry.Image, entry.BackupName, entry.TextAlignment, entry.ID)
		} else if len(entry.Backup) > 0 {
			_, err = tx.Exec("UPDATE entries SET number = ?, title = ?, comment = ?, rank = ?, description = ?, backup = ?, backup_name = ?, text_alignment = ? WHERE id = ?",
				entry.Number, entry.Title, entry.Comment, entry.Rank, entry.Description, entry.Backup, entry.BackupName, entry.TextAlignment, entry.ID)
		} else {
			_, err = tx.Exec("UPDATE entries SET number = ?, title = ?, comment = ?, rank = ?, description = ?, backup_name = ?, text_alignment = ? WHERE id = ?",
				entry.Number, entry.Title, entry.Comment, entry.Rank, entry.Description, entry.BackupName, entry.TextAlignment, entry.ID)
		}
	}
	if err != nil {
		return err
	}

	if oldNum != -1 && newNum > oldNum {
		_, err = tx.Exec("UPDATE entries SET number = CAST(number AS INTEGER) - 1 WHERE CAST(number AS INTEGER) > ?", oldNum)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (db *DB) DeleteEntry(id int) error {
	var deletedNum int
	err := db.conn.QueryRow("SELECT number FROM entries WHERE id = ?", id).Scan(&deletedNum)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		return err
	}

	tx, err := db.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM entries WHERE id = ?", id); err != nil {
		return err
	}
	if _, err := tx.Exec("UPDATE entries SET number = CAST(number AS INTEGER) - 1 WHERE CAST(number AS INTEGER) > ?", deletedNum); err != nil {
		return err
	}

	return tx.Commit()
}

func (db *DB) UpdateOrder(entries []MangaEntry) error {
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

	for _, entry := range entries {
		if _, err := stmt.Exec(entry.Number, entry.ID); err != nil {
			return err
		}
	}
	return tx.Commit()
}
