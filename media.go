package main

// --- GroupSet Logic (Replacing MediaGroup) ---

// AddGroupSet creates a new grouping (e.g., "Season 1", "Volume 5")
func (db *DB) AddGroupSet(entryID int, title, category string, sortOrder int) (int, error) {
	result, err := db.conn.Exec(
		"INSERT INTO group_sets (entry_id, title, category, sort_order) VALUES (?, ?, ?, ?)",
		entryID, title, category, sortOrder,
	)
	if err != nil {
		return 0, err
	}
	id, err := result.LastInsertId()
	return int(id), err
}

func (db *DB) UpdateGroupSet(id int, title, category string, sortOrder int) error {
	_, err := db.conn.Exec(
		"UPDATE group_sets SET title = ?, category = ?, sort_order = ? WHERE id = ?",
		title, category, sortOrder, id,
	)
	return err
}

func (db *DB) DeleteGroupSet(id int) error {
	// Cascading delete handles the files and objects automatically!
	_, err := db.conn.Exec("DELETE FROM group_sets WHERE id = ?", id)
	return err
}

// --- File & Object Logic (Replacing MediaAsset) ---

// AddFile handles the 1:1 relationship securely via a Transaction.
// It inserts metadata into 'files', and the raw bytes into 'objects'.
func (db *DB) AddFile(groupsetID int, filename, mimeType string, sizeBytes int64, data []byte, sortOrder int) (int, error) {
	tx, err := db.conn.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback() // Rolls back if anything fails before tx.Commit()

	// 1. Insert Metadata (Fast)
	result, err := tx.Exec(
		"INSERT INTO files (groupset_id, filename, mime_type, size_bytes, sort_order) VALUES (?, ?, ?, ?, ?)",
		groupsetID, filename, mimeType, sizeBytes, sortOrder,
	)
	if err != nil {
		return 0, err
	}

	fileID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	// 2. Insert BLOB into Object Store (Heavy)
	_, err = tx.Exec(
		"INSERT INTO objects (file_id, data) VALUES (?, ?)",
		fileID, data,
	)
	if err != nil {
		return 0, err
	}

	return int(fileID), tx.Commit()
}

func (db *DB) UpdateFileMetadata(id int, filename, mimeType string, sortOrder int) error {
	// Notice we don't update the BLOB here, just the lightweight text
	_, err := db.conn.Exec(
		"UPDATE files SET filename = ?, mime_type = ?, sort_order = ? WHERE id = ?",
		filename, mimeType, sortOrder, id,
	)
	return err
}

func (db *DB) DeleteFile(id int) error {
	// Because of ON DELETE CASCADE, deleting the file metadata row
	// automatically wipes the massive BLOB from the 'objects' table.
	_, err := db.conn.Exec("DELETE FROM files WHERE id = ?", id)
	return err
}

// FetchFileBlob retrieves the raw bytes and mime_type for the streaming server.
func (db *DB) FetchFileBlob(fileID int) ([]byte, string, error) {
	var data []byte
	var mimeType string

	// Join the heavy object table with the fast metadata table
	query := `
		SELECT o.data, f.mime_type 
		FROM objects o
		JOIN files f ON f.id = o.file_id
		WHERE f.id = ?
	`
	err := db.conn.QueryRow(query, fileID).Scan(&data, &mimeType)
	if err != nil {
		return nil, "", err
	}
	return data, mimeType, nil
}

// UpdateFileOrder takes a list of files and updates their sort_order in a transaction
func (db *DB) UpdateFileOrder(files []File) error {
	tx, err := db.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare("UPDATE files SET sort_order = ? WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, f := range files {
		if _, err := stmt.Exec(f.SortOrder, f.ID); err != nil {
			return err
		}
	}

	return tx.Commit()
}
