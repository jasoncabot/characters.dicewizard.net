export type CampaignVisibility = "private" | "invite";
export type CampaignStatus =
  | "not_started"
  | "in_progress"
  | "paused"
  | "completed"
  | "archived";

export interface Campaign {
  id: number;
  ownerId: number;
  name: string;
  description: string;
  visibility: CampaignVisibility;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignCreate {
  name: string;
  description: string;
  visibility: CampaignVisibility;
  status?: CampaignStatus;
}

export interface CampaignCharacter {
  id: number;
  campaignId: number;
  characterId: number;
  createdAt: string;
}

export interface CampaignCharacterSummary {
  linkId: number;
  characterId: number;
  characterName: string;
  characterClass: string;
  characterLevel: number;
  ownerId: number;
  ownerUsername: string;
}

export interface CampaignDetail extends Campaign {
  characters: CampaignCharacterSummary[];
}
