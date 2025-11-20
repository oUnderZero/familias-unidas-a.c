import { Member, Credential } from '../types'; 

// Resolve API base prioritizing build-time Vite env, then global/window, then localhost
const resolveApiBase = () => {
  const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
  const envUrl = metaEnv.VITE_API_URL || (typeof window !== 'undefined' && (window as any).VITE_API_URL);
  return envUrl || 'http://localhost:4000/api';
};

const API_BASE = resolveApiBase();
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');
const TOKEN_KEY = 'ong_admin_token';

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...options,
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || res.statusText);
  }
  if (res.status === 204) {
    // No content responses (e.g. DELETE)
    return undefined as T;
  }

  // Some servers send empty body with 200; handle gracefully
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
};

export const getMembers = async (): Promise<Member[]> => {
  return request<Member[]>('/members');
};

export const getMemberById = async (id: string): Promise<Member | undefined> => {
  return request<Member>(`/members/${id}`);
};

export const getActiveCredential = (member: Member): Credential | undefined => {
  return member.credentials.find((c) => c.status === 'ACTIVE');
};

export const saveMember = async (member: Member, isUpdate = false): Promise<Member> => {
  if (isUpdate && member.id) {
    return request<Member>(`/members/${member.id}`, {
      method: 'PUT',
      body: JSON.stringify(member),
    });
  }
  return request<Member>('/members', {
    method: 'POST',
    body: JSON.stringify(member),
  });
};

export const deleteMember = async (id: string): Promise<void> => {
  await request(`/members/${id}`, { method: 'DELETE' });
};

export const fetchPublicMember = async (
  id: string,
  token?: string
): Promise<{ member: Member | null; credential: Credential | null; errorType: 'NOT_FOUND' | 'INVALID_QR' | null }> => {
  const qs = token ? `?token=${encodeURIComponent(token)}` : '';
  return request(`/public/members/${id}${qs}`);
};

export const login = async (password: string): Promise<string> => {
  const resp = await request<{ token: string }>('/login', {
    method: 'POST',
    body: JSON.stringify({ password })
  });
  const token = (resp as any)?.token;
  if (token && typeof localStorage !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
};

export const clearToken = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
};

// Kept for backward compatibility with App.tsx; backend seeds on startup.
export const seedData = () => {};

// Utility: resolve relative media paths (/uploads/...) to full URL
export const resolveMediaUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};
