# Campaign Module Context

Concise design notes for LLMs: entities, states, and data flow around campaigns.

## Core Entities
- Campaign: id, ownerId, name, description, visibility (`private|invite`), timestamps, status (planned to include `not_started|in_progress|paused|ended`).
- CampaignMember: links user to campaign with role (`owner|editor|viewer`) and status (`pending|accepted|revoked`), invitedBy.
- CampaignCharacter: joins campaign and character (enforces character ownership at add time). Unique on (campaignId, characterId).
- Scene: belongs to campaign; name, description, ordering, isActive, createdBy, timestamps. One map per scene for v1.
- Map: belongs to scene; name, baseImageUrl, gridSizeFt, widthPx/heightPx (optional), lightingMode (`none|basic` placeholder), fogState json string. Future: multiple layers.
- Token: belongs to map; optional characterId; label, imageUrl, sizeSquares, position (x,y), facingDeg, audience [] (default `gm-only`, extensible), tags [] (starter: enemy, ally, neutral, objective, hazard), notes, createdBy, createdAt.
- Notes (planned): likely table with owner_id + owner_type or dedicated columns (campaignId?, sceneId?, characterId?, authorId, visibility). Could allow standalone notes by keeping all foreign keys nullable.

## Frontend UX (current + planned)
- Characters view: dropdown per character with “Add to campaign” (prompts for campaign name; creates if missing) and Delete. Uses campaigns API: list, create, addCharacter.
- Planned campaigns tab: list/create campaigns, show status, members, attached characters (with owning user). Future subviews: scenes/maps/tokens, notes.

## Backend API (current)
- `GET /api/campaigns` (auth): list campaigns where user is an accepted member.
- `POST /api/campaigns` (auth): create campaign; also inserts owner membership.
- `POST /api/campaigns/{id}/characters` (auth): add character if user is accepted member with role owner/editor and owns the character. Errors: not found, not member/permitted, already added, not owner of character.
- Characters CRUD unchanged.

## Store Rules
- CreateCampaign sets visibility default `private`, inserts owner as campaign_member role owner.
- ListCampaigns joins campaign_members where status = accepted for user.
- AddCharacterToCampaign: checks campaign exists, membership role ∈ {owner, editor}, status accepted, character belongs to requesting user; inserts into campaign_characters unique per campaign.

## Status Handling (implemented)
- Campaign.status enum: `not_started`, `in_progress`, `paused`, `ended`, `archived`. Default `not_started`.
- API: `PUT /api/campaigns/{id}/status` (auth, owner/editor) updates status only. UI dropdown uses this.

## Campaign onboarding and lifecycle (in progress)
- Smooth create + invite: create campaign, then generate shareable code. Default invite role: `viewer`, promotable to `editor`.
- Invite flow (API implemented):
	- `POST /api/campaigns/{id}/invites` (owner/editor) -> returns code, role_default, expires_at.
	- `POST /api/campaigns/invites/{code}/accept` (auth) -> inserts/updates campaign_member to accepted with role_default; rejects expired/redeemed/duplicate.
- Invite storage (implemented): table `campaign_invites` (code unique, campaign_id, invited_by, role_default viewer|editor, status active|revoked, expires_at, redeemed_by/at).
- Frontend cues (partial): campaign cards have status dropdown (driven by status endpoint) and an Invite button that generates + shows copyable code. Future: invite modal, member list, inline alerts when someone joins.
- Validation/guards: owner/editor only to create invites; codes expire server-side; duplicate accepted membership blocked.

## Notes Design Options
1) Polymorphic via owner_id + owner_type (`campaign|scene|character|user|standalone`) + optional foreign keys per type for referential integrity.
2) Dedicated nullable foreign keys (campaignId, sceneId, characterId, userId) with check to ensure at least one target or a `scope` column (`campaign`, `character`, `user`, `global`).
3) Standalone allowed by permitting no target + visibility (`private|party|gm|public`).
Current recommendation: option 2 with a `scope` enum and nullable target columns; keeps queries simple and LLM-friendly.

## Data Flow (typical happy path)
1) Authenticated user opens campaigns tab -> `GET /api/campaigns` populates list.
2) User creates campaign -> `POST /api/campaigns`; UI adds to list with status `not_started`.
3) From character card, user selects “Add to campaign”: frontend finds/creates campaign, then `POST /api/campaigns/{id}/characters`.
4) Later features will add scenes/maps/tokens per campaign; tokens can reference characters or be NPCs (characterId null) with tags/audience/notes.
