import React from 'react';
import {
  Activity,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarX,
  Clock,
  Download,
  FileText,
  MapPin,
  Plus,
  ShieldCheck,
  TrendingUp,
  Users
} from 'lucide-react';
import { CampusEvent, Room, UserRole } from '../types';
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

  const statCards = [
    {
      label: 'Total Event',
      value: totalEvents,
      caption: 'Keseluruhan agenda',
      icon: CalendarDays,
      cardClass:
        'bg-gradient-to-br from-[#FAF9F6] via-stone-50 to-slate-100/90 border-stone-200/85',
      labelClass: 'text-slate-600',
      valueClass: 'text-slate-900',
      captionClass: 'text-stone-500',
      iconBoxClass: 'bg-slate-200/70 text-slate-700'
    },
    {
      label: 'Scheduled',
      value: scheduledCount,
      caption: 'Jadwal resmi ditetapkan',
      icon: CalendarCheck,
      cardClass:
        'bg-gradient-to-br from-[#F7FAF8] via-stone-50 to-emerald-50/70 border-emerald-200/70',
      labelClass: 'text-emerald-900',
      valueClass: 'text-emerald-900',
      captionClass: 'text-emerald-700/80',
      iconBoxClass: 'bg-emerald-100/80 text-emerald-800'
    },
    {
      label: 'Menunggu',
      value: pendingCount,
      caption: 'Perlu verifikasi',
      icon: CalendarClock,
      cardClass:
        'bg-gradient-to-br from-[#FCF9F2] via-stone-50 to-amber-50/75 border-amber-200/75',
      labelClass: 'text-amber-900',
      valueClass: 'text-amber-900',
      captionClass: 'text-amber-700/80',
      iconBoxClass: 'bg-amber-100/80 text-amber-800'
    },
    {
      label: 'Dibatalkan',
      value: cancelledCount,
      caption: 'Ruangan dibebaskan',
      icon: CalendarX,
      cardClass:
        'bg-gradient-to-br from-[#FBF6F6] via-stone-50 to-rose-50/65 border-rose-200/70',
      labelClass: 'text-rose-900',
      valueClass: 'text-rose-800',
      captionClass: 'text-rose-700/75',
      iconBoxClass: 'bg-rose-100/75 text-rose-700'
    },
    {
      label: 'Hari Ini',
      value: todayEvents.length,
      caption: formatDateIndo(todayStr),
      icon: Clock,
      cardClass:
        'bg-gradient-to-br from-[#F5F8FB] via-slate-50 to-sky-100/65 border-sky-200/80',
      labelClass: 'text-sky-900',
      valueClass: 'text-sky-900',
      captionClass: 'text-sky-700/80',
      iconBoxClass: 'bg-sky-100/85 text-sky-800'
    },
    {
      label: 'Mendatang',
      value: upcomingEvents.length,
      caption: 'Agenda ke depan',
      icon: TrendingUp,
      cardClass:
        'bg-gradient-to-br from-[#F6F7FA] via-stone-50 to-blue-100/60 border-blue-200/75',
      labelClass: 'text-blue-900',
      valueClass: 'text-blue-900',
      captionClass: 'text-blue-700/80',
      iconBoxClass: 'bg-blue-100/80 text-blue-800'
    }
  ];

  return (
    <div className="space-y-7">
      {/* Warm & Calming Executive Hero Surface */}
      <div className="bg-gradient-to-br from-[#FCFBF8] via-[#F7F4ED] to-[#EFF4F9] rounded-[28px] p-6 sm:p-8 text-stone-800 border border-stone-200/85 shadow-[0_8px_30px_-12px_rgba(41,37,36,0.08)] relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 text-blue-900 text-xs font-semibold mb-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-700" strokeWidth={1.75} />
            <span>Sistem Operasional Kampus STEKOM Terpadu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 text-balance">
            STEKOM Campus Event Management
          </h1>
          <p className="text-sm text-stone-600 mt-2.5 leading-relaxed font-normal max-w-2xl">
            Pusat manajemen jadwal kegiatan akademik, seminar, kuliah umum, dan peminjaman 21 ruangan kampus Universitas STEKOM dengan deteksi bentrok jadwal dan rekapitulasi data resmi.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {userRole !== 'Viewer' && (
              <button
                onClick={onOpenCreateModal}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-blue-800 hover:bg-blue-900 text-white font-semibold text-xs shadow-[0_4px_14px_-4px_rgba(30,64,175,0.45)] transition-all duration-200 active:scale-[0.98] whitespace-nowrap"
              >
                <Plus className="w-4 h-4 text-white" strokeWidth={1.75} />
                <span>Tambah & Jadwalkan Event</span>
              </button>
            )}
            <button
              onClick={onOpenMonthlyRecap}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#FAF8F4] hover:bg-stone-100 text-emerald-900 font-semibold text-xs border border-emerald-200/90 shadow-xs transition-all duration-200 active:scale-[0.98] whitespace-nowrap"
            >
              <Download className="w-4 h-4 text-emerald-700" strokeWidth={1.75} />
              <span>Download Rekap Bulanan</span>
            </button>
            <button
              onClick={() => onNavigateTab('calendar')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#FAF8F4] hover:bg-stone-100 text-stone-700 font-semibold text-xs border border-stone-200/90 shadow-xs transition-all duration-200 whitespace-nowrap"
            >
              <Calendar className="w-4 h-4 text-blue-700" strokeWidth={1.75} />
              <span>Buka Kalender Event</span>
            </button>
            <button
              onClick={() => onNavigateTab('room-monitoring')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#FAF8F4] hover:bg-stone-100 text-stone-700 font-semibold text-xs border border-stone-200/90 shadow-xs transition-all duration-200 whitespace-nowrap"
            >
              <Activity className="w-4 h-4 text-slate-700" strokeWidth={1.75} />
              <span>Live Status 21 Ruangan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary 6 Statistics Cards (Warm Blue/Slate/Stone Gradients & Soft Shadows) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`${card.cardClass} rounded-[22px] p-4 border shadow-[0_4px_18px_-6px_rgba(30,41,59,0.07)] hover:shadow-[0_10px_24px_-8px_rgba(30,41,59,0.12)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between`}
            >
              <div className={`flex items-center justify-between ${card.labelClass}`}>
                <span className="text-xs font-bold tracking-tight">{card.label}</span>
                <div className={`w-8 h-8 rounded-xl ${card.iconBoxClass} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                </div>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-extrabold tabular-nums ${card.valueClass}`}>
                  {card.value}
                </div>
                <p className={`text-[11px] mt-0.5 font-medium ${card.captionClass}`}>
                  {card.caption}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Monthly Chart & Room Usage Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-[#FCFBF8] rounded-[26px] p-6 border border-stone-200/85 shadow-[0_6px_24px_-8px_rgba(41,37,36,0.06)] flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Grafik Sebaran Event Bulanan (2026)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Visualisasi sebaran kegiatan kampus Universitas STEKOM
                </p>
              </div>
              <div className="flex items-center space-x-3.5 text-xs font-medium text-stone-600">
                <span className="flex items-center space-x-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.75} />
                  <span>Scheduled</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.75} />
                  <span>Menunggu</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <CalendarX className="w-3.5 h-3.5 text-rose-500" strokeWidth={1.75} />
                  <span>Batal</span>
                </span>
              </div>
            </div>

            {/* Custom High-Fidelity Bar Chart with Soothing Warm Hues */}
            <div className="pt-6 pb-2">
              <div className="h-48 flex items-end justify-between gap-1.5 sm:gap-2.5 px-2 border-b border-stone-200/80">
                {monthlyStats.map((item, idx) => {
                  const scheduledH = (item.scheduled / maxMonthTotal) * 100;
                  const pendingH = (item.pending / maxMonthTotal) * 100;
                  const cancelledH = (item.cancelled / maxMonthTotal) * 100;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute -top-12 bg-slate-800 text-stone-50 text-[11px] py-1.5 px-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-20 shadow-lg font-medium tabular-nums">
                        <strong>{item.month} 2026</strong>: {item.total} Event
                        <br />
                        {item.scheduled} Scheduled · {item.pending} Menunggu
                      </div>

                      {/* Stacked Bar with Soothing Colors */}
                      <div className="w-full max-w-[26px] flex flex-col-reverse rounded-t-xl overflow-hidden bg-stone-200/60">
                        {item.scheduled > 0 && (
                          <div
                            style={{ height: `${Math.max(scheduledH, 6)}%` }}
                            className="w-full bg-emerald-600/90 transition-all duration-300 group-hover:bg-emerald-700"
                          />
                        )}
                        {item.pending > 0 && (
                          <div
                            style={{ height: `${Math.max(pendingH, 6)}%` }}
                            className="w-full bg-amber-500/90 transition-all duration-300 group-hover:bg-amber-600"
                          />
                        )}
                        {item.cancelled > 0 && (
                          <div
                            style={{ height: `${Math.max(cancelledH, 6)}%` }}
                            className="w-full bg-rose-400/90 transition-all duration-300"
                          />
                        )}
                      </div>

                      <span className="text-[11px] font-semibold text-stone-500 mt-2">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-stone-200/70 flex items-center justify-between text-xs text-stone-500">
            <span className="tabular-nums">Rata-rata kegiatan kampus: ~{Math.round(totalEvents / 12)} event/bulan</span>
            <button
              onClick={onOpenMonthlyRecap}
              className="text-blue-800 font-semibold hover:text-blue-900 hover:underline flex items-center space-x-1.5 text-xs transition"
            >
              <FileText className="w-3.5 h-3.5 text-blue-700" strokeWidth={1.75} />
              <span>Download Rekap Bulanan</span>
            </button>
          </div>
        </div>

        {/* Ringkasan Penggunaan Ruangan (1 Col) */}
        <div className="bg-[#FCFBF8] rounded-[26px] p-6 border border-stone-200/85 shadow-[0_6px_24px_-8px_rgba(41,37,36,0.06)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Penggunaan Ruangan Teratas
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  21 Ruangan Universitas STEKOM
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('rooms')}
                className="text-xs text-blue-800 font-semibold hover:underline"
              >
                Semua Ruang
              </button>
            </div>

            <div className="space-y-2.5">
              {topRooms.map((room) => {
                const maxUsage = Math.max(...topRooms.map((r) => r.usage), 1);
                const percent = Math.round((room.usage / maxUsage) * 100);

                return (
                  <div
                    key={room.id}
                    className="p-3 rounded-2xl bg-gradient-to-r from-stone-100/70 to-slate-100/50 border border-stone-200/75 hover:border-stone-300 transition"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="font-bold text-stone-800 truncate mr-2">
                        {room.name}
                      </div>
                      <span className="text-[11px] font-bold text-blue-800 whitespace-nowrap tabular-nums">
                        {room.usage} Event
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-stone-200/90 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-slate-600 to-blue-700 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 mt-1.5 font-medium">
                      <span>{room.building} · {room.floor}</span>
                      <span className="tabular-nums">Kapasitas: {room.capacity || 'Fleksibel'} org</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('room-monitoring')}
            className="mt-4 w-full py-2.5 bg-gradient-to-r from-slate-100 to-blue-50 hover:from-slate-200/70 hover:to-blue-100/80 text-blue-900 font-semibold text-xs rounded-2xl border border-blue-200/70 transition text-center shadow-xs flex items-center justify-center space-x-2"
          >
            <Building2 className="w-4 h-4 text-blue-700" strokeWidth={1.75} />
            <span>Buka Monitoring 21 Ruangan</span>
          </button>
        </div>
      </div>

      {/* Today's Events & Upcoming Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Hari Ini */}
        <div className="bg-[#FCFBF8] rounded-[26px] p-6 border border-stone-200/85 shadow-[0_6px_24px_-8px_rgba(41,37,36,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-700" strokeWidth={1.75} />
              <h3 className="text-base font-bold text-slate-900">
                Agenda Kampus Hari Ini ({todayEvents.length})
              </h3>
            </div>
            <span className="text-xs font-medium text-stone-500">
              {formatDateFullIndo(todayStr)}
            </span>
          </div>

          {todayEvents.length === 0 ? (
            <div className="py-10 text-center bg-stone-100/60 rounded-2xl border border-dashed border-stone-300/80">
              <Calendar className="w-8 h-8 text-stone-400 mx-auto mb-2" strokeWidth={1.75} />
              <p className="text-xs font-semibold text-stone-700">Tidak ada jadwal kegiatan untuk hari ini</p>
              <p className="text-[11px] text-stone-500 mt-0.5">Seluruh ruangan kampus berstatus siap digunakan</p>
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
                    className="p-4 rounded-2xl border border-stone-200/85 hover:border-blue-300 hover:shadow-sm transition cursor-pointer bg-[#F7F5F0]/80 hover:bg-[#FAF9F5]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {ev.nama_event}
                        </h4>
                        <div className="flex items-center space-x-1.5 text-[11px] text-blue-800 font-medium mt-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0" strokeWidth={1.75} />
                          <span className="truncate">{roomNames}</span>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-xl whitespace-nowrap border ${
                          ev.status === 'Scheduled'
                            ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200/80'
                            : ev.status === 'Menunggu Konfirmasi'
                            ? 'bg-amber-50/90 text-amber-800 border-amber-200/80'
                            : 'bg-rose-50/90 text-rose-800 border-rose-200/80'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2.5 pt-2.5 border-t border-stone-200/70 font-medium tabular-nums">
                      <span className="inline-flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.75} />
                        <span>{ev.jam_mulai} - {ev.jam_selesai} WIB</span>
                      </span>
                      <span className="inline-flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.75} />
                        <span>PIC: {ev.pic} · {ev.jumlah_peserta} org</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Event Mendatang */}
        <div className="bg-[#FCFBF8] rounded-[26px] p-6 border border-stone-200/85 shadow-[0_6px_24px_-8px_rgba(41,37,36,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Jadwal Event Mendatang
            </h3>
            <button
              onClick={() => onNavigateTab('events')}
              className="text-xs text-blue-800 font-semibold hover:underline"
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
                  className="p-4 rounded-2xl border border-stone-200/85 hover:border-blue-300 hover:shadow-sm transition cursor-pointer flex items-center justify-between gap-3 bg-[#F7F5F0]/80 hover:bg-[#FAF9F5]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 text-[11px] text-stone-500 font-medium tabular-nums">
                      <span className="font-semibold text-blue-800">{formatDateIndo(ev.tanggal)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{ev.jam_mulai} WIB</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 truncate mt-1">
                      {ev.nama_event}
                    </h4>
                    <p className="text-[11px] text-stone-500 truncate mt-0.5 font-medium">
                      {roomNames} · PIC: {ev.pic}
                    </p>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-xl whitespace-nowrap shrink-0 border ${
                      ev.status === 'Scheduled'
                        ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200/80'
                        : 'bg-amber-50/90 text-amber-800 border-amber-200/80'
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
