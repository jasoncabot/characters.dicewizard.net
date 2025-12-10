import type { Character, CharacterCreate, CharacterUpdate, User, UserCreate, LoginResponse } from '../types/character';

// In dev mode, Vite proxies /api to the backend
// In production, the Go server serves both frontend and API
const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
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

// Auth API
export const authApi = {
  register: (data: UserCreate): Promise<LoginResponse> =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: UserCreate): Promise<LoginResponse> =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: (): Promise<User> => request('/auth/me'),
};

// Characters API
export const charactersApi = {
  list: (): Promise<Character[]> => request('/characters'),

  get: (id: number): Promise<Character> => request(`/characters/${id}`),

  create: (data: CharacterCreate): Promise<Character> =>
    request('/characters', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: CharacterUpdate): Promise<Character> =>
    request(`/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number): Promise<void> =>
    request(`/characters/${id}`, {
      method: 'DELETE',
    }),
};

export { ApiError };
