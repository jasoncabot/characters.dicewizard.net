package store

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// SearchNotes performs a full text search with optional entity filters using the FTS virtual table.
func (s *Store) SearchNotes(userID int64, query, entityType string, entityID *int64, limit int) ([]*NoteWithScore, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	conds := []string{"n.user_id = ?"}
	args := []any{userID}

	if entityType = strings.TrimSpace(entityType); entityType != "" {
		conds = append(conds, "n.entity_type = ?")
		args = append(args, entityType)
	}

	if entityID != nil {
		conds = append(conds, "n.entity_id = ?")
		args = append(args, *entityID)
	}

	whereClause := strings.Join(conds, " AND ")
	trimmedQuery := strings.TrimSpace(query)

	ctx := context.Background()
	var rows *sql.Rows
	var err error

	if trimmedQuery != "" {
		ftsQuery := buildFTSQuery(trimmedQuery)
		if ftsQuery == "" {
			ftsQuery = trimmedQuery
		}
		rows, err = s.db.QueryContext(ctx, fmt.Sprintf(`
            SELECT n.id, n.user_id, n.entity_type, n.entity_id, n.title, n.body, n.created_at, n.updated_at, bm25(note_fts) AS score
            FROM note_fts
            JOIN notes n ON n.id = note_fts.rowid
            WHERE %s AND note_fts MATCH ?
            ORDER BY score ASC, n.updated_at DESC
            LIMIT ?`, whereClause), append(args, ftsQuery, limit)...)
	} else {
		rows, err = s.db.QueryContext(ctx, fmt.Sprintf(`
            SELECT n.id, n.user_id, n.entity_type, n.entity_id, n.title, n.body, n.created_at, n.updated_at, NULL AS score
            FROM notes n
            WHERE %s
            ORDER BY n.updated_at DESC
            LIMIT ?`, whereClause), append(args, limit)...)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to search notes: %w", err)
	}
	defer rows.Close()

	var notes []*NoteWithScore
	for rows.Next() {
		note, err := scanNoteWithScore(rows)
		if err != nil {
			return nil, err
		}
		notes = append(notes, note)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating notes: %w", err)
	}

	return notes, nil
}

func scanNoteWithScore(scanner interface{ Scan(dest ...any) error }) (*NoteWithScore, error) {
	var n NoteWithScore
	var entityID sql.NullInt64
	var score sql.NullFloat64

	if err := scanner.Scan(&n.ID, &n.UserID, &n.EntityType, &entityID, &n.Title, &n.Body, &n.CreatedAt, &n.UpdatedAt, &score); err != nil {
		return nil, fmt.Errorf("failed to scan note: %w", err)
	}

	if entityID.Valid {
		n.EntityID = &entityID.Int64
	}

	if score.Valid {
		value := score.Float64
		n.Score = &value
	}

	return &n, nil
}

func buildFTSQuery(input string) string {
	terms := strings.Fields(input)
	if len(terms) == 0 {
		return ""
	}

	for i, term := range terms {
		term = strings.ReplaceAll(term, "\"", "\"\"")
		terms[i] = fmt.Sprintf("\"%s\"*", term)
	}

	return strings.Join(terms, " AND ")
}
