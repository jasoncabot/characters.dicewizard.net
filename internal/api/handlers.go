package api

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jasoncabot/dicewizard-characters/internal/models"
	"github.com/jasoncabot/dicewizard-characters/internal/store"
	"golang.org/x/crypto/bcrypt"
)

type contextKey string

const userIDKey contextKey = "userID"

// Handler holds the dependencies for HTTP handlers
type Handler struct {
	store     *store.Store
	jwtSecret []byte
}

// NewHandler creates a new Handler
func NewHandler(s *store.Store, jwtSecret string) *Handler {
	return &Handler{
		store:     s,
		jwtSecret: []byte(jwtSecret),
	}
}

// Auth handlers

// Register handles POST /api/auth/register
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.UserCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Username == "" || req.Password == "" {
		respondError(w, http.StatusBadRequest, "Username and password are required")
		return
	}

	if len(req.Password) < 6 {
		respondError(w, http.StatusBadRequest, "Password must be at least 6 characters")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	user, err := h.store.CreateUser(req.Username, string(hashedPassword))
	if err != nil {
		if err == store.ErrUserExists {
			respondError(w, http.StatusConflict, "Username already exists")
			return
		}
		respondError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	token, err := h.generateJWT(user.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	respondJSON(w, http.StatusCreated, models.LoginResponse{
		Token: token,
		User:  *user,
	})
}

// Login handles POST /api/auth/login
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.UserCreate
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := h.store.GetUserByUsername(req.Username)
	if err != nil {
		if err == store.ErrUserNotFound {
			respondError(w, http.StatusUnauthorized, "Invalid credentials")
			return
		}
		respondError(w, http.StatusInternalServerError, "Failed to get user")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		respondError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	token, err := h.generateJWT(user.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	respondJSON(w, http.StatusOK, models.LoginResponse{
		Token: token,
		User:  *user,
	})
}

// Me handles GET /api/auth/me
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	user, err := h.store.GetUserByID(userID)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}
	respondJSON(w, http.StatusOK, user)
}

// Character handlers

// ListCharacters handles GET /api/characters
func (h *Handler) ListCharacters(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	characters, err := h.store.ListCharacters(userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if characters == nil {
		characters = []*models.Character{}
	}

	respondJSON(w, http.StatusOK, characters)
}

// GetCharacter handles GET /api/characters/{id}
func (h *Handler) GetCharacter(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid character id")
		return
	}

	character, err := h.store.GetCharacter(id, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if character == nil {
		respondError(w, http.StatusNotFound, "Character not found")
		return
	}

	respondJSON(w, http.StatusOK, character)
}

// CreateCharacter handles POST /api/characters
func (h *Handler) CreateCharacter(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	var req models.CreateCharacterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Name == "" {
		respondError(w, http.StatusBadRequest, "Name is required")
		return
	}

	character := req.ToCharacter()
	character.UserID = userID

	if err := h.store.CreateCharacter(character); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, character)
}

// UpdateCharacter handles PUT /api/characters/{id}
func (h *Handler) UpdateCharacter(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid character id")
		return
	}

	existing, err := h.store.GetCharacter(id, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing == nil {
		respondError(w, http.StatusNotFound, "Character not found")
		return
	}

	var req models.CreateCharacterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	character := req.ToCharacter()
	character.ID = id
	character.UserID = userID
	character.CreatedAt = existing.CreatedAt

	if err := h.store.UpdateCharacter(character); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, character)
}

// DeleteCharacter handles DELETE /api/characters/{id}
func (h *Handler) DeleteCharacter(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid character id")
		return
	}

	if err := h.store.DeleteCharacter(id, userID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Auth middleware
func (h *Handler) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respondError(w, http.StatusUnauthorized, "Authorization header required")
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			respondError(w, http.StatusUnauthorized, "Invalid authorization header")
			return
		}

		userID, err := h.validateJWT(parts[1])
		if err != nil {
			respondError(w, http.StatusUnauthorized, "Invalid token")
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Helper functions
func getUserID(r *http.Request) int64 {
	if id, ok := r.Context().Value(userIDKey).(int64); ok {
		return id
	}
	return 0
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// JWT functions
func (h *Handler) generateJWT(userID int64) (string, error) {
	header := base64Encode([]byte(`{"alg":"HS256","typ":"JWT"}`))
	payload := base64Encode([]byte(`{"sub":"` + strconv.FormatInt(userID, 10) + `","exp":` + strconv.FormatInt(time.Now().Add(24*7*time.Hour).Unix(), 10) + `}`))
	signature := h.hmacSHA256(header + "." + payload)
	return header + "." + payload + "." + signature, nil
}

func (h *Handler) validateJWT(tokenString string) (int64, error) {
	parts := strings.Split(tokenString, ".")
	if len(parts) != 3 {
		return 0, http.ErrNoCookie
	}

	expectedSig := h.hmacSHA256(parts[0] + "." + parts[1])
	if parts[2] != expectedSig {
		return 0, http.ErrNoCookie
	}

	payloadBytes, err := base64Decode(parts[1])
	if err != nil {
		return 0, err
	}

	payload := string(payloadBytes)

	subStart := strings.Index(payload, `"sub":"`) + 7
	subEnd := strings.Index(payload[subStart:], `"`) + subStart
	userID, err := strconv.ParseInt(payload[subStart:subEnd], 10, 64)
	if err != nil {
		return 0, err
	}

	expStart := strings.Index(payload, `"exp":`) + 6
	expEnd := expStart
	for expEnd < len(payload) && payload[expEnd] >= '0' && payload[expEnd] <= '9' {
		expEnd++
	}
	exp, err := strconv.ParseInt(payload[expStart:expEnd], 10, 64)
	if err != nil {
		return 0, err
	}

	if time.Now().Unix() > exp {
		return 0, http.ErrNoCookie
	}

	return userID, nil
}

func base64Encode(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}

func base64Decode(data string) ([]byte, error) {
	return base64.RawURLEncoding.DecodeString(data)
}

func (h *Handler) hmacSHA256(data string) string {
	mac := hmac.New(sha256.New, h.jwtSecret)
	mac.Write([]byte(data))
	return base64Encode(mac.Sum(nil))
}
