import React, { useState } from 'react';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  History,
  Search,
  Shield,
  User,
  XCircle
} from 'lucide-react';
import { AuditLog } from '../types';
import { formatDateFullIndo, formatDateIndo } from '../utils/conflictDetector';

interface AuditLogsViewProps {
  logs: AuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.target_name.toLowerCase().includes(q) ||
        log.user_name.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.target_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <History className="w-6 h-6 text-blue-700" />
            <span>Audit Log & Jejak Aktivitas Sistem</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            Pencatatan menyeluruh setiap penambahan, pengubahan, pembatalan jadwal, perubahan status, dan hak akses
          </p>
        </div>

        <div className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200/70 shadow-xs tabular-nums">
          Total Log: {logs.length} Aktivitas
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-stone-500">Filter Tindakan:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-stone-50/80 border border-stone-200 rounded-xl font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Semua Tindakan</option>
            <option value="LOGIN">Login Pengguna</option>
            <option value="LOGOUT">Logout Pengguna</option>
            <option value="TAMBAH">Tambah Data</option>
            <option value="UBAH">Ubah Data</option>
            <option value="KONFIRMASI">Konfirmasi Jadwal</option>
            <option value="BATALKAN">Batalkan Event</option>
            <option value="HAPUS">Hapus Data</option>
            <option value="RUANGAN_STATUS">Status Ruangan</option>
            <option value="PENGATURAN">Pengaturan</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari event, petugas, detail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3.5 py-1.5 text-xs bg-stone-50/80 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64 font-medium text-stone-800"
          />
        </div>
      </div>

      {/* Log Feed */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-6 space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-xs font-medium">
            Belum ada aktivitas audit log yang cocok dengan filter pencarian.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isAdd = log.action === 'TAMBAH';
            const isConfirm = log.action === 'KONFIRMASI';
            const isCancel = log.action === 'BATALKAN';
            const isDelete = log.action === 'HAPUS';
            const isLogin = log.action === 'LOGIN';
            const isLogout = log.action === 'LOGOUT';

            const badgeBg = isConfirm || isLogin
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : isCancel || isDelete
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : isLogout
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : isAdd
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-indigo-50 text-indigo-800 border-indigo-200';

            return (
              <div
                key={log.id}
                className="p-4 rounded-2xl border border-stone-200/80 bg-stone-50/40 hover:bg-white transition flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${badgeBg}`}>
                      {log.action}
                    </span>
                    <span className="font-semibold text-stone-500">
                      [{log.target_type}]
                    </span>
                    <span className="font-bold text-slate-900">
                      {log.target_name}
                    </span>
                  </div>

                  <p className="text-stone-600 leading-relaxed pt-1 font-medium">
                    {log.details}
                  </p>

                  <div className="flex items-center space-x-3 text-[11px] text-stone-400 pt-1">
                    <span>
                      Oleh: <strong className="text-stone-800 font-semibold">{log.user_name}</strong> ({log.user_role})
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-stone-400 whitespace-nowrap sm:text-right shrink-0 tabular-nums">
                  <div className="font-bold text-stone-700">
                    {log.timestamp ? formatDateIndo(log.timestamp.split('T')[0]) : '-'}
                  </div>
                  <div>
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
