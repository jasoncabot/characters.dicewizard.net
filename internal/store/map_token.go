package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/jasoncabot/dicewizard-characters/internal/models"
)

// CreateMapForCampaign inserts a map under the campaign's default scene, creating the scene if needed.
func (s *Store) CreateMapForCampaign(campaignID, userID int64, name, baseImageURL string) (*models.Map, error) {
	role, status, err := s.getMembership(campaignID, userID)
	if err != nil {
		return nil, err
	}
	if status != "accepted" || (role != "owner" && role != "editor") {
		return nil, ErrNotPermitted
	}

	defaultSceneID, err := s.ensureDefaultScene(campaignID, userID)
	if err != nil {
		return nil, err
	}

	ctx := context.Background()

	m, err := s.q.CreateMap(ctx, CreateMapParams{
		SceneID:      defaultSceneID,
		Name:         name,
		BaseImageUrl: &baseImageURL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create map: %w", err)
	}

	return &models.Map{
		ID:           m.ID,
		SceneID:      m.SceneID,
		Name:         m.Name,
		BaseImageURL: m.BaseImageUrl,
		GridSizeFt:   int(m.GridSizeFt),
		LightingMode: m.LightingMode,
		FogState:     m.FogState,
		CreatedAt:    m.CreatedAt,
	}, nil
}

// CreateToken adds a token to an existing map if the actor can edit the campaign.
func (s *Store) CreateToken(mapID, userID int64, characterID *int64, label, imageURL string, sizeSquares, positionX, positionY, facingDeg int, audience, tags []string, layer string) (*models.Token, error) {
	campaignID, err := s.getCampaignIDByMap(mapID)
	if err != nil {
		return nil, err
	}
	role, status, err := s.getMembership(campaignID, userID)
	if err != nil {
		return nil, err
	}
	if status != "accepted" || (role != "owner" && role != "editor") {
		return nil, ErrNotPermitted
	}

	if sizeSquares <= 0 {
		sizeSquares = 1
	}

	if layer == "" {
		layer = "token"
	}

	audienceJSON := marshalStringArray(audience)
	tagsJSON := marshalStringArray(tags)

	ctx := context.Background()

	t, err := s.q.CreateToken(ctx, CreateTokenParams{
		MapID:       mapID,
		CharacterID: characterID,
		Label:       label,
		ImageUrl:    imageURL,
		SizeSquares: int64(sizeSquares),
		PositionX:   int64(positionX),
		PositionY:   int64(positionY),
		FacingDeg:   int64(facingDeg),
		Audience:    audienceJSON,
		Tags:        tagsJSON,
		Layer:       layer,
		CreatedBy:   &userID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create token: %w", err)
	}

	return &models.Token{
		ID:          t.ID,
		MapID:       t.MapID,
		CharacterID: t.CharacterID,
		Label:       t.Label,
		ImageURL:    t.ImageUrl,
		SizeSquares: int(t.SizeSquares),
		PositionX:   int(t.PositionX),
		PositionY:   int(t.PositionY),
		FacingDeg:   int(t.FacingDeg),
		Audience:    audience,
		Tags:        tags,
		Notes:       "",
		Layer:       t.Layer,
		CreatedBy:   t.CreatedBy,
		CreatedAt:   t.CreatedAt,
	}, nil
}

// UpdateTokenPosition moves a token if the actor can edit the campaign.
func (s *Store) UpdateTokenPosition(tokenID, userID int64, positionX, positionY int) (*models.Token, error) {
	campaignID, _, err := s.getCampaignIDByToken(tokenID)
	if err != nil {
		return nil, err
	}

	role, status, err := s.getMembership(campaignID, userID)
	if err != nil {
		return nil, err
	}
	if status != "accepted" || (role != "owner" && role != "editor") {
		return nil, ErrNotPermitted
	}

	ctx := context.Background()
	err = s.q.UpdateTokenPosition(ctx, UpdateTokenPositionParams{
		PositionX: int64(positionX),
		PositionY: int64(positionY),
		ID:        tokenID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update token: %w", err)
	}

	t, err := s.q.GetTokenByID(ctx, tokenID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrTokenNotFound
		}
		return nil, fmt.Errorf("failed to fetch token: %w", err)
	}

	return &models.Token{
		ID:          t.ID,
		MapID:       t.MapID,
		CharacterID: int64ToPtrOrNil(t.CharacterID),
		Label:       t.Label,
		ImageURL:    nullString(t.ImageUrl),
		SizeSquares: int(t.SizeSquares),
		PositionX:   int(t.PositionX),
		PositionY:   int(t.PositionY),
		FacingDeg:   int(t.FacingDeg),
		Audience:    parseStringArray(t.Audience),
		Tags:        parseStringArray(t.Tags),
		Notes:       t.Notes,
		CreatedBy:   int64ToPtrOrNil(t.CreatedBy),
		CreatedAt:   t.CreatedAt,
	}, nil
}

// GetCampaignFull aggregates a campaign, members, characters, scenes/maps/tokens, and handouts in one payload.
func (s *Store) GetCampaignFull(campaignID, userID int64) (*models.CampaignFull, error) {
	role, status, err := s.getMembership(campaignID, userID)
	if err != nil {
		return nil, err
	}
	if status != "accepted" {
		return nil, ErrNotPermitted
	}

	campaign, err := s.getCampaignByID(campaignID)
	if err != nil {
		return nil, err
	}

	members, err := s.ListCampaignMembers(campaignID, userID)
	if err != nil {
		return nil, err
	}

	var characters []models.CampaignCharacterSummary
	if details, err := s.ListCampaignDetails(userID); err == nil {
		for _, d := range details {
			if d.ID == campaignID {
				characters = d.Characters
				break
			}
		}
	}

	scenes, err := s.listScenesWithMapsAndTokens(campaignID, role == "owner" || role == "editor", campaign.ActiveSceneID)
	if err != nil {
		return nil, err
	}

	handouts, err := s.ListCampaignHandouts(campaignID, userID)
	if err != nil {
		return nil, err
	}

	memberVals := make([]models.CampaignMemberSummary, len(members))
	for i, m := range members {
		memberVals[i] = *m
	}

	handoutVals := make([]models.CampaignHandout, len(handouts))
	for i, h := range handouts {
		handoutVals[i] = *h
	}

	return &models.CampaignFull{
		Campaign:   *campaign,
		Role:       role,
		Characters: characters,
		Members:    memberVals,
		Scenes:     scenes,
		Handouts:   handoutVals,
	}, nil
}

func (s *Store) listScenesWithMapsAndTokens(campaignID int64, isGM bool, activeSceneID *int64) ([]models.SceneWithMaps, error) {
	ctx := context.Background()

	sceneRows, err := s.q.ListScenes(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to list scenes: %w", err)
	}

	scenes := make([]models.SceneWithMaps, 0, len(sceneRows))
	sceneIDs := make([]int64, 0, len(sceneRows))
	for _, r := range sceneRows {
		if !isGM && (activeSceneID == nil || r.ID != *activeSceneID) {
			continue
		}
		scenes = append(scenes, models.SceneWithMaps{
			Scene: models.Scene{
				ID:          r.ID,
				CampaignID:  r.CampaignID,
				Name:        r.Name,
				Description: r.Description,
				Ordering:    int(r.Ordering),
				IsActive:    r.IsActive,
				CreatedBy:   r.CreatedBy,
				CreatedAt:   r.CreatedAt,
				UpdatedAt:   r.UpdatedAt,
			},
			Maps: []models.MapWithTokens{},
		})
		sceneIDs = append(sceneIDs, r.ID)
	}

	if len(sceneIDs) == 0 {
		return scenes, nil
	}

	mapRows, err := s.q.ListMapsBySceneIDs(ctx, sceneIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to list maps: %w", err)
	}

	mapByScene := make(map[int64][]models.MapWithTokens)
	mapIDs := make([]int64, 0, len(mapRows))
	for _, m := range mapRows {
		mapByScene[m.SceneID] = append(mapByScene[m.SceneID], models.MapWithTokens{
			Map: models.Map{
				ID:           m.ID,
				SceneID:      m.SceneID,
				Name:         m.Name,
				BaseImageURL: m.BaseImageUrl,
				GridSizeFt:   int(m.GridSizeFt),
				WidthPx:      ptr(int(m.WidthPx)),
				HeightPx:     ptr(int(m.HeightPx)),
				LightingMode: m.LightingMode,
				FogState:     m.FogState,
				CreatedAt:    m.CreatedAt,
			},
			Tokens: []models.Token{},
		})
		mapIDs = append(mapIDs, m.ID)
	}

	if len(mapIDs) > 0 {
		tokensByMap := make(map[int64][]models.Token)

		if isGM {
			tokenRows, err := s.q.ListTokensByMapIDs(ctx, mapIDs)
			if err != nil {
				return nil, fmt.Errorf("failed to list tokens: %w", err)
			}
			for _, t := range tokenRows {
				tokensByMap[t.MapID] = append(tokensByMap[t.MapID], models.Token{
					ID:          t.ID,
					MapID:       t.MapID,
					CharacterID: t.CharacterID,
					Label:       t.Label,
					ImageURL:    t.ImageUrl,
					SizeSquares: int(t.SizeSquares),
					PositionX:   int(t.PositionX),
					PositionY:   int(t.PositionY),
					FacingDeg:   int(t.FacingDeg),
					Audience:    parseStringArray(t.Audience),
					Tags:        parseStringArray(t.Tags),
					Notes:       t.Notes,
					Layer:       t.Layer,
					CreatedBy:   t.CreatedBy,
					CreatedAt:   t.CreatedAt,
				})
			}
		} else {
			tokenRows, err := s.q.ListTokensByMapIDsForPlayer(ctx, mapIDs)
			if err != nil {
				return nil, fmt.Errorf("failed to list tokens: %w", err)
			}
			for _, t := range tokenRows {
				tokensByMap[t.MapID] = append(tokensByMap[t.MapID], models.Token{
					ID:          t.ID,
					MapID:       t.MapID,
					CharacterID: t.CharacterID,
					Label:       t.Label,
					ImageURL:    t.ImageUrl,
					SizeSquares: int(t.SizeSquares),
					PositionX:   int(t.PositionX),
					PositionY:   int(t.PositionY),
					FacingDeg:   int(t.FacingDeg),
					Audience:    parseStringArray(t.Audience),
					Tags:        parseStringArray(t.Tags),
					Notes:       t.Notes,
					Layer:       t.Layer,
					CreatedBy:   t.CreatedBy,
					CreatedAt:   t.CreatedAt,
				})
			}
		}

		for sceneID, maps := range mapByScene {
			for i := range maps {
				maps[i].Tokens = tokensByMap[maps[i].ID]
			}
			mapByScene[sceneID] = maps
		}
	}

	for i := range scenes {
		scenes[i].Maps = mapByScene[scenes[i].Scene.ID]
	}

	return scenes, nil
}

func (s *Store) ensureDefaultScene(campaignID, userID int64) (int64, error) {
	ctx := context.Background()

	sceneID, err := s.q.GetFirstSceneByCampaignID(ctx, campaignID)
	if err == nil {
		return sceneID, nil
	} else if !errors.Is(err, sql.ErrNoRows) {
		return 0, fmt.Errorf("failed to check default scene: %w", err)
	}

	scene, err := s.q.CreateScene(ctx, CreateSceneParams{
		CampaignID:  campaignID,
		Name:        "Table",
		Description: ptr(""),
		Ordering:    0,
		IsActive:    true,
		CreatedBy:   &userID,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to create default scene: %w", err)
	}
	return scene.ID, nil
}

func (s *Store) getCampaignIDByMap(mapID int64) (int64, error) {
	ctx := context.Background()
	campaignID, err := s.q.GetCampaignIDByMap(ctx, mapID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, ErrCampaignMapNotFound
		}
		return 0, fmt.Errorf("failed to resolve map campaign: %w", err)
	}
	return campaignID, nil
}

func (s *Store) getCampaignIDByToken(tokenID int64) (int64, int64, error) {
	ctx := context.Background()
	row, err := s.q.GetCampaignAndMapByToken(ctx, tokenID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, 0, ErrTokenNotFound
		}
		return 0, 0, fmt.Errorf("failed to resolve token campaign: %w", err)
	}
	return row.CampaignID, row.MapID, nil
}
