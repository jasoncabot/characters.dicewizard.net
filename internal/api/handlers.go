package api

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
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

const uploadMountPath = "/uploads"

// Handler holds the dependencies for HTTP handlers
type Handler struct {
	store      *store.Store
	jwtSecret  []byte
	assetsPath string
}

// NewHandler creates a new Handler
func NewHandler(s *store.Store, jwtSecret, assetsPath string) *Handler {
	return &Handler{
		store:      s,
		jwtSecret:  []byte(jwtSecret),
		assetsPath: assetsPath,
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

// Campaign handlers

// ListCampaigns handles GET /api/campaigns
func (h *Handler) ListCampaigns(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	campaigns, err := h.store.ListCampaigns(userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if campaigns == nil {
		campaigns = []*models.Campaign{}
	}

	respondJSON(w, http.StatusOK, campaigns)
}

// ListCampaignDetails handles GET /api/campaigns/details to include linked characters.
func (h *Handler) ListCampaignDetails(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	details, err := h.store.ListCampaignDetails(userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if details == nil {
		details = []*models.CampaignDetail{}
	}

	respondJSON(w, http.StatusOK, details)
}

// CreateCampaign handles POST /api/campaigns
func (h *Handler) CreateCampaign(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	var req models.CreateCampaignRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	campaign, err := h.store.CreateCampaign(userID, req.Name, req.Description, req.Visibility, req.Status)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, campaign)
}

// UpdateCampaign handles PUT /api/campaigns/{id}
func (h *Handler) UpdateCampaign(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	idStr := chi.URLParam(r, "id")
	campaignID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid campaign id")
		return
	}

	var req models.CreateCampaignRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	updated, err := h.store.UpdateCampaign(campaignID, userID, req.Name, req.Description, req.Visibility, req.Status)
	if err != nil {
		switch err {
		case store.ErrCampaignNotFound:
			respondError(w, http.StatusNotFound, err.Error())
		case store.ErrNotCampaignMember, store.ErrNotPermitted:
			respondError(w, http.StatusForbidden, err.Error())
		case store.ErrInvalidCampaignStatus:
			respondError(w, http.StatusBadRequest, err.Error())
		default:
			respondError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	respondJSON(w, http.StatusOK, updated)
}

// UpdateCampaignStatus handles PUT /api/campaigns/{id}/status
func (h *Handler) UpdateCampaignStatus(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	idStr := chi.URLParam(r, "id")
	campaignID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid campaign id")
		return
	}

	var payload struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	updated, err := h.store.UpdateCampaignStatus(campaignID, userID, payload.Status)
	if err != nil {
		switch err {
		case store.ErrCampaignNotFound:
			respondError(w, http.StatusNotFound, err.Error())
		case store.ErrNotPermitted, store.ErrNotCampaignMember:
			respondError(w, http.StatusForbidden, err.Error())
		case store.ErrInvalidCampaignStatus:
			respondError(w, http.StatusBadRequest, err.Error())
		default:
			respondError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	respondJSON(w, http.StatusOK, updated)
}

// AddCharacterToCampaign handles POST /api/campaigns/{id}/characters
func (h *Handler) AddCharacterToCampaign(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	idStr := chi.URLParam(r, "id")
	campaignID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid campaign id")
		return
	}

	var req models.AddCharacterToCampaignRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.CharacterID == 0 {
		respondError(w, http.StatusBadRequest, "characterId is required")
		return
	}

	link, err := h.store.AddCharacterToCampaign(campaignID, req.CharacterID, userID)
	if err != nil {
		switch err {
		case store.ErrCampaignNotFound:
			respondError(w, http.StatusNotFound, err.Error())
		case store.ErrNotCampaignMember, store.ErrNotPermitted, store.ErrCharacterNotOwned:
			respondError(w, http.StatusForbidden, err.Error())
		case store.ErrCampaignCharacterExists:
			respondError(w, http.StatusConflict, err.Error())
		default:
			respondError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}

	respondJSON(w, http.StatusCreated, link)
}

// CreateCampaignInvite handles POST /api/campaigns/{id}/invites
func (h *Handler) CreateCampaignInvite(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	idStr := chi.URLParam(r, "id")
	campaignID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid campaign id")
		return
	}

	var req models.CreateCampaignInviteRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	inv, err := h.store.CreateCampaignInvite(campaignID, userID, req.RoleDefault, req.ExpiresAt)
	if err != nil {
		switch err {
		case store.ErrNotPermitted, store.ErrNotCampaignMember:
			respondError(w, http.StatusForbidden, err.Error())
		default:
			respondError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	respondJSON(w, http.StatusCreated, inv)
}

// AcceptCampaignInvite handles POST /api/campaigns/invites/{code}/accept
func (h *Handler) AcceptCampaignInvite(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	code := chi.URLParam(r, "code")

	campaign, err := h.store.AcceptInvite(code, userID)
	if err != nil {
		switch err {
		case store.ErrInviteNotFound:
			respondError(w, http.StatusNotFound, err.Error())
		case store.ErrInviteExpired, store.ErrInviteRedeemed, store.ErrAlreadyMember:
			respondError(w, http.StatusBadRequest, err.Error())
		default:
			respondError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	respondJSON(w, http.StatusOK, campaign)
}

// ListCampaignMembers handles GET /api/campaigns/{id}/members
func (h *Handler) ListCampaignMembers(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	idStr := chi.URLParam(r, "id")
	campaignID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid campaign id")
		return
	}

	members, err := h.store.ListCampaignMembers(campaignID, userID)
	if err != nil {
		switch err {
		case store.ErrNotCampaignMember:
			respondError(w, http.StatusForbidden, err.Error())
		default:
			respondError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	respondJSON(w, http.StatusOK, members)
}

// UpdateCampaignMemberRole handles PUT /api/campaigns/{id}/members/{userId}/role
func (h *Handler) UpdateCampaignMemberRole(w http.ResponseWriter, r *http.Request) {
	actorID := getUserID(r)
	campaignID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid campaign id")
		return
	}
	targetID, err := strconv.ParseInt(chi.URLParam(r, "userId"), 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user id")
		return
	}

	var payload struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	m, err := h.store.UpdateMemberRole(campaignID, targetID, actorID, payload.Role)
	if err != nil {
		switch err {
		case store.ErrNotPermitted, store.ErrNotCampaignMember:
			respondError(w, http.StatusForbidden, err.Error())
		default:
			respondError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	respondJSON(w, http.StatusOK, m)
}

// RevokeCampaignMember handles POST /api/campaigns/{id}/members/{userId}/revoke
func (h *Handler) RevokeCampaignMember(w http.ResponseWriter, r *http.Request) {
	actorID := getUserID(r)
	campaignID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid campaign id")
		return
	}
	targetID, err := strconv.ParseInt(chi.URLParam(r, "userId"), 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid user id")
		return
	}

	if err := h.store.RevokeMember(campaignID, targetID, actorID); err != nil {
		switch err {
		case store.ErrNotPermitted, store.ErrNotCampaignMember:
			respondError(w, http.StatusForbidden, err.Error())
		default:
			respondError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Note handlers

// CreateNote handles POST /api/notes
func (h *Handler) CreateNote(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)

	var req models.CreateNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if strings.TrimSpace(req.Body) == "" && strings.TrimSpace(req.Title) == "" {
		respondError(w, http.StatusBadRequest, "Title or body is required")
		return
	}

	note, err := h.store.CreateNote(userID, req.EntityType, req.EntityID, req.Title, req.Body)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, note)
}

// SearchNotes handles GET /api/notes/search
func (h *Handler) SearchNotes(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	query := r.URL.Query()

	q := query.Get("q")
	entityType := query.Get("entityType")

	var entityID *int64
	if entityIDStr := query.Get("entityId"); entityIDStr != "" {
		val, err := strconv.ParseInt(entityIDStr, 10, 64)
		if err != nil {
			respondError(w, http.StatusBadRequest, "Invalid entityId")
			return
		}
		entityID = &val
	}

	limit := 20
	if limitStr := query.Get("limit"); limitStr != "" {
		if val, err := strconv.Atoi(limitStr); err == nil && val > 0 {
			limit = val
		}
	}

	results, err := h.store.SearchNotes(userID, q, entityType, entityID, limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if results == nil {
		results = []*models.Note{}
	}

	respondJSON(w, http.StatusOK, results)
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
	character.AvatarURL = existing.AvatarURL

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

// UploadCharacterAvatar handles POST /api/characters/{id}/avatar
func (h *Handler) UploadCharacterAvatar(w http.ResponseWriter, r *http.Request) {
	const maxUploadSize = int64(5 << 20) // 5MB

	userID := getUserID(r)
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid character id")
		return
	}

	// Ensure character exists and belongs to user
	character, err := h.store.GetCharacter(id, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to load character")
		return
	}
	if character == nil {
		respondError(w, http.StatusNotFound, "Character not found")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid upload payload")
		return
	}

	file, _, err := r.FormFile("avatar")
	if err != nil {
		respondError(w, http.StatusBadRequest, "Avatar file is required")
		return
	}
	defer file.Close()

	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		respondError(w, http.StatusBadRequest, "Failed to read upload")
		return
	}
	if n == 0 {
		respondError(w, http.StatusBadRequest, "Empty file")
		return
	}

	contentType := http.DetectContentType(buffer[:n])
	extension := ""
	switch contentType {
	case "image/jpeg":
		extension = ".jpg"
	case "image/png":
		extension = ".png"
	case "image/webp":
		extension = ".webp"
	case "image/gif":
		extension = ".gif"
	default:
		respondError(w, http.StatusBadRequest, "Unsupported file type")
		return
	}

	fileName := fmt.Sprintf("char-%d-%d%s", id, time.Now().UnixNano(), extension)
	avatarDir := filepath.Join(h.assetsPath, "avatars")
	if err := os.MkdirAll(avatarDir, 0755); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to prepare assets directory")
		return
	}
	filePath := filepath.Join(avatarDir, fileName)

	dst, err := os.Create(filePath)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to save avatar")
		return
	}
	defer dst.Close()

	if _, err := dst.Write(buffer[:n]); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to write file")
		return
	}
	if _, err := io.Copy(dst, file); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to write file")
		return
	}

	avatarURL := fmt.Sprintf("%s/avatars/%s", uploadMountPath, fileName)
	updated, err := h.store.UpdateCharacterAvatar(id, userID, avatarURL)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update avatar")
		return
	}

	// Clean up previous avatar if present (only new uploads path is supported)
	if character.AvatarURL != "" && strings.HasPrefix(character.AvatarURL, uploadMountPath+"/") {
		oldPath := strings.TrimPrefix(character.AvatarURL, uploadMountPath+"/")
		if oldPath != "" {
			clean := filepath.Clean(oldPath)
			target := filepath.Join(h.assetsPath, clean)
			if rel, err := filepath.Rel(h.assetsPath, target); err == nil && !strings.HasPrefix(rel, "..") {
				_ = os.Remove(target)
			}
		}
	}

	respondJSON(w, http.StatusOK, updated)
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
