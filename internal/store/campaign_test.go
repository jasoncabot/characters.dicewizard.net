package store

import (
	"testing"

	"github.com/jasoncabot/dicewizard-characters/internal/models"
)

func TestUpdateCampaign_StatusValidationAndPermission(t *testing.T) {
	s := setupTestStore(t)
	defer s.Close()

	owner, _ := s.CreateUser("owner", "hash")
	editor, _ := s.CreateUser("editor", "hash")
	viewer, _ := s.CreateUser("viewer", "hash")

	camp, err := s.CreateCampaign(owner.ID, "Quest", "desc", models.CampaignVisibilityPrivate, models.CampaignStatusNotStarted)
	if err != nil {
		t.Fatalf("create campaign: %v", err)
	}

	// add editor and viewer memberships
	if _, err := s.db.Exec(`INSERT INTO campaign_members (campaign_id, user_id, role, status) VALUES (?, ?, 'editor', 'accepted')`, camp.ID, editor.ID); err != nil {
		t.Fatalf("insert editor: %v", err)
	}
	if _, err := s.db.Exec(`INSERT INTO campaign_members (campaign_id, user_id, role, status) VALUES (?, ?, 'viewer', 'accepted')`, camp.ID, viewer.ID); err != nil {
		t.Fatalf("insert viewer: %v", err)
	}

	// editor can update status
	updated, err := s.UpdateCampaign(camp.ID, editor.ID, camp.Name, camp.Description, camp.Visibility, models.CampaignStatusInProgress)
	if err != nil {
		t.Fatalf("editor should update: %v", err)
	}
	if updated.Status != models.CampaignStatusInProgress {
		t.Fatalf("status not updated: %v", updated.Status)
	}

	// viewer cannot update
	if _, err := s.UpdateCampaign(camp.ID, viewer.ID, "", "", "", models.CampaignStatusPaused); err != ErrNotPermitted {
		t.Fatalf("viewer expected ErrNotPermitted, got %v", err)
	}

	// invalid status rejected
	if _, err := s.UpdateCampaign(camp.ID, owner.ID, "", "", "", "bogus"); err != ErrInvalidCampaignStatus {
		t.Fatalf("expected ErrInvalidCampaignStatus, got %v", err)
	}
}
