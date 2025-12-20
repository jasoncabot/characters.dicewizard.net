export type NoteEntityType =
  | "general"
  | "campaign"
  | "character"
  | "npc"
  | "map"
  | "handout"
  | "other";

export interface Note {
  id: number;
  userId: number;
  entityType: NoteEntityType;
  entityId?: number | null;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  score?: number;
}

export interface NoteCreatePayload {
  entityType?: NoteEntityType;
  entityId?: number | null;
  title?: string;
  body: string;
}
