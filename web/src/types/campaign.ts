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

export interface CampaignMemberSummary {
  id: number;
  campaignId: number;
  userId: number;
  username: string;
  role: "owner" | "editor" | "viewer";
  status: string;
  invitedBy?: number | null;
  createdAt: string;
}

export interface Scene {
  id: number;
  campaignId: number;
  name: string;
  description: string;
  ordering: number;
  isActive: boolean;
  createdBy?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Map {
  id: number;
  sceneId: number;
  name: string;
  baseImageUrl: string;
  gridSizeFt: number;
  widthPx?: number | null;
  heightPx?: number | null;
  lightingMode: string;
  fogState: string;
  createdAt: string;
}

export interface Token {
  id: number;
  mapId: number;
  characterId?: number | null;
  label: string;
  imageUrl: string;
  sizeSquares: number;
  positionX: number;
  positionY: number;
  facingDeg: number;
  audience: string[];
  tags: string[];
  notes: string;
  createdBy?: number | null;
  createdAt: string;
}

export interface MapWithTokens extends Map {
  tokens: Token[];
}

export interface SceneWithMaps extends Scene {
  maps: MapWithTokens[];
}

export interface CampaignHandout {
  id: number;
  campaignId: number;
  title: string;
  description: string;
  fileUrl: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignFull extends Campaign {
  role: "owner" | "editor" | "viewer";
  characters: CampaignCharacterSummary[];
  members: CampaignMemberSummary[];
  scenes: SceneWithMaps[];
  handouts: CampaignHandout[];
}
