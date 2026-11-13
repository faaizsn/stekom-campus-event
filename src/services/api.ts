import {
  AuditLog,
  AuthResponse,
  CampusEvent,
  ConflictCheckResult,
  FilterOptions,
  Room,
  User
} from '../types';

const API_BASE = '/api';
const TOKEN_KEY = 'stekom_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, { ...init, headers });
}

export const api = {
  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
    } catch {
      throw new Error('Tidak dapat terhubung ke server backend. Periksa koneksi internet atau status server.');
    }
    if (!res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Email atau kata sandi salah.');
      }
      throw new Error(
        `Server backend tidak merespons endpoint autentikasi (HTTP ${res.status}). Pastikan layanan backend berjalan.`
      );
    }
    const data: AuthResponse = await res.json();
    setStoredToken(data.token);
    return data;
  },

  async logout(): Promise<void> {
    try {
      const token = getStoredToken();
      if (token) {
        await authFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
      }
    } finally {
      setStoredToken(null);
    }
  },

  async getMe(): Promise<User> {
    const res = await authFetch(`${API_BASE}/auth/me`);
    if (!res.ok) {
      if (res.status === 401) {
        setStoredToken(null);
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Sesi tidak valid');
    }
    return res.json();
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await authFetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal memperbarui kata sandi');
    }
    return res.json();
  },

  // System Status
  async getStatus() {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) throw new Error('Failed to fetch system status');
    return res.json();
  },

  // Reset to initial demo data
  async resetData(user_name?: string, user_role?: string) {
    const res = await authFetch(`${API_BASE}/reset-data`, {
      method: 'POST',
      body: JSON.stringify({ user_name, user_role })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reset data');
    }
    return res.json();
  },

  // Rooms API
  async getRooms(): Promise<Room[]> {
    const res = await authFetch(`${API_BASE}/rooms`);
    if (!res.ok) throw new Error('Gagal memuat data ruangan');
    return res.json();
  },

  async createRoom(room: Partial<Room>, currentUser?: User): Promise<Room> {
    const res = await authFetch(`${API_BASE}/rooms`, {
      method: 'POST',
      body: JSON.stringify({ ...room, current_user: currentUser })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal menambahkan ruangan');
    }
    return res.json();
  },

  async updateRoom(id: string, room: Partial<Room>, currentUser?: User): Promise<Room> {
    const res = await authFetch(`${API_BASE}/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...room, current_user: currentUser })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal mengubah data ruangan');
    }
    return res.json();
  },

  async deleteRoom(id: string, userName?: string, userRole?: string): Promise<{ success: boolean }> {
    const url = new URL(`${window.location.origin}${API_BASE}/rooms/${id}`);
    if (userName) url.searchParams.set('user_name', userName);
    if (userRole) url.searchParams.set('user_role', userRole);

    const res = await authFetch(url.toString(), {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal menghapus ruangan');
    }
    return res.json();
  },

  // Events API
  async getEvents(filters?: Partial<FilterOptions>): Promise<CampusEvent[]> {
    const url = new URL(`${window.location.origin}${API_BASE}/events`);
    if (filters) {
      if (filters.month && filters.month !== 'all') url.searchParams.set('month', filters.month);
      if (filters.year && filters.year !== 'all') url.searchParams.set('year', filters.year);
      if (filters.status && filters.status !== 'all') url.searchParams.set('status', filters.status);
      if (filters.roomId && filters.roomId !== 'all') url.searchParams.set('roomId', filters.roomId);
      if (filters.pic) url.searchParams.set('pic', filters.pic);
      if (filters.search) url.searchParams.set('search', filters.search);
    }

    const res = await authFetch(url.toString());
    if (!res.ok) throw new Error('Gagal memuat data event');
    return res.json();
  },

  async checkConflict(eventData: {
    id?: string;
    tanggal: string;
    jam_mulai: string;
    jam_selesai: string;
    ruangan_ids: string[];
    status?: string;
  }): Promise<ConflictCheckResult> {
    const res = await authFetch(`${API_BASE}/events/check-conflict`, {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
    if (!res.ok) throw new Error('Gagal memeriksa bentrok jadwal');
    return res.json();
  },

  async createEvent(eventData: Partial<CampusEvent>, currentUser?: User): Promise<CampusEvent> {
    const res = await authFetch(`${API_BASE}/events`, {
      method: 'POST',
      body: JSON.stringify({ ...eventData, current_user: currentUser })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal menambahkan event');
    }
    return res.json();
  },

  async updateEvent(id: string, eventData: Partial<CampusEvent>, currentUser?: User): Promise<CampusEvent> {
    const res = await authFetch(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...eventData, current_user: currentUser })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal memperbarui event');
    }
    return res.json();
  },

  async deleteEvent(id: string, userName?: string, userRole?: string): Promise<{ success: boolean }> {
    const url = new URL(`${window.location.origin}${API_BASE}/events/${id}`);
    if (userName) url.searchParams.set('user_name', userName);
    if (userRole) url.searchParams.set('user_role', userRole);

    const res = await authFetch(url.toString(), {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal menghapus event');
    }
    return res.json();
  },

  // Users API
  async getUsers(): Promise<User[]> {
    const res = await authFetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Gagal memuat pengguna');
    return res.json();
  },

  async createUser(user: Partial<User> & { password?: string }, currentUser?: User): Promise<User> {
    const res = await authFetch(`${API_BASE}/users`, {
      method: 'POST',
      body: JSON.stringify({ ...user, current_user: currentUser })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal menambahkan pengguna');
    }
    return res.json();
  },

  async updateUser(id: string, user: Partial<User> & { new_password?: string }, currentUser?: User): Promise<User> {
    const res = await authFetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...user, current_user: currentUser })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal memperbarui pengguna');
    }
    return res.json();
  },

  async deleteUser(id: string, userName?: string, userRole?: string): Promise<{ success: boolean }> {
    const url = new URL(`${window.location.origin}${API_BASE}/users/${id}`);
    if (userName) url.searchParams.set('user_name', userName);
    if (userRole) url.searchParams.set('user_role', userRole);

    const res = await authFetch(url.toString(), {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal menghapus pengguna');
    }
    return res.json();
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await authFetch(`${API_BASE}/audit-logs`);
    if (!res.ok) throw new Error('Gagal memuat riwayat audit');
    return res.json();
  },

  // Dashboard Stats
  async getStats() {
    const res = await authFetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Gagal memuat statistik dashboard');
    return res.json();
  },

  // Settings
  async getSettings() {
    const res = await authFetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Gagal memuat pengaturan sistem');
    return res.json();
  },

  async updateSettings(settings: any) {
    const res = await authFetch(`${API_BASE}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal memperbarui pengaturan');
    }
    return res.json();
  }
};
