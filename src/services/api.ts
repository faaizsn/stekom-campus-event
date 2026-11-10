import {
  AuditLog,
  CampusEvent,
  ConflictCheckResult,
  FilterOptions,
  Room,
  User
} from '../types';

const API_BASE = '/api';

export const api = {
  // System Status
  async getStatus() {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) throw new Error('Failed to fetch system status');
    return res.json();
  },

  // Reset to initial demo data
  async resetData(user_name?: string, user_role?: string) {
    const res = await fetch(`${API_BASE}/reset-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name, user_role })
    });
    if (!res.ok) throw new Error('Failed to reset data');
    return res.json();
  },

  // Rooms API
  async getRooms(): Promise<Room[]> {
    const res = await fetch(`${API_BASE}/rooms`);
    if (!res.ok) throw new Error('Gagal memuat data ruangan');
    return res.json();
  },

  async createRoom(room: Partial<Room>, currentUser?: User): Promise<Room> {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...room, current_user: currentUser })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal menambahkan ruangan');
    }
    return res.json();
  },

  async updateRoom(id: string, room: Partial<Room>, currentUser?: User): Promise<Room> {
    const res = await fetch(`${API_BASE}/rooms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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

    const res = await fetch(url.toString(), {
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

    const res = await fetch(url.toString());
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
    const res = await fetch(`${API_BASE}/events/check-conflict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    if (!res.ok) throw new Error('Gagal memeriksa bentrok jadwal');
    return res.json();
  },

  async createEvent(eventData: Partial<CampusEvent>, currentUser?: User): Promise<CampusEvent> {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...eventData, current_user: currentUser })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal menambahkan event');
    }
    return res.json();
  },

  async updateEvent(id: string, eventData: Partial<CampusEvent>, currentUser?: User): Promise<CampusEvent> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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

    const res = await fetch(url.toString(), {
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
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Gagal memuat pengguna');
    return res.json();
  },

  async createUser(user: Partial<User>, currentUser?: User): Promise<User> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, current_user: currentUser })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Gagal menambahkan pengguna');
    }
    return res.json();
  },

  async updateUser(id: string, user: Partial<User>, currentUser?: User): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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

    const res = await fetch(url.toString(), {
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
    const res = await fetch(`${API_BASE}/audit-logs`);
    if (!res.ok) throw new Error('Gagal memuat riwayat audit');
    return res.json();
  },

  // Dashboard Stats
  async getStats() {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Gagal memuat statistik dashboard');
    return res.json();
  },

  // Settings
  async getSettings() {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Gagal memuat pengaturan sistem');
    return res.json();
  },

  async updateSettings(settings: any) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Gagal memperbarui pengaturan');
    return res.json();
  }
};
