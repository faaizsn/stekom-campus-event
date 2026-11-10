import React from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarX,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users
} from 'lucide-react';
import { CampusEvent, Room, UserRole } from '../../src/types';
import { formatDateFullIndo, formatDateIndo } from '../utils/conflictDetector';

interface DashboardViewProps {
  events: CampusEvent[];
  rooms: Room[];
  userRole: UserRole;
  onOpenCreateModal: () => void;
  onSelectEvent: (event: CampusEvent) => void;
  onNavigateTab: (tab: any) => void;
  onOpenMonthlyRecap: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  events,
  rooms,
  userRole,
  onOpenCreateModal,
  onSelectEvent,
  onNavigateTab,
  onOpenMonthlyRecap
}) => {
  const totalEvents = events.length;
  const scheduledCount = events.filter((e) => e.status === 'Scheduled').length;
  const pendingCount = events.filter((e) => e.status === 'Menunggu Konfirmasi').length;
  const cancelledCount = events.filter((e) => e.status === 'Dibatalkan').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter((e) => e.tanggal === todayStr);
  const upcomingEvents = events
    .filter((e) => e.tanggal >= todayStr && e.status !== 'Dibatalkan')
    .sort((a, b) => `${a.tanggal} ${a.jam_mulai}`.localeCompare(`${b.tanggal} ${b.jam_mulai}`))
    .slice(0, 5);

  // Real room usage calculation
  const roomUsageMap: Record<string, number> = {};
  rooms.forEach((r) => (roomUsageMap[r.id] = 0));
  events.forEach((e) => {
    if (e.status !== 'Dibatalkan') {
      (e.ruangan_ids || []).forEach((rId) => {
        roomUsageMap[rId] = (roomUsageMap[rId] || 0) + 1;
      });
    }
  });

  const topRooms = [...rooms]
    .map((r) => ({ ...r, usage: roomUsageMap[r.id] || 0 }))
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 6);

  // Monthly distribution aggregation from real events
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = i + 1;
    const mStr = String(monthIndex).padStart(2, '0');
    const scheduled = events.filter(
      (e) => e.status === 'Scheduled' && e.tanggal.split('-')[1] === mStr
    ).length;
    const pending = events.filter(
      (e) => e.status === 'Menunggu Konfirmasi' && e.tanggal.split('-')[1] === mStr
    ).length;
    const cancelled = events.filter(
      (e) => e.status === 'Dibatalkan' && e.tanggal.split('-')[1] === mStr
    ).length;
    return {
      month: monthNames[i],
      scheduled,
      pending,
      cancelled,
      total: scheduled + pending + cancelled
    };
  });

  const maxMonthTotal = Math.max(...monthlyStats.map((m) => m.total), 4);
  const roomMap = new Map(rooms.map((r) => [r.id, r]));

  return (
    <div className="space-y-6">
      {/* Warm & Calming Executive Hero Card */}
      <div className="bg-gradient-to-br from-white via-sky-50/40 to-amber-50/30 rounded-3xl p-6 sm:p-8 text-stone-800 border border-stone-200/90 shadow-[0_2px_12px_rgba(30,41,59,0.04)] relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-[0.04] pointer-events-none flex items-center pr-10 text-blue-900">
          <Building2 className="w-96 h-96" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 text-blue-900 text-xs font-bold mb-3 border border-blue-200/70">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
            <span>Sistem Operasional Kampus STEKOM Terpadu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            STEKOM CAMPUS EVENT MANAGEMENT
          </h1>
          <p className="text-sm text-stone-600 mt-2 leading-relaxed font-normal">
            Pusat manajemen jadwal kegiatan akademik, seminar, kuliah umum, dan peminjaman 21 ruangan kampus Universitas STEKOM dengan sistem deteksi bentrok real-time dan rekapitulasi data resmi.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {userRole !== 'Viewer' && (
              <button
                onClick={onOpenCreateModal}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm shadow-blue-700/25 transition active:scale-95"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Tambah & Jadwalkan Event</span>
              </button>
            )}
            <button
              onClick={onOpenMonthlyRecap}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm shadow-emerald-700/25 transition active:scale-95"
            >
              <Download className="w-4 h-4 text-emerald-100" />
              <span>Download Rekap Bulanan</span>
            </button>
            <button
              onClick={() => onNavigateTab('calendar')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs border border-stone-200/90 shadow-xs transition"
            >
              <Calendar className="w-4 h-4 text-blue-700" />
              <span>Buka Kalender Event</span>
            </button>
            <button
              onClick={() => onNavigateTab('room-monitoring')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs border border-stone-200/90 shadow-xs transition"
            >
              <Activity className="w-4 h-4 text-emerald-700" />
              <span>Live Status 21 Ruangan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary 6 Metrics Cards (Warm, Calming, Clear Hierarchy) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Event */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold">Total Event</span>
            <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-slate-700">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-slate-900 tabular-nums">{totalEvents}</div>
            <p className="text-[10px] text-stone-400 mt-0.5 font-medium">Keseluruhan agenda</p>
          </div>
        </div>

        {/* Scheduled */}
        <div className="bg-emerald-50/40 rounded-2xl p-4 border border-emerald-200/70 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold">Scheduled</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-800">
              <CalendarCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-emerald-800 tabular-nums">{scheduledCount}</div>
            <p className="text-[10px] text-emerald-700/80 mt-0.5 font-medium">Jadwal resmi ditetapkan</p>
          </div>
        </div>

        {/* Menunggu Konfirmasi */}
        <div className="bg-amber-50/40 rounded-2xl p-4 border border-amber-200/70 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold">Menunggu</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100/80 flex items-center justify-center text-amber-800">
              <CalendarClock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-amber-800 tabular-nums">{pendingCount}</div>
            <p className="text-[10px] text-amber-700/80 mt-0.5 font-medium">Perlu verifikasi</p>
          </div>
        </div>

        {/* Dibatalkan */}
        <div className="bg-rose-50/30 rounded-2xl p-4 border border-rose-200/70 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-bold">Dibatalkan</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100/70 flex items-center justify-center text-rose-700">
              <CalendarX className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-rose-700 tabular-nums">{cancelledCount}</div>
            <p className="text-[10px] text-rose-600/70 mt-0.5 font-medium">Ruangan dibebaskan</p>
          </div>
        </div>

        {/* Event Hari Ini */}
        <div className="bg-sky-50/40 rounded-2xl p-4 border border-sky-200/70 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-800">
            <span className="text-xs font-bold">Hari Ini</span>
            <div className="w-7 h-7 rounded-lg bg-sky-100/80 flex items-center justify-center text-sky-800">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-sky-800 tabular-nums">{todayEvents.length}</div>
            <p className="text-[10px] text-sky-700/80 mt-0.5 font-medium">{formatDateIndo(todayStr)}</p>
          </div>
        </div>

        {/* Event Mendatang */}
        <div className="bg-indigo-50/30 rounded-2xl p-4 border border-indigo-200/70 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-800">
            <span className="text-xs font-bold">Mendatang</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100/80 flex items-center justify-center text-indigo-800">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-indigo-800 tabular-nums">{upcomingEvents.length}</div>
            <p className="text-[10px] text-indigo-700/80 mt-0.5 font-medium">Agenda ke depan</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Monthly Chart & Room Usage Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Grafik Sebaran Event Bulanan (2026)
                </h3>
                <p className="text-xs text-stone-500">
                  Visualisasi sebaran kegiatan kampus Universitas STEKOM
                </p>
              </div>
              <div className="flex items-center space-x-3 text-[11px] font-semibold">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span className="text-stone-700">Scheduled</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-stone-700">Menunggu</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="text-stone-700">Batal</span>
                </span>
              </div>
            </div>

            {/* Custom High-Fidelity SVG/CSS Bar Chart with Soothing Warm Hues */}
            <div className="pt-6 pb-2">
              <div className="h-48 flex items-end justify-between gap-1 sm:gap-2.5 px-2 border-b border-stone-100">
                {monthlyStats.map((item, idx) => {
                  const scheduledH = (item.scheduled / maxMonthTotal) * 100;
                  const pendingH = (item.pending / maxMonthTotal) * 100;
                  const cancelledH = (item.cancelled / maxMonthTotal) * 100;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute -top-12 bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-20 shadow-lg font-medium">
                        <strong>{item.month} 2026</strong>: {item.total} Event
                        <br />
                        ✓ {item.scheduled} Scheduled · ⏳ {item.pending} Menunggu
                      </div>

                      {/* Stacked Bar with Soothing Colors */}
                      <div className="w-full max-w-[26px] flex flex-col-reverse rounded-t-lg overflow-hidden bg-stone-100/80">
                        {item.scheduled > 0 && (
                          <div
                            style={{ height: `${Math.max(scheduledH, 6)}%` }}
                            className="w-full bg-emerald-600 transition-all duration-300 group-hover:bg-emerald-700"
                          />
                        )}
                        {item.pending > 0 && (
                          <div
                            style={{ height: `${Math.max(pendingH, 6)}%` }}
                            className="w-full bg-amber-500 transition-all duration-300 group-hover:bg-amber-600"
                          />
                        )}
                        {item.cancelled > 0 && (
                          <div
                            style={{ height: `${Math.max(cancelledH, 6)}%` }}
                            className="w-full bg-rose-400 transition-all duration-300"
                          />
                        )}
                      </div>

                      <span className="text-[10px] font-bold text-stone-500 mt-2">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Rata-rata kegiatan kampus: ~{Math.round(totalEvents / 12)} event/bulan</span>
            <button
              onClick={onOpenMonthlyRecap}
              className="text-blue-700 font-bold hover:underline flex items-center space-x-1 text-xs"
            >
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              <span>Download Rekap Bulanan</span>
            </button>
          </div>
        </div>

        {/* Ringkasan Penggunaan Ruangan (1 Col) */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Penggunaan Ruangan Teratas
                </h3>
                <p className="text-xs text-stone-500">
                  21 Ruangan Universitas STEKOM
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('rooms')}
                className="text-xs text-blue-700 font-bold hover:underline"
              >
                Semua Ruang
              </button>
            </div>

            <div className="space-y-3">
              {topRooms.map((room) => {
                const maxUsage = Math.max(...topRooms.map((r) => r.usage), 1);
                const percent = Math.round((room.usage / maxUsage) * 100);

                return (
                  <div key={room.id} className="p-2.5 rounded-xl bg-stone-50/70 border border-stone-200/80 hover:bg-stone-50 transition">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="font-bold text-stone-800 truncate mr-2">
                        {room.name}
                      </div>
                      <span className="text-[11px] font-bold text-blue-800 whitespace-nowrap tabular-nums">
                        {room.usage} Event
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-700 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1 font-medium">
                      <span>{room.building} ({room.floor})</span>
                      <span>Kapasitas: {room.capacity || 'Fleksibel'} org</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('room-monitoring')}
            className="mt-4 w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs rounded-xl transition text-center shadow-xs"
          >
            Buka Monitoring 21 Ruangan
          </button>
        </div>
      </div>

      {/* Today's Events & Upcoming Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Hari Ini */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
              <h3 className="text-base font-bold text-slate-900">
                Agenda Kampus Hari Ini ({todayEvents.length})
              </h3>
            </div>
            <span className="text-xs font-semibold text-stone-500">
              {formatDateFullIndo(todayStr)}
            </span>
          </div>

          {todayEvents.length === 0 ? (
            <div className="py-8 text-center bg-stone-50/70 rounded-2xl border border-dashed border-stone-200">
              <Calendar className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-stone-600">Tidak ada jadwal kegiatan untuk hari ini</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Seluruh ruangan kampus berstatus siap digunakan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayEvents.map((ev) => {
                const roomNames = (ev.ruangan_ids || [])
                  .map((id) => roomMap.get(id)?.name || id)
                  .join(', ');

                return (
                  <div
                    key={ev.id}
                    onClick={() => onSelectEvent(ev)}
                    className="p-3.5 rounded-2xl border border-stone-200/90 hover:border-blue-400 hover:shadow-sm transition cursor-pointer bg-stone-50/40 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {ev.nama_event}
                        </h4>
                        <p className="text-[11px] text-blue-800 font-semibold mt-1">
                          📍 {roomNames}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          ev.status === 'Scheduled'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : ev.status === 'Menunggu Konfirmasi'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2 pt-2 border-t border-stone-200/60 font-medium">
                      <span>🕒 {ev.jam_mulai} - {ev.jam_selesai} WIB</span>
                      <span>PIC: {ev.pic} ({ev.jumlah_peserta} org)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Event Mendatang */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Jadwal Event Mendatang
            </h3>
            <button
              onClick={() => onNavigateTab('events')}
              className="text-xs text-blue-700 font-bold hover:underline"
            >
              Lihat Semua
            </button>
          </div>

          <div className="space-y-3">
            {upcomingEvents.map((ev) => {
              const roomNames = (ev.ruangan_ids || [])
                .map((id) => roomMap.get(id)?.name || id)
                .join(', ');

              return (
                <div
                  key={ev.id}
                  onClick={() => onSelectEvent(ev)}
                  className="p-3.5 rounded-2xl border border-stone-200/90 hover:border-blue-400 hover:shadow-sm transition cursor-pointer flex items-center justify-between gap-3 bg-stone-50/40 hover:bg-white"
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-800 rounded-md">
                        {formatDateIndo(ev.tanggal)}
                      </span>
                      <span className="text-[11px] text-stone-400 tabular-nums">
                        {ev.jam_mulai} WIB
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 truncate mt-1">
                      {ev.nama_event}
                    </h4>
                    <p className="text-[11px] text-stone-500 truncate mt-0.5 font-medium">
                      {roomNames} · PIC: {ev.pic}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                      ev.status === 'Scheduled'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {ev.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
