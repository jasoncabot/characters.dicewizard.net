package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jasoncabot/dicewizard-characters/internal/models"
)

// CreateCampaign creates a campaign and records the owner membership.
func (s *Store) CreateCampaign(ownerID int64, name, description, visibility, status string) (*models.Campaign, error) {
	if name == "" {
		return nil, fmt.Errorf("campaign name is required")
	}

	if visibility == "" {
		visibility = models.CampaignVisibilityPrivate
	}
	if visibility != models.CampaignVisibilityPrivate && visibility != models.CampaignVisibilityInvite {
		return nil, fmt.Errorf("invalid visibility")
	}

	if status == "" {
		status = models.CampaignStatusNotStarted
	}
	if !isValidCampaignStatus(status) {
		return nil, fmt.Errorf("invalid status")
	}

	ctx := context.Background()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	qtx := s.q.WithTx(tx)

	inserted, err := qtx.InsertCampaign(ctx, InsertCampaignParams{
		OwnerID:     ownerID,
		Name:        name,
		Description: &description,
		Visibility:  visibility,
		Status:      status,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create campaign: %w", err)
	}

	if _, err := qtx.InsertCampaignMember(ctx, InsertCampaignMemberParams{
		CampaignID: inserted.ID,
		UserID:     ownerID,
		Role:       "owner",
		Status:     "accepted",
		InvitedBy:  nil,
	}); err != nil {
		return nil, fmt.Errorf("failed to add owner membership: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit campaign creation: %w", err)
	}

	campaign := models.Campaign{
		ID:            inserted.ID,
		OwnerID:       inserted.OwnerID,
		Name:          inserted.Name,
		Description:   inserted.Description,
		Visibility:    inserted.Visibility,
		Status:        inserted.Status,
		ActiveSceneID: inserted.ActiveSceneID,
		CreatedAt:     inserted.CreatedAt,
		UpdatedAt:     inserted.UpdatedAt,
	}
	return &campaign, nil
}

// ListCampaigns returns campaigns a user belongs to (accepted membership).
func (s *Store) ListCampaigns(userID int64) ([]*models.Campaign, error) {
	ctx := context.Background()

	rows, err := s.q.ListCampaignsForUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list campaigns: %w", err)
	}

	result := make([]*models.Campaign, 0, len(rows))
	for _, r := range rows {
		c := models.Campaign{
			ID:            r.ID,
			OwnerID:       r.OwnerID,
			Name:          r.Name,
			Description:   r.Description,
			Visibility:    r.Visibility,
			Status:        r.Status,
			ActiveSceneID: r.ActiveSceneID,
			CreatedAt:     r.CreatedAt,
			UpdatedAt:     r.UpdatedAt,
		}
		result = append(result, &c)
	}

	return result, nil
}

// UpdateCampaign allows an owner/editor to change campaign fields.
func (s *Store) UpdateCampaign(campaignID, userID int64, name, description, visibility, status string) (*models.Campaign, error) {
	if visibility != "" && visibility != models.CampaignVisibilityPrivate && visibility != models.CampaignVisibilityInvite {
		return nil, fmt.Errorf("invalid visibility")
	}
	if status != "" && !isValidCampaignStatus(status) {
		return nil, ErrInvalidCampaignStatus
	}

	role, memberStatus, err := s.getMembership(campaignID, userID)
	if err != nil {
		return nil, err
	}
	if memberStatus != "accepted" || (role != "owner" && role != "editor") {
		return nil, ErrNotPermitted
	}

	current, err := s.getCampaignByID(campaignID)
	if err != nil {
		return nil, err
	}

	if name == "" {
		name = current.Name
	}
	if description == "" {
		description = current.Description
	}
	if visibility == "" {
		visibility = current.Visibility
	}
	if status == "" {
		status = current.Status
	}

	ctx := context.Background()
	updated, err := s.q.UpdateCampaign(ctx, UpdateCampaignParams{
		Name:          name,
		Description:   &description,
		Visibility:    visibility,
		Status:        status,
		ActiveSceneID: current.ActiveSceneID,
		ID:            campaignID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignNotFound
		}
		return nil, fmt.Errorf("failed to update campaign: %w", err)
	}

	campaign := models.Campaign{
		ID:            updated.ID,
		OwnerID:       updated.OwnerID,
		Name:          updated.Name,
		Description:   updated.Description,
		Visibility:    updated.Visibility,
		Status:        updated.Status,
		ActiveSceneID: updated.ActiveSceneID,
		CreatedAt:     updated.CreatedAt,
		UpdatedAt:     updated.UpdatedAt,
	}
	return &campaign, nil
}

// UpdateCampaignStatus updates only the status of a campaign with permissions.
func (s *Store) UpdateCampaignStatus(campaignID, userID int64, status string) (*models.Campaign, error) {
	if !isValidCampaignStatus(status) {
		return nil, ErrInvalidCampaignStatus
	}

	role, memberStatus, err := s.getMembership(campaignID, userID)
	if err != nil {
		return nil, err
	}
	if memberStatus != "accepted" || (role != "owner" && role != "editor") {
		return nil, ErrNotPermitted
	}

	ctx := context.Background()

	updated, err := s.q.UpdateCampaignStatus(ctx, UpdateCampaignStatusParams{
		Status: status,
		ID:     campaignID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignNotFound
		}
		return nil, fmt.Errorf("failed to update campaign status: %w", err)
	}

	campaign := dbCampaignStatusRowToModel(updated)
	return &campaign, nil
}

// AddCharacterToCampaign attaches a user's character to a campaign after membership and ownership checks.
func (s *Store) AddCharacterToCampaign(campaignID, characterID, userID int64) (*models.CampaignCharacter, error) {
	if _, err := s.getCampaignOwner(campaignID); err != nil {
		return nil, err
	}

	role, status, err := s.getMembership(campaignID, userID)
	if err != nil {
		return nil, err
	}
	if status != "accepted" || (role != "owner" && role != "editor") {
		return nil, ErrNotPermitted
	}

	owned, err := s.characterOwnedByUser(characterID, userID)
	if err != nil {
		return nil, err
	}
	if !owned {
		return nil, ErrCharacterNotOwned
	}

	ctx := context.Background()

	inserted, err := s.q.InsertCampaignCharacter(ctx, InsertCampaignCharacterParams{
		CampaignID:  campaignID,
		CharacterID: characterID,
	})
	if err != nil {
		if isUniqueConstraintError(err) {
			return nil, ErrCampaignCharacterExists
		}
		return nil, fmt.Errorf("failed to add character to campaign: %w", err)
	}

	return &models.CampaignCharacter{
		ID:          inserted.ID,
		CampaignID:  inserted.CampaignID,
		CharacterID: inserted.CharacterID,
		CreatedAt:   inserted.CreatedAt,
	}, nil
}

// CreateCampaignInvite generates an invite code for a campaign.
func (s *Store) CreateCampaignInvite(campaignID, userID int64, roleDefault string, expiresAt time.Time) (*models.CampaignInvite, error) {
	if roleDefault == "" {
		roleDefault = "viewer"
	}
	if roleDefault != "viewer" && roleDefault != "editor" {
		return nil, fmt.Errorf("invalid role default")
	}
	if expiresAt.Before(time.Now()) {
		expiresAt = time.Now().Add(7 * 24 * time.Hour)
	}

	role, memberStatus, err := s.getMembership(campaignID, userID)
	if err != nil {
		return nil, err
	}
	if memberStatus != "accepted" || (role != "owner" && role != "editor") {
		return nil, ErrNotPermitted
	}

	code, err := s.generateUniqueInviteCode()
	if err != nil {
		return nil, err
	}

	ctx := context.Background()

	inserted, err := s.q.InsertCampaignInvite(ctx, InsertCampaignInviteParams{
		CampaignID:  campaignID,
		Code:        code,
		InvitedBy:   userID,
		RoleDefault: roleDefault,
		ExpiresAt:   expiresAt,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create invite: %w", err)
	}

	return &models.CampaignInvite{
		ID:          inserted.ID,
		CampaignID:  inserted.CampaignID,
		Code:        inserted.Code,
		InvitedBy:   inserted.InvitedBy,
		RoleDefault: inserted.RoleDefault,
		Status:      inserted.Status,
		ExpiresAt:   inserted.ExpiresAt,
		RedeemedBy:  inserted.RedeemedBy,
		RedeemedAt:  inserted.RedeemedAt,
		CreatedAt:   inserted.CreatedAt,
	}, nil
}

// AcceptInvite redeems an invite code and creates/updates membership.
func (s *Store) AcceptInvite(code string, userID int64) (*models.Campaign, error) {
	ctx := context.Background()

	inv, err := s.q.GetInviteByCode(ctx, code)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrInviteNotFound
		}
		return nil, fmt.Errorf("failed to load invite: %w", err)
	}

	if inv.Status != "active" {
		return nil, ErrInviteRedeemed
	}
	if time.Now().After(inv.ExpiresAt) {
		return nil, ErrInviteExpired
	}
	if inv.RedeemedBy != nil {
		return nil, ErrInviteRedeemed
	}

	role := inv.RoleDefault
	_, memberStatus, membershipErr := s.getMembership(inv.CampaignID, userID)
	if membershipErr != nil && membershipErr != ErrNotCampaignMember {
		return nil, membershipErr
	}
	if membershipErr == nil && memberStatus == "accepted" {
		return nil, ErrAlreadyMember
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	qtx := s.q.WithTx(tx)
	now := time.Now()

	if err := qtx.MarkInviteRedeemed(ctx, MarkInviteRedeemedParams{
		RedeemedBy: &userID,
		RedeemedAt: &now,
		ID:         inv.ID,
	}); err != nil {
		return nil, fmt.Errorf("failed to mark invite redeemed: %w", err)
	}

	if membershipErr == ErrNotCampaignMember {
		if err := qtx.InsertMembershipOnRedeem(ctx, InsertMembershipOnRedeemParams{
			CampaignID: inv.CampaignID,
			UserID:     userID,
			Role:       role,
			InvitedBy:  &inv.InvitedBy,
		}); err != nil {
			return nil, fmt.Errorf("failed to insert membership: %w", err)
		}
	} else {
		if membershipErr != nil && membershipErr != ErrNotCampaignMember {
			return nil, membershipErr
		}
		if err := qtx.UpsertMembershipOnRedeem(ctx, UpsertMembershipOnRedeemParams{
			Role:       role,
			CampaignID: inv.CampaignID,
			UserID:     userID,
		}); err != nil {
			return nil, fmt.Errorf("failed to update membership: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit invite acceptance: %w", err)
	}

	return s.getCampaignByID(inv.CampaignID)
}

// ListCampaignMembers returns member summaries if requester is a member.
func (s *Store) ListCampaignMembers(campaignID, userID int64) ([]*models.CampaignMemberSummary, error) {
	if _, _, err := s.getMembership(campaignID, userID); err != nil {
		return nil, err
	}

	ctx := context.Background()

	rows, err := s.q.ListCampaignMembers(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to list members: %w", err)
	}

	members := make([]*models.CampaignMemberSummary, 0, len(rows))
	for _, r := range rows {
		var invitedBy *int64
		if r.InvitedBy != 0 {
			val := r.InvitedBy
			invitedBy = &val
		}
		m := models.CampaignMemberSummary{
			ID:         r.ID,
			CampaignID: r.CampaignID,
			UserID:     r.UserID,
			Username:   r.Username,
			Role:       r.Role,
			Status:     r.Status,
			InvitedBy:  invitedBy,
			CreatedAt:  r.CreatedAt,
		}
		members = append(members, &m)
	}

	return members, nil
}

// UpdateMemberRole changes a member role if permitted.
func (s *Store) UpdateMemberRole(campaignID, targetUserID, actorUserID int64, role string) (*models.CampaignMemberSummary, error) {
	if role != "owner" && role != "editor" && role != "viewer" {
		return nil, fmt.Errorf("invalid role")
	}

	actorRole, actorStatus, err := s.getMembership(campaignID, actorUserID)
	if err != nil {
		return nil, err
	}
	if actorStatus != "accepted" || (actorRole != "owner" && actorRole != "editor") {
		return nil, ErrNotPermitted
	}

	targetRole, _, err := s.getMembership(campaignID, targetUserID)
	if err != nil {
		return nil, err
	}
	if targetRole == "owner" && actorRole != "owner" {
		return nil, ErrNotPermitted
	}

	ctx := context.Background()

	if _, err := s.q.UpdateMemberRole(ctx, UpdateMemberRoleParams{
		Role:       role,
		CampaignID: campaignID,
		UserID:     targetUserID,
	}); err != nil {
		return nil, fmt.Errorf("failed to update role: %w", err)
	}

	summary, err := s.getMemberSummary(campaignID, targetUserID)
	if err != nil {
		return nil, err
	}

	return summary, nil
}

// RevokeMember sets status to revoked (non-owner targets only).
func (s *Store) RevokeMember(campaignID, targetUserID, actorUserID int64) error {
	actorRole, actorStatus, err := s.getMembership(campaignID, actorUserID)
	if err != nil {
		return err
	}
	if actorStatus != "accepted" || (actorRole != "owner" && actorRole != "editor") {
		return ErrNotPermitted
	}

	targetRole, _, err := s.getMembership(campaignID, targetUserID)
	if err != nil {
		return err
	}
	if targetRole == "owner" {
		return ErrNotPermitted
	}

	ctx := context.Background()

	if err := s.q.RevokeMember(ctx, RevokeMemberParams{CampaignID: campaignID, UserID: targetUserID}); err != nil {
		return fmt.Errorf("failed to revoke member: %w", err)
	}

	return nil
}

// ListCampaignDetails returns campaigns the user belongs to along with linked characters and their owners.
func (s *Store) ListCampaignDetails(userID int64) ([]*models.CampaignDetail, error) {
	ctx := context.Background()

	rows, err := s.q.ListCampaignDetails(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list campaign details: %w", err)
	}

	byID := make(map[int64]*models.CampaignDetail)
	var result []*models.CampaignDetail

	for _, r := range rows {
		detail, ok := byID[r.CampaignID]
		if !ok {
			detail = &models.CampaignDetail{
				Campaign: models.Campaign{
					ID:          r.CampaignID,
					OwnerID:     r.OwnerID,
					Name:        r.Name,
					Description: nullString(r.Description),
					Visibility:  r.Visibility,
					Status:      r.Status,
					CreatedAt:   r.CreatedAt,
					UpdatedAt:   r.UpdatedAt,
				},
				Characters: []models.CampaignCharacterSummary{},
			}
			byID[r.CampaignID] = detail
			result = append(result, detail)
		}

		if r.LinkID != nil && r.CharacterID != 0 {
			detail.Characters = append(detail.Characters, models.CampaignCharacterSummary{
				LinkID:         *r.LinkID,
				CharacterID:    r.CharacterID,
				CharacterName:  r.CharacterName,
				CharacterClass: r.CharacterClass,
				CharacterLevel: int(r.CharacterLevel),
				OwnerID:        r.OwnerUserID,
				OwnerUsername:  r.OwnerUsername,
			})
		}
	}

	return result, nil
}

// ListCampaignHandouts returns all handouts for a campaign if the user is a member.
func (s *Store) ListCampaignHandouts(campaignID, userID int64) ([]*models.CampaignHandout, error) {
	if _, _, err := s.getMembership(campaignID, userID); err != nil {
		return nil, err
	}

	ctx := context.Background()
	rows, err := s.q.ListCampaignHandouts(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to list handouts: %w", err)
	}

	handouts := make([]*models.CampaignHandout, 0, len(rows))
	for _, r := range rows {
		handouts = append(handouts, &models.CampaignHandout{
			ID:          r.ID,
			CampaignID:  r.CampaignID,
			Title:       r.Title,
			Description: r.Description,
			FileURL:     r.FilePath,
			CreatedBy:   r.CreatedBy,
			CreatedAt:   r.CreatedAt,
			UpdatedAt:   r.UpdatedAt,
		})
	}

	return handouts, nil
}

// CreateCampaignHandout inserts a new handout if the user can edit the campaign.
func (s *Store) CreateCampaignHandout(campaignID, userID int64, title, description, fileURL string) (*models.CampaignHandout, error) {
	role, status, err := s.getMembership(campaignID, userID)
	if err != nil {
		return nil, err
	}
	if status != "accepted" || (role != "owner" && role != "editor") {
		return nil, ErrNotPermitted
	}
	if strings.TrimSpace(title) == "" {
		title = "Handout"
	}

	ctx := context.Background()

	h, err := s.q.CreateCampaignHandout(ctx, CreateCampaignHandoutParams{
		CampaignID:  campaignID,
		Title:       title,
		Description: &description,
		FilePath:    &fileURL,
		CreatedBy:   userID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create handout: %w", err)
	}

	handout := &models.CampaignHandout{
		ID:          h.ID,
		CampaignID:  h.CampaignID,
		Title:       h.Title,
		Description: h.Description,
		FileURL:     h.FilePath,
		CreatedBy:   h.CreatedBy,
		CreatedAt:   h.CreatedAt,
		UpdatedAt:   h.UpdatedAt,
	}
	return handout, nil
}

// getMemberSummary returns membership plus username, or ErrNotCampaignMember.
func (s *Store) getMemberSummary(campaignID, userID int64) (*models.CampaignMemberSummary, error) {
	ctx := context.Background()

	row, err := s.q.GetMemberSummary(ctx, GetMemberSummaryParams{CampaignID: campaignID, UserID: userID})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotCampaignMember
		}
		return nil, fmt.Errorf("failed to scan member: %w", err)
	}

	return &models.CampaignMemberSummary{
		ID:         row.ID,
		CampaignID: row.CampaignID,
		UserID:     row.UserID,
		Username:   row.Username,
		Role:       row.Role,
		Status:     row.Status,
		InvitedBy:  int64ToPtrOrNil(row.InvitedBy),
		CreatedAt:  row.CreatedAt,
	}, nil
}

func (s *Store) getCampaignOwner(campaignID int64) (int64, error) {
	ctx := context.Background()

	ownerID, err := s.q.GetCampaignOwner(ctx, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, ErrCampaignNotFound
		}
		return 0, fmt.Errorf("failed to get campaign: %w", err)
	}
	return ownerID, nil
}

func (s *Store) getCampaignByID(campaignID int64) (*models.Campaign, error) {
	ctx := context.Background()

	row, err := s.q.GetCampaignByID(ctx, campaignID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCampaignNotFound
		}
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	campaign := dbCampaignRowToModel(row)
	return &campaign, nil
}

func (s *Store) getMembership(campaignID, userID int64) (role string, status string, err error) {
	ctx := context.Background()

	row, err := s.q.GetMembership(ctx, GetMembershipParams{CampaignID: campaignID, UserID: userID})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", "", ErrNotCampaignMember
		}
		return "", "", fmt.Errorf("failed to check membership: %w", err)
	}
	return row.Role, row.Status, nil
}

func dbCampaignRowToModel(row GetCampaignByIDRow) models.Campaign {
	return models.Campaign{
		ID:            row.ID,
		OwnerID:       row.OwnerID,
		Name:          row.Name,
		Description:   row.Description,
		Visibility:    row.Visibility,
		Status:        row.Status,
		ActiveSceneID: row.ActiveSceneID,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}
}

func dbCampaignStatusRowToModel(row UpdateCampaignStatusRow) models.Campaign {
	return models.Campaign{
		ID:            row.ID,
		OwnerID:       row.OwnerID,
		Name:          row.Name,
		Description:   row.Description,
		Visibility:    row.Visibility,
		Status:        row.Status,
		ActiveSceneID: row.ActiveSceneID,
		CreatedAt:     row.CreatedAt,
		UpdatedAt:     row.UpdatedAt,
	}
}

func isValidCampaignStatus(status string) bool {
	switch status {
	case models.CampaignStatusNotStarted, models.CampaignStatusInProgress, models.CampaignStatusPaused, models.CampaignStatusCompleted, models.CampaignStatusArchived:
		return true
	default:
		return false
	}
}

func (s *Store) generateUniqueInviteCode() (string, error) {
	ctx := context.Background()
	for i := 0; i < 5; i++ {
		code := randomCode(8)
		_, err := s.q.CheckInviteCodeExists(ctx, code)
		if err == nil {
			// Code exists
			continue
		} else if errors.Is(err, sql.ErrNoRows) {
			// Code does not exist, it is unique
			return code, nil
		} else {
			return "", fmt.Errorf("failed to check invite code: %w", err)
		}
	}
	return "", fmt.Errorf("could not generate unique invite code")
}
