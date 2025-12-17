package models

import "time"

// Campaign visibility options
const (
	CampaignVisibilityPrivate = "private"
	CampaignVisibilityInvite  = "invite"
)

// Campaign lifecycle states
const (
	CampaignStatusNotStarted = "not_started"
	CampaignStatusInProgress = "in_progress"
	CampaignStatusPaused     = "paused"
	CampaignStatusCompleted  = "completed"
	CampaignStatusArchived   = "archived"
)

// Campaign represents a shared world for multiple characters and scenes.
type Campaign struct {
	ID          int64     `json:"id"`
	OwnerID     int64     `json:"ownerId"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Visibility  string    `json:"visibility"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// CampaignMember captures a user's role inside a campaign.
type CampaignMember struct {
	ID         int64     `json:"id"`
	CampaignID int64     `json:"campaignId"`
	UserID     int64     `json:"userId"`
	Role       string    `json:"role"`
	Status     string    `json:"status"`
	InvitedBy  *int64    `json:"invitedBy,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

// CampaignCharacter links a character to a campaign (many-to-many).
type CampaignCharacter struct {
	ID          int64     `json:"id"`
	CampaignID  int64     `json:"campaignId"`
	CharacterID int64     `json:"characterId"`
	CreatedAt   time.Time `json:"createdAt"`
}

// Scene represents a playable scene inside a campaign.
type Scene struct {
	ID          int64     `json:"id"`
	CampaignID  int64     `json:"campaignId"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Ordering    int       `json:"ordering"`
	IsActive    bool      `json:"isActive"`
	CreatedBy   *int64    `json:"createdBy"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// Map belongs to a scene and holds drawable/token layers.
type Map struct {
	ID           int64     `json:"id"`
	SceneID      int64     `json:"sceneId"`
	Name         string    `json:"name"`
	BaseImageURL string    `json:"baseImageUrl"`
	GridSizeFt   int       `json:"gridSizeFt"`
	WidthPx      *int      `json:"widthPx"`
	HeightPx     *int      `json:"heightPx"`
	LightingMode string    `json:"lightingMode"`
	FogState     string    `json:"fogState"`
	CreatedAt    time.Time `json:"createdAt"`
}

// Token represents a movable piece on the map.
type Token struct {
	ID          int64     `json:"id"`
	MapID       int64     `json:"mapId"`
	CharacterID *int64    `json:"characterId,omitempty"`
	Label       string    `json:"label"`
	ImageURL    string    `json:"imageUrl"`
	SizeSquares int       `json:"sizeSquares"`
	PositionX   int       `json:"positionX"`
	PositionY   int       `json:"positionY"`
	FacingDeg   int       `json:"facingDeg"`
	Audience    []string  `json:"audience"`
	Tags        []string  `json:"tags"`
	Notes       string    `json:"notes"`
	CreatedBy   *int64    `json:"createdBy"`
	CreatedAt   time.Time `json:"createdAt"`
}

// CreateCampaignRequest is the payload for creating a campaign.
type CreateCampaignRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Visibility  string `json:"visibility"`
	Status      string `json:"status"`
}

// AddCharacterToCampaignRequest attaches a character to a campaign.
type AddCharacterToCampaignRequest struct {
	CharacterID int64 `json:"characterId"`
}

// CampaignCharacterSummary describes a character linked to a campaign with its owner.
type CampaignCharacterSummary struct {
	LinkID         int64  `json:"linkId"`
	CharacterID    int64  `json:"characterId"`
	CharacterName  string `json:"characterName"`
	CharacterClass string `json:"characterClass"`
	CharacterLevel int    `json:"characterLevel"`
	OwnerID        int64  `json:"ownerId"`
	OwnerUsername  string `json:"ownerUsername"`
}

// CampaignDetail augments a campaign with attached characters.
type CampaignDetail struct {
	Campaign
	Characters []CampaignCharacterSummary `json:"characters"`
}

// Default starter tags for tokens.
var DefaultTokenTags = []string{"enemy", "ally", "neutral", "objective", "hazard"}

// Default audiences for tokens (gm-only by default).
var DefaultTokenAudience = []string{"gm-only"}
