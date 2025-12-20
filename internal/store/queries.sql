-- User queries
-- name: CreateUser :one
INSERT INTO users (username, password_hash)
VALUES (?, ?)
RETURNING id, username, password_hash, created_at;

-- name: GetUserByUsername :one
SELECT id, username, password_hash, created_at
FROM users
WHERE username = ?;

-- name: GetUserByID :one
SELECT id, username, password_hash, created_at
FROM users
WHERE id = ?;

-- Character queries
-- name: ListCharactersByUser :many
SELECT id, user_id, name, race, class, level, COALESCE(background, '') as background, COALESCE(alignment, '') as alignment, COALESCE(experience_points, 0) as experience_points,
       strength, dexterity, constitution, intelligence, wisdom, charisma,
       max_hp, current_hp, COALESCE(temp_hp, 0) as temp_hp, armor_class, COALESCE(speed, 0) as speed, COALESCE(hit_dice, '') as hit_dice,
       COALESCE(skill_proficiencies, '[]') as skill_proficiencies, COALESCE(saving_throw_proficiencies, '[]') as saving_throw_proficiencies, COALESCE(features, '[]') as features, COALESCE(equipment, '[]') as equipment,
       COALESCE(avatar_url, '') as avatar_url, created_at, updated_at
FROM characters
WHERE user_id = ?
ORDER BY updated_at DESC;

-- name: GetCharacterByIDAndUser :one
SELECT id, user_id, name, race, class, level, COALESCE(background, '') as background, COALESCE(alignment, '') as alignment, COALESCE(experience_points, 0) as experience_points,
       strength, dexterity, constitution, intelligence, wisdom, charisma,
       max_hp, current_hp, COALESCE(temp_hp, 0) as temp_hp, armor_class, COALESCE(speed, 0) as speed, COALESCE(hit_dice, '') as hit_dice,
       COALESCE(skill_proficiencies, '[]') as skill_proficiencies, COALESCE(saving_throw_proficiencies, '[]') as saving_throw_proficiencies, COALESCE(features, '[]') as features, COALESCE(equipment, '[]') as equipment,
       COALESCE(avatar_url, '') as avatar_url, created_at, updated_at
FROM characters
WHERE id = ? AND user_id = ?;

-- name: InsertCharacter :one
INSERT INTO characters (
    user_id, name, race, class, level, background, alignment, experience_points,
    strength, dexterity, constitution, intelligence, wisdom, charisma,
    max_hp, current_hp, temp_hp, armor_class, speed, hit_dice,
    skill_proficiencies, saving_throw_proficiencies, features, equipment,
    avatar_url
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING id, user_id, name, race, class, level, background, alignment, experience_points,
          strength, dexterity, constitution, intelligence, wisdom, charisma,
          max_hp, current_hp, temp_hp, armor_class, speed, hit_dice,
          skill_proficiencies, saving_throw_proficiencies, features, equipment,
          avatar_url, created_at, updated_at;

-- name: UpdateCharacter :one
UPDATE characters SET
    name = ?, race = ?, class = ?, level = ?, background = ?, alignment = ?, experience_points = ?,
    strength = ?, dexterity = ?, constitution = ?, intelligence = ?, wisdom = ?, charisma = ?,
    max_hp = ?, current_hp = ?, temp_hp = ?, armor_class = ?, speed = ?, hit_dice = ?,
    skill_proficiencies = ?, saving_throw_proficiencies = ?, features = ?, equipment = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ? AND user_id = ?
RETURNING id, user_id, name, race, class, level, background, alignment, experience_points,
          strength, dexterity, constitution, intelligence, wisdom, charisma,
          max_hp, current_hp, temp_hp, armor_class, speed, hit_dice,
          skill_proficiencies, saving_throw_proficiencies, features, equipment,
          avatar_url, created_at, updated_at;

-- name: DeleteCharacter :execrows
DELETE FROM characters WHERE id = ? AND user_id = ?;

-- name: UpdateCharacterAvatar :one
UPDATE characters
SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP
WHERE id = ? AND user_id = ?
RETURNING id, user_id, name, race, class, level, background, alignment, experience_points,
          strength, dexterity, constitution, intelligence, wisdom, charisma,
          max_hp, current_hp, temp_hp, armor_class, speed, hit_dice,
          skill_proficiencies, saving_throw_proficiencies, features, equipment,
          avatar_url, created_at, updated_at;

-- Campaign queries
-- name: InsertCampaign :one
INSERT INTO campaigns (owner_id, name, description, visibility, status, active_scene_id)
VALUES (?, ?, ?, ?, ?, ?)
RETURNING id, owner_id, name, COALESCE(description, '') as description, visibility, status, active_scene_id, created_at, updated_at;

-- name: InsertCampaignMember :one
INSERT INTO campaign_members (campaign_id, user_id, role, status, invited_by)
VALUES (?, ?, ?, ?, ?)
RETURNING id, campaign_id, user_id, role, status, invited_by, created_at;

-- name: ListCampaignsForUser :many
SELECT c.id, c.owner_id, c.name, COALESCE(c.description, '') as description, c.visibility, c.status, c.active_scene_id, c.created_at, c.updated_at
FROM campaigns c
JOIN campaign_members m ON m.campaign_id = c.id
WHERE m.user_id = ? AND m.status = 'accepted'
ORDER BY c.updated_at DESC;

-- name: UpdateCampaign :one
UPDATE campaigns
SET name = ?, description = ?, visibility = ?, status = ?, active_scene_id = ?, updated_at = CURRENT_TIMESTAMP
WHERE id = ?
RETURNING id, owner_id, name, COALESCE(description, '') as description, visibility, status, active_scene_id, created_at, updated_at;

-- name: UpdateCampaignStatus :one
UPDATE campaigns
SET status = ?, updated_at = CURRENT_TIMESTAMP
WHERE id = ?
RETURNING id, owner_id, name, COALESCE(description, '') as description, visibility, status, active_scene_id, created_at, updated_at;

-- name: GetCampaignByID :one
SELECT id, owner_id, name, COALESCE(description, '') as description, visibility, status, active_scene_id, created_at, updated_at
FROM campaigns
WHERE id = ?;

-- name: GetMembership :one
SELECT role, status
FROM campaign_members
WHERE campaign_id = ? AND user_id = ?;

-- name: GetCampaignOwner :one
SELECT owner_id
FROM campaigns
WHERE id = ?;

-- name: InsertCampaignCharacter :one
INSERT INTO campaign_characters (campaign_id, character_id)
VALUES (?, ?)
RETURNING id, campaign_id, character_id, created_at;

-- name: ListCampaignMembers :many
SELECT m.id, m.campaign_id, m.user_id, u.username, m.role, m.status, COALESCE(m.invited_by, 0) as invited_by, m.created_at
FROM campaign_members m
JOIN users u ON u.id = m.user_id
WHERE m.campaign_id = ?
ORDER BY m.created_at ASC;

-- name: UpdateMemberRole :one
UPDATE campaign_members
SET role = ?
WHERE campaign_id = ? AND user_id = ?
RETURNING id, campaign_id, user_id, role, status, invited_by, created_at;

-- name: RevokeMember :exec
UPDATE campaign_members
SET status = 'revoked'
WHERE campaign_id = ? AND user_id = ?;

-- name: GetMemberSummary :one
SELECT m.id, m.campaign_id, m.user_id, u.username, m.role, m.status, COALESCE(m.invited_by, 0) as invited_by, m.created_at
FROM campaign_members m
JOIN users u ON u.id = m.user_id
WHERE m.campaign_id = ? AND m.user_id = ?;

-- name: ListCampaignDetails :many
SELECT c.id AS campaign_id, c.owner_id, c.name, c.description, c.visibility, c.status, c.active_scene_id, c.created_at, c.updated_at,
       cc.id AS link_id, COALESCE(ch.id, 0) AS character_id, COALESCE(ch.name, '') AS character_name, COALESCE(ch.class, '') AS character_class, COALESCE(ch.level, 0) AS character_level,
       COALESCE(u.id, 0) AS owner_user_id, COALESCE(u.username, '') AS owner_username
FROM campaigns c
JOIN campaign_members m ON m.campaign_id = c.id
LEFT JOIN campaign_characters cc ON cc.campaign_id = c.id
LEFT JOIN characters ch ON ch.id = cc.character_id
LEFT JOIN users u ON u.id = ch.user_id
WHERE m.user_id = ? AND m.status = 'accepted'
ORDER BY c.updated_at DESC, c.id, cc.id;

-- Invite queries
-- name: InsertCampaignInvite :one
INSERT INTO campaign_invites (campaign_id, code, invited_by, role_default, status, expires_at)
VALUES (?, ?, ?, ?, 'active', ?)
RETURNING id, campaign_id, code, invited_by, role_default, status, expires_at, redeemed_by, redeemed_at, created_at;

-- name: GetInviteByCode :one
SELECT id, campaign_id, code, invited_by, role_default, status, expires_at, redeemed_by, redeemed_at, created_at
FROM campaign_invites
WHERE code = ?;

-- name: MarkInviteRedeemed :exec
UPDATE campaign_invites
SET redeemed_by = ?, redeemed_at = ?
WHERE id = ?;

-- name: UpsertMembershipOnRedeem :exec
UPDATE campaign_members
SET role = ?, status = 'accepted'
WHERE campaign_id = ? AND user_id = ?;

-- name: InsertMembershipOnRedeem :exec
INSERT INTO campaign_members (campaign_id, user_id, role, status, invited_by)
VALUES (?, ?, ?, 'accepted', ?);

-- Utility queries
-- name: GetCharacterOwner :one
SELECT user_id
FROM characters
WHERE id = ?;

-- Token helpers
-- name: GetCampaignAndMapByToken :one
SELECT sc.campaign_id, t.map_id
FROM tokens t
JOIN maps m ON m.id = t.map_id
JOIN scenes sc ON sc.id = m.scene_id
WHERE t.id = ?;

-- name: UpdateTokenPosition :exec
UPDATE tokens
SET position_x = ?, position_y = ?
WHERE id = ?;

-- name: GetTokenByID :one
SELECT id, map_id, COALESCE(character_id, 0) as character_id, label, image_url, size_squares, position_x, position_y, facing_deg, audience, layer, tags, COALESCE(notes, '') as notes, COALESCE(created_by, 0) as created_by, created_at
FROM tokens
WHERE id = ?;

-- Notes queries
-- name: InsertNote :one
INSERT INTO notes (user_id, entity_type, entity_id, title, body)
VALUES (?, ?, ?, ?, ?)
RETURNING id, user_id, entity_type, entity_id, title, body, created_at, updated_at;

-- name: ListNotesForUser :many
SELECT n.id, n.user_id, n.entity_type, n.entity_id, n.title, n.body, n.created_at, n.updated_at, NULL AS score
FROM notes n
WHERE n.user_id = ?
  AND (? = '' OR n.entity_type = ?)
  AND (? IS NULL OR n.entity_id = ?)
ORDER BY n.updated_at DESC
LIMIT ?;

-- Handout queries
-- name: ListCampaignHandouts :many
SELECT id, campaign_id, title, COALESCE(description, '') as description, COALESCE(file_path, '') as file_path, created_by, created_at, updated_at
FROM campaign_handouts
WHERE campaign_id = ?
ORDER BY created_at DESC, id DESC;

-- name: CreateCampaignHandout :one
INSERT INTO campaign_handouts (campaign_id, title, description, file_path, created_by)
VALUES (?, ?, ?, ?, ?)
RETURNING id, campaign_id, title, COALESCE(description, '') as description, COALESCE(file_path, '') as file_path, created_by, created_at, updated_at;

-- name: CheckInviteCodeExists :one
SELECT 1 FROM campaign_invites WHERE code = ?;

-- Map and Token queries
-- name: CreateMap :one
INSERT INTO maps (scene_id, name, base_image_url)
VALUES (?, ?, ?)
RETURNING id, scene_id, name, COALESCE(base_image_url, '') as base_image_url, grid_size_ft, CAST(width_px AS INTEGER) as width_px, CAST(height_px AS INTEGER) as height_px, lighting_mode, fog_state, created_at;

-- name: CreateToken :one
INSERT INTO tokens (map_id, character_id, label, image_url, size_squares, position_x, position_y, facing_deg, audience, layer, tags, notes, created_by)
VALUES (?, sqlc.narg('character_id'), ?, CAST(sqlc.arg('image_url') AS TEXT), ?, ?, ?, ?, ?, ?, ?, '', sqlc.narg('created_by'))
RETURNING id, map_id, character_id, label, COALESCE(image_url, '') as image_url, size_squares, position_x, position_y, facing_deg, audience, layer, tags, COALESCE(notes, '') as notes, created_by, created_at;

-- name: ListScenes :many
SELECT id, campaign_id, name, COALESCE(description, '') as description, ordering, is_active, created_by, created_at, updated_at
FROM scenes
WHERE campaign_id = ?
ORDER BY ordering ASC, id ASC;

-- name: ListMapsBySceneIDs :many
SELECT id, scene_id, name, COALESCE(base_image_url, '') as base_image_url, grid_size_ft, CAST(width_px AS INTEGER) as width_px, CAST(height_px AS INTEGER) as height_px, lighting_mode, fog_state, created_at
FROM maps
WHERE scene_id IN (sqlc.slice('scene_ids'))
ORDER BY id ASC;

-- name: ListTokensByMapIDs :many
SELECT id, map_id, character_id, label, COALESCE(image_url, '') as image_url, size_squares, position_x, position_y, facing_deg, audience, layer, tags, COALESCE(notes, '') as notes, created_by, created_at
FROM tokens
WHERE map_id IN (sqlc.slice('map_ids'))
ORDER BY id ASC;

-- name: ListTokensByMapIDsForPlayer :many
SELECT id, map_id, character_id, label, COALESCE(image_url, '') as image_url, size_squares, position_x, position_y, facing_deg, audience, layer, tags, COALESCE(notes, '') as notes, created_by, created_at
FROM tokens
WHERE map_id IN (sqlc.slice('map_ids'))
  AND layer != 'gm'
ORDER BY id ASC;

-- name: UpdateTokenLayer :exec
UPDATE tokens
SET layer = ?
WHERE id = ?;

-- name: UpdateCampaignActiveScene :exec
UPDATE campaigns
SET active_scene_id = ?
WHERE id = ?;

-- name: GetFirstSceneByCampaignID :one
SELECT id FROM scenes WHERE campaign_id = ? ORDER BY ordering ASC, id ASC LIMIT 1;

-- name: CreateScene :one
INSERT INTO scenes (campaign_id, name, description, ordering, is_active, created_by)
VALUES (?, ?, ?, ?, ?, ?)
RETURNING id, campaign_id, name, COALESCE(description, '') as description, ordering, is_active, created_by, created_at, updated_at;

-- name: GetCampaignIDByMap :one
SELECT sc.campaign_id
FROM maps m
JOIN scenes sc ON sc.id = m.scene_id
WHERE m.id = ?;
