import crypto from 'crypto';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_SECRET = process.env.AUTH_SECRET || 'stekom-campus-event-mgmt-secret-2026';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const distPath = path.resolve(__dirname, 'dist');
const isProd =
  process.env.NODE_ENV === 'production' ||
  (process.env.npm_lifecycle_event === 'start' && fs.existsSync(distPath));
const PORT = Number(process.env.PORT) || 3000;

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

// Data directory and SQLite path with safe fallback for read-only production filesystems
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
      // ignore
    }
    return fallback;
  }
}

const DATA_DIR = resolveDataDir();
const DB_PATH = path.join(DATA_DIR, 'stekom.db');
const LEGACY_JSON_FILE = path.join(DATA_DIR, 'db.json');

// 21 Initial Rooms specified by Universitas STEKOM
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

// Initialize SQLite database
const sqlite = new DatabaseSync(DB_PATH);
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

function mapRoomRow(row: Record<string, unknown>): DbRoom {
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

function mapEventRow(row: Record<string, unknown>): DbEvent {
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

function mapUserRow(row: Record<string, unknown>): DbUser {
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

function mapAuditRow(row: Record<string, unknown>): DbAuditLog {
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

function insertAuditLog(entry: Omit<DbAuditLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) {
  const stmt = sqlite.prepare(`
    INSERT INTO audit_logs (id, user_name, user_role, action, target_type, target_id, target_name, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
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
}

function seedRoomsAndEvents(rooms: DbRoom[], events: DbEvent[], logs?: DbAuditLog[]) {
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
    const rawStatus = String(ev.status || 'Menunggu Konfirmasi');
    const normalizedStatus: EventStatus =
      rawStatus === 'Dikonfirmasi' || rawStatus === 'Scheduled'
        ? 'Scheduled'
        : rawStatus === 'Dibatalkan'
        ? 'Dibatalkan'
        : 'Menunggu Konfirmasi';

    insertEvent.run(
      ev.id,
      ev.nama_event,
      ev.tanggal,
      ev.jam_mulai,
      ev.jam_selesai,
      Number(ev.jumlah_peserta) || 1,
      ev.pic,
      ev.nomor_hp_pic,
      JSON.stringify(Array.isArray(ev.ruangan_ids) ? ev.ruangan_ids : []),
      normalizedStatus,
      ev.catatan || '',
      ev.created_at || new Date().toISOString(),
      ev.updated_at || new Date().toISOString(),
      ev.created_by || 'Sistem'
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
}

function seedUsers(users: DbUser[]) {
  const insertUser = sqlite.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, role, department, phone, created_at, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const u of users) {
    const normalizedEmail = normalizeLoginEmail(u.email);
    const pwHash =
      u.password_hash && u.password_hash.includes(':')
        ? u.password_hash
        : hashPassword(getDefaultPasswordForEmail(normalizedEmail));
    insertUser.run(
      u.id,
      u.name,
      normalizedEmail,
      u.role,
      u.department || 'Universitas STEKOM',
      u.phone || '',
      u.created_at || new Date().toISOString(),
      pwHash
    );
  }
}

function ensureDatabaseInitialized() {
  const roomCountRow = sqlite.prepare('SELECT COUNT(*) as cnt FROM rooms').get() as { cnt: number };
  const userCountRow = sqlite.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  const settingsRow = sqlite.prepare('SELECT id FROM system_settings WHERE id = 1').get();

  let legacyData: {
    rooms?: DbRoom[];
    events?: DbEvent[];
    users?: DbUser[];
    audit_logs?: DbAuditLog[];
    system_settings?: Partial<DbSettings>;
  } | null = null;

  if ((roomCountRow.cnt === 0 || userCountRow.cnt === 0) && fs.existsSync(LEGACY_JSON_FILE)) {
    try {
      legacyData = JSON.parse(fs.readFileSync(LEGACY_JSON_FILE, 'utf-8'));
    } catch {
      legacyData = null;
    }
  }

  sqlite.exec('BEGIN');
  try {
    if (roomCountRow.cnt === 0) {
      const roomsToSeed =
        legacyData?.rooms && Array.isArray(legacyData.rooms) && legacyData.rooms.length > 0
          ? legacyData.rooms
          : INITIAL_ROOMS;
      const eventsToSeed =
        legacyData?.events && Array.isArray(legacyData.events)
          ? legacyData.events
          : INITIAL_EVENTS;
      const logsToSeed =
        legacyData?.audit_logs && Array.isArray(legacyData.audit_logs)
          ? legacyData.audit_logs
          : INITIAL_AUDIT_LOGS;
      seedRoomsAndEvents(roomsToSeed, eventsToSeed, logsToSeed);
    }

    if (userCountRow.cnt === 0) {
      const usersToSeed =
        legacyData?.users && Array.isArray(legacyData.users) && legacyData.users.length > 0
          ? legacyData.users
          : INITIAL_USERS;
      seedUsers(usersToSeed);
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
}

function getAllRooms(): DbRoom[] {
  const rows = sqlite.prepare('SELECT * FROM rooms ORDER BY name ASC').all() as Array<Record<string, unknown>>;
  return rows.map(mapRoomRow);
}

function getAllEvents(): DbEvent[] {
  const rows = sqlite
    .prepare('SELECT * FROM events ORDER BY tanggal ASC, jam_mulai ASC')
    .all() as Array<Record<string, unknown>>;
  return rows.map(mapEventRow);
}

function getAllUsers(): DbUser[] {
  const rows = sqlite.prepare('SELECT * FROM users ORDER BY name ASC').all() as Array<Record<string, unknown>>;
  return rows.map(mapUserRow);
}

function findUserById(id: string): DbUser | null {
  const row = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? mapUserRow(row) : null;
}

function findUserByEmailOrUsername(identifier: string): DbUser | null {
  const rawLower = String(identifier || '').trim().toLowerCase();
  const normalized = normalizeLoginEmail(rawLower);
  if (!rawLower) return null;

  const row = sqlite
    .prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(email) = ? LIMIT 1')
    .get(normalized, rawLower) as Record<string, unknown> | undefined;

  return row ? mapUserRow(row) : null;
}

function getSettings(): DbSettings {
  const row = sqlite.prepare('SELECT * FROM system_settings WHERE id = 1').get() as Record<string, unknown>;
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
}

interface AuthenticatedRequest extends Request {
  authUser?: DbUser;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' });
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Sesi login tidak valid atau telah berakhir. Silakan login kembali.' });
  }
  const user = findUserById(payload.sub);
  if (!user) {
    return res.status(401).json({ error: 'Akun pengguna tidak ditemukan atau telah dihapus.' });
  }
  req.authUser = user;
  next();
}

function requireRoles(...allowedRoles: UserRole[]) {
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
}

// Conflict Detection Function
// Irisan jam: startA < endB && endA > startB
// Event dibatalkan tidak memblokir ruangan!
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

async function startServer() {
  ensureDatabaseInitialized();

  const app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // Status & System info
  app.get('/api/status', (_req: Request, res: Response) => {
    const roomsCount = (sqlite.prepare('SELECT COUNT(*) as cnt FROM rooms').get() as { cnt: number }).cnt;
    const eventsCount = (sqlite.prepare('SELECT COUNT(*) as cnt FROM events').get() as { cnt: number }).cnt;
    const usersCount = (sqlite.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;
    const settings = getSettings();

    res.json({
      status: 'online',
      appName: settings.app_name,
      campus: settings.campus_name,
      persistence: 'SQLite Database (Server Backend)',
      dbFilePath: DB_PATH,
      eventsCount,
      roomsCount,
      usersCount,
      mode: settings.mode,
      timezone: settings.timezone,
      timestamp: new Date().toISOString()
    });
  });

  // Authentication Endpoints (Local User & Password against SQLite — no external auth provider required)
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const identifier = String(req.body?.email || req.body?.identifier || '').trim();
    const password = String(req.body?.password || '');

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/username dan kata sandi wajib diisi.' });
    }

    const user = findUserByEmailOrUsername(identifier);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Email/username atau kata sandi salah. Silakan periksa kembali.' });
    }

    const token = createAuthToken(user);

    insertAuditLog({
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
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    insertAuditLog({
      user_name: user.name,
      user_role: user.role,
      action: 'LOGOUT',
      target_type: 'Sistem',
      target_id: user.id,
      target_name: 'Autentikasi Pengguna',
      details: `${user.name} (${user.email}) keluar (logout) dari sistem`
    });
    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json(sanitizeUser(req.authUser!));
  });

  app.post('/api/auth/change-password', requireAuth, (req: AuthenticatedRequest, res: Response) => {
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

    sqlite
      .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(hashPassword(newPassword), authUser.id);

    insertAuditLog({
      user_name: authUser.name,
      user_role: authUser.role,
      action: 'UBAH',
      target_type: 'Pengguna',
      target_id: authUser.id,
      target_name: authUser.name,
      details: `${authUser.name} memperbarui kata sandi akun pribadinya`
    });

    res.json({ success: true, message: 'Kata sandi berhasil diperbarui.' });
  });

  // Reset database to initial sample data (Administrator only — keeps existing user accounts intact!)
  app.post('/api/reset-data', requireAuth, requireRoles('Administrator'), (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    sqlite.exec('BEGIN');
    try {
      sqlite.exec('DELETE FROM rooms');
      sqlite.exec('DELETE FROM events');
      seedRoomsAndEvents(INITIAL_ROOMS, INITIAL_EVENTS);
      insertAuditLog({
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
      return res.status(500).json({ error: 'Gagal me-reset database SQLite.' });
    }
    res.json({ success: true, message: 'Data contoh berhasil di-reset ulang ke kondisi awal.' });
  });

  // Rooms CRUD
  app.get('/api/rooms', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json(getAllRooms());
  });

  app.post('/api/rooms', requireAuth, requireRoles('Administrator', 'Operator'), (req: AuthenticatedRequest, res: Response) => {
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

    sqlite
      .prepare(`
        INSERT INTO rooms (id, name, code, capacity, is_general, floor, building, facilities, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        newRoom.id,
        newRoom.name,
        newRoom.code,
        newRoom.capacity,
        newRoom.is_general ? 1 : 0,
        newRoom.floor,
        newRoom.building,
        JSON.stringify(newRoom.facilities),
        newRoom.status,
        newRoom.notes || ''
      );

    insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'TAMBAH',
      target_type: 'Ruangan',
      target_id: newRoom.id,
      target_name: newRoom.name,
      details: `Menambahkan ruangan baru ${newRoom.name} (${newRoom.code}), kapasitas ${newRoom.capacity}`
    });

    res.status(201).json(newRoom);
  });

  app.put('/api/rooms/:id', requireAuth, requireRoles('Administrator', 'Operator'), (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const existingRow = sqlite
      .prepare('SELECT * FROM rooms WHERE id = ?')
      .get(req.params.id) as Record<string, unknown> | undefined;

    if (!existingRow) {
      return res.status(404).json({ error: 'Ruangan tidak ditemukan' });
    }

    const prevRoom = mapRoomRow(existingRow);
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

    sqlite
      .prepare(`
        UPDATE rooms
        SET name = ?, code = ?, capacity = ?, is_general = ?, floor = ?, building = ?, facilities = ?, status = ?, notes = ?
        WHERE id = ?
      `)
      .run(
        updatedRoom.name,
        updatedRoom.code,
        updatedRoom.capacity,
        updatedRoom.is_general ? 1 : 0,
        updatedRoom.floor,
        updatedRoom.building,
        JSON.stringify(updatedRoom.facilities),
        updatedRoom.status,
        updatedRoom.notes || '',
        updatedRoom.id
      );

    insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'UBAH',
      target_type: 'Ruangan',
      target_id: updatedRoom.id,
      target_name: updatedRoom.name,
      details: `Mengubah data ruangan ${updatedRoom.name}: kapasitas ${updatedRoom.capacity}, status ${updatedRoom.status}`
    });

    res.json(updatedRoom);
  });

  app.delete('/api/rooms/:id', requireAuth, requireRoles('Administrator'), (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const existingRow = sqlite
      .prepare('SELECT * FROM rooms WHERE id = ?')
      .get(req.params.id) as Record<string, unknown> | undefined;

    if (!existingRow) {
      return res.status(404).json({ error: 'Ruangan tidak ditemukan' });
    }

    const targetRoom = mapRoomRow(existingRow);
    const events = getAllEvents();
    const isUsed = events.some(
      (e) => e.status !== 'Dibatalkan' && (e.ruangan_ids || []).includes(req.params.id)
    );

    if (isUsed && req.query.force !== 'true') {
      return res.status(400).json({
        error: 'Ruangan masih terdaftar dalam jadwal event aktif. Batalkan atau ubah event terlebih dahulu.'
      });
    }

    sqlite.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);

    insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'HAPUS',
      target_type: 'Ruangan',
      target_id: targetRoom.id,
      target_name: targetRoom.name,
      details: `Menghapus ruangan ${targetRoom.name} (${targetRoom.code})`
    });

    res.json({ success: true, deletedRoom: targetRoom });
  });

  // Events CRUD & Conflict Check
  app.get('/api/events', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    let events = getAllEvents();
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
  });

  app.post('/api/events/check-conflict', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { id, tanggal, jam_mulai, jam_selesai, ruangan_ids, status } = req.body;
    if (!tanggal || !jam_mulai || !jam_selesai || !ruangan_ids || !ruangan_ids.length) {
      return res.json({ hasConflict: false, conflicts: [] });
    }
    const result = checkScheduleConflicts(
      { id, tanggal, jam_mulai, jam_selesai, ruangan_ids, status },
      getAllEvents(),
      getAllRooms()
    );
    res.json(result);
  });

  app.post('/api/events', requireAuth, requireRoles('Administrator', 'Operator'), (req: AuthenticatedRequest, res: Response) => {
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

    const existingEvents = getAllEvents();
    const rooms = getAllRooms();
    const finalStatus: EventStatus =
      status === 'Scheduled' || status === 'Dibatalkan' ? status : 'Menunggu Konfirmasi';

    const conflictResult = checkScheduleConflicts(
      { tanggal, jam_mulai, jam_selesai, ruangan_ids, status: finalStatus },
      existingEvents,
      rooms
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

    sqlite
      .prepare(`
        INSERT INTO events (id, nama_event, tanggal, jam_mulai, jam_selesai, jumlah_peserta, pic, nomor_hp_pic, ruangan_ids, status, catatan, created_at, updated_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        newEvent.id,
        newEvent.nama_event,
        newEvent.tanggal,
        newEvent.jam_mulai,
        newEvent.jam_selesai,
        newEvent.jumlah_peserta,
        newEvent.pic,
        newEvent.nomor_hp_pic,
        JSON.stringify(newEvent.ruangan_ids),
        newEvent.status,
        newEvent.catatan,
        newEvent.created_at,
        newEvent.updated_at,
        newEvent.created_by
      );

    insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'TAMBAH',
      target_type: 'Event',
      target_id: newEvent.id,
      target_name: newEvent.nama_event,
      details: `Membuat event "${newEvent.nama_event}" pada ${newEvent.tanggal} (${newEvent.jam_mulai} - ${newEvent.jam_selesai} WIB), status: ${newEvent.status}`
    });

    res.status(201).json(newEvent);
  });

  app.put('/api/events/:id', requireAuth, requireRoles('Administrator', 'Operator'), (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const existingRow = sqlite
      .prepare('SELECT * FROM events WHERE id = ?')
      .get(req.params.id) as Record<string, unknown> | undefined;

    if (!existingRow) {
      return res.status(404).json({ error: 'Event tidak ditemukan' });
    }

    const existingEvent = mapEventRow(existingRow);
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

    const conflictResult = checkScheduleConflicts(
      {
        id: existingEvent.id,
        tanggal: updatedTanggal,
        jam_mulai: updatedStart,
        jam_selesai: updatedEnd,
        ruangan_ids: updatedRooms,
        status: updatedStatus
      },
      getAllEvents(),
      getAllRooms()
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

    sqlite
      .prepare(`
        UPDATE events
        SET nama_event = ?, tanggal = ?, jam_mulai = ?, jam_selesai = ?, jumlah_peserta = ?, pic = ?, nomor_hp_pic = ?, ruangan_ids = ?, status = ?, catatan = ?, updated_at = ?
        WHERE id = ?
      `)
      .run(
        updatedEvent.nama_event,
        updatedEvent.tanggal,
        updatedEvent.jam_mulai,
        updatedEvent.jam_selesai,
        updatedEvent.jumlah_peserta,
        updatedEvent.pic,
        updatedEvent.nomor_hp_pic,
        JSON.stringify(updatedEvent.ruangan_ids),
        updatedEvent.status,
        updatedEvent.catatan,
        updatedEvent.updated_at,
        updatedEvent.id
      );

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

    insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: auditAction,
      target_type: 'Event',
      target_id: updatedEvent.id,
      target_name: updatedEvent.nama_event,
      details: auditDetail
    });

    res.json(updatedEvent);
  });

  app.delete('/api/events/:id', requireAuth, requireRoles('Administrator', 'Operator'), (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const existingRow = sqlite
      .prepare('SELECT * FROM events WHERE id = ?')
      .get(req.params.id) as Record<string, unknown> | undefined;

    if (!existingRow) {
      return res.status(404).json({ error: 'Event tidak ditemukan' });
    }

    const deleted = mapEventRow(existingRow);
    sqlite.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);

    insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'HAPUS',
      target_type: 'Event',
      target_id: deleted.id,
      target_name: deleted.nama_event,
      details: `Menghapus event "${deleted.nama_event}" (Tanggal: ${deleted.tanggal})`
    });

    res.json({ success: true, deletedEvent: deleted });
  });

  // Users CRUD (Administrator only)
  app.get('/api/users', requireAuth, requireRoles('Administrator'), (_req: AuthenticatedRequest, res: Response) => {
    res.json(getAllUsers().map(sanitizeUser));
  });

  app.post('/api/users', requireAuth, requireRoles('Administrator'), (req: AuthenticatedRequest, res: Response) => {
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

    const existing = findUserByEmailOrUsername(email);
    if (existing) {
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

    sqlite
      .prepare(`
        INSERT INTO users (id, name, email, role, department, phone, created_at, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        newUser.id,
        newUser.name,
        newUser.email,
        newUser.role,
        newUser.department,
        newUser.phone || '',
        newUser.created_at,
        newUser.password_hash!
      );

    insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'TAMBAH',
      target_type: 'Pengguna',
      target_id: newUser.id,
      target_name: newUser.name,
      details: `Menambahkan pengguna baru: ${newUser.name} (${newUser.email}) sebagai ${newUser.role}`
    });

    res.status(201).json(sanitizeUser(newUser));
  });

  app.put('/api/users/:id', requireAuth, requireRoles('Administrator'), (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const prevUser = findUserById(req.params.id);
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
      const duplicate = sqlite
        .prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ? LIMIT 1')
        .get(normalizedEmail, prevUser.id);
      if (duplicate) {
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

    sqlite
      .prepare(`
        UPDATE users
        SET name = ?, email = ?, role = ?, department = ?, phone = ?, password_hash = ?
        WHERE id = ?
      `)
      .run(
        updated.name,
        updated.email,
        updated.role,
        updated.department,
        updated.phone || '',
        updated.password_hash!,
        updated.id
      );

    insertAuditLog({
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
  });

  app.post('/api/users/:id/reset-password', requireAuth, requireRoles('Administrator'), (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const target = findUserById(req.params.id);
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
    sqlite
      .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(hashPassword(finalPassword), target.id);

    insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'UBAH',
      target_type: 'Pengguna',
      target_id: target.id,
      target_name: target.name,
      details: `Mereset kata sandi pengguna ${target.name} (${target.email}) secara langsung`
    });

    res.json({ success: true, password: finalPassword });
  });

  app.delete('/api/users/:id', requireAuth, requireRoles('Administrator'), (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    if (req.params.id === actor.id) {
      return res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.' });
    }

    const deleted = findUserById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    sqlite.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

    insertAuditLog({
      user_name: actor.name,
      user_role: actor.role,
      action: 'HAPUS',
      target_type: 'Pengguna',
      target_id: deleted.id,
      target_name: deleted.name,
      details: `Menghapus akses pengguna ${deleted.name} (${deleted.role})`
    });

    res.json({ success: true, deletedUser: sanitizeUser(deleted) });
  });

  // Audit Logs (Administrator & Operator)
  app.get('/api/audit-logs', requireAuth, requireRoles('Administrator', 'Operator'), (_req: AuthenticatedRequest, res: Response) => {
    const rows = sqlite
      .prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500')
      .all() as Array<Record<string, unknown>>;
    res.json(rows.map(mapAuditRow));
  });

  // System Settings
  app.get('/api/settings', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json(getSettings());
  });

  // Stats calculation
  app.get('/api/stats', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    const events = getAllEvents();
    const rooms = getAllRooms();
    const usersCount = (sqlite.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;

    const totalEvents = events.length;
    const scheduledEvents = events.filter((e) => e.status === 'Scheduled').length;
    const pendingEvents = events.filter((e) => e.status === 'Menunggu Konfirmasi').length;
    const cancelledEvents = events.filter((e) => e.status === 'Dibatalkan').length;

    const today = new Date().toISOString().split('T')[0];
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
      totalUsers: usersCount
    });
  });

  // Fallback JSON 404 for unknown /api routes
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: `Endpoint API ${req.method} ${req.path} tidak ditemukan.` });
  });

  // Setup Vite or Static File Serving
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`STEKOM Campus Event Management server running on http://0.0.0.0:${PORT} (SQLite: ${DB_PATH}, mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
});
