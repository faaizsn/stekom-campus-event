import {
  AuditLog,
  AuthResponse,
  CampusEvent,
  ConflictCheckResult,
  FilterOptions,
  Room,
  User
} from '../types';
import { checkEventConflict } from '../utils/conflictDetector';

const LOCAL_DB_KEY = 'stekom_local_db_v1';
const LOCAL_TOKEN_PREFIX = 'local:';

interface LocalUserRecord extends User {
  password: string;
  syncedToServer?: boolean;
}

const SEED_USER_IDS = new Set(['user-admin', 'user-operator', 'user-viewer']);

function getDefaultPasswordForEmail(email: string): string {
  const normalized = (email || '').trim().toLowerCase();
  if (normalized === 'admin@stekom.ac.id') return 'admin123';
  if (normalized === 'operator@stekom.ac.id') return 'operator123';
  if (normalized === 'viewer@stekom.ac.id') return 'viewer123';
  return 'stekom123';
}

interface LocalDatabase {
  rooms: Room[];
  events: CampusEvent[];
  users: LocalUserRecord[];
  audit_logs: AuditLog[];
  system_settings: {
    app_name: string;
    campus_name: string;
    campus_address: string;
    campus_phone: string;
    campus_website: string;
    mode: 'demo' | 'production_synced';
    firebase_configured: boolean;
    timezone: string;
    updated_at: string;
  };
}

const INITIAL_ROOMS: Room[] = [
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

const INITIAL_USERS: LocalUserRecord[] = [
  {
    id: 'user-admin',
    name: 'Dr. Ir. Agus Wibowo, M.Kom',
    email: 'admin@stekom.ac.id',
    role: 'Administrator',
    department: 'Biro Administrasi Akademik & Sarpras',
    phone: '081234567890',
    created_at: '2026-01-01T08:00:00.000Z',
    password: 'admin123'
  },
  {
    id: 'user-operator',
    name: 'Rahmat Hidayat, S.Kom',
    email: 'operator@stekom.ac.id',
    role: 'Operator',
    department: 'Bagian Rumah Tangga & Penjadwalan',
    phone: '081398765432',
    created_at: '2026-01-05T08:00:00.000Z',
    password: 'operator123'
  },
  {
    id: 'user-viewer',
    name: 'Siti Nurhaliza',
    email: 'viewer@stekom.ac.id',
    role: 'Viewer',
    department: 'BEM Universitas STEKOM',
    phone: '085712349988',
    created_at: '2026-02-01T08:00:00.000Z',
    password: 'viewer123'
  }
];

const INITIAL_EVENTS: CampusEvent[] = [
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

const INITIAL_AUDIT_LOGS: AuditLog[] = [
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

function createDefaultDb(): LocalDatabase {
  return {
    rooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)),
    events: JSON.parse(JSON.stringify(INITIAL_EVENTS)),
    users: JSON.parse(JSON.stringify(INITIAL_USERS)),
    audit_logs: JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)),
    system_settings: {
      app_name: 'STEKOM CAMPUS EVENT MANAGEMENT',
      campus_name: 'Universitas STEKOM',
      campus_address: 'Jl. Majapahit No. 605, Pedurungan Kidul, Kec. Pedurungan, Kota Semarang, Jawa Tengah 50192',
      campus_phone: '(024) 6723456 / 0812-3456-7890',
      campus_website: 'https://stekom.ac.id',
      mode: 'demo',
      firebase_configured: false,
      timezone: 'Asia/Jakarta (WIB)',
      updated_at: new Date().toISOString()
    }
  };
}

function loadLocalDb(): LocalDatabase {
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalDatabase;
      if (Array.isArray(parsed.users) && Array.isArray(parsed.rooms) && Array.isArray(parsed.events)) {
        let migrated = false;
        if (parsed.rooms.length === 0) {
          parsed.rooms = JSON.parse(JSON.stringify(INITIAL_ROOMS));
          migrated = true;
        }
        if (parsed.users.length === 0) {
          parsed.users = JSON.parse(JSON.stringify(INITIAL_USERS));
          migrated = true;
        }
        for (const u of parsed.users) {
          const cleanEmail = String(u.email || '').trim().toLowerCase();
          if (u.email !== cleanEmail) {
            u.email = cleanEmail;
            migrated = true;
          }
          if (!u.password) {
            u.password = getDefaultPasswordForEmail(cleanEmail);
            migrated = true;
          }
        }
        for (const ev of parsed.events) {
          if ((ev.status as string) === 'Dikonfirmasi') {
            ev.status = 'Scheduled';
            migrated = true;
          }
        }
        if (migrated) {
          saveLocalDb(parsed);
        }
        return parsed;
      }
    }
  } catch {
    // ignore parse errors
  }
  const fresh = createDefaultDb();
  saveLocalDb(fresh);
  return fresh;
}

function saveLocalDb(db: LocalDatabase) {
  try {
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
  } catch {
    // ignore quota errors
  }
}

function sanitizeUser(u: LocalUserRecord): User {
  const { password: _ignored, ...safe } = u;
  return safe;
}

function requireLocalAuth(token: string | null): LocalUserRecord {
  if (!token || !token.startsWith(LOCAL_TOKEN_PREFIX)) {
    throw new Error('Sesi login tidak valid. Silakan masuk kembali.');
  }
  const userId = token.slice(LOCAL_TOKEN_PREFIX.length);
  const db = loadLocalDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    throw new Error('Akun pengguna tidak ditemukan.');
  }
  return user;
}

export const localFallback = {
  isLocalToken(token: string | null): boolean {
    return Boolean(token && token.startsWith(LOCAL_TOKEN_PREFIX));
  },

  findCustomUserForLogin(email: string, password: string): boolean {
    const db = loadLocalDb();
    const normalized = email.trim().toLowerCase();
    const user = db.users.find(
      (u) => !SEED_USER_IDS.has(u.id) && !u.syncedToServer && u.email.trim().toLowerCase() === normalized
    );
    return Boolean(user && user.password === password);
  },

  getUnsyncedCustomUsers(): LocalUserRecord[] {
    const db = loadLocalDb();
    return db.users.filter((u) => !SEED_USER_IDS.has(u.id) && !u.syncedToServer);
  },

  markCustomUserSynced(id: string) {
    const db = loadLocalDb();
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      db.users[idx].syncedToServer = true;
      saveLocalDb(db);
    }
  },

  login(email: string, password: string): AuthResponse {
    const db = loadLocalDb();
    const normalized = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.trim().toLowerCase() === normalized);
    if (!user || user.password !== password) {
      throw new Error('Email atau kata sandi salah. Silakan periksa kembali.');
    }

    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: user.name,
      user_role: user.role,
      action: 'LOGIN',
      target_type: 'Sistem',
      target_id: user.id,
      target_name: 'Autentikasi Pengguna',
      details: `${user.name} (${user.email}) masuk ke sistem sebagai ${user.role}`,
      timestamp: new Date().toISOString()
    });
    saveLocalDb(db);

    return {
      token: `${LOCAL_TOKEN_PREFIX}${user.id}`,
      user: sanitizeUser(user)
    };
  },

  logout(token: string | null) {
    try {
      const user = requireLocalAuth(token);
      const db = loadLocalDb();
      db.audit_logs.unshift({
        id: `log-${Date.now()}`,
        user_name: user.name,
        user_role: user.role,
        action: 'LOGOUT',
        target_type: 'Sistem',
        target_id: user.id,
        target_name: 'Autentikasi Pengguna',
        details: `${user.name} (${user.email}) keluar (logout) dari sistem`,
        timestamp: new Date().toISOString()
      });
      saveLocalDb(db);
    } catch {
      // ignore if token already invalid
    }
  },

  getMe(token: string | null): User {
    return sanitizeUser(requireLocalAuth(token));
  },

  changePassword(token: string | null, currentPassword: string, newPassword: string) {
    const actor = requireLocalAuth(token);
    if (newPassword.length < 6) {
      throw new Error('Kata sandi baru minimal harus 6 karakter.');
    }
    const db = loadLocalDb();
    const idx = db.users.findIndex((u) => u.id === actor.id);
    if (idx === -1) throw new Error('Akun pengguna tidak ditemukan.');
    if (db.users[idx].password !== currentPassword) {
      throw new Error('Kata sandi saat ini tidak sesuai.');
    }
    db.users[idx].password = newPassword;
    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: actor.name,
      user_role: actor.role,
      action: 'UBAH',
      target_type: 'Pengguna',
      target_id: actor.id,
      target_name: actor.name,
      details: `${actor.name} memperbarui kata sandi akun pribadinya`,
      timestamp: new Date().toISOString()
    });
    saveLocalDb(db);
    return { success: true, message: 'Kata sandi berhasil diperbarui.' };
  },

  getStatus() {
    const db = loadLocalDb();
    return {
      status: 'online',
      appName: 'STEKOM CAMPUS EVENT MANAGEMENT',
      campus: 'Universitas STEKOM',
      persistence: 'Browser Storage (Mode Preview Statis)',
      eventsCount: db.events.length,
      roomsCount: db.rooms.length,
      usersCount: db.users.length,
      mode: 'demo',
      firebaseConfigured: false,
      timezone: 'Asia/Jakarta (WIB)',
      timestamp: new Date().toISOString()
    };
  },

  resetData(token: string | null) {
    const actor = requireLocalAuth(token);
    if (actor.role !== 'Administrator') {
      throw new Error('Akses ditolak. Hanya Administrator yang dapat melakukan reset data.');
    }
    const fresh = createDefaultDb();
    fresh.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: actor.name,
      user_role: actor.role,
      action: 'PENGATURAN',
      target_type: 'Sistem',
      target_id: 'sys-reset',
      target_name: 'Database Reset',
      details: 'Melakukan reset data contoh awal Universitas STEKOM',
      timestamp: new Date().toISOString()
    });
    saveLocalDb(fresh);
    return { success: true, message: 'Data contoh berhasil di-reset ulang ke kondisi awal.' };
  },

  getRooms(token: string | null): Room[] {
    requireLocalAuth(token);
    return loadLocalDb().rooms;
  },

  createRoom(token: string | null, room: Partial<Room>): Room {
    const actor = requireLocalAuth(token);
    if (actor.role === 'Viewer') throw new Error('Akses ditolak.');
    const db = loadLocalDb();
    const newRoom: Room = {
      id: room.id || `room-${Date.now()}`,
      name: room.name || '',
      code: room.code || '',
      capacity: Number(room.capacity) || 0,
      is_general: Boolean(room.is_general),
      floor: room.floor || 'Lantai 1',
      building: room.building || 'Gedung Pusat STEKOM',
      facilities: room.facilities || [],
      status: room.status || 'Tersedia',
      notes: room.notes || ''
    };
    db.rooms.push(newRoom);
    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: actor.name,
      user_role: actor.role,
      action: 'TAMBAH',
      target_type: 'Ruangan',
      target_id: newRoom.id,
      target_name: newRoom.name,
      details: `Menambahkan ruangan baru ${newRoom.name} (${newRoom.code}), kapasitas ${newRoom.capacity}`,
      timestamp: new Date().toISOString()
    });
    saveLocalDb(db);
    return newRoom;
  },

  updateRoom(token: string | null, id: string, room: Partial<Room>): Room {
    const actor = requireLocalAuth(token);
    if (actor.role === 'Viewer') throw new Error('Akses ditolak.');
    const db = loadLocalDb();
    const idx = db.rooms.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Ruangan tidak ditemukan');
    const updated: Room = {
      ...db.rooms[idx],
      ...room,
      capacity: room.capacity !== undefined ? Number(room.capacity) : db.rooms[idx].capacity
    };
    db.rooms[idx] = updated;
    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: actor.name,
      user_role: actor.role,
      action: 'UBAH',
      target_type: 'Ruangan',
      target_id: updated.id,
      target_name: updated.name,
      details: `Mengubah data ruangan ${updated.name}: kapasitas ${updated.capacity}, status ${updated.status}`,
      timestamp: new Date().toISOString()
    });
    saveLocalDb(db);
    return updated;
  },

  deleteRoom(token: string | null, id: string) {
    const actor = requireLocalAuth(token);
    if (actor.role !== 'Administrator') throw new Error('Akses ditolak.');
    const db = loadLocalDb();
    const idx = db.rooms.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Ruangan tidak ditemukan');
    const deleted = db.rooms.splice(idx, 1)[0];
    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: actor.name,
      user_role: actor.role,
      action: 'HAPUS',
      target_type: 'Ruangan',
      target_id: deleted.id,
      target_name: deleted.name,
      details: `Menghapus ruangan ${deleted.name} (${deleted.code})`,
      timestamp: new Date().toISOString()
    });
    saveLocalDb(db);
    return { success: true };
  },

  getEvents(token: string | null, filters?: Partial<FilterOptions>): CampusEvent[] {
    requireLocalAuth(token);
    let events = [...loadLocalDb().events];
    if (filters) {
      if (filters.month && filters.month !== 'all') {
        events = events.filter((e) => e.tanggal.split('-')[1] === String(filters.month).padStart(2, '0'));
      }
      if (filters.year && filters.year !== 'all') {
        events = events.filter((e) => e.tanggal.split('-')[0] === String(filters.year));
      }
      if (filters.status && filters.status !== 'all') {
        events = events.filter((e) => e.status === filters.status);
      }
      if (filters.roomId && filters.roomId !== 'all') {
        events = events.filter((e) => (e.ruangan_ids || []).includes(String(filters.roomId)));
      }
      if (filters.pic?.trim()) {
        const q = filters.pic.toLowerCase();
        events = events.filter((e) => e.pic.toLowerCase().includes(q));
      }
      if (filters.search?.trim()) {
        const q = filters.search.toLowerCase();
        events = events.filter(
          (e) =>
            e.nama_event.toLowerCase().includes(q) ||
            e.pic.toLowerCase().includes(q) ||
            e.catatan.toLowerCase().includes(q)
        );
      }
    }
    events.sort((a, b) => `${a.tanggal} ${a.jam_mulai}`.localeCompare(`${b.tanggal} ${b.jam_mulai}`));
    return events;
  },

  checkConflict(
    token: string | null,
    eventData: {
      id?: string;
      tanggal: string;
      jam_mulai: string;
      jam_selesai: string;
      ruangan_ids: string[];
      status?: string;
    }
  ): ConflictCheckResult {
    requireLocalAuth(token);
    const db = loadLocalDb();
    return checkEventConflict(eventData, db.events, db.rooms);
  },

  createEvent(token: string | null, eventData: Partial<CampusEvent>): CampusEvent {
    const actor = requireLocalAuth(token);
    if (actor.role === 'Viewer') throw new Error('Akses ditolak.');
    const db = loadLocalDb();

    if (!eventData.nama_event || !eventData.tanggal || !eventData.jam_mulai || !eventData.jam_selesai || !eventData.pic || !eventData.nomor_hp_pic) {
      throw new Error('Semua field wajib diisi lengkap.');
    }
    if (!eventData.ruangan_ids?.length) {
      throw new Error('Pilih minimal satu ruangan untuk event ini.');
    }
    if (!eventData.jumlah_peserta || Number(eventData.jumlah_peserta) <= 0) {
      throw new Error('Jumlah peserta harus berupa bilangan positif (> 0).');
    }
    if (eventData.jam_selesai <= eventData.jam_mulai) {
      throw new Error('Jam selesai harus lebih akhir daripada jam mulai.');
    }

    const conflictResult = checkEventConflict(
      {
        tanggal: eventData.tanggal,
        jam_mulai: eventData.jam_mulai,
        jam_selesai: eventData.jam_selesai,
        ruangan_ids: eventData.ruangan_ids,
        status: eventData.status
      },
      db.events,
      db.rooms
    );
    if (eventData.status === 'Scheduled' && conflictResult.hasConflict) {
      throw new Error(`Jadwal bentrok tidak dapat di-set ke Scheduled! ${conflictResult.conflicts[0].reason}`);
    }

    const newEvent: CampusEvent = {
      id: `evt-${Date.now()}`,
      nama_event: eventData.nama_event.trim(),
      tanggal: eventData.tanggal,
      jam_mulai: eventData.jam_mulai,
      jam_selesai: eventData.jam_selesai,
      jumlah_peserta: Number(eventData.jumlah_peserta),
      pic: eventData.pic.trim(),
      nomor_hp_pic: eventData.nomor_hp_pic.trim(),
      ruangan_ids: eventData.ruangan_ids,
      status: eventData.status || 'Menunggu Konfirmasi',
      catatan: eventData.catatan ? eventData.catatan.trim() : '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: actor.name
    };
    db.events.push(newEvent);
    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: actor.name,
      user_role: actor.role,
      action: 'TAMBAH',
      target_type: 'Event',
      target_id: newEvent.id,
      target_name: newEvent.nama_event,
      details: `Membuat event "${newEvent.nama_event}" pada ${newEvent.tanggal} (${newEvent.jam_mulai} - ${newEvent.jam_selesai} WIB), status: ${newEvent.status}`,
      timestamp: new Date().toISOString()
    });
    saveLocalDb(db);
    return newEvent;
  },

  updateEvent(token: string | null, id: string, eventData: Partial<CampusEvent>): CampusEvent {
    const actor = requireLocalAuth(token);
    if (actor.role === 'Viewer') throw new Error('Akses ditolak.');
    const db = loadLocalDb();
    const idx = db.events.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Event tidak ditemukan');

    const prev = db.events[idx];
    const updatedTanggal = eventData.tanggal || prev.tanggal;
    const updatedStart = eventData.jam_mulai || prev.jam_mulai;
    const updatedEnd = eventData.jam_selesai || prev.jam_selesai;
    const updatedRooms = eventData.ruangan_ids || prev.ruangan_ids;
    const updatedStatus = eventData.status || prev.status;

    if (updatedEnd <= updatedStart) {
      throw new Error('Jam selesai harus lebih akhir daripada jam mulai.');
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
      throw new Error(`Jadwal bentrok tidak dapat di-set ke Scheduled! ${conflictResult.conflicts[0].reason}`);
    }

    const updated: CampusEvent = {
      ...prev,
      ...eventData,
      tanggal: updatedTanggal,
      jam_mulai: updatedStart,
      jam_selesai: updatedEnd,
      ruangan_ids: updatedRooms,
      status: updatedStatus,
      updated_at: new Date().toISOString()
    };
    db.events[idx] = updated;

    let action: AuditLog['action'] = 'UBAH';
    let details = `Memperbarui event "${updated.nama_event}"`;
    if (prev.status !== updatedStatus) {
      if (updatedStatus === 'Scheduled') {
        action = 'KONFIRMASI';
        details = `Menetapkan event "${updated.nama_event}" menjadi Scheduled (${prev.status} -> Scheduled)`;
      } else if (updatedStatus === 'Dibatalkan') {
        action = 'BATALKAN';
        details = `Membatalkan event "${updated.nama_event}" (${prev.status} -> Dibatalkan)`;
      }
    }

    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: actor.name,
      user_role: actor.role,
      action,
      target_type: 'Event',
      target_id: updated.id,
      target_name: updated.nama_event,
      details,
      timestamp: new Date().toISOString()
    });
    saveLocalDb(db);
    return updated;
  },

  deleteEvent(token: string | null, id: string) {
    const actor = requireLocalAuth(token);
    if (actor.role === 'Viewer') throw new Error('Akses ditolak.');
    const db = loadLocalDb();
    const idx = db.events.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Event tidak ditemukan');
    const deleted = db.events.splice(idx, 1)[0];
    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: actor.name,
      user_role: actor.role,
      action: 'HAPUS',
      target_type: 'Event',
      target_id: deleted.id,
      target_name: deleted.nama_event,
      details: `Menghapus event "${deleted.nama_event}" (Tanggal: ${deleted.tanggal})`,
      timestamp: new Date().toISOString()
    });
    saveLocalDb(db);
    return { success: true };
  },

  getUsers(token: string | null): User[] {
    const actor = requireLocalAuth(token);
    if (actor.role !== 'Administrator') throw new Error('Akses ditolak.');
    return loadLocalDb().users.map(sanitizeUser);
  },

  createUser(token: string | null, user: Partial<User> & { password?: string }): User {
    const actor = requireLocalAuth(token);
    if (actor.role !== 'Administrator') throw new Error('Akses ditolak.');
    const db = loadLocalDb();
    const email = String(user.email || '').trim().toLowerCase();
    const name = String(user.name || '').trim();
    const rawPassword = typeof user.password === 'string' ? user.password : '';
    const hasPasswordInput = rawPassword.trim().length > 0;

    if (!name || !email) throw new Error('Nama dan email pengguna wajib diisi.');
    if (hasPasswordInput && rawPassword !== rawPassword.trim()) {
      throw new Error('Kata sandi tidak boleh diawali atau diakhiri spasi.');
    }
    if (hasPasswordInput && rawPassword.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter.');
    }
    if (db.users.some((u) => u.email.trim().toLowerCase() === email)) {
      throw new Error(`Email "${email}" sudah terdaftar dalam sistem.`);
    }
    const validRoles: User['role'][] = ['Administrator', 'Operator', 'Viewer'];
    const role: User['role'] = user.role && validRoles.includes(user.role) ? user.role : 'Operator';

    const newUser: LocalUserRecord = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      department: String(user.department || 'Universitas STEKOM').trim(),
      phone: String(user.phone || '').trim(),
      created_at: new Date().toISOString(),
      password: hasPasswordInput ? rawPassword : 'stekom123'
    };
    db.users.push(newUser);
    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: actor.name,
      user_role: actor.role,
      action: 'TAMBAH',
      target_type: 'Pengguna',
      target_id: newUser.id,
      target_name: newUser.name,
      details: `Menambahkan pengguna baru: ${newUser.name} (${newUser.email}) sebagai ${newUser.role}`,
      timestamp: new Date().toISOString()
    });
    saveLocalDb(db);
    return sanitizeUser(newUser);
  },

  updateUser(token: string | null, id: string, data: Partial<User> & { new_password?: string }): User {
    const actor = requireLocalAuth(token);
    if (actor.role !== 'Administrator') throw new Error('Akses ditolak.');
    const db = loadLocalDb();
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('Pengguna tidak ditemukan');
    const prev = db.users[idx];

    if (data.email !== undefined) {
      const normalizedEmail = data.email.trim().toLowerCase();
      if (!normalizedEmail) throw new Error('Email pengguna tidak boleh kosong.');
      if (db.users.some((u) => u.id !== id && u.email.trim().toLowerCase() === normalizedEmail)) {
        throw new Error(`Email "${normalizedEmail}" sudah digunakan pengguna lain.`);
      }
    }

    const validRoles: User['role'][] = ['Administrator', 'Operator', 'Viewer'];
    if (data.role !== undefined && !validRoles.includes(data.role)) {
      throw new Error('Peran pengguna tidak valid.');
    }

    let updatedPassword = prev.password;
    let passwordChanged = false;
    if (data.new_password !== undefined && String(data.new_password).trim() !== '') {
      const pw = String(data.new_password);
      if (pw !== pw.trim()) throw new Error('Kata sandi baru tidak boleh diawali atau diakhiri spasi.');
      if (pw.length < 6) throw new Error('Kata sandi baru minimal 6 karakter.');
      updatedPassword = pw;
      passwordChanged = true;
    }

    const updated: LocalUserRecord = {
      ...prev,
      name: data.name !== undefined ? data.name.trim() : prev.name,
      email: data.email !== undefined ? data.email.trim().toLowerCase() : prev.email,
      role: data.role || prev.role,
      department: data.department !== undefined ? data.department.trim() : prev.department,
      phone: data.phone !== undefined ? data.phone.trim() : prev.phone,
      password: updatedPassword
    };
    db.users[idx] = updated;
    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: actor.name,
      user_role: actor.role,
      action: 'UBAH',
      target_type: 'Pengguna',
      target_id: updated.id,
      target_name: updated.name,
      details: passwordChanged
        ? `Mengubah data / mereset kata sandi pengguna ${updated.name} (Peran: ${updated.role})`
        : `Mengubah data pengguna ${updated.name} (Peran: ${updated.role})`,
      timestamp: new Date().toISOString()
    });
    saveLocalDb(db);
    return sanitizeUser(updated);
  },

  deleteUser(token: string | null, id: string) {
    const actor = requireLocalAuth(token);
    if (actor.role !== 'Administrator') throw new Error('Akses ditolak.');
    if (id === actor.id) throw new Error('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.');
    const db = loadLocalDb();
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('Pengguna tidak ditemukan');
    const deleted = db.users.splice(idx, 1)[0];
    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: actor.name,
      user_role: actor.role,
      action: 'HAPUS',
      target_type: 'Pengguna',
      target_id: deleted.id,
      target_name: deleted.name,
      details: `Menghapus akses pengguna ${deleted.name} (${deleted.role})`,
      timestamp: new Date().toISOString()
    });
    saveLocalDb(db);
    return { success: true };
  },

  getAuditLogs(token: string | null): AuditLog[] {
    const actor = requireLocalAuth(token);
    if (actor.role === 'Viewer') throw new Error('Akses ditolak.');
    return loadLocalDb().audit_logs;
  },

  getStats(token: string | null) {
    requireLocalAuth(token);
    const db = loadLocalDb();
    const events = db.events;
    const rooms = db.rooms;
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter((e) => e.tanggal === today);
    const upcomingEvents = events.filter((e) => e.tanggal >= today && e.status !== 'Dibatalkan');

    const monthlyData: Record<string, { confirmed: number; pending: number; cancelled: number }> = {};
    for (const e of events) {
      const monthKey = e.tanggal.substring(0, 7);
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { confirmed: 0, pending: 0, cancelled: 0 };
      }
      if (e.status === 'Scheduled') monthlyData[monthKey].confirmed++;
      else if (e.status === 'Menunggu Konfirmasi') monthlyData[monthKey].pending++;
      else if (e.status === 'Dibatalkan') monthlyData[monthKey].cancelled++;
    }

    const roomUsageMap: Record<string, number> = {};
    rooms.forEach((r) => (roomUsageMap[r.id] = 0));
    events.forEach((e) => {
      if (e.status !== 'Dibatalkan') {
        (e.ruangan_ids || []).forEach((rId) => {
          roomUsageMap[rId] = (roomUsageMap[rId] || 0) + 1;
        });
      }
    });

    const roomUsageList = rooms
      .map((r) => ({ room: r, usageCount: roomUsageMap[r.id] || 0 }))
      .sort((a, b) => b.usageCount - a.usageCount);

    const scheduledEvents = events.filter((e) => e.status === 'Scheduled').length;
    return {
      totalEvents: events.length,
      scheduledEvents,
      confirmedEvents: scheduledEvents,
      pendingEvents: events.filter((e) => e.status === 'Menunggu Konfirmasi').length,
      cancelledEvents: events.filter((e) => e.status === 'Dibatalkan').length,
      todayEventsCount: todayEvents.length,
      todayEvents,
      upcomingEventsCount: upcomingEvents.length,
      upcomingEvents: upcomingEvents.slice(0, 5),
      monthlyData,
      roomUsageList,
      totalRooms: rooms.length,
      totalUsers: db.users.length
    };
  },

  getSettings(token: string | null) {
    requireLocalAuth(token);
    return loadLocalDb().system_settings;
  },

  updateSettings(token: string | null, settings: any) {
    const actor = requireLocalAuth(token);
    if (actor.role !== 'Administrator') throw new Error('Akses ditolak.');
    const db = loadLocalDb();
    db.system_settings = {
      ...db.system_settings,
      ...settings,
      updated_at: new Date().toISOString()
    };
    saveLocalDb(db);
    return db.system_settings;
  }
};
