import {
  AuditLog,
  AuthResponse,
  CampusEvent,
  Room,
  User
} from '../types';

const TOKEN_STORAGE_KEY = 'stekom_auth_token';
const USER_STORAGE_KEY = 'stekom_auth_user';

export function normalizeLoginEmail(identifier: string): string {
  const trimmed = String(identifier || '').trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.includes('@') ? trimmed : `${trimmed}@stekom.ac.id`;
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredSession(token: string, user: User) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore storage errors
  }
}

function clearStoredSession() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  requireToken = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };

  if (requireToken) {
    const token = getStoredToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server backend. Pastikan server sedang berjalan.');
  }

  const contentType = response.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => '');
    data = text ? { message: text } : null;
  }

  if (!response.ok) {
    if (response.status === 401 && requireToken) {
      clearStoredSession();
    }
    const errMsg =
      data?.error ||
      data?.message ||
      `Permintaan ke server gagal (HTTP ${response.status}).`;
    throw new Error(errMsg);
  }

  return data as T;
}

export interface ServerStatusInfo {
  status: string;
  persistence: string;
  mode: string;
  eventsCount?: number;
  roomsCount?: number;
  usersCount?: number;
}

export const api = {
  async checkStatus(): Promise<ServerStatusInfo> {
    return apiRequest<ServerStatusInfo>('/api/status', { method: 'GET' }, false);
  },

  async restoreSession(): Promise<User | null> {
    const token = getStoredToken();
    if (!token) return null;
    try {
      const user = await apiRequest<User>('/api/auth/me', { method: 'GET' }, true);
      setStoredSession(token, user);
      return user;
    } catch {
      clearStoredSession();
      return null;
    }
  },

  async loginWithEmailPassword(emailOrUser: string, password: string): Promise<User> {
    const normalizedEmail = normalizeLoginEmail(emailOrUser);
    if (!normalizedEmail || !password) {
      throw new Error('Email/username dan kata sandi wajib diisi.');
    }
    const result = await apiRequest<AuthResponse>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password })
      },
      false
    );
    setStoredSession(result.token, result.user);
    return result.user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiRequest<{ success: boolean }>(
      '/api/auth/change-password',
      {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      },
      true
    );
  },

  async logout(): Promise<void> {
    const token = getStoredToken();
    if (token) {
      await apiRequest('/api/auth/logout', { method: 'POST' }, true).catch(() => undefined);
    }
    clearStoredSession();
  },

  async getRooms(): Promise<Room[]> {
    return apiRequest<Room[]>('/api/rooms', { method: 'GET' }, true);
  },

  async createRoom(room: Partial<Room>): Promise<Room> {
    return apiRequest<Room>(
      '/api/rooms',
      {
        method: 'POST',
        body: JSON.stringify(room)
      },
      true
    );
  },

  async updateRoom(id: string, room: Partial<Room>): Promise<Room> {
    return apiRequest<Room>(
      `/api/rooms/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(room)
      },
      true
    );
  },

  async getEvents(): Promise<CampusEvent[]> {
    return apiRequest<CampusEvent[]>('/api/events', { method: 'GET' }, true);
  },

  async createEvent(eventData: Partial<CampusEvent>): Promise<CampusEvent> {
    return apiRequest<CampusEvent>(
      '/api/events',
      {
        method: 'POST',
        body: JSON.stringify(eventData)
      },
      true
    );
  },

  async updateEvent(id: string, eventData: Partial<CampusEvent>): Promise<CampusEvent> {
    return apiRequest<CampusEvent>(
      `/api/events/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(eventData)
      },
      true
    );
  },

  async deleteEvent(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(
      `/api/events/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      true
    );
  },

  async getUsers(): Promise<User[]> {
    return apiRequest<User[]>('/api/users', { method: 'GET' }, true);
  },

  async createUser(userData: Partial<User> & { password?: string }): Promise<User> {
    return apiRequest<User>(
      '/api/users',
      {
        method: 'POST',
        body: JSON.stringify(userData)
      },
      true
    );
  },

  async updateUser(id: string, data: Partial<User> & { new_password?: string }): Promise<User> {
    return apiRequest<User>(
      `/api/users/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      },
      true
    );
  },

  async resetUserPassword(id: string, newPassword?: string): Promise<{ success: boolean; password: string }> {
    return apiRequest<{ success: boolean; password: string }>(
      `/api/users/${encodeURIComponent(id)}/reset-password`,
      {
        method: 'POST',
        body: JSON.stringify({ newPassword: newPassword || '' })
      },
      true
    );
  },

  async deleteUser(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(
      `/api/users/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      true
    );
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    return apiRequest<AuditLog[]>('/api/audit-logs', { method: 'GET' }, true);
  },

  async resetData(): Promise<void> {
    await apiRequest<{ success: boolean }>('/api/reset-data', { method: 'POST' }, true);
  }
};
