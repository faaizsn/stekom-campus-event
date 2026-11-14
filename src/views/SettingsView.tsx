import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Globe,
  RotateCcw,
  Server,
  ShieldCheck
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirmReset = async () => {
    setConfirmOpen(false);
    try {
      setResetting(true);
      await onResetData();
    } catch {
      // toast handled by App.tsx
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center space-x-2">
          <Database className="w-6 h-6 text-blue-700" strokeWidth={1.75} />
          <span>Pengaturan Sistem & Backend Database</span>
        </h1>
        <p className="text-xs text-stone-500 mt-1 font-medium">
          Informasi status database SQLite server, autentikasi user/kata sandi, dan pemulihan data contoh Universitas STEKOM
        </p>
      </div>

      {/* Active Persistence Status Card */}
      <div className="bg-[#FCFBF8] rounded-[26px] p-6 border border-stone-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <Server className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="text-sm font-bold text-stone-900">
                  Status Database: AKTIF & TERSIMPAN PERSISTEN
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  SQLite Backend Server
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Seluruh data jadwal event, 21 ruangan STEKOM, akun pengguna, dan audit log tersimpan langsung di database SQLite pada server backend tanpa memerlukan layanan autentikasi eksternal.
              </p>
            </div>
          </div>

          {userRole === 'Administrator' && (
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={resetting}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition disabled:opacity-50 shrink-0 self-start sm:self-auto"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              <span>{resetting ? 'Mereset...' : 'Reset Data Contoh (DEMO)'}</span>
            </button>
          )}
        </div>

        {/* Quick summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-stone-200/70 text-xs">
          <div className="p-3 rounded-xl bg-[#F7F5F0] border border-stone-200/60">
            <span className="text-stone-500 text-[11px]">Total Ruangan STEKOM:</span>
            <p className="font-extrabold text-stone-900 text-sm mt-0.5">{roomsCount} Ruang Terdaftar</p>
          </div>
          <div className="p-3 rounded-xl bg-[#F7F5F0] border border-stone-200/60">
            <span className="text-stone-500 text-[11px]">Total Event Aktif:</span>
            <p className="font-extrabold text-blue-700 text-sm mt-0.5">{eventsCount} Agenda Terjadwal</p>
          </div>
          <div className="p-3 rounded-xl bg-[#F7F5F0] border border-stone-200/60">
            <span className="text-stone-500 text-[11px]">Zona Waktu Sistem:</span>
            <p className="font-extrabold text-stone-900 text-sm mt-0.5">Asia/Jakarta (WIB)</p>
          </div>
          <div className="p-3 rounded-xl bg-[#F7F5F0] border border-stone-200/60">
            <span className="text-stone-500 text-[11px]">Metode Autentikasi:</span>
            <p className="font-extrabold text-emerald-700 text-sm mt-0.5">User & Kata Sandi Lokal</p>
          </div>
        </div>
      </div>

      {/* Backend Architecture Summary */}
      <div className="bg-[#FCFBF8] rounded-[26px] p-6 border border-stone-200/90 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-stone-900 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-blue-700" strokeWidth={1.75} />
          <span>Arsitektur Penyimpanan & Keamanan Backend</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-700">
          <div className="p-3.5 rounded-2xl bg-[#F7F5F0] border border-stone-200/70 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-stone-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
              <span>Database SQLite Terintegrasi Server</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Setiap penambahan event, perubahan ruangan, maupun pembuatan akun langsung tersimpan persisten di database SQLite server (WAL mode).
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F7F5F0] border border-stone-200/70 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-stone-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
              <span>Login User/Sandi & RBAC Langsung Aktif</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Verifikasi hak akses Administrator, Operator, dan Viewer dijalankan langsung oleh server API tanpa perlu setup provider eksternal.
            </p>
          </div>
        </div>
      </div>

      {/* Campus Identity & Location Info */}
      <div className="bg-[#FCFBF8] rounded-[26px] p-6 border border-stone-200/90 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center space-x-1.5">
          <Globe className="w-4 h-4 text-blue-700" strokeWidth={1.75} />
          <span>Informasi Institusi Universitas STEKOM</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-stone-700 pt-1">
          <div>
            <p className="font-semibold text-stone-500">Nama Kampus:</p>
            <p className="font-bold text-stone-900 mt-0.5">
              Universitas Sains & Teknologi Komputer (Universitas STEKOM)
            </p>
          </div>
          <div>
            <p className="font-semibold text-stone-500">Alamat Kampus Pusat:</p>
            <p className="font-bold text-stone-900 mt-0.5">
              Jl. Majapahit No. 605, Pedurungan Kidul, Semarang, Jawa Tengah 50192
            </p>
          </div>
          <div>
            <p className="font-semibold text-stone-500">Kontak Resmi:</p>
            <p className="font-bold text-stone-900 mt-0.5">
              (024) 6723456 • WhatsApp Sarpras: 0812-3456-7890
            </p>
          </div>
          <div>
            <p className="font-semibold text-stone-500">Portal Website:</p>
            <p className="font-bold text-blue-700 mt-0.5">
              https://stekom.ac.id
            </p>
          </div>
        </div>
      </div>

      {/* Confirm Reset Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-[#FCFBF8] rounded-[26px] shadow-2xl max-w-sm w-full p-6 border border-stone-200/90 space-y-4 text-xs">
            <div className="flex items-center space-x-2 text-amber-700">
              <AlertTriangle className="w-5 h-5 shrink-0" strokeWidth={1.75} />
              <h3 className="text-sm font-extrabold text-stone-900">Reset Data Contoh STEKOM?</h3>
            </div>
            <p className="text-stone-600 leading-relaxed">
              Seluruh jadwal event dan data 21 ruangan di database SQLite akan dikembalikan ke data awal default Universitas STEKOM (akun pengguna tetap dipertahankan). Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-3.5 py-2 font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition"
              >
                Ya, Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
