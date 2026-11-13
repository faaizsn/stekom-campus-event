export type UserRole = 'Administrator' | 'Operator' | 'Viewer';

export type EventStatus = 'Menunggu Konfirmasi' | 'Scheduled' | 'Dibatalkan';

export type RoomOperationalStatus = 'Tersedia' | 'Pemeliharaan';

export type RoomLiveStatus = 'Tersedia' | 'Sedang Digunakan' | 'Akan Digunakan' | 'Tidak Dapat Digunakan';

export interface Room {
  id: string;
  name: string;
  code: string;
  capacity: number; // For the 8 general rooms, default is set and fully editable; for B.x.x rooms initial values are set
  is_general: boolean; // true for 8 general rooms
  floor: string;
  building: string;
  facilities: string[];
  status: RoomOperationalStatus;
  notes?: string;
}

export interface CampusEvent {
  id: string;
  nama_event: string;
  tanggal: string; // YYYY-MM-DD
  jam_mulai: string; // HH:mm
  jam_selesai: string; // HH:mm
  jumlah_peserta: number;
  pic: string;
  nomor_hp_pic: string;
  ruangan_ids: string[]; // multi-select
  status: EventStatus;
  catatan: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  phone?: string;
  created_at: string;
  isPendingInvite?: boolean;
}

export interface AuditLog {
  id: string;
  user_name: string;
  user_role: UserRole;
  action: 'TAMBAH' | 'UBAH' | 'HAPUS' | 'KONFIRMASI' | 'BATALKAN' | 'RUANGAN_STATUS' | 'LOGIN' | 'LOGOUT' | 'PENGATURAN';
  target_type: 'Event' | 'Ruangan' | 'Pengguna' | 'Sistem';
  target_id?: string;
  target_name: string;
  details: string;
  timestamp: string; // ISO string
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ConflictInfo {
  conflictingEvent: CampusEvent;
  conflictingRoomIds: string[];
  conflictingRoomNames: string[];
  overlapWindow: string;
  reason: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflicts: ConflictInfo[];
}

export interface FilterOptions {
  month: string; // 'all' or '01'-'12'
  year: string; // 'all' or '2026', '2027', etc.
  status: string; // 'all' or EventStatus
  roomId: string; // 'all' or room.id
  pic: string;
  search: string;
}
