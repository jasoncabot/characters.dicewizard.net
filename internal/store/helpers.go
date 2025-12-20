package store

import (
	"encoding/json"
	"strings"
	"time"
)

func isUniqueConstraintError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "UNIQUE constraint failed") || strings.Contains(strings.ToLower(msg), "unique constraint")
}

func nullString(ns *string) string {
	if ns != nil {
		return *ns
	}
	return ""
}

// randomCode generates an alphanumeric code; callers ensure uniqueness.
func randomCode(length int) string {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = alphabet[int(time.Now().UnixNano()+int64(i))%len(alphabet)]
	}
	return string(b)
}

func marshalStringArray(values []string) string {
	if len(values) == 0 {
		return "[]"
	}
	data, err := json.Marshal(values)
	if err != nil {
		return "[]"
	}
	return string(data)
}

func parseStringArray(input string) []string {
	input = strings.TrimSpace(input)
	if input == "" {
		return []string{}
	}
	var values []string
	if err := json.Unmarshal([]byte(input), &values); err != nil {
		return []string{}
	}
	return values
}

func nullJSONString(ns *string) string {
	if ns != nil && *ns != "" {
		return *ns
	}
	return "[]"
}

func ptr[T any](v T) *T {
	return &v
}

func int64ToPtrOrNil(v int64) *int64 {
	if v == 0 {
		return nil
	}
	return &v
}

func nullInt64(ni *int64) int64 {
	if ni != nil {
		return *ni
	}
	return 0
}
