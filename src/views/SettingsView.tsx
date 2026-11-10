import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Database,
  Download,
  Flame,
  Globe,
  HardDrive,
  Info,
  RefreshCw,
  RotateCcw,
  Server,
  Shield,
  Terminal
} from 'lucide-react';
import { UserRole } from '../types';

interface SettingsViewProps {
  userRole: UserRole;
  onResetData: () => Promise<void>;
  eventsCount: number;
  roomsCount: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userRole,
  onResetData,
  eventsCount,
  roomsCount
}) => {
  const [resetting, setResetting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleReset = async () => {
    if (
      window.confirm(
        'Apakah Anda yakin ingin me-reset data contoh STEKOM ke kondisi awal? Seluruh perubahan jadwal yang ditambahkan saat pengujian akan dikembalikan ke data default demonstrasi.'
      )
    ) {
      try {
        setResetting(true);
        await onResetData();
        alert('Data contoh berhasil di-reset ulang ke kondisi awal.');
      } catch (err: any) {
        alert(err.message || 'Gagal mereset data');
      } finally {
        setResetting(false);
      }
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const firebaseEnvSnippet = `# ========================================================
# KONFIGURASI DATABASE & FIREBASE (SERVER-SIDE ONLY)
# Jangan meletakkan secret keys di frontend client!
# ========================================================
FIREBASE_PROJECT_ID="stekom-campus-events"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@stekom-campus-events.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
DATABASE_PERSISTENCE_MODE="file_json" # atau "firestore"
`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
          <Database className="w-6 h-6 text-blue-600" />
          <span>Pengaturan Sistem, Database & Panduan Deployment</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Informasi status persistensi data, konfigurasi Firebase Firestore, dan pemulihan data contoh
        </p>
      </div>

      {/* Active Persistence Status Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Status Database Backend: AKTIF & PERSISTEN
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Penyimpanan file terstruktur JSON di backend (<code className="text-blue-700">/data/db.json</code>) dengan sinkronisasi otomatis. Data tidak hilang setelah refresh atau restart browser.
              </p>
            </div>
          </div>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Mereset...' : 'Reset Data Contoh (DEMO)'}</span>
          </button>
        </div>

        {/* Quick summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-xl bg-slate-50">
            <span className="text-slate-400 text-[11px]">Total Ruangan STEKOM:</span>
            <p className="font-extrabold text-slate-900 text-sm mt-0.5">{roomsCount} Ruang Terdaftar</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50">
            <span className="text-slate-400 text-[11px]">Total Event Aktif:</span>
            <p className="font-extrabold text-blue-700 text-sm mt-0.5">{eventsCount} Agenda Terjadwal</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50">
            <span className="text-slate-400 text-[11px]">Zona Waktu Sistem:</span>
            <p className="font-extrabold text-slate-900 text-sm mt-0.5">Asia/Jakarta (WIB)</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50">
            <span className="text-slate-400 text-[11px]">Keamanan API Frontend:</span>
            <p className="font-extrabold text-emerald-700 text-sm mt-0.5">Proxy Server (No API Key Leak)</p>
          </div>
        </div>
      </div>

      {/* Firebase & Firestore Deployment Documentation */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
          <Flame className="w-5 h-5 text-amber-500" />
          <span>Panduan Konfigurasi & Integrasi Firebase Cloud Firestore</span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Aplikasi dirancang dengan arsitektur modular yang mendukung migrasi langsung ke <strong>Firebase Cloud Firestore</strong> dan <strong>Firebase Authentication</strong>. Untuk keamanan produksi, API key atau Firebase Service Account credentials dikelola sepenuhnya di sisi server (<code className="text-slate-800">server.ts</code>), bukan diekspos di frontend client.
        </p>

        {/* Code Snippet Box */}
        <div className="relative bg-slate-900 rounded-2xl p-4 text-xs font-mono text-slate-200 overflow-x-auto">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
            <span>Contoh Konfigurasi .env.production</span>
            <button
              onClick={() => copyToClipboard(firebaseEnvSnippet, 'env')}
              className="flex items-center space-x-1 text-blue-400 hover:text-blue-300"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedKey === 'env' ? 'Tersalin!' : 'Salin Kode'}</span>
            </button>
          </div>
          <pre className="text-[11px] leading-relaxed">{firebaseEnvSnippet}</pre>
        </div>

        {/* Steps List */}
        <div className="space-y-2 pt-2 text-xs text-slate-700">
          <h4 className="font-bold text-slate-900">Langkah Deployment Produksi:</h4>
          <ol className="list-decimal pl-5 space-y-1.5 text-slate-600">
            <li>
              <strong>Build Aplikasi:</strong> Jalankan perintah <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-mono">npm run build</code> untuk memproduksi bundle frontend di folder <code className="font-mono">dist/</code>.
            </li>
            <li>
              <strong>Jalankan Server:</strong> Jalankan <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-mono">npm start</code> (menjalankan <code className="font-mono">tsx server.ts</code> dengan <code className="font-mono">NODE_ENV=production</code>).
            </li>
            <li>
              <strong>Database File vs Firestore:</strong> Server otomatis mendeteksi ketersediaan Firestore. Jika belum dikonfigurasi, sistem menggunakan persistent file storage di <code className="font-mono">/data/db.json</code> yang menjamin 100% fungsionalitas tanpa dependensi eksternal yang memblokir.
            </li>
          </ol>
        </div>
      </div>

      {/* Campus Identity & Location Info */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
          <Globe className="w-4 h-4 text-blue-600" />
          <span>Informasi Institusi Universitas STEKOM</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700 pt-1">
          <div>
            <p className="font-semibold text-slate-500">Nama Kampus:</p>
            <p className="font-bold text-slate-900 mt-0.5">
              Universitas Sains & Teknologi Komputer (Universitas STEKOM)
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-500">Alamat Kampus Pusat:</p>
            <p className="font-bold text-slate-900 mt-0.5">
              Jl. Majapahit No. 605, Pedurungan Kidul, Semarang, Jawa Tengah 50192
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-500">Kontak Resmi:</p>
            <p className="font-bold text-slate-900 mt-0.5">
              (024) 6723456 • WhatsApp Sarpras: 0812-3456-7890
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-500">Portal Website:</p>
            <p className="font-bold text-blue-600 mt-0.5">
              https://stekom.ac.id
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
