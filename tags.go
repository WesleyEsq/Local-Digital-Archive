package main

// Tag struct remains exactly the same so the React frontend doesn't break
type Tag struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`  // Stores a key like "sword", "magic", "slice_of_life"
	Count       int    `json:"count"` // derived field: how many entries use this tag?
}

func (db *DB) CreateTag(name, description, icon string) error {
	_, err := db.conn.Exec("INSERT INTO tags (name, description, icon) VALUES (?, ?, ?)", name, description, icon)
	return err
}

func (db *DB) GetAllTags() ([]Tag, error) {
	// Using LEFT JOIN to get the count of entries per tag
	query := `
		SELECT t.id, t.name, COALESCE(t.description, ''), COALESCE(t.icon, ''), COUNT(et.entry_id) as count
		FROM tags t
		LEFT JOIN entry_tags et ON t.id = et.tag_id
		GROUP BY t.id
		ORDER BY t.name ASC
	`
	rows, err := db.conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []Tag
	for rows.Next() {
		var tag Tag
		if err := rows.Scan(&tag.ID, &tag.Name, &tag.Description, &tag.Icon, &tag.Count); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}
	return tags, nil
}

func (db *DB) GetTagsForEntry(entryID int) ([]Tag, error) {
	query := `
		SELECT t.id, t.name, COALESCE(t.description, ''), COALESCE(t.icon, '')
		FROM tags t
		INNER JOIN entry_tags et ON t.id = et.tag_id
		WHERE et.entry_id = ?
	`
	rows, err := db.conn.Query(query, entryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []Tag
	for rows.Next() {
		var tag Tag
		if err := rows.Scan(&tag.ID, &tag.Name, &tag.Description, &tag.Icon); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}
	return tags, nil
}

func (db *DB) AddTagToEntry(entryID, tagID int) error {
	// INSERT OR IGNORE avoids errors if the link already exists
	_, err := db.conn.Exec("INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)", entryID, tagID)
	return err
}

func (db *DB) RemoveTagFromEntry(entryID, tagID int) error {
	_, err := db.conn.Exec("DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?", entryID, tagID)
	return err
}

func (db *DB) DeleteTag(tagID int) error {
	// Cascade in DB handles the entry_tags cleanup automatically
	_, err := db.conn.Exec("DELETE FROM tags WHERE id = ?", tagID)
	return err
}

func (db *DB) UpdateTag(id int, name, description, icon string) error {
	_, err := db.conn.Exec(
		"UPDATE tags SET name = ?, description = ?, icon = ? WHERE id = ?",
		name, description, icon, id,
	)
	return err
}

func (db *DB) UpdateEntryTags(entryID int, tagIDs []int) error {
	tx, err := db.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Clear existing tags for this entry
	_, err = tx.Exec("DELETE FROM entry_tags WHERE entry_id = ?", entryID)
	if err != nil {
		return err
	}

	// 2. Insert new tags
	stmt, err := tx.Prepare("INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)")
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, tagID := range tagIDs {
		if _, err := stmt.Exec(entryID, tagID); err != nil {
			return err
		}
	}

	return tx.Commit()
}
