import crypto from 'crypto';
import express from 'express';
import type { Express, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_SECRET = process.env.AUTH_SECRET || 'stekom-campus-event-mgmt-secret-2026';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type UserRole = 'Administrator' | 'Operator' | 'Viewer';
export type EventStatus = 'Menunggu Konfirmasi' | 'Scheduled' | 'Dibatalkan';
export type RoomStatus = 'Tersedia' | 'Pemeliharaan';

export interface DbRoom {
  id: string;
  name: string;
  code: string;
  capacity: number;
  is_general: boolean;
  floor: string;
  building: string;
  facilities: string[];
  status: RoomStatus;
  notes?: string;
}

export interface DbEvent {
  id: string;
  nama_event: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  jumlah_peserta: number;
  pic: string;
  nomor_hp_pic: string;
  ruangan_ids: string[];
  status: EventStatus;
  catatan: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface DbUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  phone?: string;
  created_at: string;
  password_hash?: string;
}

export interface DbAuditLog {
  id: string;
  user_name: string;
  user_role: string;
  action: string;
  target_type: string;
  target_id?: string;
  target_name: string;
  details: string;
  timestamp: string;
}

export interface DbSettings {
  app_name: string;
  campus_name: string;
  campus_address: string;
  campus_phone: string;
  campus_website: string;
  mode: string;
  timezone: string;
  updated_at: string;
}

interface JsonDatabaseSchema {
  rooms: DbRoom[];
  events: DbEvent[];
  users: DbUser[];
  audit_logs: DbAuditLog[];
  system_settings: DbSettings;
}

function resolveDataDir(): string {
  const preferred = path.resolve(__dirname, 'data');
  try {
    if (!fs.existsSync(preferred)) {
      fs.mkdirSync(preferred, { recursive: true });
    }
    fs.accessSync(preferred, fs.constants.W_OK);
    return preferred;
  } catch {
    const fallback = path.join(os.tmpdir(), 'stekom-campus-event-data');
    try {
      if (!fs.existsSync(fallback)) {
        fs.mkdirSync(fallback, { recursive: true });
      }
    } catch {
      // in-memory fallback works
    }
    return fallback;
  }
}

const DATA_DIR = resolveDataDir();
const SQLITE_PATH = path.join(DATA_DIR, 'stekom.db');
const JSON_PATH = path.join(DATA_DIR, 'db.json');

const INITIAL_ROOMS: DbRoom[] = [
  {
    id: 'room-aula-utama',
    name: 'Aula Utama',
    code: 'AULA-01',
    capacity: 500,
    is_general: true,
    floor: 'Lantai 1',
    building: 'Gedung Pusat STEKOM',
    facilities: ['Panggung Utama', 'Sound System 10.000W', 'Videotron LED', 'AC Central', 'Kursi 500+', 'Podium'],
    status: 'Tersedia',
    notes: 'Kapasitas dapat disesuaikan sesuai kebutuhan tata panggung & layout kursi'
  },
  {
    id: 'room-pertemuan-lt2',
    name: 'Ruang Pertemuan LT 2',
    code: 'RP-LT2',
    capacity: 60,
    is_general: true,
    floor: 'Lantai 2',
    building: 'Gedung Rektorat',
    facilities: ['Smart TV 75"', 'Meja Konferensi', 'Sound System', 'AC', 'Mikrofon Meja'],
    status: 'Tersedia',
    notes: 'Cocok untuk rapat senat, pertemuan dewan dosen dan mitra industri'
  },
  {
    id: 'room-conf-lt1',
    name: 'Ruang Conferences LT 1',
    code: 'CONF-LT1',
    capacity: 120,
    is_general: true,
    floor: 'Lantai 1',
    building: 'Gedung Akademik',
    facilities: ['Dual Proyektor Laser', 'Audio Hi-Fi', 'AC Dual Unit', 'Wireless Mic', 'Streaming Setup'],
    status: 'Tersedia',
    notes: 'Ruang konferensi internasional dan seminar umum'
  },
  {
    id: 'room-serbaguna-lt3',
    name: 'Ruang Serbaguna LT 3',
    code: 'RSG-LT3',
    capacity: 200,
    is_general: true,
    floor: 'Lantai 3',
    building: 'Gedung Pusat STEKOM',
    facilities: ['Proyektor', 'Sound Portable', 'Lantai Kayu Parquet', 'AC', 'Kursi Lipat'],
    status: 'Tersedia',
    notes: 'Area serbaguna pameran karya mahasiswa dan lomba'
  },
  {
    id: 'room-studio-musik',
    name: 'Studio Musik',
    code: 'STD-MUSIK',
    capacity: 20,
    is_general: true,
    floor: 'Lantai 2',
    building: 'Gedung Kreatif',
    facilities: ['Peredam Akustik', 'Drum Kit', 'Amplifier Marshall', 'Audio Interface', 'Keyboard & Gitar', 'AC'],
    status: 'Tersedia',
    notes: 'Studio rekaman dan latihan UKM musik kampus'
  },
  {
    id: 'room-studio-karaoke',
    name: 'Studio Karaoke',
    code: 'STD-KARAOKE',
    capacity: 15,
    is_general: true,
    floor: 'Lantai 2',
    building: 'Gedung Kreatif',
    facilities: ['Sistem Karaoke Digital', 'Layar 55"', 'Dual Wireless Mic', 'Peredam Suara', 'Sofa & AC'],
    status: 'Tersedia',
    notes: 'Fasilitas rekreasi civitas akademika dan pelatihan vokal'
  },
  {
    id: 'room-ruang-hukum',
    name: 'Ruang Hukum',
    code: 'R-HUKUM',
    capacity: 45,
    is_general: true,
    floor: 'Lantai 3',
    building: 'Gedung Akademik',
    facilities: ['Simulasi Meja Sidang', 'Palu Hakim', 'Mikrofon Meja', 'AC', 'Layar Presentasi'],
    status: 'Tersedia',
    notes: 'Ruang sidang semu dan kajian hukum cyber law'
  },
  {
    id: 'room-lab-sepeda-listrik',
    name: 'Lab Sepeda Listrik',
    code: 'LAB-EBIKE',
    capacity: 35,
    is_general: true,
    floor: 'Lantai 1',
    building: 'Gedung Inovasi & Riset STEKOM',
    facilities: ['Bench Uji Motor Listrik', 'Alat Uji Baterai Li-ion', 'Osiloskop', 'Tool Kit Mekanikal', 'Exhaust', 'AC'],
    status: 'Tersedia',
    notes: 'Pusat riset kendaraan listrik ramah lingkungan STEKOM'
  },
  {
    id: 'room-b-2-8',
    name: 'B.2.8',
    code: 'B.2.8',
    capacity: 36,
    is_general: false,
    floor: 'Lantai 2',
    building: 'Gedung B',
    facilities: ['Proyektor', 'Whiteboard', 'AC', '36 Kursi Kuliah Single'],
    status: 'Tersedia'
  },
  {
    id: 'room-b-2-9',
    name: 'B.2.9',
    code: 'B.2.9',
    capacity: 40,
    is_general: false,
    floor: 'Lantai 2',
    building: 'Gedung B',
    facilities: ['Proyektor', 'Whiteboard', 'AC', '40 Kursi Kuliah Single'],
    status: 'Tersedia'
  },
  {
    id: 'room-b-2-10',
    name: 'B.2.10',
    code: 'B.2.10',
    capacity: 30,
    is_general: false,
    floor: 'Lantai 2',
    building: 'Gedung B',
    facilities: ['Proyektor LCD', 'Whiteboard', 'AC', '30 Kursi Kuliah Single'],
    status: 'Tersedia'
  },
  {
    id: 'room-b-3-6',
    name: 'B.3.6',
    code: 'B.3.6',
    capacity: 50,
    is_general: false,
    floor: 'Lantai 3',
    building: 'Gedung B',
    facilities: ['Dual Monitor LED', 'Sound System Ruang', 'AC Dual Unit', '50 Kursi Kuliah'],
    status: 'Tersedia'
  },
  {
    id: 'room-b-3-7',
    name: 'B.3.7',
    code: 'B.3.7',
    capacity: 30,
    is_general: false,
    floor: 'Lantai 3',
    building: 'Gedung B',
    facilities: ['Proyektor', 'Whiteboard', 'AC', '30 Kursi Kuliah Single'],
    status: 'Tersedia'
  },
  {
    id: 'room-b-3-8',
    name: 'B.3.8',
    code: 'B.3.8',
    capacity: 30,
    is_general: false,
    floor: 'Lantai 3',
    building: 'Gedung B',
    facilities: ['Proyektor', 'Whiteboard', 'AC', '30 Kursi Kuliah Single'],
    status: 'Tersedia'
  },
  {
    id: 'room-b-3-9',
    name: 'B.3.9',
    code: 'B.3.9',
    capacity: 40,
    is_general: false,
    floor: 'Lantai 3',
    building: 'Gedung B',
    facilities: ['Proyektor', 'Whiteboard', 'AC', '40 Kursi Kuliah Single'],
    status: 'Tersedia'
  },
  {
    id: 'room-b-3-10',
    name: 'B.3.10',
    code: 'B.3.10',
    capacity: 40,
    is_general: false,
    floor: 'Lantai 3',
    building: 'Gedung B',
    facilities: ['Proyektor', 'Whiteboard', 'AC', '40 Kursi Kuliah Single'],
    status: 'Tersedia'
  },
  {
    id: 'room-b-3-11',
    name: 'B.3.11',
    code: 'B.3.11',
    capacity: 40,
    is_general: false,
    floor: 'Lantai 3',
    building: 'Gedung B',
    facilities: ['Proyektor', 'Whiteboard', 'AC', '40 Kursi Kuliah Single'],
    status: 'Tersedia'
  },
  {
    id: 'room-b-2-7-1',
    name: 'B.2.7.1',
    code: 'B.2.7.1',
    capacity: 8,
    is_general: false,
    floor: 'Lantai 2',
    building: 'Gedung B',
    facilities: ['Meja Diskusi Bundar', 'Whiteboard Kaca', 'AC', '8 Kursi Ergonomis'],
    status: 'Tersedia',
    notes: 'Ruang Diskusi Kelompok & Bimbingan Skripsi'
  },
  {
    id: 'room-b-2-7-2',
    name: 'B.2.7.2',
    code: 'B.2.7.2',
    capacity: 8,
    is_general: false,
    floor: 'Lantai 2',
    building: 'Gedung B',
    facilities: ['Meja Diskusi Bundar', 'Whiteboard Kaca', 'AC', '8 Kursi Ergonomis'],
    status: 'Tersedia',
    notes: 'Ruang Diskusi Kelompok & Bimbingan Skripsi'
  },
  {
    id: 'room-b-2-7-3',
    name: 'B.2.7.3',
    code: 'B.2.7.3',
    capacity: 8,
    is_general: false,
    floor: 'Lantai 2',
    building: 'Gedung B',
    facilities: ['Meja Diskusi Bundar', 'Whiteboard Kaca', 'AC', '8 Kursi Ergonomis'],
    status: 'Tersedia',
    notes: 'Ruang Diskusi Kelompok & Bimbingan Skripsi'
  },
  {
    id: 'room-b-2-7-4',
    name: 'B.2.7.4',
    code: 'B.2.7.4',
    capacity: 8,
    is_general: false,
    floor: 'Lantai 2',
    building: 'Gedung B',
    facilities: ['Meja Diskusi Bundar', 'Whiteboard Kaca', 'AC', '8 Kursi Ergonomis'],
    status: 'Tersedia',
    notes: 'Ruang Diskusi Kelompok & Bimbingan Skripsi'
  }
];

const INITIAL_USERS: DbUser[] = [
  {
    id: 'user-admin',
    name: 'Dr. Ir. Agus Wibowo, M.Kom',
    email: 'admin@stekom.ac.id',
    role: 'Administrator',
    department: 'Biro Administrasi Akademik & Sarpras',
    phone: '081234567890',
    created_at: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 'user-operator',
    name: 'Rahmat Hidayat, S.Kom',
    email: 'operator@stekom.ac.id',
    role: 'Operator',
    department: 'Bagian Rumah Tangga & Penjadwalan',
    phone: '081398765432',
    created_at: '2026-01-05T08:00:00.000Z'
  },
  {
    id: 'user-viewer',
    name: 'Siti Nurhaliza',
    email: 'viewer@stekom.ac.id',
    role: 'Viewer',
    department: 'BEM Universitas STEKOM',
    phone: '085712349988',
    created_at: '2026-02-01T08:00:00.000Z'
  }
];

const INITIAL_EVENTS: DbEvent[] = [
  {
    id: 'evt-001',
    nama_event: 'Kuliah Umum: Inovasi Artificial Intelligence & Cyber Security',
    tanggal: '2026-11-10',
    jam_mulai: '08:30',
    jam_selesai: '12:00',
    jumlah_peserta: 350,
    pic: 'Dr. Ir. Agus Wibowo, M.Kom',
    nomor_hp_pic: '081234567890',
    ruangan_ids: ['room-aula-utama'],
    status: 'Scheduled',
    catatan: 'Dihadiri mahasiswa TI dan SI. Perlu setup sound system & videotron pukul 07.30 WIB.',
    created_at: '2026-11-01T09:00:00.000Z',
    updated_at: '2026-11-02T10:00:00.000Z',
    created_by: 'Dr. Ir. Agus Wibowo, M.Kom'
  },
  {
    id: 'evt-002',
    nama_event: 'Workshop Riset & Perakitan Konversi Sepeda Listrik Kampus',
    tanggal: '2026-11-10',
    jam_mulai: '13:00',
    jam_selesai: '16:30',
    jumlah_peserta: 30,
    pic: 'Bambang Sudarmono, M.T.',
    nomor_hp_pic: '081322334455',
    ruangan_ids: ['room-lab-sepeda-listrik'],
    status: 'Scheduled',
    catatan: 'Praktik langsung perakitan baterai BMS dan dinamo hub 350W.',
    created_at: '2026-11-02T11:00:00.000Z',
    updated_at: '2026-11-02T11:00:00.000Z',
    created_by: 'Rahmat Hidayat, S.Kom'
  },
  {
    id: 'evt-003',
    nama_event: 'Rapat Senat Akademik: Evaluasi Kurikulum OBE 2027',
    tanggal: '2026-11-11',
    jam_mulai: '09:00',
    jam_selesai: '12:30',
    jumlah_peserta: 40,
    pic: 'Prof. Suparyanto, M.Kom',
    nomor_hp_pic: '081566778899',
    ruangan_ids: ['room-pertemuan-lt2'],
    status: 'Scheduled',
    catatan: 'Konsumsi disediakan oleh Bagian Umum, siapkan smart TV untuk presentasi materi kurikulum.',
    created_at: '2026-11-03T08:30:00.000Z',
    updated_at: '2026-11-03T08:30:00.000Z',
    created_by: 'Dr. Ir. Agus Wibowo, M.Kom'
  },
  {
    id: 'evt-004',
    nama_event: 'Seminar Nasional Rekayasa Perangkat Lunak & Cloud Native',
    tanggal: '2026-11-12',
    jam_mulai: '08:00',
    jam_selesai: '15:00',
    jumlah_peserta: 100,
    pic: 'Hendra Gunawan, M.Cs',
    nomor_hp_pic: '081778899001',
    ruangan_ids: ['room-conf-lt1'],
    status: 'Scheduled',
    catatan: 'Live streaming di kanal YouTube Universitas STEKOM. Pasang dual proyektor laser.',
    created_at: '2026-11-03T14:00:00.000Z',
    updated_at: '2026-11-04T09:15:00.000Z',
    created_by: 'Rahmat Hidayat, S.Kom'
  },
  {
    id: 'evt-005',
    nama_event: 'Latihan Kolaborasi Band Dies Natalis STEKOM',
    tanggal: '2026-11-10',
    jam_mulai: '14:00',
    jam_selesai: '17:00',
    jumlah_peserta: 12,
    pic: 'Dimas Prasetyo (Ketua UKM Musik)',
    nomor_hp_pic: '085811223344',
    ruangan_ids: ['room-studio-musik'],
    status: 'Menunggu Konfirmasi',
    catatan: 'Menunggu persetujuan sarpras untuk penggunaan drum kit dan amplifier.',
    created_at: '2026-11-05T10:20:00.000Z',
    updated_at: '2026-11-05T10:20:00.000Z',
    created_by: 'Siti Nurhaliza'
  },
  {
    id: 'evt-006',
    nama_event: 'Simulasi Sidang Semu Cyber Law & HAKI STEKOM',
    tanggal: '2026-11-13',
    jam_mulai: '10:00',
    jam_selesai: '13:00',
    jumlah_peserta: 35,
    pic: 'Farida Kusumawardani, S.H., M.H.',
    nomor_hp_pic: '081299887766',
    ruangan_ids: ['room-ruang-hukum'],
    status: 'Scheduled',
    catatan: 'Uji kompetensi mahasiswa Fakultas Hukum & Bisnis STEKOM.',
    created_at: '2026-11-04T13:40:00.000Z',
    updated_at: '2026-11-04T13:40:00.000Z',
    created_by: 'Dr. Ir. Agus Wibowo, M.Kom'
  },
  {
    id: 'evt-007',
    nama_event: 'STEKOM Tech & Art Expo 2026 (Pameran Karya Inovatif)',
    tanggal: '2026-11-14',
    jam_mulai: '08:00',
    jam_selesai: '17:00',
    jumlah_peserta: 400,
    pic: 'Eko Setyawan, S.Sn, M.Kom',
    nomor_hp_pic: '081344556677',
    ruangan_ids: ['room-aula-utama', 'room-conf-lt1'],
    status: 'Scheduled',
    catatan: 'Event multi-ruangan untuk pameran hardware IoT, robotika, dan instalasi desain grafis.',
    created_at: '2026-11-01T15:00:00.000Z',
    updated_at: '2026-11-02T16:00:00.000Z',
    created_by: 'Dr. Ir. Agus Wibowo, M.Kom'
  },
  {
    id: 'evt-008',
    nama_event: 'Latihan Paduan Suara & Karaoke Keakraban Dosen',
    tanggal: '2026-11-10',
    jam_mulai: '15:30',
    jam_selesai: '17:30',
    jumlah_peserta: 10,
    pic: 'Nining Rahayu, M.Si',
    nomor_hp_pic: '081677889922',
    ruangan_ids: ['room-studio-karaoke'],
    status: 'Dibatalkan',
    catatan: 'Dibatalkan karena bertepatan dengan rapat koordinasi fakultas.',
    created_at: '2026-11-02T10:00:00.000Z',
    updated_at: '2026-11-06T09:00:00.000Z',
    created_by: 'Rahmat Hidayat, S.Kom'
  },
  {
    id: 'evt-009',
    nama_event: 'Bimbingan Skripsi & Ujian Terbuka Tahap 1',
    tanggal: '2026-11-16',
    jam_mulai: '09:00',
    jam_selesai: '12:00',
    jumlah_peserta: 8,
    pic: 'Ir. Wahyu Tri Wibowo, M.Cs',
    nomor_hp_pic: '081255667788',
    ruangan_ids: ['room-b-2-7-1', 'room-b-2-7-2'],
    status: 'Menunggu Konfirmasi',
    catatan: 'Memerlukan 2 ruangan diskusi bimbingan skripsi paralel.',
    created_at: '2026-11-06T11:00:00.000Z',
    updated_at: '2026-11-06T11:00:00.000Z',
    created_by: 'Rahmat Hidayat, S.Kom'
  },
  {
    id: 'evt-010',
    nama_event: 'Kuliah Praktikum Pemrograman Web Lanjut',
    tanggal: '2026-11-10',
    jam_mulai: '10:00',
    jam_selesai: '12:30',
    jumlah_peserta: 38,
    pic: 'Anisa Dwi Lestari, M.Kom',
    nomor_hp_pic: '081822334455',
    ruangan_ids: ['room-b-3-9'],
    status: 'Scheduled',
    catatan: 'Praktikum framework React dan TypeScript.',
    created_at: '2026-11-05T08:00:00.000Z',
    updated_at: '2026-11-05T08:00:00.000Z',
    created_by: 'Dr. Ir. Agus Wibowo, M.Kom'
  }
];

const INITIAL_AUDIT_LOGS: DbAuditLog[] = [
  {
    id: 'log-001',
    user_name: 'Dr. Ir. Agus Wibowo, M.Kom',
    user_role: 'Administrator',
    action: 'TAMBAH',
    target_type: 'Event',
    target_id: 'evt-001',
    target_name: 'Kuliah Umum: Inovasi Artificial Intelligence & Cyber Security',
    details: 'Menambahkan event baru di Aula Utama pada tanggal 10/11/2026 08:30 - 12:00 WIB',
    timestamp: '2026-11-01T09:00:00.000Z'
  },
  {
    id: 'log-002',
    user_name: 'Dr. Ir. Agus Wibowo, M.Kom',
    user_role: 'Administrator',
    action: 'KONFIRMASI',
    target_type: 'Event',
    target_id: 'evt-001',
    target_name: 'Kuliah Umum: Inovasi Artificial Intelligence & Cyber Security',
    details: 'Mengubah status event menjadi Scheduled',
    timestamp: '2026-11-02T10:00:00.000Z'
  },
  {
    id: 'log-003',
    user_name: 'Rahmat Hidayat, S.Kom',
    user_role: 'Operator',
    action: 'TAMBAH',
    target_type: 'Event',
    target_id: 'evt-002',
    target_name: 'Workshop Riset & Perakitan Konversi Sepeda Listrik Kampus',
    details: 'Menjadwalkan workshop di Lab Sepeda Listrik',
    timestamp: '2026-11-02T11:00:00.000Z'
  },
  {
    id: 'log-004',
    user_name: 'Rahmat Hidayat, S.Kom',
    user_role: 'Operator',
    action: 'BATALKAN',
    target_type: 'Event',
    target_id: 'evt-008',
    target_name: 'Latihan Paduan Suara & Karaoke Keakraban Dosen',
    details: 'Membatalkan peminjaman Studio Karaoke atas permintaan PIC (tidak memblokir ruangan)',
    timestamp: '2026-11-06T09:00:00.000Z'
  }
];

function normalizeLoginEmail(identifier: string): string {
  const trimmed = String(identifier || '').trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.includes('@') ? trimmed : `${trimmed}@stekom.ac.id`;
}

function getDefaultPasswordForEmail(email: string): string {
  const normalized = normalizeLoginEmail(email);
  if (normalized === 'admin@stekom.ac.id') return 'admin123';
  if (normalized === 'operator@stekom.ac.id') return 'operator123';
  if (normalized === 'viewer@stekom.ac.id') return 'viewer123';
  return 'stekom123';
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHex] = storedHash.split(':');
  if (!salt || !originalHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const originalBuf = Buffer.from(originalHex, 'hex');
    if (derived.length !== originalBuf.length) return false;
    return crypto.timingSafeEqual(derived, originalBuf);
  } catch {
    return false;
  }
}

function sanitizeUser(user: DbUser): Omit<DbUser, 'password_hash'> {
  const { password_hash: _ignored, ...safe } = user;
  return safe;
}

interface AuthTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
  exp: number;
}

function createAuthToken(user: DbUser): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    exp: Date.now() + TOKEN_TTL_MS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encodedPayload, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(encodedPayload).digest('base64url');
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8')) as AuthTokenPayload;
    if (!payload.sub || !payload.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function safeJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapRoomRecord(row: Record<string, unknown>): DbRoom {
  return {
    id: String(row.id),
    name: String(row.name),
    code: String(row.code),
    capacity: Number(row.capacity) || 0,
    is_general: Boolean(row.is_general),
    floor: String(row.floor || 'Lantai 1'),
    building: String(row.building || 'Gedung Pusat STEKOM'),
    facilities: safeJsonArray(row.facilities),
    status: row.status === 'Pemeliharaan' ? 'Pemeliharaan' : 'Tersedia',
    notes: row.notes ? String(row.notes) : ''
  };
}

function mapEventRecord(row: Record<string, unknown>): DbEvent {
  const rawStatus = String(row.status || 'Menunggu Konfirmasi');
  const status: EventStatus =
    rawStatus === 'Dikonfirmasi' || rawStatus === 'Scheduled'
      ? 'Scheduled'
      : rawStatus === 'Dibatalkan'
      ? 'Dibatalkan'
      : 'Menunggu Konfirmasi';

  return {
    id: String(row.id),
    nama_event: String(row.nama_event),
    tanggal: String(row.tanggal),
    jam_mulai: String(row.jam_mulai),
    jam_selesai: String(row.jam_selesai),
    jumlah_peserta: Number(row.jumlah_peserta) || 1,
    pic: String(row.pic),
    nomor_hp_pic: String(row.nomor_hp_pic),
    ruangan_ids: safeJsonArray(row.ruangan_ids),
    status,
    catatan: row.catatan ? String(row.catatan) : '',
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    created_by: String(row.created_by)
  };
}

function mapUserRecord(row: Record<string, unknown>): DbUser {
  const rawRole = String(row.role || 'Viewer');
  const role: UserRole =
    rawRole === 'Administrator' || rawRole === 'Operator' || rawRole === 'Viewer'
      ? rawRole
      : 'Viewer';
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email).toLowerCase(),
    role,
    department: String(row.department || 'Universitas STEKOM'),
    phone: row.phone ? String(row.phone) : '',
    created_at: String(row.created_at),
    password_hash: row.password_hash ? String(row.password_hash) : undefined
  };
}

function mapAuditRecord(row: Record<string, unknown>): DbAuditLog {
  return {
    id: String(row.id),
    user_name: String(row.user_name),
    user_role: String(row.user_role),
    action: String(row.action),
    target_type: String(row.target_type),
    target_id: row.target_id ? String(row.target_id) : undefined,
    target_name: String(row.target_name),
    details: String(row.details),
    timestamp: String(row.timestamp)
  };
}

function getJakartaTodayDateStr(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

interface StorageAdapter {
  engineLabel: string;
  storagePath: string;
  mode: string;
  persistentServerStorage: boolean;
  getAllRooms(): Promise<DbRoom[]> | DbRoom[];
  getRoomById(id: string): Promise<DbRoom | null> | DbRoom | null;
  insertRoom(room: DbRoom): Promise<void> | void;
  updateRoom(room: DbRoom): Promise<void> | void;
  deleteRoom(id: string): Promise<void> | void;
  getAllEvents(): Promise<DbEvent[]> | DbEvent[];
  getEventById(id: string): Promise<DbEvent | null> | DbEvent | null;
  insertEvent(event: DbEvent): Promise<void> | void;
  updateEvent(event: DbEvent): Promise<void> | void;
  deleteEvent(id: string): Promise<void> | void;
  getAllUsers(): Promise<DbUser[]> | DbUser[];
  findUserById(id: string): Promise<DbUser | null> | DbUser | null;
  findUserByEmailOrUsername(identifier: string): Promise<DbUser | null> | DbUser | null;
  insertUser(user: DbUser): Promise<void> | void;
  updateUser(user: DbUser): Promise<void> | void;
  deleteUser(id: string): Promise<void> | void;
  getAuditLogs(): Promise<DbAuditLog[]> | DbAuditLog[];
  insertAuditLog(entry: Omit<DbAuditLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): Promise<void> | void;
  getSettings(): Promise<DbSettings> | DbSettings;
  resetRoomsAndEvents(actor: DbUser): Promise<void> | void;
}

function createInitialSeedDb(mode: string): JsonDatabaseSchema {
  return {
    rooms: INITIAL_ROOMS.map((r) => ({ ...r, facilities: [...r.facilities] })),
    events: INITIAL_EVENTS.map((e) => ({ ...e, ruangan_ids: [...e.ruangan_ids] })),
    users: INITIAL_USERS.map((u) => ({
      ...u,
      email: normalizeLoginEmail(u.email),
      password_hash: hashPassword(getDefaultPasswordForEmail(u.email))
    })),
    audit_logs: INITIAL_AUDIT_LOGS.map((l) => ({ ...l })),
    system_settings: {
      app_name: 'STEKOM CAMPUS EVENT MANAGEMENT',
      campus_name: 'Universitas STEKOM',
      campus_address: 'Jl. Majapahit No. 605, Pedurungan Kidul, Kec. Pedurungan, Kota Semarang, Jawa Tengah 50192',
      campus_phone: '(024) 6723456 / 0812-3456-7890',
      campus_website: 'https://stekom.ac.id',
      mode,
      timezone: 'Asia/Jakarta (WIB)',
      updated_at: new Date().toISOString()
    }
  };
}

async function createKvRestAdapter(restUrl: string, restToken: string): Promise<StorageAdapter> {
  const baseUrl = restUrl.replace(/\/+$/, '');
  const KV_KEY = 'stekom_campus_event_db_v1';

  const kvCommand = async <T = unknown>(args: unknown[]): Promise<T> => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${restToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`KV REST error (${res.status}): ${txt}`);
    }
    const json = (await res.json()) as { result: T; error?: string };
    if (json.error) throw new Error(json.error);
    return json.result;
  };

  const loadDb = async (): Promise<JsonDatabaseSchema> => {
    const raw = await kvCommand<string | null>(['GET', KV_KEY]);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<JsonDatabaseSchema>;
        if (Array.isArray(parsed.rooms) && Array.isArray(parsed.users)) {
          return {
            rooms: parsed.rooms.map((r) => mapRoomRecord(r as unknown as Record<string, unknown>)),
            events: (parsed.events || []).map((e) => mapEventRecord(e as unknown as Record<string, unknown>)),
            users: parsed.users.map((u) => {
              const mapped = mapUserRecord(u as unknown as Record<string, unknown>);
              if (!mapped.password_hash || !mapped.password_hash.includes(':')) {
                mapped.password_hash = hashPassword(getDefaultPasswordForEmail(mapped.email));
              }
              return mapped;
            }),
            audit_logs: (parsed.audit_logs || []).map((l) => mapAuditRecord(l as unknown as Record<string, unknown>)),
            system_settings: {
              app_name: parsed.system_settings?.app_name || 'STEKOM CAMPUS EVENT MANAGEMENT',
              campus_name: parsed.system_settings?.campus_name || 'Universitas STEKOM',
              campus_address: parsed.system_settings?.campus_address || 'Jl. Majapahit No. 605, Pedurungan Kidul, Kec. Pedurungan, Kota Semarang, Jawa Tengah 50192',
              campus_phone: parsed.system_settings?.campus_phone || '(024) 6723456 / 0812-3456-7890',
              campus_website: parsed.system_settings?.campus_website || 'https://stekom.ac.id',
              mode: 'kv-rest',
              timezone: parsed.system_settings?.timezone || 'Asia/Jakarta (WIB)',
              updated_at: parsed.system_settings?.updated_at || new Date().toISOString()
            }
          };
        }
      } catch {
        // re-seed below if corrupted
      }
    }
    const seeded = createInitialSeedDb('kv-rest');
    await kvCommand(['SET', KV_KEY, JSON.stringify(seeded)]);
    return seeded;
  };

  const mutateDb = async (fn: (db: JsonDatabaseSchema) => void): Promise<void> => {
    const db = await loadDb();
    fn(db);
    db.system_settings.updated_at = new Date().toISOString();
    await kvCommand(['SET', KV_KEY, JSON.stringify(db)]);
  };

  // Ensure initial seed exists
  await loadDb();

  return {
    engineLabel: 'Cloud KV Database (Redis REST)',
    storagePath: `kv://${KV_KEY}`,
    mode: 'kv-rest',
    persistentServerStorage: true,
    getAllRooms: async () => {
      const db = await loadDb();
      return [...db.rooms].sort((a, b) => a.name.localeCompare(b.name));
    },
    getRoomById: async (id) => {
      const db = await loadDb();
      return db.rooms.find((r) => r.id === id) || null;
    },
    insertRoom: async (r) => mutateDb((db) => { db.rooms.push(r); }),
    updateRoom: async (r) => mutateDb((db) => {
      const idx = db.rooms.findIndex((item) => item.id === r.id);
      if (idx >= 0) db.rooms[idx] = r;
    }),
    deleteRoom: async (id) => mutateDb((db) => {
      db.rooms = db.rooms.filter((r) => r.id !== id);
    }),
    getAllEvents: async () => {
      const db = await loadDb();
      return [...db.events].sort((a, b) => `${a.tanggal} ${a.jam_mulai}`.localeCompare(`${b.tanggal} ${b.jam_mulai}`));
    },
    getEventById: async (id) => {
      const db = await loadDb();
      return db.events.find((e) => e.id === id) || null;
    },
    insertEvent: async (ev) => mutateDb((db) => { db.events.push(ev); }),
    updateEvent: async (ev) => mutateDb((db) => {
      const idx = db.events.findIndex((item) => item.id === ev.id);
      if (idx >= 0) db.events[idx] = ev;
    }),
    deleteEvent: async (id) => mutateDb((db) => {
      db.events = db.events.filter((e) => e.id !== id);
    }),
    getAllUsers: async () => {
      const db = await loadDb();
      return [...db.users].sort((a, b) => a.name.localeCompare(b.name));
    },
    findUserById: async (id) => {
      const db = await loadDb();
      return db.users.find((u) => u.id === id) || null;
    },
    findUserByEmailOrUsername: async (identifier) => {
      const rawLower = String(identifier || '').trim().toLowerCase();
      const norm = normalizeLoginEmail(rawLower);
      if (!rawLower) return null;
      const db = await loadDb();
      return db.users.find((u) => u.email.toLowerCase() === norm || u.email.toLowerCase() === rawLower) || null;
    },
    insertUser: async (u) => mutateDb((db) => { db.users.push(u); }),
    updateUser: async (u) => mutateDb((db) => {
      const idx = db.users.findIndex((item) => item.id === u.id);
      if (idx >= 0) db.users[idx] = u;
    }),
    deleteUser: async (id) => mutateDb((db) => {
      db.users = db.users.filter((u) => u.id !== id);
    }),
    getAuditLogs: async () => {
      const db = await loadDb();
      return [...db.audit_logs].slice(0, 500);
    },
    insertAuditLog: async (entry) => mutateDb((db) => {
      db.audit_logs.unshift({
        id: entry.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        user_name: entry.user_name,
        user_role: entry.user_role,
        action: entry.action,
        target_type: entry.target_type,
        target_id: entry.target_id,
        target_name: entry.target_name,
        details: entry.details,
        timestamp: entry.timestamp || new Date().toISOString()
      });
    }),
    getSettings: async () => {
      const db = await loadDb();
      return db.system_settings;
    },
    resetRoomsAndEvents: async (actor) => mutateDb((db) => {
      db.rooms = INITIAL_ROOMS.map((r) => ({ ...r, facilities: [...r.facilities] }));
      db.events = INITIAL_EVENTS.map((e) => ({ ...e, ruangan_ids: [...e.ruangan_ids] }));
      db.audit_logs.unshift({
        id: `log-${Date.now()}`,
        user_name: actor.name,
        user_role: actor.role,
        action: 'PENGATURAN',
        target_type: 'Sistem',
        target_id: 'sys-reset',
        target_name: 'Database Reset',
        details: 'Melakukan reset data ruangan dan event contoh awal Universitas STEKOM',
        timestamp: new Date().toISOString()
      });
    })
  };
}

async function createStorageAdapter(): Promise<StorageAdapter> {
  // 1. Prefer Upstash Redis / Vercel KV REST when configured (works across all Vercel lambdas)
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (kvUrl && kvToken) {
    try {
      return await createKvRestAdapter(kvUrl, kvToken);
    } catch (kvErr) {
      console.warn('Cloud KV REST unavailable, falling back:', kvErr);
    }
  }

  const isEphemeralServerless = Boolean(process.env.VERCEL);

  let legacyData: Partial<JsonDatabaseSchema> | null = null;
  if (fs.existsSync(JSON_PATH)) {
    try {
      legacyData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
    } catch {
      legacyData = null;
    }
  }

  // 2. Prefer Node 22 built-in SQLite (DatabaseSync) when running on persistent server disk
  if (!isEphemeralServerless) {
    try {
      const sqliteModuleName = 'node:sqlite';
      const sqliteMod = (await import(sqliteModuleName)) as {
        DatabaseSync: new (path: string) => {
          exec(sql: string): void;
          prepare(sql: string): {
            run(...params: unknown[]): unknown;
            get(...params: unknown[]): Record<string, unknown> | undefined;
            all(...params: unknown[]): Array<Record<string, unknown>>;
          };
        };
      };
    const sqlite = new sqliteMod.DatabaseSync(SQLITE_PATH);
    sqlite.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 0,
        is_general INTEGER NOT NULL DEFAULT 0,
        floor TEXT NOT NULL DEFAULT 'Lantai 1',
        building TEXT NOT NULL DEFAULT 'Gedung Pusat STEKOM',
        facilities TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'Tersedia',
        notes TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        nama_event TEXT NOT NULL,
        tanggal TEXT NOT NULL,
        jam_mulai TEXT NOT NULL,
        jam_selesai TEXT NOT NULL,
        jumlah_peserta INTEGER NOT NULL DEFAULT 1,
        pic TEXT NOT NULL,
        nomor_hp_pic TEXT NOT NULL,
        ruangan_ids TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'Menunggu Konfirmasi',
        catatan TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'Operator',
        department TEXT NOT NULL DEFAULT 'Universitas STEKOM',
        phone TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        password_hash TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_name TEXT NOT NULL,
        user_role TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT,
        target_name TEXT NOT NULL,
        details TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        app_name TEXT NOT NULL,
        campus_name TEXT NOT NULL,
        campus_address TEXT NOT NULL,
        campus_phone TEXT NOT NULL,
        campus_website TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'sqlite',
        timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta (WIB)',
        updated_at TEXT NOT NULL
      );
    `);

    const seedRoomsAndEventsSql = (rooms: DbRoom[], events: DbEvent[], logs?: DbAuditLog[]) => {
      const insertRoom = sqlite.prepare(`
        INSERT OR REPLACE INTO rooms (id, name, code, capacity, is_general, floor, building, facilities, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of rooms) {
        insertRoom.run(
          r.id,
          r.name,
          r.code,
          Number(r.capacity) || 0,
          r.is_general ? 1 : 0,
          r.floor || 'Lantai 1',
          r.building || 'Gedung Pusat STEKOM',
          JSON.stringify(Array.isArray(r.facilities) ? r.facilities : []),
          r.status === 'Pemeliharaan' ? 'Pemeliharaan' : 'Tersedia',
          r.notes || ''
        );
      }

      const insertEvent = sqlite.prepare(`
        INSERT OR REPLACE INTO events (id, nama_event, tanggal, jam_mulai, jam_selesai, jumlah_peserta, pic, nomor_hp_pic, ruangan_ids, status, catatan, created_at, updated_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const ev of events) {
        const mapped = mapEventRecord(ev as unknown as Record<string, unknown>);
        insertEvent.run(
          mapped.id,
          mapped.nama_event,
          mapped.tanggal,
          mapped.jam_mulai,
          mapped.jam_selesai,
          mapped.jumlah_peserta,
          mapped.pic,
          mapped.nomor_hp_pic,
          JSON.stringify(mapped.ruangan_ids),
          mapped.status,
          mapped.catatan,
          mapped.created_at || new Date().toISOString(),
          mapped.updated_at || new Date().toISOString(),
          mapped.created_by || 'Sistem'
        );
      }

      if (logs && logs.length > 0) {
        const insertLog = sqlite.prepare(`
          INSERT OR REPLACE INTO audit_logs (id, user_name, user_role, action, target_type, target_id, target_name, details, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const l of logs) {
          insertLog.run(
            l.id,
            l.user_name,
            l.user_role,
            l.action,
            l.target_type,
            l.target_id || null,
            l.target_name,
            l.details,
            l.timestamp
          );
        }
      }
    };

    const roomCnt = (sqlite.prepare('SELECT COUNT(*) as cnt FROM rooms').get() as { cnt: number }).cnt;
    const userCnt = (sqlite.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;
    const settingsRow = sqlite.prepare('SELECT id FROM system_settings WHERE id = 1').get();

    sqlite.exec('BEGIN');
    try {
      if (roomCnt === 0) {
        seedRoomsAndEventsSql(
          legacyData?.rooms?.length ? legacyData.rooms : INITIAL_ROOMS,
          legacyData?.events ? legacyData.events : INITIAL_EVENTS,
          legacyData?.audit_logs ? legacyData.audit_logs : INITIAL_AUDIT_LOGS
        );
      }
      if (userCnt === 0) {
        const seedList = legacyData?.users?.length ? legacyData.users : INITIAL_USERS;
        const insertUser = sqlite.prepare(`
          INSERT OR IGNORE INTO users (id, name, email, role, department, phone, created_at, password_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const u of seedList) {
          const emailNorm = normalizeLoginEmail(u.email);
          const pwHash =
            u.password_hash && u.password_hash.includes(':')
              ? u.password_hash
              : hashPassword(getDefaultPasswordForEmail(emailNorm));
          insertUser.run(
            u.id,
            u.name,
            emailNorm,
            u.role,
            u.department || 'Universitas STEKOM',
            u.phone || '',
            u.created_at || new Date().toISOString(),
            pwHash
          );
        }
      }
      if (!settingsRow) {
        const s = legacyData?.system_settings;
        sqlite
          .prepare(`
            INSERT INTO system_settings (id, app_name, campus_name, campus_address, campus_phone, campus_website, mode, timezone, updated_at)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            s?.app_name || 'STEKOM CAMPUS EVENT MANAGEMENT',
            s?.campus_name || 'Universitas STEKOM',
            s?.campus_address || 'Jl. Majapahit No. 605, Pedurungan Kidul, Kec. Pedurungan, Kota Semarang, Jawa Tengah 50192',
            s?.campus_phone || '(024) 6723456 / 0812-3456-7890',
            s?.campus_website || 'https://stekom.ac.id',
            'sqlite',
            s?.timezone || 'Asia/Jakarta (WIB)',
            new Date().toISOString()
          );
      }
      sqlite.exec('COMMIT');
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }

    const insertAudit = (entry: Omit<DbAuditLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) => {
      sqlite
        .prepare(`
          INSERT INTO audit_logs (id, user_name, user_role, action, target_type, target_id, target_name, details, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          entry.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          entry.user_name,
          entry.user_role,
          entry.action,
          entry.target_type,
          entry.target_id || null,
          entry.target_name,
          entry.details,
          entry.timestamp || new Date().toISOString()
        );
    };

    return {
      engineLabel: 'SQLite Database (Server Backend)',
      storagePath: SQLITE_PATH,
      mode: 'sqlite',
      persistentServerStorage: true,
      getAllRooms: () =>
        sqlite.prepare('SELECT * FROM rooms ORDER BY name ASC').all().map(mapRoomRecord),
      getRoomById: (id) => {
        const row = sqlite.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
        return row ? mapRoomRecord(row) : null;
      },
      insertRoom: (r) => {
        sqlite
          .prepare(`
            INSERT INTO rooms (id, name, code, capacity, is_general, floor, building, facilities, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            r.id,
            r.name,
            r.code,
            r.capacity,
            r.is_general ? 1 : 0,
            r.floor,
            r.building,
            JSON.stringify(r.facilities),
            r.status,
            r.notes || ''
          );
      },
      updateRoom: (r) => {
        sqlite
          .prepare(`
            UPDATE rooms
            SET name = ?, code = ?, capacity = ?, is_general = ?, floor = ?, building = ?, facilities = ?, status = ?, notes = ?
            WHERE id = ?
          `)
          .run(
            r.name,
            r.code,
            r.capacity,
            r.is_general ? 1 : 0,
            r.floor,
            r.building,
            JSON.stringify(r.facilities),
            r.status,
            r.notes || '',
            r.id
          );
      },
      deleteRoom: (id) => {
        sqlite.prepare('DELETE FROM rooms WHERE id = ?').run(id);
      },
      getAllEvents: () =>
        sqlite
          .prepare('SELECT * FROM events ORDER BY tanggal ASC, jam_mulai ASC')
          .all()
          .map(mapEventRecord),
      getEventById: (id) => {
        const row = sqlite.prepare('SELECT * FROM events WHERE id = ?').get(id);
        return row ? mapEventRecord(row) : null;
      },
      insertEvent: (ev) => {
        sqlite
          .prepare(`
            INSERT INTO events (id, nama_event, tanggal, jam_mulai, jam_selesai, jumlah_peserta, pic, nomor_hp_pic, ruangan_ids, status, catatan, created_at, updated_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            ev.id,
            ev.nama_event,
            ev.tanggal,
            ev.jam_mulai,
            ev.jam_selesai,
            ev.jumlah_peserta,
            ev.pic,
            ev.nomor_hp_pic,
            JSON.stringify(ev.ruangan_ids),
            ev.status,
            ev.catatan,
            ev.created_at,
            ev.updated_at,
            ev.created_by
          );
      },
      updateEvent: (ev) => {
        sqlite
          .prepare(`
            UPDATE events
            SET nama_event = ?, tanggal = ?, jam_mulai = ?, jam_selesai = ?, jumlah_peserta = ?, pic = ?, nomor_hp_pic = ?, ruangan_ids = ?, status = ?, catatan = ?, updated_at = ?
            WHERE id = ?
          `)
          .run(
            ev.nama_event,
            ev.tanggal,
            ev.jam_mulai,
            ev.jam_selesai,
            ev.jumlah_peserta,
            ev.pic,
            ev.nomor_hp_pic,
            JSON.stringify(ev.ruangan_ids),
            ev.status,
            ev.catatan,
            ev.updated_at,
            ev.id
          );
      },
      deleteEvent: (id) => {
        sqlite.prepare('DELETE FROM events WHERE id = ?').run(id);
      },
      getAllUsers: () =>
        sqlite.prepare('SELECT * FROM users ORDER BY name ASC').all().map(mapUserRecord),
      findUserById: (id) => {
        const row = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(id);
        return row ? mapUserRecord(row) : null;
      },
      findUserByEmailOrUsername: (identifier) => {
        const rawLower = String(identifier || '').trim().toLowerCase();
        const norm = normalizeLoginEmail(rawLower);
        if (!rawLower) return null;
        const row = sqlite
          .prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(email) = ? LIMIT 1')
          .get(norm, rawLower);
        return row ? mapUserRecord(row) : null;
      },
      insertUser: (u) => {
        sqlite
          .prepare(`
            INSERT INTO users (id, name, email, role, department, phone, created_at, password_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            u.id,
            u.name,
            u.email,
            u.role,
            u.department,
            u.phone || '',
            u.created_at,
            u.password_hash!
          );
      },
      updateUser: (u) => {
        sqlite
          .prepare(`
            UPDATE users
            SET name = ?, email = ?, role = ?, department = ?, phone = ?, password_hash = ?
            WHERE id = ?
          `)
          .run(
            u.name,
            u.email,
            u.role,
            u.department,
            u.phone || '',
            u.password_hash!,
            u.id
          );
      },
      deleteUser: (id) => {
        sqlite.prepare('DELETE FROM users WHERE id = ?').run(id);
      },
      getAuditLogs: () =>
        sqlite
          .prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500')
          .all()
          .map(mapAuditRecord),
      insertAuditLog: insertAudit,
      getSettings: () => {
        const row = sqlite.prepare('SELECT * FROM system_settings WHERE id = 1').get()!;
        return {
          app_name: String(row.app_name),
          campus_name: String(row.campus_name),
          campus_address: String(row.campus_address),
          campus_phone: String(row.campus_phone),
          campus_website: String(row.campus_website),
          mode: String(row.mode),
          timezone: String(row.timezone),
          updated_at: String(row.updated_at)
        };
      },
      resetRoomsAndEvents: (actor) => {
        sqlite.exec('BEGIN');
        try {
          sqlite.exec('DELETE FROM rooms');
          sqlite.exec('DELETE FROM events');
          seedRoomsAndEventsSql(INITIAL_ROOMS, INITIAL_EVENTS);
          insertAudit({
            user_name: actor.name,
            user_role: actor.role,
            action: 'PENGATURAN',
            target_type: 'Sistem',
            target_id: 'sys-reset',
            target_name: 'Database Reset',
            details: 'Melakukan reset data ruangan dan event contoh awal Universitas STEKOM'
          });
          sqlite.exec('COMMIT');
        } catch (err) {
          sqlite.exec('ROLLBACK');
          throw err;
        }
      }
    };
    } catch (sqliteErr) {
      console.warn('node:sqlite unavailable, falling back to JSON/memory database:', sqliteErr);
    }
  }

  // Fallback JSON + Memory store (also used on Vercel serverless when KV env vars are not set)
  let memDb: JsonDatabaseSchema = {
    rooms: legacyData?.rooms?.length ? legacyData.rooms.map((r) => mapRoomRecord(r as unknown as Record<string, unknown>)) : [...INITIAL_ROOMS],
    events: legacyData?.events ? legacyData.events.map((e) => mapEventRecord(e as unknown as Record<string, unknown>)) : [...INITIAL_EVENTS],
    users: (legacyData?.users?.length ? legacyData.users : INITIAL_USERS).map((u) => ({
      ...u,
      email: normalizeLoginEmail(u.email),
      password_hash:
        u.password_hash && u.password_hash.includes(':')
          ? u.password_hash
          : hashPassword(getDefaultPasswordForEmail(u.email))
    })),
    audit_logs: legacyData?.audit_logs?.length ? [...legacyData.audit_logs] : [...INITIAL_AUDIT_LOGS],
    system_settings: {
      app_name: legacyData?.system_settings?.app_name || 'STEKOM CAMPUS EVENT MANAGEMENT',
      campus_name: legacyData?.system_settings?.campus_name || 'Universitas STEKOM',
      campus_address: legacyData?.system_settings?.campus_address || 'Jl. Majapahit No. 605, Pedurungan Kidul, Kec. Pedurungan, Kota Semarang, Jawa Tengah 50192',
      campus_phone: legacyData?.system_settings?.campus_phone || '(024) 6723456 / 0812-3456-7890',
      campus_website: legacyData?.system_settings?.campus_website || 'https://stekom.ac.id',
      mode: isEphemeralServerless ? 'serverless-ephemeral' : 'json',
      timezone: legacyData?.system_settings?.timezone || 'Asia/Jakarta (WIB)',
      updated_at: new Date().toISOString()
    }
  };

  const persistJson = () => {
    try {
      fs.writeFileSync(JSON_PATH, JSON.stringify(memDb, null, 2), 'utf-8');
    } catch {
      // keep in memory if read-only
    }
  };
  persistJson();

  return {
    engineLabel: isEphemeralServerless
      ? 'Serverless Browser-Synced Storage (Vercel)'
      : 'JSON Server Database',
    storagePath: JSON_PATH,
    mode: isEphemeralServerless ? 'serverless-ephemeral' : 'json',
    persistentServerStorage: !isEphemeralServerless,
    getAllRooms: () => [...memDb.rooms].sort((a, b) => a.name.localeCompare(b.name)),
    getRoomById: (id) => memDb.rooms.find((r) => r.id === id) || null,
    insertRoom: (r) => {
      memDb.rooms.push(r);
      persistJson();
    },
    updateRoom: (r) => {
      const idx = memDb.rooms.findIndex((item) => item.id === r.id);
      if (idx >= 0) memDb.rooms[idx] = r;
      persistJson();
    },
    deleteRoom: (id) => {
      memDb.rooms = memDb.rooms.filter((r) => r.id !== id);
      persistJson();
    },
    getAllEvents: () =>
      [...memDb.events].sort((a, b) => `${a.tanggal} ${a.jam_mulai}`.localeCompare(`${b.tanggal} ${b.jam_mulai}`)),
    getEventById: (id) => memDb.events.find((e) => e.id === id) || null,
    insertEvent: (ev) => {
      memDb.events.push(ev);
      persistJson();
    },
    updateEvent: (ev) => {
      const idx = memDb.events.findIndex((item) => item.id === ev.id);
      if (idx >= 0) memDb.events[idx] = ev;
      persistJson();
    },
    deleteEvent: (id) => {
      memDb.events = memDb.events.filter((e) => e.id !== id);
      persistJson();
    },
    getAllUsers: () => [...memDb.users].sort((a, b) => a.name.localeCompare(b.name)),
    findUserById: (id) => memDb.users.find((u) => u.id === id) || null,
    findUserByEmailOrUsername: (identifier) => {
      const rawLower = String(identifier || '').trim().toLowerCase();
      const norm = normalizeLoginEmail(rawLower);
      return memDb.users.find((u) => u.email.toLowerCase() === norm || u.email.toLowerCase() === rawLower) || null;
    },
    insertUser: (u) => {
      memDb.users.push(u);
      persistJson();
    },
    updateUser: (u) => {
      const idx = memDb.users.findIndex((item) => item.id === u.id);
      if (idx >= 0) memDb.users[idx] = u;
      persistJson();
    },
    deleteUser: (id) => {
      memDb.users = memDb.users.filter((u) => u.id !== id);
      persistJson();
    },
    getAuditLogs: () => [...memDb.audit_logs].slice(0, 500),
    insertAuditLog: (entry) => {
      memDb.audit_logs.unshift({
        id: entry.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        user_name: entry.user_name,
        user_role: entry.user_role,
        action: entry.action,
        target_type: entry.target_type,
        target_id: entry.target_id,
        target_name: entry.target_name,
        details: entry.details,
        timestamp: entry.timestamp || new Date().toISOString()
      });
      persistJson();
    },
    getSettings: () => memDb.system_settings,
    resetRoomsAndEvents: (actor) => {
      memDb.rooms = [...INITIAL_ROOMS];
      memDb.events = [...INITIAL_EVENTS];
      memDb.audit_logs.unshift({
        id: `log-${Date.now()}`,
        user_name: actor.name,
        user_role: actor.role,
        action: 'PENGATURAN',
        target_type: 'Sistem',
        target_id: 'sys-reset',
        target_name: 'Database Reset',
        details: 'Melakukan reset data ruangan dan event contoh awal Universitas STEKOM',
        timestamp: new Date().toISOString()
      });
      persistJson();
    }
  };
}

function checkScheduleConflicts(
  targetEvent: {
    id?: string;
    tanggal: string;
    jam_mulai: string;
    jam_selesai: string;
    ruangan_ids: string[];
    status?: string;
  },
  existingEvents: DbEvent[],
  rooms: DbRoom[]
) {
  if (targetEvent.status === 'Dibatalkan') {
    return { hasConflict: false, conflicts: [] };
  }

  const conflicts: Array<{
    conflictingEvent: DbEvent;
    conflictingRoomIds: string[];
    conflictingRoomNames: string[];
    overlapWindow: string;
    reason: string;
  }> = [];

  const targetStart = targetEvent.jam_mulai;
  const targetEnd = targetEvent.jam_selesai;

  for (const event of existingEvents) {
    if (targetEvent.id && event.id === targetEvent.id) continue;
    if (event.status === 'Dibatalkan') continue;
    if (event.tanggal !== targetEvent.tanggal) continue;

    const isTimeOverlap = targetStart < event.jam_selesai && targetEnd > event.jam_mulai;
    if (!isTimeOverlap) continue;

    const sharedRoomIds = (targetEvent.ruangan_ids || []).filter((rId) =>
      (event.ruangan_ids || []).includes(rId)
    );

    if (sharedRoomIds.length > 0) {
      const roomNames = sharedRoomIds.map((rId) => {
        const found = rooms.find((r) => r.id === rId);
        return found ? found.name : rId;
      });

      const maxStart = targetStart > event.jam_mulai ? targetStart : event.jam_mulai;
      const minEnd = targetEnd < event.jam_selesai ? targetEnd : event.jam_selesai;

      conflicts.push({
        conflictingEvent: event,
        conflictingRoomIds: sharedRoomIds,
        conflictingRoomNames: roomNames,
        overlapWindow: `${maxStart} - ${minEnd} WIB`,
        reason: `Bentrok di ruangan [${roomNames.join(', ')}] pada jam ${event.jam_mulai} - ${event.jam_selesai} (Irisan: ${maxStart} - ${minEnd}) dengan event "${event.nama_event}" (${event.status})`
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

interface AuthenticatedRequest extends Request {
  authUser?: DbUser;
}

export async function createApiApp(): Promise<Express> {
  const store = await createStorageAdapter();
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'stekom-campus-event', timestamp: new Date().toISOString() });
  });

  const wrap = (
    fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<unknown> | unknown
  ) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch((err) => {
        console.error('API route error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: err?.message || 'Terjadi kesalahan internal server.' });
        }
      });
    };
  };

  const requireAuth = wrap(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' });
    }
    const token = authHeader.slice(7).trim();
    const payload = verifyAuthToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Sesi login tidak valid atau telah berakhir. Silakan login kembali.' });
    }
    const user = await store.findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'Akun pengguna tidak ditemukan atau telah dihapus.' });
    }
    req.authUser = user;
    next();
  });

  const requireRoles = (...allowedRoles: UserRole[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.authUser) {
        return res.status(401).json({ error: 'Autentikasi diperlukan.' });
      }
      if (!allowedRoles.includes(req.authUser.role)) {
        return res.status(403).json({
          error: `Akses ditolak. Peran "${req.authUser.role}" tidak memiliki izin untuk tindakan ini.`
        });
      }
      next();
    };
  };

  app.get('/api/status', wrap(async (_req: Request, res: Response) => {
    const [rooms, events, users, settings] = await Promise.all([
      store.getAllRooms(),
      store.getAllEvents(),
      store.getAllUsers(),
      store.getSettings()
    ]);

    res.json({
      status: 'online',
      appName: settings.app_name,
      campus: settings.campus_name,
      persistence: store.engineLabel,
      persistentServerStorage: store.persistentServerStorage,
      dbFilePath: store.storagePath,
      eventsCount: events.length,
      roomsCount: rooms.length,
      usersCount: users.length,
      mode: store.mode || settings.mode,
      timezone: settings.timezone,
      timestamp: new Date().toISOString()
    });
  }));

  app.get('/api/seed-defaults', (_req: Request, res: Response) => {
    res.json({
      rooms: INITIAL_ROOMS,
      events: INITIAL_EVENTS,
      users: INITIAL_USERS.map(sanitizeUser),
      audit_logs: INITIAL_AUDIT_LOGS
    });
  });

  app.post('/api/auth/login', wrap(async (req: Request, res: Response) => {
    const identifier = String(req.body?.email || req.body?.identifier || '').trim();
    const password = String(req.body?.password || '');

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/username dan kata sandi wajib diisi.' });
    }

    const user = await store.findUserByEmailOrUsername(identifier);
    const passwordMatches =
      user &&
      (verifyPassword(password, user.password_hash) ||
        (password !== password.trim() && verifyPassword(password.trim(), user.password_hash)));
    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Email/username atau kata sandi salah. Silakan periksa kembali.' });
    }

    const token = createAuthToken(user);

    await store.insertAuditLog({
      user_name: user.name,
      user_role: user.role,
      action: 'LOGIN',
      target_type: 'Sistem',
      target_id: user.id,
      target_name: 'Autentikasi Pengguna',
      details: `${user.name} (${user.email}) masuk ke sistem sebagai ${user.role}`
    });

    res.json({
      token,
      user: sanitizeUser(user)
    });
  }));

  app.post('/api/auth/logout', requireAuth, wrap(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    await store.insertAuditLog({
      user_name: user.name,
      user_role: user.role,
      action: 'LOGOUT',
      target_type: 'Sistem',
      target_id: user.id,
      target_name: 'Autentikasi Pengguna',
      details: `${user.name} (${user.email}) keluar (logout) dari sistem`
    });
    res.json({ success: true });
  }));

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json(sanitizeUser(req.authUser!));
  });

  app.post('/api/auth/change-password', requireAuth, wrap(async (req: AuthenticatedRequest, res: Response) => {
    const authUser = req.authUser!;
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Kata sandi saat ini dan kata sandi baru wajib diisi.' });
    }
    if (newPassword !== newPassword.trim()) {
      return res.status(400).json({ error: 'Kata sandi baru tidak boleh diawali atau diakhiri spasi.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Kata sandi baru minimal harus 6 karakter.' });
    }
    if (!verifyPassword(currentPassword, authUser.password_hash)) {
      return res.status(400).json({ error: 'Kata sandi saat ini tidak sesuai.' });
    }

    await store.updateUser({
      ...authUser,
      password_hash: hashPassword(newPassword)
    });

    await store.insertAuditLog({
      user_name: authUser.name,
      user_role: authUser.role,
      action: 'UBAH',
      target_type: 'Pengguna',
      target_id: authUser.id,
      target_name: authUser.name,
      details: `${authUser.name} memperbarui kata sandi akun pribadinya`
    });

    res.json({ success: true, message: 'Kata sandi berhasil diperbarui.' });
  }));

  app.post('/api/reset-data', requireAuth, requireRoles('Administrator'), wrap(async (req: AuthenticatedRequest, res: Response) => {
    await store.resetRoomsAndEvents(req.authUser!);
    res.json({ success: true, message: 'Data contoh berhasil di-reset ulang ke kondisi awal.' });
  }));

  app.get('/api/rooms', requireAuth, wrap(async (_req: AuthenticatedRequest, res: Response) => {
    res.json(await store.getAllRooms());
  }));

  app.post('/api/rooms', requireAuth, requireRoles('Administrator', 'Operator'), wrap(async (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const name = String(req.body?.name || '').trim();
    const code = String(req.body?.code || '').trim();
    if (!name || !code) {
      return res.status(400).json({ error: 'Nama ruangan dan kode ruangan wajib diisi.' });
    }

    const newRoom: DbRoom = {
      id: req.body.id || `room-${Date.now()}`,
      name,
      code,
      capacity: Math.max(0, Number(req.body.capacity) || 0),
      is_general: Boolean(req.body.is_general),
      floor: String(req.body.floor || 'Lantai 1'),
      building: String(req.body.building || 'Gedung Pusat STEKOM'),
      facilities: Array.isArray(req.body.facilities) ? req.body.facilities.map(String) : [],
      status: req.body.status === 'Pemeliharaan' ? 'Pemeliharaan' : 'Tersedia',
      notes: String(req.body.notes || '')
    };

    await store.insertRoom(newRoom);
    await store.insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'TAMBAH',
      target_type: 'Ruangan',
      target_id: newRoom.id,
      target_name: newRoom.name,
      details: `Menambahkan ruangan baru ${newRoom.name} (${newRoom.code}), kapasitas ${newRoom.capacity}`
    });

    res.status(201).json(newRoom);
  }));

  app.put('/api/rooms/:id', requireAuth, requireRoles('Administrator', 'Operator'), wrap(async (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const prevRoom = await store.getRoomById(req.params.id);
    if (!prevRoom) {
      return res.status(404).json({ error: 'Ruangan tidak ditemukan' });
    }

    const updatedRoom: DbRoom = {
      id: prevRoom.id,
      name: req.body.name !== undefined ? String(req.body.name).trim() : prevRoom.name,
      code: req.body.code !== undefined ? String(req.body.code).trim() : prevRoom.code,
      capacity: req.body.capacity !== undefined ? Math.max(0, Number(req.body.capacity) || 0) : prevRoom.capacity,
      is_general: req.body.is_general !== undefined ? Boolean(req.body.is_general) : prevRoom.is_general,
      floor: req.body.floor !== undefined ? String(req.body.floor) : prevRoom.floor,
      building: req.body.building !== undefined ? String(req.body.building) : prevRoom.building,
      facilities: Array.isArray(req.body.facilities) ? req.body.facilities.map(String) : prevRoom.facilities,
      status: req.body.status !== undefined ? (req.body.status === 'Pemeliharaan' ? 'Pemeliharaan' : 'Tersedia') : prevRoom.status,
      notes: req.body.notes !== undefined ? String(req.body.notes) : prevRoom.notes || ''
    };

    await store.updateRoom(updatedRoom);
    await store.insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'UBAH',
      target_type: 'Ruangan',
      target_id: updatedRoom.id,
      target_name: updatedRoom.name,
      details: `Mengubah data ruangan ${updatedRoom.name}: kapasitas ${updatedRoom.capacity}, status ${updatedRoom.status}`
    });

    res.json(updatedRoom);
  }));

  app.delete('/api/rooms/:id', requireAuth, requireRoles('Administrator'), wrap(async (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const targetRoom = await store.getRoomById(req.params.id);
    if (!targetRoom) {
      return res.status(404).json({ error: 'Ruangan tidak ditemukan' });
    }

    const events = await store.getAllEvents();
    const isUsed = events.some(
      (e) => e.status !== 'Dibatalkan' && (e.ruangan_ids || []).includes(req.params.id)
    );
    if (isUsed && req.query.force !== 'true') {
      return res.status(400).json({
        error: 'Ruangan masih terdaftar dalam jadwal event aktif. Batalkan atau ubah event terlebih dahulu.'
      });
    }

    await store.deleteRoom(req.params.id);
    await store.insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'HAPUS',
      target_type: 'Ruangan',
      target_id: targetRoom.id,
      target_name: targetRoom.name,
      details: `Menghapus ruangan ${targetRoom.name} (${targetRoom.code})`
    });

    res.json({ success: true, deletedRoom: targetRoom });
  }));

  app.get('/api/events', requireAuth, wrap(async (req: AuthenticatedRequest, res: Response) => {
    let events = await store.getAllEvents();
    const { month, year, status, roomId, search, pic } = req.query;

    if (month && month !== 'all') {
      events = events.filter((e) => e.tanggal.split('-')[1] === String(month).padStart(2, '0'));
    }
    if (year && year !== 'all') {
      events = events.filter((e) => e.tanggal.split('-')[0] === String(year));
    }
    if (status && status !== 'all') {
      events = events.filter((e) => e.status === status);
    }
    if (roomId && roomId !== 'all') {
      events = events.filter((e) => (e.ruangan_ids || []).includes(String(roomId)));
    }
    if (pic && typeof pic === 'string' && pic.trim() !== '') {
      const q = pic.toLowerCase();
      events = events.filter((e) => e.pic.toLowerCase().includes(q));
    }
    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase();
      events = events.filter(
        (e) =>
          e.nama_event.toLowerCase().includes(q) ||
          e.pic.toLowerCase().includes(q) ||
          e.catatan.toLowerCase().includes(q)
      );
    }

    res.json(events);
  }));

  app.post('/api/events/check-conflict', requireAuth, wrap(async (req: AuthenticatedRequest, res: Response) => {
    const { id, tanggal, jam_mulai, jam_selesai, ruangan_ids, status } = req.body;
    if (!tanggal || !jam_mulai || !jam_selesai || !ruangan_ids || !ruangan_ids.length) {
      return res.json({ hasConflict: false, conflicts: [] });
    }
    const [events, rooms] = await Promise.all([store.getAllEvents(), store.getAllRooms()]);
    const result = checkScheduleConflicts(
      { id, tanggal, jam_mulai, jam_selesai, ruangan_ids, status },
      events,
      rooms
    );
    res.json(result);
  }));

  app.post('/api/events', requireAuth, requireRoles('Administrator', 'Operator'), wrap(async (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
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
    } = req.body;

    if (!nama_event || !tanggal || !jam_mulai || !jam_selesai || !pic || !nomor_hp_pic) {
      return res.status(400).json({ error: 'Semua field wajib diisi lengkap.' });
    }
    if (!ruangan_ids || !Array.isArray(ruangan_ids) || ruangan_ids.length === 0) {
      return res.status(400).json({ error: 'Pilih minimal satu ruangan untuk event ini.' });
    }

    const participants = Number(jumlah_peserta);
    if (isNaN(participants) || participants <= 0) {
      return res.status(400).json({ error: 'Jumlah peserta harus berupa bilangan bulat positif (> 0).' });
    }
    if (jam_selesai <= jam_mulai) {
      return res.status(400).json({ error: 'Jam selesai harus lebih akhir daripada jam mulai.' });
    }

    const finalStatus: EventStatus =
      status === 'Scheduled' || status === 'Dibatalkan' ? status : 'Menunggu Konfirmasi';

    const [allEvents, allRooms] = await Promise.all([store.getAllEvents(), store.getAllRooms()]);
    const conflictResult = checkScheduleConflicts(
      { tanggal, jam_mulai, jam_selesai, ruangan_ids, status: finalStatus },
      allEvents,
      allRooms
    );

    if (finalStatus === 'Scheduled' && conflictResult.hasConflict) {
      return res.status(409).json({
        error: `Jadwal bentrok tidak dapat di-set ke Scheduled! ${conflictResult.conflicts[0].reason}`,
        conflictDetails: conflictResult
      });
    }

    const now = new Date().toISOString();
    const newEvent: DbEvent = {
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

    await store.insertEvent(newEvent);
    await store.insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'TAMBAH',
      target_type: 'Event',
      target_id: newEvent.id,
      target_name: newEvent.nama_event,
      details: `Membuat event "${newEvent.nama_event}" pada ${newEvent.tanggal} (${newEvent.jam_mulai} - ${newEvent.jam_selesai} WIB), status: ${newEvent.status}`
    });

    res.status(201).json(newEvent);
  }));

  app.put('/api/events/:id', requireAuth, requireRoles('Administrator', 'Operator'), wrap(async (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const existingEvent = await store.getEventById(req.params.id);
    if (!existingEvent) {
      return res.status(404).json({ error: 'Event tidak ditemukan' });
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
    } = req.body;

    const updatedTanggal = tanggal || existingEvent.tanggal;
    const updatedStart = jam_mulai || existingEvent.jam_mulai;
    const updatedEnd = jam_selesai || existingEvent.jam_selesai;
    const updatedRooms: string[] = Array.isArray(ruangan_ids) ? ruangan_ids.map(String) : existingEvent.ruangan_ids;
    const updatedStatus: EventStatus =
      status === 'Scheduled' || status === 'Dibatalkan' || status === 'Menunggu Konfirmasi'
        ? status
        : existingEvent.status;

    if (updatedEnd <= updatedStart) {
      return res.status(400).json({ error: 'Jam selesai harus lebih akhir daripada jam mulai.' });
    }
    if (jumlah_peserta !== undefined && Number(jumlah_peserta) <= 0) {
      return res.status(400).json({ error: 'Jumlah peserta harus berupa bilangan positif (> 0).' });
    }

    const [allEvents, allRooms] = await Promise.all([store.getAllEvents(), store.getAllRooms()]);
    const conflictResult = checkScheduleConflicts(
      {
        id: existingEvent.id,
        tanggal: updatedTanggal,
        jam_mulai: updatedStart,
        jam_selesai: updatedEnd,
        ruangan_ids: updatedRooms,
        status: updatedStatus
      },
      allEvents,
      allRooms
    );

    if (updatedStatus === 'Scheduled' && conflictResult.hasConflict) {
      return res.status(409).json({
        error: `Jadwal bentrok tidak dapat di-set ke Scheduled! ${conflictResult.conflicts[0].reason}`,
        conflictDetails: conflictResult
      });
    }

    const updatedEvent: DbEvent = {
      ...existingEvent,
      nama_event: nama_event !== undefined ? String(nama_event).trim() : existingEvent.nama_event,
      tanggal: updatedTanggal,
      jam_mulai: updatedStart,
      jam_selesai: updatedEnd,
      jumlah_peserta: jumlah_peserta !== undefined ? Number(jumlah_peserta) : existingEvent.jumlah_peserta,
      pic: pic !== undefined ? String(pic).trim() : existingEvent.pic,
      nomor_hp_pic: nomor_hp_pic !== undefined ? String(nomor_hp_pic).trim() : existingEvent.nomor_hp_pic,
      ruangan_ids: updatedRooms,
      status: updatedStatus,
      catatan: catatan !== undefined ? String(catatan).trim() : existingEvent.catatan,
      updated_at: new Date().toISOString()
    };

    await store.updateEvent(updatedEvent);

    let auditAction: 'UBAH' | 'KONFIRMASI' | 'BATALKAN' = 'UBAH';
    let auditDetail = `Memperbarui event "${updatedEvent.nama_event}"`;
    if (existingEvent.status !== updatedStatus) {
      if (updatedStatus === 'Scheduled') {
        auditAction = 'KONFIRMASI';
        auditDetail = `Menetapkan event "${updatedEvent.nama_event}" menjadi Scheduled (${existingEvent.status} -> Scheduled)`;
      } else if (updatedStatus === 'Dibatalkan') {
        auditAction = 'BATALKAN';
        auditDetail = `Membatalkan event "${updatedEvent.nama_event}" (${existingEvent.status} -> Dibatalkan)`;
      } else {
        auditDetail = `Mengubah status event "${updatedEvent.nama_event}" menjadi ${updatedStatus}`;
      }
    }

    await store.insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: auditAction,
      target_type: 'Event',
      target_id: updatedEvent.id,
      target_name: updatedEvent.nama_event,
      details: auditDetail
    });

    res.json(updatedEvent);
  }));

  app.delete('/api/events/:id', requireAuth, requireRoles('Administrator', 'Operator'), wrap(async (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const deleted = await store.getEventById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Event tidak ditemukan' });
    }

    await store.deleteEvent(req.params.id);
    await store.insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'HAPUS',
      target_type: 'Event',
      target_id: deleted.id,
      target_name: deleted.nama_event,
      details: `Menghapus event "${deleted.nama_event}" (Tanggal: ${deleted.tanggal})`
    });

    res.json({ success: true, deletedEvent: deleted });
  }));

  app.get('/api/users', requireAuth, requireRoles('Administrator'), wrap(async (_req: AuthenticatedRequest, res: Response) => {
    const users = await store.getAllUsers();
    res.json(users.map(sanitizeUser));
  }));

  app.post('/api/users', requireAuth, requireRoles('Administrator'), wrap(async (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const name = String(req.body?.name || '').trim();
    const email = normalizeLoginEmail(String(req.body?.email || ''));
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    const hasPasswordInput = rawPassword.trim().length > 0;

    if (!name || !email) {
      return res.status(400).json({ error: 'Nama dan email/username pengguna wajib diisi.' });
    }
    if (hasPasswordInput && rawPassword !== rawPassword.trim()) {
      return res.status(400).json({ error: 'Kata sandi tidak boleh diawali atau diakhiri spasi.' });
    }
    if (hasPasswordInput && rawPassword.length < 6) {
      return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
    }

    const password = hasPasswordInput ? rawPassword : 'stekom123';
    const validRoles: UserRole[] = ['Administrator', 'Operator', 'Viewer'];
    const requestedRole = String(req.body?.role || 'Operator') as UserRole;
    const role: UserRole = validRoles.includes(requestedRole) ? requestedRole : 'Operator';

    if (await store.findUserByEmailOrUsername(email)) {
      return res.status(409).json({ error: `Email "${email}" sudah terdaftar dalam sistem.` });
    }

    const newUser: DbUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      email,
      role,
      department: String(req.body?.department || 'Universitas STEKOM').trim(),
      phone: String(req.body?.phone || '').trim(),
      created_at: new Date().toISOString(),
      password_hash: hashPassword(password)
    };

    await store.insertUser(newUser);
    await store.insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'TAMBAH',
      target_type: 'Pengguna',
      target_id: newUser.id,
      target_name: newUser.name,
      details: `Menambahkan pengguna baru: ${newUser.name} (${newUser.email}) sebagai ${newUser.role}`
    });

    res.status(201).json(sanitizeUser(newUser));
  }));

  app.put('/api/users/:id', requireAuth, requireRoles('Administrator'), wrap(async (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const prevUser = await store.findUserById(req.params.id);
    if (!prevUser) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    const { name, email, role, department, phone, new_password } = req.body;

    let normalizedEmail = prevUser.email;
    if (email !== undefined) {
      normalizedEmail = normalizeLoginEmail(String(email));
      if (!normalizedEmail) {
        return res.status(400).json({ error: 'Email pengguna tidak boleh kosong.' });
      }
      const existingOwner = await store.findUserByEmailOrUsername(normalizedEmail);
      if (existingOwner && existingOwner.id !== prevUser.id) {
        return res.status(409).json({ error: `Email "${normalizedEmail}" sudah digunakan pengguna lain.` });
      }
    }

    const validRoles: UserRole[] = ['Administrator', 'Operator', 'Viewer'];
    if (role !== undefined && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Peran pengguna tidak valid.' });
    }

    let updatedHash = prevUser.password_hash!;
    let passwordChanged = false;
    if (new_password !== undefined && String(new_password).trim() !== '') {
      const pw = String(new_password);
      if (pw !== pw.trim()) {
        return res.status(400).json({ error: 'Kata sandi baru tidak boleh diawali atau diakhiri spasi.' });
      }
      if (pw.length < 6) {
        return res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter.' });
      }
      updatedHash = hashPassword(pw);
      passwordChanged = true;
    }

    const updated: DbUser = {
      ...prevUser,
      name: name !== undefined ? String(name).trim() : prevUser.name,
      email: normalizedEmail,
      role: role !== undefined ? (role as UserRole) : prevUser.role,
      department: department !== undefined ? String(department).trim() : prevUser.department,
      phone: phone !== undefined ? String(phone).trim() : prevUser.phone || '',
      password_hash: updatedHash
    };

    await store.updateUser(updated);
    await store.insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'UBAH',
      target_type: 'Pengguna',
      target_id: updated.id,
      target_name: updated.name,
      details: passwordChanged
        ? `Mengubah data / mereset kata sandi pengguna ${updated.name} (Peran: ${updated.role})`
        : `Mengubah data pengguna ${updated.name} (Peran: ${updated.role})`
    });

    res.json(sanitizeUser(updated));
  }));

  app.post('/api/users/:id/reset-password', requireAuth, requireRoles('Administrator'), wrap(async (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const target = await store.findUserById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    const rawPw = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const hasCustom = rawPw.trim().length > 0;
    if (hasCustom && rawPw !== rawPw.trim()) {
      return res.status(400).json({ error: 'Kata sandi baru tidak boleh diawali atau diakhiri spasi.' });
    }
    if (hasCustom && rawPw.length < 6) {
      return res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter.' });
    }

    const finalPassword = hasCustom ? rawPw : 'stekom123';
    await store.updateUser({
      ...target,
      password_hash: hashPassword(finalPassword)
    });

    await store.insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'UBAH',
      target_type: 'Pengguna',
      target_id: target.id,
      target_name: target.name,
      details: `Mereset kata sandi pengguna ${target.name} (${target.email}) secara langsung`
    });

    res.json({ success: true, password: finalPassword });
  }));

  app.delete('/api/users/:id', requireAuth, requireRoles('Administrator'), wrap(async (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    if (req.params.id === actor.id) {
      return res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.' });
    }

    const deleted = await store.findUserById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    await store.deleteUser(req.params.id);
    await store.insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'HAPUS',
      target_type: 'Pengguna',
      target_id: deleted.id,
      target_name: deleted.name,
      details: `Menghapus akses pengguna ${deleted.name} (${deleted.role})`
    });

    res.json({ success: true, deletedUser: sanitizeUser(deleted) });
  }));

  app.get('/api/audit-logs', requireAuth, requireRoles('Administrator', 'Operator'), wrap(async (_req: AuthenticatedRequest, res: Response) => {
    res.json(await store.getAuditLogs());
  }));

  app.get('/api/settings', requireAuth, wrap(async (_req: AuthenticatedRequest, res: Response) => {
    res.json(await store.getSettings());
  }));

  app.get('/api/stats', requireAuth, wrap(async (_req: AuthenticatedRequest, res: Response) => {
    const [events, rooms, users] = await Promise.all([
      store.getAllEvents(),
      store.getAllRooms(),
      store.getAllUsers()
    ]);

    const totalEvents = events.length;
    const scheduledEvents = events.filter((e) => e.status === 'Scheduled').length;
    const pendingEvents = events.filter((e) => e.status === 'Menunggu Konfirmasi').length;
    const cancelledEvents = events.filter((e) => e.status === 'Dibatalkan').length;

    const today = getJakartaTodayDateStr();
    const todayEvents = events.filter((e) => e.tanggal === today);
    const upcomingEvents = events.filter((e) => e.tanggal >= today && e.status !== 'Dibatalkan');

    res.json({
      totalEvents,
      scheduledEvents,
      confirmedEvents: scheduledEvents,
      pendingEvents,
      cancelledEvents,
      todayEventsCount: todayEvents.length,
      upcomingEventsCount: upcomingEvents.length,
      totalRooms: rooms.length,
      totalUsers: users.length
    });
  }));

  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: `Endpoint API ${req.method} ${req.path} tidak ditemukan.` });
  });

  return app;
}
