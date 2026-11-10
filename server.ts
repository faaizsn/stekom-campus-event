import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;

// Data directory and file path
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 21 Initial Rooms specified by Universitas STEKOM
const INITIAL_ROOMS = [
  // 8 Ruangan Umum (Kapasitas fleksibel/dapat diedit)
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
  // 13 Ruangan Kelas / Rapat dengan kapasitas spesifik
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

// Seed Users
const INITIAL_USERS = [
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

// Seed Events (realistic events for STEKOM)
// Current reference date: November 2026
const INITIAL_EVENTS = [
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

// Seed Audit Logs
const INITIAL_AUDIT_LOGS = [
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

// Helper to read and write database
interface DatabaseSchema {
  rooms: typeof INITIAL_ROOMS;
  events: typeof INITIAL_EVENTS;
  users: typeof INITIAL_USERS;
  audit_logs: typeof INITIAL_AUDIT_LOGS;
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

function getDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data: DatabaseSchema = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      let migrated = false;
      if (Array.isArray(data.events)) {
        for (const ev of data.events) {
          if ((ev.status as string) === 'Dikonfirmasi') {
            ev.status = 'Scheduled';
            migrated = true;
          }
        }
      }
      if (migrated) {
        saveDatabase(data);
      }
      return data;
    }
  } catch (err) {
    console.error('Failed to read db.json, reinitializing default data:', err);
  }

  // Initialize fresh
  const initialDb: DatabaseSchema = {
    rooms: INITIAL_ROOMS,
    events: INITIAL_EVENTS,
    users: INITIAL_USERS,
    audit_logs: INITIAL_AUDIT_LOGS,
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

  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write db.json:', err);
  }
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
  existingEvents: typeof INITIAL_EVENTS,
  rooms: typeof INITIAL_ROOMS
) {
  // If target event itself is marked as 'Dibatalkan', it doesn't cause active conflicts
  if (targetEvent.status === 'Dibatalkan') {
    return { hasConflict: false, conflicts: [] };
  }

  const conflicts: Array<{
    conflictingEvent: typeof INITIAL_EVENTS[0];
    conflictingRoomIds: string[];
    conflictingRoomNames: string[];
    overlapWindow: string;
    reason: string;
  }> = [];

  const targetStart = targetEvent.jam_mulai;
  const targetEnd = targetEvent.jam_selesai;

  for (const event of existingEvents) {
    // Skip self
    if (targetEvent.id && event.id === targetEvent.id) {
      continue;
    }
    // Skip cancelled events! Dibatalkan tidak memblokir ruangan
    if (event.status === 'Dibatalkan') {
      continue;
    }
    // Compare dates
    if (event.tanggal !== targetEvent.tanggal) {
      continue;
    }

    // Compare time window overlap: startA < endB && endA > startB
    const isTimeOverlap = targetStart < event.jam_selesai && targetEnd > event.jam_mulai;
    if (!isTimeOverlap) {
      continue;
    }

    // Check shared rooms
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
  const app = express();
  app.use(express.json());

  // Log all requests in dev
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // Ensure DB is initialized
  getDatabase();

  // API Endpoints:

  // Status & System info
  app.get('/api/status', (req: Request, res: Response) => {
    const db = getDatabase();
    res.json({
      status: 'online',
      appName: 'STEKOM CAMPUS EVENT MANAGEMENT',
      campus: 'Universitas STEKOM',
      persistence: 'File System (JSON Database)',
      dbFilePath: DB_FILE,
      eventsCount: db.events.length,
      roomsCount: db.rooms.length,
      usersCount: db.users.length,
      mode: db.system_settings.mode,
      firebaseConfigured: db.system_settings.firebase_configured,
      timezone: 'Asia/Jakarta (WIB)',
      timestamp: new Date().toISOString()
    });
  });

  // Reset database to initial sample data
  app.post('/api/reset-data', (req: Request, res: Response) => {
    const freshDb: DatabaseSchema = {
      rooms: INITIAL_ROOMS,
      events: INITIAL_EVENTS,
      users: INITIAL_USERS,
      audit_logs: [
        ...INITIAL_AUDIT_LOGS,
        {
          id: `log-${Date.now()}`,
          user_name: req.body.user_name || 'Administrator',
          user_role: req.body.user_role || 'Administrator',
          action: 'PENGATURAN',
          target_type: 'Sistem',
          target_id: 'sys-reset',
          target_name: 'Database Reset',
          details: 'Melakukan reset data contoh awal Universitas STEKOM',
          timestamp: new Date().toISOString()
        }
      ],
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
    saveDatabase(freshDb);
    res.json({ success: true, message: 'Data contoh berhasil di-reset ulang ke kondisi awal.' });
  });

  // Rooms CRUD
  app.get('/api/rooms', (req: Request, res: Response) => {
    const db = getDatabase();
    res.json(db.rooms);
  });

  app.post('/api/rooms', (req: Request, res: Response) => {
    const db = getDatabase();
    const newRoom = {
      id: req.body.id || `room-${Date.now()}`,
      name: req.body.name,
      code: req.body.code,
      capacity: Number(req.body.capacity) || 0,
      is_general: Boolean(req.body.is_general),
      floor: req.body.floor || 'Lantai 1',
      building: req.body.building || 'Gedung Pusat STEKOM',
      facilities: req.body.facilities || [],
      status: req.body.status || 'Tersedia',
      notes: req.body.notes || ''
    };

    db.rooms.push(newRoom);

    // Audit log
    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: req.body.current_user?.name || 'Administrator',
      user_role: req.body.current_user?.role || 'Administrator',
      action: 'TAMBAH',
      target_type: 'Ruangan',
      target_id: newRoom.id,
      target_name: newRoom.name,
      details: `Menambahkan ruangan baru ${newRoom.name} (${newRoom.code}), kapasitas ${newRoom.capacity}`,
      timestamp: new Date().toISOString()
    });

    saveDatabase(db);
    res.status(201).json(newRoom);
  });

  app.put('/api/rooms/:id', (req: Request, res: Response) => {
    const db = getDatabase();
    const index = db.rooms.findIndex((r) => r.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Ruangan tidak ditemukan' });
    }

    const prevRoom = db.rooms[index];
    const updatedRoom = {
      ...prevRoom,
      ...req.body,
      capacity: req.body.capacity !== undefined ? Number(req.body.capacity) : prevRoom.capacity
    };
    db.rooms[index] = updatedRoom;

    // Audit log
    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: req.body.current_user?.name || 'Administrator',
      user_role: req.body.current_user?.role || 'Administrator',
      action: 'UBAH',
      target_type: 'Ruangan',
      target_id: updatedRoom.id,
      target_name: updatedRoom.name,
      details: `Mengubah data ruangan ${updatedRoom.name}: kapasitas ${updatedRoom.capacity}, status ${updatedRoom.status}`,
      timestamp: new Date().toISOString()
    });

    saveDatabase(db);
    res.json(updatedRoom);
  });

  app.delete('/api/rooms/:id', (req: Request, res: Response) => {
    const db = getDatabase();
    const index = db.rooms.findIndex((r) => r.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Ruangan tidak ditemukan' });
    }

    // Check if room is used in future confirmed events
    const isUsed = db.events.some(
      (e) => e.status !== 'Dibatalkan' && (e.ruangan_ids || []).includes(req.params.id)
    );

    if (isUsed && req.query.force !== 'true') {
      return res.status(400).json({
        error: 'Ruangan masih terdaftar dalam jadwal event aktif. Batalkan atau ubah event terlebih dahulu.'
      });
    }

    const deleted = db.rooms.splice(index, 1)[0];

    // Audit log
    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: (req.query.user_name as string) || 'Administrator',
      user_role: ((req.query.user_role as string) as any) || 'Administrator',
      action: 'HAPUS',
      target_type: 'Ruangan',
      target_id: deleted.id,
      target_name: deleted.name,
      details: `Menghapus ruangan ${deleted.name} (${deleted.code})`,
      timestamp: new Date().toISOString()
    });

    saveDatabase(db);
    res.json({ success: true, deletedRoom: deleted });
  });

  // Events CRUD & Conflict Check
  app.get('/api/events', (req: Request, res: Response) => {
    const db = getDatabase();
    let events = [...db.events];

    // Optional filtering query params
    const { month, year, status, roomId, search, pic } = req.query;

    if (month && month !== 'all') {
      events = events.filter((e) => {
        const parts = e.tanggal.split('-');
        return parts[1] === String(month).padStart(2, '0');
      });
    }

    if (year && year !== 'all') {
      events = events.filter((e) => {
        const parts = e.tanggal.split('-');
        return parts[0] === String(year);
      });
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

    // Sort by date and start time
    events.sort((a, b) => `${a.tanggal} ${a.jam_mulai}`.localeCompare(`${b.tanggal} ${b.jam_mulai}`));

    res.json(events);
  });

  // Conflict checking endpoint
  app.post('/api/events/check-conflict', (req: Request, res: Response) => {
    const db = getDatabase();
    const { id, tanggal, jam_mulai, jam_selesai, ruangan_ids, status } = req.body;

    if (!tanggal || !jam_mulai || !jam_selesai || !ruangan_ids || !ruangan_ids.length) {
      return res.json({ hasConflict: false, conflicts: [] });
    }

    const result = checkScheduleConflicts(
      { id, tanggal, jam_mulai, jam_selesai, ruangan_ids, status },
      db.events,
      db.rooms
    );

    res.json(result);
  });

  app.post('/api/events', (req: Request, res: Response) => {
    const db = getDatabase();
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
      catatan,
      current_user
    } = req.body;

    // Strict Validations
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

    // Clash detection check
    const conflictResult = checkScheduleConflicts(
      { tanggal, jam_mulai, jam_selesai, ruangan_ids, status },
      db.events,
      db.rooms
    );

    // Rule: "Jangan izinkan status Scheduled pada jadwal yang bentrok"
    if (status === 'Scheduled' && conflictResult.hasConflict) {
      const firstConflict = conflictResult.conflicts[0];
      return res.status(409).json({
        error: `Jadwal bentrok tidak dapat di-set ke Scheduled! ${firstConflict.reason}`,
        conflictDetails: conflictResult
      });
    }

    const newEvent = {
      id: `evt-${Date.now()}`,
      nama_event: nama_event.trim(),
      tanggal,
      jam_mulai,
      jam_selesai,
      jumlah_peserta: participants,
      pic: pic.trim(),
      nomor_hp_pic: nomor_hp_pic.trim(),
      ruangan_ids,
      status: status || 'Menunggu Konfirmasi',
      catatan: catatan ? catatan.trim() : '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: current_user?.name || 'Administrator'
    };

    db.events.push(newEvent);

    // Audit log
    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: current_user?.name || 'Administrator',
      user_role: current_user?.role || 'Administrator',
      action: 'TAMBAH',
      target_type: 'Event',
      target_id: newEvent.id,
      target_name: newEvent.nama_event,
      details: `Membuat event "${newEvent.nama_event}" pada ${newEvent.tanggal} (${newEvent.jam_mulai} - ${newEvent.jam_selesai} WIB), status: ${newEvent.status}`,
      timestamp: new Date().toISOString()
    });

    saveDatabase(db);
    res.status(201).json(newEvent);
  });

  app.put('/api/events/:id', (req: Request, res: Response) => {
    const db = getDatabase();
    const index = db.events.findIndex((e) => e.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Event tidak ditemukan' });
    }

    const existingEvent = db.events[index];
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
      catatan,
      current_user
    } = req.body;

    const updatedTanggal = tanggal || existingEvent.tanggal;
    const updatedStart = jam_mulai || existingEvent.jam_mulai;
    const updatedEnd = jam_selesai || existingEvent.jam_selesai;
    const updatedRooms = ruangan_ids || existingEvent.ruangan_ids;
    const updatedStatus = status || existingEvent.status;

    if (updatedEnd <= updatedStart) {
      return res.status(400).json({ error: 'Jam selesai harus lebih akhir daripada jam mulai.' });
    }

    if (jumlah_peserta !== undefined && Number(jumlah_peserta) <= 0) {
      return res.status(400).json({ error: 'Jumlah peserta harus berupa bilangan positif (> 0).' });
    }

    // Check conflict
    const conflictResult = checkScheduleConflicts(
      {
        id: existingEvent.id,
        tanggal: updatedTanggal,
        jam_mulai: updatedStart,
        jam_selesai: updatedEnd,
        ruangan_ids: updatedRooms,
        status: updatedStatus
      },
      db.events,
      db.rooms
    );

    // Rule: "Jangan izinkan status Scheduled pada jadwal yang bentrok"
    if (updatedStatus === 'Scheduled' && conflictResult.hasConflict) {
      const firstConflict = conflictResult.conflicts[0];
      return res.status(409).json({
        error: `Jadwal bentrok tidak dapat di-set ke Scheduled! ${firstConflict.reason}`,
        conflictDetails: conflictResult
      });
    }

    const prevStatus = existingEvent.status;
    const updatedEvent = {
      ...existingEvent,
      nama_event: nama_event !== undefined ? nama_event.trim() : existingEvent.nama_event,
      tanggal: updatedTanggal,
      jam_mulai: updatedStart,
      jam_selesai: updatedEnd,
      jumlah_peserta: jumlah_peserta !== undefined ? Number(jumlah_peserta) : existingEvent.jumlah_peserta,
      pic: pic !== undefined ? pic.trim() : existingEvent.pic,
      nomor_hp_pic: nomor_hp_pic !== undefined ? nomor_hp_pic.trim() : existingEvent.nomor_hp_pic,
      ruangan_ids: updatedRooms,
      status: updatedStatus,
      catatan: catatan !== undefined ? catatan.trim() : existingEvent.catatan,
      updated_at: new Date().toISOString()
    };

    db.events[index] = updatedEvent;

    // Determine audit action
    let auditAction: 'UBAH' | 'KONFIRMASI' | 'BATALKAN' = 'UBAH';
    let auditDetail = `Memperbarui event "${updatedEvent.nama_event}"`;

    if (prevStatus !== updatedStatus) {
      if (updatedStatus === 'Scheduled') {
        auditAction = 'KONFIRMASI';
        auditDetail = `Menetapkan event "${updatedEvent.nama_event}" menjadi Scheduled (${prevStatus} -> Scheduled)`;
      } else if (updatedStatus === 'Dibatalkan') {
        auditAction = 'BATALKAN';
        auditDetail = `Membatalkan event "${updatedEvent.nama_event}" (${prevStatus} -> Dibatalkan)`;
      } else {
        auditDetail = `Mengubah status event "${updatedEvent.nama_event}" menjadi ${updatedStatus}`;
      }
    }

    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: current_user?.name || 'Administrator',
      user_role: current_user?.role || 'Administrator',
      action: auditAction,
      target_type: 'Event',
      target_id: updatedEvent.id,
      target_name: updatedEvent.nama_event,
      details: auditDetail,
      timestamp: new Date().toISOString()
    });

    saveDatabase(db);
    res.json(updatedEvent);
  });

  app.delete('/api/events/:id', (req: Request, res: Response) => {
    const db = getDatabase();
    const index = db.events.findIndex((e) => e.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Event tidak ditemukan' });
    }

    const deleted = db.events.splice(index, 1)[0];

    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: (req.query.user_name as string) || 'Administrator',
      user_role: ((req.query.user_role as string) as any) || 'Administrator',
      action: 'HAPUS',
      target_type: 'Event',
      target_id: deleted.id,
      target_name: deleted.nama_event,
      details: `Menghapus event "${deleted.nama_event}" (Tanggal: ${deleted.tanggal})`,
      timestamp: new Date().toISOString()
    });

    saveDatabase(db);
    res.json({ success: true, deletedEvent: deleted });
  });

  // Users CRUD
  app.get('/api/users', (req: Request, res: Response) => {
    const db = getDatabase();
    res.json(db.users);
  });

  app.post('/api/users', (req: Request, res: Response) => {
    const db = getDatabase();
    const newUser = {
      id: `user-${Date.now()}`,
      name: req.body.name,
      email: req.body.email,
      role: req.body.role || 'Operator',
      department: req.body.department || 'Universitas STEKOM',
      phone: req.body.phone || '',
      created_at: new Date().toISOString()
    };

    db.users.push(newUser);

    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: req.body.current_user?.name || 'Administrator',
      user_role: req.body.current_user?.role || 'Administrator',
      action: 'TAMBAH',
      target_type: 'Pengguna',
      target_id: newUser.id,
      target_name: newUser.name,
      details: `Menambahkan pengguna baru: ${newUser.name} (${newUser.email}) sebagai ${newUser.role}`,
      timestamp: new Date().toISOString()
    });

    saveDatabase(db);
    res.status(201).json(newUser);
  });

  app.put('/api/users/:id', (req: Request, res: Response) => {
    const db = getDatabase();
    const index = db.users.findIndex((u) => u.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    const prevUser = db.users[index];
    const updated = {
      ...prevUser,
      ...req.body
    };
    db.users[index] = updated;

    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: req.body.current_user?.name || 'Administrator',
      user_role: req.body.current_user?.role || 'Administrator',
      action: 'UBAH',
      target_type: 'Pengguna',
      target_id: updated.id,
      target_name: updated.name,
      details: `Mengubah data pengguna ${updated.name} (Peran: ${updated.role})`,
      timestamp: new Date().toISOString()
    });

    saveDatabase(db);
    res.json(updated);
  });

  app.delete('/api/users/:id', (req: Request, res: Response) => {
    const db = getDatabase();
    const index = db.users.findIndex((u) => u.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }

    const deleted = db.users.splice(index, 1)[0];

    db.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_name: (req.query.user_name as string) || 'Administrator',
      user_role: ((req.query.user_role as string) as any) || 'Administrator',
      action: 'HAPUS',
      target_type: 'Pengguna',
      target_id: deleted.id,
      target_name: deleted.name,
      details: `Menghapus akses pengguna ${deleted.name} (${deleted.role})`,
      timestamp: new Date().toISOString()
    });

    saveDatabase(db);
    res.json({ success: true, deletedUser: deleted });
  });

  // Audit Logs
  app.get('/api/audit-logs', (req: Request, res: Response) => {
    const db = getDatabase();
    res.json(db.audit_logs);
  });

  // System Settings
  app.get('/api/settings', (req: Request, res: Response) => {
    const db = getDatabase();
    res.json(db.system_settings);
  });

  app.put('/api/settings', (req: Request, res: Response) => {
    const db = getDatabase();
    db.system_settings = {
      ...db.system_settings,
      ...req.body,
      updated_at: new Date().toISOString()
    };
    saveDatabase(db);
    res.json(db.system_settings);
  });

  // Stats calculation
  app.get('/api/stats', (req: Request, res: Response) => {
    const db = getDatabase();
    const events = db.events;
    const rooms = db.rooms;

    const totalEvents = events.length;
    const scheduledEvents = events.filter((e) => e.status === 'Scheduled').length;
    const pendingEvents = events.filter((e) => e.status === 'Menunggu Konfirmasi').length;
    const cancelledEvents = events.filter((e) => e.status === 'Dibatalkan').length;

    // Today in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter((e) => e.tanggal === today);

    // Upcoming events (today and future)
    const upcomingEvents = events.filter((e) => e.tanggal >= today && e.status !== 'Dibatalkan');

    // Monthly aggregation
    const monthlyData: Record<string, { confirmed: number; pending: number; cancelled: number }> = {};
    for (const e of events) {
      const monthKey = e.tanggal.substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { confirmed: 0, pending: 0, cancelled: 0 };
      }
      if (e.status === 'Scheduled') monthlyData[monthKey].confirmed++;
      else if (e.status === 'Menunggu Konfirmasi') monthlyData[monthKey].pending++;
      else if (e.status === 'Dibatalkan') monthlyData[monthKey].cancelled++;
    }

    // Room usage stats
    const roomUsageMap: Record<string, number> = {};
    rooms.forEach((r) => (roomUsageMap[r.id] = 0));
    events.forEach((e) => {
      if (e.status !== 'Dibatalkan') {
        (e.ruangan_ids || []).forEach((rId) => {
          roomUsageMap[rId] = (roomUsageMap[rId] || 0) + 1;
        });
      }
    });

    const roomUsageList = rooms.map((r) => ({
      room: r,
      usageCount: roomUsageMap[r.id] || 0
    })).sort((a, b) => b.usageCount - a.usageCount);

    res.json({
      totalEvents,
      scheduledEvents,
      confirmedEvents: scheduledEvents,
      pendingEvents,
      cancelledEvents,
      todayEventsCount: todayEvents.length,
      todayEvents,
      upcomingEventsCount: upcomingEvents.length,
      upcomingEvents: upcomingEvents.slice(0, 5),
      monthlyData,
      roomUsageList,
      totalRooms: rooms.length,
      totalUsers: db.users.length
    });
  });

  // Setup Vite or Static File Serving
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`STEKOM Campus Event Management server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
});
