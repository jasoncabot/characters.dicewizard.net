import type {
  Character,
  CharacterCreate,
  User,
  UserCreate,
  LoginResponse,
} from "../types/character";
import type {
  Campaign,
  CampaignCharacter,
  CampaignCreate,
  CampaignDetail,
} from "../types/campaign";
import type { Note, NoteCreatePayload } from "../types/note";

// In dev mode, Vite proxies /api to the backend
// In production, the Go server serves both frontend and API
const API_BASE = import.meta.env.VITE_API_URL || "/api";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: formData,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Auth API
export const authApi = {
  register: (data: UserCreate): Promise<LoginResponse> =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: UserCreate): Promise<LoginResponse> =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: (): Promise<User> => request("/auth/me"),
};

// Characters API
export const charactersApi = {
  list: (): Promise<Character[]> => request("/characters"),

  get: (id: number): Promise<Character> => request(`/characters/${id}`),

  create: (data: CharacterCreate): Promise<Character> =>
    request("/characters", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<CharacterCreate>): Promise<Character> =>
    request(`/characters/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  uploadAvatar: (id: number, file: File): Promise<Character> => {
		const formData = new FormData();
		formData.append("avatar", file);
		return requestForm(`/characters/${id}/avatar`, formData);
	},

  delete: (id: number): Promise<void> =>
    request(`/characters/${id}`, {
      method: "DELETE",
    }),
};

// Campaigns API
export const campaignsApi = {
  list: (): Promise<Campaign[]> => request("/campaigns"),

  create: (data: CampaignCreate): Promise<Campaign> =>
    request("/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  addCharacter: (
    campaignId: number,
    characterId: number,
  ): Promise<CampaignCharacter> =>
    request(`/campaigns/${campaignId}/characters`, {
      method: "POST",
      body: JSON.stringify({ characterId }),
    }),

  listDetails: (): Promise<CampaignDetail[]> => request("/campaigns/details"),

  update: (
    campaignId: number,
    data: Partial<CampaignCreate>,
  ): Promise<Campaign> =>
    request(`/campaigns/${campaignId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateStatus: (campaignId: number, status: string): Promise<Campaign> =>
    request(`/campaigns/${campaignId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  createInvite: (
    campaignId: number,
    payload: { roleDefault?: "viewer" | "editor"; expiresAt?: string },
  ): Promise<{ code: string; expiresAt: string; roleDefault: string }> =>
    request(`/campaigns/${campaignId}/invites`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  acceptInvite: (code: string): Promise<Campaign> =>
    request(`/campaigns/invites/${code}/accept`, {
      method: "POST",
    }),

  listMembers: (campaignId: number) =>
    request<{ id: number; campaignId: number; userId: number; username: string; role: string; status: string; createdAt: string; invitedBy?: number | null }[]>(`/campaigns/${campaignId}/members`),

  updateMemberRole: (
    campaignId: number,
    userId: number,
    role: "viewer" | "editor" | "owner",
  ) =>
    request(`/campaigns/${campaignId}/members/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),

  revokeMember: (campaignId: number, userId: number) =>
    request(`/campaigns/${campaignId}/members/${userId}/revoke`, {
      method: "POST",
    }),
};

// Notes API
export const notesApi = {
  search: (params: {
    q?: string;
    entityType?: string;
    entityId?: number;
    limit?: number;
  } = {}): Promise<Note[]> => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.entityType) qs.set("entityType", params.entityType);
    if (typeof params.entityId === "number") qs.set("entityId", String(params.entityId));
    if (params.limit) qs.set("limit", String(params.limit));

    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/notes/search${suffix}`);
  },

  create: (payload: NoteCreatePayload): Promise<Note> =>
    request("/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export { ApiError };
