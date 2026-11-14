import {
  AuditLog,
  AuthResponse,
  CampusEvent,
  EventStatus,
  Room,
  User,
  UserRole
} from '../types';
import { checkEventConflict } from '../utils/conflictDetector';

const TOKEN_STORAGE_KEY = 'stekom_auth_token';
const USER_STORAGE_KEY = 'stekom_auth_user';
const LOCAL_DB_STORAGE_KEY = 'stekom_campus_db_v1';

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
    'Cache-Control': 'no-cache',
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
      cache: 'no-store',
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
  persistentServerStorage?: boolean;
  eventsCount?: number;
  roomsCount?: number;
  usersCount?: number;
}

// Track whether the backend has persistent storage (SQLite / KV REST) or ephemeral serverless (/tmp)
let detectedPersistentServerStorage: boolean | null = null;

async function isServerlessLocalFallback(): Promise<boolean> {
  if (detectedPersistentServerStorage !== null) {
    return detectedPersistentServerStorage === false;
  }
  try {
    const status = await apiRequest<ServerStatusInfo>('/api/status', { method: 'GET' }, false);
    detectedPersistentServerStorage = status.persistentServerStorage !== false;
    return !detectedPersistentServerStorage;
  } catch {
    return false;
  }
}

interface LocalStoredUser extends User {
  passwordHash: string;
}

interface LocalDatabase {
  rooms: Room[];
  events: CampusEvent[];
  users: LocalStoredUser[];
  audit_logs: AuditLog[];
}

function getDefaultPasswordForEmail(email: string): string {
  const norm = normalizeLoginEmail(email);
  if (norm === 'admin@stekom.ac.id') return 'admin123';
  if (norm === 'operator@stekom.ac.id') return 'operator123';
  if (norm === 'viewer@stekom.ac.id') return 'viewer123';
  return 'stekom123';
}

async function hashLocalPassword(password: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(`stekom-local:${password}`);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `sha256:${hex}`;
  }
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = (hash * 33) ^ password.charCodeAt(i);
  }
  return `djb2:${(hash >>> 0).toString(16)}`;
}

async function verifyLocalPassword(password: string, storedHash?: string): Promise<boolean> {
  if (!storedHash) return false;
  const computed = await hashLocalPassword(password);
  return computed === storedHash;
}

function sanitizeLocalUser(user: LocalStoredUser): User {
  const { passwordHash: _ignored, ...safe } = user;
  return safe;
}

async function fetchSeedDefaultsFromServer(): Promise<{
  rooms: Room[];
  events: CampusEvent[];
  users: User[];
  audit_logs: AuditLog[];
}> {
  try {
    return await apiRequest<{
      rooms: Room[];
      events: CampusEvent[];
      users: User[];
      audit_logs: AuditLog[];
    }>('/api/seed-defaults', { method: 'GET' }, false);
  } catch {
    return {
      rooms: [],
      events: [],
      users: [
        {
          id: 'user-admin',
          name: 'Dr. Ir. Agus Wibowo, M.Kom',
          email: 'admin@stekom.ac.id',
          role: 'Administrator',
          department: 'Biro Administrasi Akademik & Sarpras',
          phone: '081234567890',
          created_at: '2026-01-01T08:00:00.000Z'
        }
      ],
      audit_logs: []
    };
  }
}

function saveLocalDb(db: LocalDatabase): void {
  localStorage.setItem(LOCAL_DB_STORAGE_KEY, JSON.stringify(db));
}

async function loadOrInitLocalDb(): Promise<LocalDatabase> {
  try {
    const raw = localStorage.getItem(LOCAL_DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalDatabase>;
      if (
        Array.isArray(parsed.rooms) &&
        Array.isArray(parsed.events) &&
        Array.isArray(parsed.users) &&
        Array.isArray(parsed.audit_logs)
      ) {
        return {
          rooms: parsed.rooms,
          events: parsed.events,
          users: parsed.users,
          audit_logs: parsed.audit_logs
        };
      }
    }
  } catch {
    // Re-seed below if corrupted
  }

  const seeds = await fetchSeedDefaultsFromServer();
  const hashedUsers: LocalStoredUser[] = await Promise.all(
    seeds.users.map(async (u) => ({
      ...u,
      email: normalizeLoginEmail(u.email),
      passwordHash: await hashLocalPassword(getDefaultPasswordForEmail(u.email))
    }))
  );

  const initialDb: LocalDatabase = {
    rooms: seeds.rooms || [],
    events: seeds.events || [],
    users: hashedUsers,
    audit_logs: seeds.audit_logs || []
  };
  saveLocalDb(initialDb);
  return initialDb;
}

async function getLocalSessionActor(db: LocalDatabase): Promise<LocalStoredUser> {
  const token = getStoredToken() || '';
  if (!token.startsWith('local-session:')) {
    clearStoredSession();
    throw new Error('Autentikasi diperlukan. Silakan login terlebih dahulu.');
  }
  const userId = token.slice('local-session:'.length);
  const found = db.users.find((u) => u.id === userId);
  if (!found) {
    clearStoredSession();
    throw new Error('Akun pengguna tidak ditemukan atau telah dihapus.');
  }
  return found;
}

function appendLocalAudit(
  db: LocalDatabase,
  actor: User,
  entry: Omit<AuditLog, 'id' | 'user_name' | 'user_role' | 'timestamp'>
) {
  db.audit_logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_name: actor.name,
    user_role: actor.role,
    action: entry.action,
    target_type: entry.target_type,
    target_id: entry.target_id,
    target_name: entry.target_name,
    details: entry.details,
    timestamp: new Date().toISOString()
  });
  if (db.audit_logs.length > 500) {
    db.audit_logs = db.audit_logs.slice(0, 500);
  }
}

export const api = {
  async checkStatus(): Promise<ServerStatusInfo> {
    const info = await apiRequest<ServerStatusInfo>('/api/status', { method: 'GET' }, false);
    detectedPersistentServerStorage = info.persistentServerStorage !== false;
    return info;
  },

  async restoreSession(): Promise<User | null> {
    const token = getStoredToken();
    if (!token) return null;

    if (await isServerlessLocalFallback()) {
      if (!token.startsWith('local-session:')) {
        clearStoredSession();
        return null;
      }
      const db = await loadOrInitLocalDb();
      const userId = token.slice('local-session:'.length);
      const found = db.users.find((u) => u.id === userId);
      if (!found) {
        clearStoredSession();
        return null;
      }
      const safe = sanitizeLocalUser(found);
      setStoredSession(token, safe);
      return safe;
    }

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

    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      const rawLower = String(emailOrUser || '').trim().toLowerCase();
      const user = db.users.find(
        (u) => u.email.toLowerCase() === normalizedEmail || u.email.toLowerCase() === rawLower
      );
      if (!user || !(await verifyLocalPassword(password, user.passwordHash))) {
        throw new Error('Email/username atau kata sandi salah. Silakan periksa kembali.');
      }
      const safe = sanitizeLocalUser(user);
      setStoredSession(`local-session:${user.id}`, safe);
      appendLocalAudit(db, safe, {
        action: 'LOGIN',
        target_type: 'Sistem',
        target_id: user.id,
        target_name: 'Autentikasi Pengguna',
        details: `${user.name} (${user.email}) masuk ke sistem sebagai ${user.role}`
      });
      saveLocalDb(db);
      return safe;
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
    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      const actor = await getLocalSessionActor(db);
      if (!currentPassword || !newPassword) {
        throw new Error('Kata sandi saat ini dan kata sandi baru wajib diisi.');
      }
      if (newPassword !== newPassword.trim()) {
        throw new Error('Kata sandi baru tidak boleh diawali atau diakhiri spasi.');
      }
      if (newPassword.length < 6) {
        throw new Error('Kata sandi baru minimal harus 6 karakter.');
      }
      if (!(await verifyLocalPassword(currentPassword, actor.passwordHash))) {
        throw new Error('Kata sandi saat ini tidak sesuai.');
      }
      actor.passwordHash = await hashLocalPassword(newPassword);
      appendLocalAudit(db, actor, {
        action: 'UBAH',
        target_type: 'Pengguna',
        target_id: actor.id,
        target_name: actor.name,
        details: `${actor.name} memperbarui kata sandi akun pribadinya`
      });
      saveLocalDb(db);
      return;
    }

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
    if (await isServerlessLocalFallback()) {
      try {
        const db = await loadOrInitLocalDb();
        const actor = await getLocalSessionActor(db);
        appendLocalAudit(db, actor, {
          action: 'LOGOUT',
          target_type: 'Sistem',
          target_id: actor.id,
          target_name: 'Autentikasi Pengguna',
          details: `${actor.name} (${actor.email}) keluar (logout) dari sistem`
        });
        saveLocalDb(db);
      } catch {
        // ignore if already logged out
      }
      clearStoredSession();
      return;
    }

    const token = getStoredToken();
    if (token) {
      await apiRequest('/api/auth/logout', { method: 'POST' }, true).catch(() => undefined);
    }
    clearStoredSession();
  },

  async getRooms(): Promise<Room[]> {
    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      await getLocalSessionActor(db);
      return [...db.rooms].sort((a, b) => a.name.localeCompare(b.name));
    }
    return apiRequest<Room[]>('/api/rooms', { method: 'GET' }, true);
  },

  async createRoom(room: Partial<Room>): Promise<Room> {
    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      const actor = await getLocalSessionActor(db);
      if (actor.role !== 'Administrator' && actor.role !== 'Operator') {
        throw new Error(`Akses ditolak. Peran "${actor.role}" tidak memiliki izin untuk tindakan ini.`);
      }
      const name = String(room.name || '').trim();
      const code = String(room.code || '').trim();
      if (!name || !code) {
        throw new Error('Nama ruangan dan kode ruangan wajib diisi.');
      }
      const newRoom: Room = {
        id: room.id || `room-${Date.now()}`,
        name,
        code,
        capacity: Math.max(0, Number(room.capacity) || 0),
        is_general: Boolean(room.is_general),
        floor: String(room.floor || 'Lantai 1'),
        building: String(room.building || 'Gedung Pusat STEKOM'),
        facilities: Array.isArray(room.facilities) ? room.facilities.map(String) : [],
        status: room.status === 'Pemeliharaan' ? 'Pemeliharaan' : 'Tersedia',
        notes: String(room.notes || '')
      };
      db.rooms.push(newRoom);
      appendLocalAudit(db, actor, {
        action: 'TAMBAH',
        target_type: 'Ruangan',
        target_id: newRoom.id,
        target_name: newRoom.name,
        details: `Menambahkan ruangan baru ${newRoom.name} (${newRoom.code}), kapasitas ${newRoom.capacity}`
      });
      saveLocalDb(db);
      return newRoom;
    }

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
    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      const actor = await getLocalSessionActor(db);
      if (actor.role !== 'Administrator' && actor.role !== 'Operator') {
        throw new Error(`Akses ditolak. Peran "${actor.role}" tidak memiliki izin untuk tindakan ini.`);
      }
      const idx = db.rooms.findIndex((r) => r.id === id);
      if (idx < 0) throw new Error('Ruangan tidak ditemukan');
      const prev = db.rooms[idx];
      const updatedRoom: Room = {
        id: prev.id,
        name: room.name !== undefined ? String(room.name).trim() : prev.name,
        code: room.code !== undefined ? String(room.code).trim() : prev.code,
        capacity: room.capacity !== undefined ? Math.max(0, Number(room.capacity) || 0) : prev.capacity,
        is_general: room.is_general !== undefined ? Boolean(room.is_general) : prev.is_general,
        floor: room.floor !== undefined ? String(room.floor) : prev.floor,
        building: room.building !== undefined ? String(room.building) : prev.building,
        facilities: Array.isArray(room.facilities) ? room.facilities.map(String) : prev.facilities,
        status: room.status !== undefined ? (room.status === 'Pemeliharaan' ? 'Pemeliharaan' : 'Tersedia') : prev.status,
        notes: room.notes !== undefined ? String(room.notes) : prev.notes || ''
      };
      db.rooms[idx] = updatedRoom;
      appendLocalAudit(db, actor, {
        action: 'UBAH',
        target_type: 'Ruangan',
        target_id: updatedRoom.id,
        target_name: updatedRoom.name,
        details: `Mengubah data ruangan ${updatedRoom.name}: kapasitas ${updatedRoom.capacity}, status ${updatedRoom.status}`
      });
      saveLocalDb(db);
      return updatedRoom;
    }

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
    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      await getLocalSessionActor(db);
      return [...db.events].sort((a, b) =>
        `${a.tanggal} ${a.jam_mulai}`.localeCompare(`${b.tanggal} ${b.jam_mulai}`)
      );
    }
    return apiRequest<CampusEvent[]>('/api/events', { method: 'GET' }, true);
  },

  async createEvent(eventData: Partial<CampusEvent>): Promise<CampusEvent> {
    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      const actor = await getLocalSessionActor(db);
      if (actor.role !== 'Administrator' && actor.role !== 'Operator') {
        throw new Error(`Akses ditolak. Peran "${actor.role}" tidak memiliki izin untuk tindakan ini.`);
      }
      const {
        nama_event,
        tanggal,
        jam_mulai,
        jam_selesai,
        jumlah_peserta,
        pic,
        nomor_hp_pic,
        ruangan_ids,
        status,
        catatan
      } = eventData;

      if (!nama_event || !tanggal || !jam_mulai || !jam_selesai || !pic || !nomor_hp_pic) {
        throw new Error('Semua field wajib diisi lengkap.');
      }
      if (!ruangan_ids || !Array.isArray(ruangan_ids) || ruangan_ids.length === 0) {
        throw new Error('Pilih minimal satu ruangan untuk event ini.');
      }
      const participants = Number(jumlah_peserta);
      if (isNaN(participants) || participants <= 0) {
        throw new Error('Jumlah peserta harus berupa bilangan bulat positif (> 0).');
      }
      if (jam_selesai <= jam_mulai) {
        throw new Error('Jam selesai harus lebih akhir daripada jam mulai.');
      }

      const finalStatus: EventStatus =
        status === 'Scheduled' || status === 'Dibatalkan' ? status : 'Menunggu Konfirmasi';

      const conflictResult = checkEventConflict(
        { tanggal, jam_mulai, jam_selesai, ruangan_ids, status: finalStatus },
        db.events,
        db.rooms
      );
      if (finalStatus === 'Scheduled' && conflictResult.hasConflict) {
        throw new Error(
          `Jadwal bentrok tidak dapat di-set ke Scheduled! ${conflictResult.conflicts[0].reason}`
        );
      }

      const now = new Date().toISOString();
      const newEvent: CampusEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        nama_event: String(nama_event).trim(),
        tanggal: String(tanggal),
        jam_mulai: String(jam_mulai),
        jam_selesai: String(jam_selesai),
        jumlah_peserta: participants,
        pic: String(pic).trim(),
        nomor_hp_pic: String(nomor_hp_pic).trim(),
        ruangan_ids: ruangan_ids.map(String),
        status: finalStatus,
        catatan: catatan ? String(catatan).trim() : '',
        created_at: now,
        updated_at: now,
        created_by: actor.name
      };
      db.events.push(newEvent);
      appendLocalAudit(db, actor, {
        action: 'TAMBAH',
        target_type: 'Event',
        target_id: newEvent.id,
        target_name: newEvent.nama_event,
        details: `Membuat event "${newEvent.nama_event}" pada ${newEvent.tanggal} (${newEvent.jam_mulai} - ${newEvent.jam_selesai} WIB), status: ${newEvent.status}`
      });
      saveLocalDb(db);
      return newEvent;
    }

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
    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      const actor = await getLocalSessionActor(db);
      if (actor.role !== 'Administrator' && actor.role !== 'Operator') {
        throw new Error(`Akses ditolak. Peran "${actor.role}" tidak memiliki izin untuk tindakan ini.`);
      }
      const idx = db.events.findIndex((e) => e.id === id);
      if (idx < 0) throw new Error('Event tidak ditemukan');
      const prev = db.events[idx];

      const updatedTanggal = eventData.tanggal || prev.tanggal;
      const updatedStart = eventData.jam_mulai || prev.jam_mulai;
      const updatedEnd = eventData.jam_selesai || prev.jam_selesai;
      const updatedRooms: string[] = Array.isArray(eventData.ruangan_ids)
        ? eventData.ruangan_ids.map(String)
        : prev.ruangan_ids;
      const updatedStatus: EventStatus =
        eventData.status === 'Scheduled' ||
        eventData.status === 'Dibatalkan' ||
        eventData.status === 'Menunggu Konfirmasi'
          ? eventData.status
          : prev.status;

      if (updatedEnd <= updatedStart) {
        throw new Error('Jam selesai harus lebih akhir daripada jam mulai.');
      }
      if (eventData.jumlah_peserta !== undefined && Number(eventData.jumlah_peserta) <= 0) {
        throw new Error('Jumlah peserta harus berupa bilangan positif (> 0).');
      }

      const conflictResult = checkEventConflict(
        {
          id: prev.id,
          tanggal: updatedTanggal,
          jam_mulai: updatedStart,
          jam_selesai: updatedEnd,
          ruangan_ids: updatedRooms,
          status: updatedStatus
        },
        db.events,
        db.rooms
      );
      if (updatedStatus === 'Scheduled' && conflictResult.hasConflict) {
        throw new Error(
          `Jadwal bentrok tidak dapat di-set ke Scheduled! ${conflictResult.conflicts[0].reason}`
        );
      }

      const updatedEvent: CampusEvent = {
        ...prev,
        nama_event:
          eventData.nama_event !== undefined ? String(eventData.nama_event).trim() : prev.nama_event,
        tanggal: updatedTanggal,
        jam_mulai: updatedStart,
        jam_selesai: updatedEnd,
        jumlah_peserta:
          eventData.jumlah_peserta !== undefined ? Number(eventData.jumlah_peserta) : prev.jumlah_peserta,
        pic: eventData.pic !== undefined ? String(eventData.pic).trim() : prev.pic,
        nomor_hp_pic:
          eventData.nomor_hp_pic !== undefined ? String(eventData.nomor_hp_pic).trim() : prev.nomor_hp_pic,
        ruangan_ids: updatedRooms,
        status: updatedStatus,
        catatan: eventData.catatan !== undefined ? String(eventData.catatan).trim() : prev.catatan,
        updated_at: new Date().toISOString()
      };
      db.events[idx] = updatedEvent;

      let auditAction: AuditLog['action'] = 'UBAH';
      let auditDetail = `Memperbarui event "${updatedEvent.nama_event}"`;
      if (prev.status !== updatedStatus) {
        if (updatedStatus === 'Scheduled') {
          auditAction = 'KONFIRMASI';
          auditDetail = `Menetapkan event "${updatedEvent.nama_event}" menjadi Scheduled (${prev.status} -> Scheduled)`;
        } else if (updatedStatus === 'Dibatalkan') {
          auditAction = 'BATALKAN';
          auditDetail = `Membatalkan event "${updatedEvent.nama_event}" (${prev.status} -> Dibatalkan)`;
        } else {
          auditDetail = `Mengubah status event "${updatedEvent.nama_event}" menjadi ${updatedStatus}`;
        }
      }
      appendLocalAudit(db, actor, {
        action: auditAction,
        target_type: 'Event',
        target_id: updatedEvent.id,
        target_name: updatedEvent.nama_event,
        details: auditDetail
      });
      saveLocalDb(db);
      return updatedEvent;
    }

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
    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      const actor = await getLocalSessionActor(db);
      if (actor.role !== 'Administrator' && actor.role !== 'Operator') {
        throw new Error(`Akses ditolak. Peran "${actor.role}" tidak memiliki izin untuk tindakan ini.`);
      }
      const deleted = db.events.find((e) => e.id === id);
      if (!deleted) throw new Error('Event tidak ditemukan');
      db.events = db.events.filter((e) => e.id !== id);
      appendLocalAudit(db, actor, {
        action: 'HAPUS',
        target_type: 'Event',
        target_id: deleted.id,
        target_name: deleted.nama_event,
        details: `Menghapus event "${deleted.nama_event}" (Tanggal: ${deleted.tanggal})`
      });
      saveLocalDb(db);
      return;
    }

    await apiRequest<{ success: boolean }>(
      `/api/events/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      true
    );
  },

  async getUsers(): Promise<User[]> {
    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      const actor = await getLocalSessionActor(db);
      if (actor.role !== 'Administrator') {
        throw new Error(`Akses ditolak. Peran "${actor.role}" tidak memiliki izin untuk tindakan ini.`);
      }
      return [...db.users].sort((a, b) => a.name.localeCompare(b.name)).map(sanitizeLocalUser);
    }
    return apiRequest<User[]>('/api/users', { method: 'GET' }, true);
  },

  async createUser(userData: Partial<User> & { password?: string }): Promise<User> {
    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      const actor = await getLocalSessionActor(db);
      if (actor.role !== 'Administrator') {
        throw new Error(`Akses ditolak. Peran "${actor.role}" tidak memiliki izin untuk tindakan ini.`);
      }
      const name = String(userData.name || '').trim();
      const email = normalizeLoginEmail(String(userData.email || ''));
      const rawPassword = typeof userData.password === 'string' ? userData.password : '';
      const hasPasswordInput = rawPassword.trim().length > 0;

      if (!name || !email) {
        throw new Error('Nama dan email/username pengguna wajib diisi.');
      }
      if (hasPasswordInput && rawPassword !== rawPassword.trim()) {
        throw new Error('Kata sandi tidak boleh diawali atau diakhiri spasi.');
      }
      if (hasPasswordInput && rawPassword.length < 6) {
        throw new Error('Kata sandi minimal 6 karakter.');
      }
      if (db.users.some((u) => u.email.toLowerCase() === email)) {
        throw new Error(`Email "${email}" sudah terdaftar dalam sistem.`);
      }

      const validRoles: UserRole[] = ['Administrator', 'Operator', 'Viewer'];
      const requestedRole = String(userData.role || 'Operator') as UserRole;
      const role: UserRole = validRoles.includes(requestedRole) ? requestedRole : 'Operator';
      const password = hasPasswordInput ? rawPassword : 'stekom123';

      const newUser: LocalStoredUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        email,
        role,
        department: String(userData.department || 'Universitas STEKOM').trim(),
        phone: String(userData.phone || '').trim(),
        created_at: new Date().toISOString(),
        passwordHash: await hashLocalPassword(password)
      };
      db.users.push(newUser);
      appendLocalAudit(db, actor, {
        action: 'TAMBAH',
        target_type: 'Pengguna',
        target_id: newUser.id,
        target_name: newUser.name,
        details: `Menambahkan pengguna baru: ${newUser.name} (${newUser.email}) sebagai ${newUser.role}`
      });
      saveLocalDb(db);
      return sanitizeLocalUser(newUser);
    }

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
    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      const actor = await getLocalSessionActor(db);
      if (actor.role !== 'Administrator') {
        throw new Error(`Akses ditolak. Peran "${actor.role}" tidak memiliki izin untuk tindakan ini.`);
      }
      const idx = db.users.findIndex((u) => u.id === id);
      if (idx < 0) throw new Error('Pengguna tidak ditemukan');
      const prev = db.users[idx];

      let normalizedEmail = prev.email;
      if (data.email !== undefined) {
        normalizedEmail = normalizeLoginEmail(String(data.email));
        if (!normalizedEmail) throw new Error('Email pengguna tidak boleh kosong.');
        if (db.users.some((u) => u.id !== prev.id && u.email.toLowerCase() === normalizedEmail)) {
          throw new Error(`Email "${normalizedEmail}" sudah digunakan pengguna lain.`);
        }
      }

      const validRoles: UserRole[] = ['Administrator', 'Operator', 'Viewer'];
      if (data.role !== undefined && !validRoles.includes(data.role)) {
        throw new Error('Peran pengguna tidak valid.');
      }

      let updatedHash = prev.passwordHash;
      let passwordChanged = false;
      if (data.new_password !== undefined && String(data.new_password).trim() !== '') {
        const pw = String(data.new_password);
        if (pw !== pw.trim()) throw new Error('Kata sandi baru tidak boleh diawali atau diakhiri spasi.');
        if (pw.length < 6) throw new Error('Kata sandi baru minimal 6 karakter.');
        updatedHash = await hashLocalPassword(pw);
        passwordChanged = true;
      }

      const updated: LocalStoredUser = {
        ...prev,
        name: data.name !== undefined ? String(data.name).trim() : prev.name,
        email: normalizedEmail,
        role: data.role !== undefined ? (data.role as UserRole) : prev.role,
        department: data.department !== undefined ? String(data.department).trim() : prev.department,
        phone: data.phone !== undefined ? String(data.phone).trim() : prev.phone || '',
        passwordHash: updatedHash
      };
      db.users[idx] = updated;
      appendLocalAudit(db, actor, {
        action: 'UBAH',
        target_type: 'Pengguna',
        target_id: updated.id,
        target_name: updated.name,
        details: passwordChanged
          ? `Mengubah data / mereset kata sandi pengguna ${updated.name} (Peran: ${updated.role})`
          : `Mengubah data pengguna ${updated.name} (Peran: ${updated.role})`
      });
      saveLocalDb(db);
      return sanitizeLocalUser(updated);
    }

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
    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      const actor = await getLocalSessionActor(db);
      if (actor.role !== 'Administrator') {
        throw new Error(`Akses ditolak. Peran "${actor.role}" tidak memiliki izin untuk tindakan ini.`);
      }
      const target = db.users.find((u) => u.id === id);
      if (!target) throw new Error('Pengguna tidak ditemukan');

      const rawPw = typeof newPassword === 'string' ? newPassword : '';
      const hasCustom = rawPw.trim().length > 0;
      if (hasCustom && rawPw !== rawPw.trim()) {
        throw new Error('Kata sandi baru tidak boleh diawali atau diakhiri spasi.');
      }
      if (hasCustom && rawPw.length < 6) {
        throw new Error('Kata sandi baru minimal 6 karakter.');
      }
      const finalPassword = hasCustom ? rawPw : 'stekom123';
      target.passwordHash = await hashLocalPassword(finalPassword);
      appendLocalAudit(db, actor, {
        action: 'UBAH',
        target_type: 'Pengguna',
        target_id: target.id,
        target_name: target.name,
        details: `Mereset kata sandi pengguna ${target.name} (${target.email}) secara langsung`
      });
      saveLocalDb(db);
      return { success: true, password: finalPassword };
    }

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
    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      const actor = await getLocalSessionActor(db);
      if (actor.role !== 'Administrator') {
        throw new Error(`Akses ditolak. Peran "${actor.role}" tidak memiliki izin untuk tindakan ini.`);
      }
      if (id === actor.id) {
        throw new Error('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.');
      }
      const deleted = db.users.find((u) => u.id === id);
      if (!deleted) throw new Error('Pengguna tidak ditemukan');
      db.users = db.users.filter((u) => u.id !== id);
      appendLocalAudit(db, actor, {
        action: 'HAPUS',
        target_type: 'Pengguna',
        target_id: deleted.id,
        target_name: deleted.name,
        details: `Menghapus akses pengguna ${deleted.name} (${deleted.role})`
      });
      saveLocalDb(db);
      return;
    }

    await apiRequest<{ success: boolean }>(
      `/api/users/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      true
    );
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      const actor = await getLocalSessionActor(db);
      if (actor.role !== 'Administrator' && actor.role !== 'Operator') {
        throw new Error(`Akses ditolak. Peran "${actor.role}" tidak memiliki izin untuk tindakan ini.`);
      }
      return [...db.audit_logs].slice(0, 500);
    }
    return apiRequest<AuditLog[]>('/api/audit-logs', { method: 'GET' }, true);
  },

  async resetData(): Promise<void> {
    if (await isServerlessLocalFallback()) {
      const db = await loadOrInitLocalDb();
      const actor = await getLocalSessionActor(db);
      if (actor.role !== 'Administrator') {
        throw new Error(`Akses ditolak. Peran "${actor.role}" tidak memiliki izin untuk tindakan ini.`);
      }
      const seeds = await fetchSeedDefaultsFromServer();
      db.rooms = seeds.rooms;
      db.events = seeds.events;
      appendLocalAudit(db, actor, {
        action: 'PENGATURAN',
        target_type: 'Sistem',
        target_id: 'sys-reset',
        target_name: 'Database Reset',
        details: 'Melakukan reset data ruangan dan event contoh awal Universitas STEKOM'
      });
      saveLocalDb(db);
      return;
    }

    await apiRequest<{ success: boolean }>('/api/reset-data', { method: 'POST' }, true);
  }
};
