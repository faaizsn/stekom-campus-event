import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  Layers,
  MapPin,
  Plus,
  Users
} from 'lucide-react';
import { FilterBar } from '../components/FilterBar';
import { CampusEvent, FilterOptions, Room, UserRole } from '../types';
import { formatDateFullIndo, formatDateIndo } from '../utils/conflictDetector';

interface CalendarViewProps {
  events: CampusEvent[];
  rooms: Room[];
  userRole: UserRole;
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  onResetFilters: () => void;
  onSelectEvent: (event: CampusEvent) => void;
  onAddEventOnDate: (dateStr: string) => void;
  onOpenMonthlyRecap?: (month: string, year: string) => void;
}

type CalendarViewMode = 'month' | 'week' | 'day';

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  rooms,
  userRole,
  filters,
  setFilters,
  onResetFilters,
  onSelectEvent,
  onAddEventOnDate,
  onOpenMonthlyRecap
}) => {
  // Current viewing date (default: November 2026 or today)
  const [currentDate, setCurrentDate] = useState(() => {
    return new Date('2026-11-10T00:00:00');
  });

  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');

  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  // Apply filters consistently
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filters.status !== 'all' && ev.status !== filters.status) return false;
      if (filters.roomId !== 'all' && !ev.ruangan_ids?.includes(filters.roomId)) return false;
      if (filters.pic.trim() && !ev.pic.toLowerCase().includes(filters.pic.toLowerCase())) return false;
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchTitle = ev.nama_event.toLowerCase().includes(q);
        const matchPic = ev.pic.toLowerCase().includes(q);
        if (!matchTitle && !matchPic) return false;
      }
      return true;
    });
  }, [events, filters]);

  // Navigation helpers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date('2026-11-10T00:00:00'));
  };

  // Month grid calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthTitle = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric'
  }).format(currentDate);

  const startDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Calendar cells matrix (42 cells: 6 rows of 7 days)
  const calendarCells = useMemo(() => {
    const cells = [];

    // Prev month filler
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const mStr = String(month === 0 ? 12 : month).padStart(2, '0');
      const yStr = month === 0 ? year - 1 : year;
      const dateStr = `${yStr}-${mStr}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        events: filteredEvents.filter((e) => e.tanggal === dateStr)
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        events: filteredEvents.filter((e) => e.tanggal === dateStr)
      });
    }

    // Next month filler
    const remaining = 42 - cells.length; // 6 rows of 7
    for (let day = 1; day <= remaining; day++) {
      const mStr = String(month === 11 ? 1 : month + 2).padStart(2, '0');
      const yStr = month === 11 ? year + 1 : year;
      const dateStr = `${yStr}-${mStr}-${String(day).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: false,
        events: filteredEvents.filter((e) => e.tanggal === dateStr)
      });
    }

    return cells;
  }, [year, month, startDayOfWeek, daysInMonth, filteredEvents]);

  // Week View calculation
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const monday = new Date(curr.setDate(diff));

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(d);
      return {
        dateStr,
        dayNumber: d.getDate(),
        dayName,
        events: filteredEvents.filter((e) => e.tanggal === dateStr)
      };
    });
  }, [currentDate, filteredEvents]);

  const canModify = userRole === 'Administrator' || userRole === 'Operator';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Kalender Agenda & Ruangan STEKOM
          </h1>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            Visualisasi kalender interaktif: klik tanggal untuk menambah event, klik event untuk detail
          </p>
        </div>

        {/* View Mode Switcher & Navigation */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center bg-stone-100/90 rounded-xl p-1 border border-stone-200/80 text-xs font-bold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'month'
                  ? 'bg-white text-blue-900 shadow-xs border border-stone-200/70'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Bulan
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'week'
                  ? 'bg-white text-blue-900 shadow-xs border border-stone-200/70'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Minggu
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'day'
                  ? 'bg-white text-blue-900 shadow-xs border border-stone-200/70'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Hari
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrev}
              className="p-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition shadow-xs"
              title="Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl transition shadow-xs"
            >
              Hari Ini
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition shadow-xs"
              title="Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {onOpenMonthlyRecap && (
            <button
              onClick={() =>
                onOpenMonthlyRecap(
                  String(month + 1).padStart(2, '0'),
                  String(year)
                )
              }
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-emerald-900 bg-emerald-50/80 border border-emerald-200 hover:bg-emerald-100 rounded-xl shadow-xs transition"
              title="Download rekap bulan ini"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Rekap Bulan Ini</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Component */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        rooms={rooms}
        onReset={onResetFilters}
      />

      {/* Current Month / Period Title Bar & Status Legend */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-slate-900 capitalize flex items-center space-x-2">
          <span>{monthTitle}</span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200/70">
            {filteredEvents.length} Event Terdaftar
          </span>
        </h2>

        {/* Status Legend */}
        <div className="flex items-center space-x-4 text-xs font-bold text-stone-600">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Scheduled</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Menunggu</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span>Dibatalkan</span>
          </span>
        </div>
      </div>

      {/* Main Calendar Display */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden">
          {/* Days of week */}
          <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/80 text-center text-xs font-bold text-stone-600 py-3">
            <div>Minggu</div>
            <div>Senin</div>
            <div>Selasa</div>
            <div>Rabu</div>
            <div>Kamis</div>
            <div>Jumat</div>
            <div>Sabtu</div>
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-stone-100 min-h-[580px]">
            {calendarCells.map((cell, idx) => {
              const isToday =
                cell.dateStr === new Date('2026-11-10T00:00:00').toISOString().split('T')[0];

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (canModify) {
                      onAddEventOnDate(cell.dateStr);
                    }
                  }}
                  className={`p-2 min-h-[105px] flex flex-col justify-between transition group relative cursor-pointer ${
                    cell.isCurrentMonth
                      ? 'bg-white hover:bg-stone-50/80'
                      : 'bg-stone-50/40 text-stone-300'
                  }`}
                >
                  {/* Date Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center tabular-nums ${
                        isToday
                          ? 'bg-blue-700 text-white font-black'
                          : cell.isCurrentMonth
                          ? 'text-stone-800'
                          : 'text-stone-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {canModify && (
                      <span className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-700 font-bold transition">
                        + Tambah
                      </span>
                    )}
                  </div>

                  {/* Events list in cell */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-24">
                    {cell.events.map((ev) => {
                      const roomNames = (ev.ruangan_ids || [])
                        .map((id) => roomMap.get(id)?.name || id)
                        .slice(0, 1)
                        .join(', ');

                      const pillColor =
                        ev.status === 'Scheduled'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : ev.status === 'Menunggu Konfirmasi'
                          ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          : 'bg-rose-50 text-rose-800 border-rose-200 line-through opacity-70';

                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(ev);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border truncate cursor-pointer transition shadow-2xs ${pillColor}`}
                          title={`${ev.nama_event} (${ev.jam_mulai} - ${ev.jam_selesai}) - ${roomNames}`}
                        >
                          <span className="font-extrabold mr-1 tabular-nums">{ev.jam_mulai}</span>
                          {ev.nama_event}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden">
          <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/80 text-center py-3">
            {weekDays.map((w, idx) => (
              <div key={idx} className="space-y-0.5">
                <p className="text-[11px] font-bold text-stone-500 uppercase">{w.dayName}</p>
                <p className="text-sm font-black text-slate-900 tabular-nums">{w.dayNumber}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-stone-100 min-h-[480px]">
            {weekDays.map((w, idx) => (
              <div
                key={idx}
                className="p-2 space-y-2 bg-white hover:bg-stone-50/60 transition cursor-pointer"
                onClick={() => canModify && onAddEventOnDate(w.dateStr)}
              >
                {w.events.length === 0 ? (
                  <p className="text-[11px] text-stone-300 text-center pt-8">Tidak ada event</p>
                ) : (
                  w.events.map((ev) => {
                    const roomNames = (ev.ruangan_ids || [])
                      .map((id) => roomMap.get(id)?.name || id)
                      .join(', ');

                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className={`p-2 rounded-xl border text-xs cursor-pointer shadow-xs transition hover:scale-102 ${
                          ev.status === 'Scheduled'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : ev.status === 'Menunggu Konfirmasi'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-rose-50 text-rose-900 border-rose-200'
                        }`}
                      >
                        <div className="text-[10px] font-bold text-stone-600 flex items-center space-x-1 tabular-nums">
                          <Clock className="w-3 h-3 text-blue-700" />
                          <span>
                            {ev.jam_mulai} - {ev.jam_selesai}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 leading-tight mt-1 line-clamp-2">
                          {ev.nama_event}
                        </div>
                        <div className="text-[10px] text-blue-800 font-semibold truncate mt-1">
                          📍 {roomNames}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Agenda Kegiatan {formatDateFullIndo(currentDate.toISOString().split('T')[0])}
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                Peminjaman dan jadwal aktif 21 ruangan kampus STEKOM pada hari ini
              </p>
            </div>
            {canModify && (
              <button
                onClick={() => onAddEventOnDate(currentDate.toISOString().split('T')[0])}
                className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold text-white bg-blue-700 rounded-xl hover:bg-blue-800 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Event Hari Ini</span>
              </button>
            )}
          </div>

          {/* Timeline of day events */}
          <div className="mt-6 space-y-3">
            {filteredEvents
              .filter((e) => e.tanggal === currentDate.toISOString().split('T')[0])
              .sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai))
              .map((ev) => {
                const roomNames = (ev.ruangan_ids || [])
                  .map((id) => roomMap.get(id)?.name || id)
                  .join(', ');

                return (
                  <div
                    key={ev.id}
                    onClick={() => onSelectEvent(ev)}
                    className="p-4 rounded-2xl border border-stone-200/90 hover:border-blue-400 hover:shadow-sm transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50/40 hover:bg-white"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-blue-900 px-2.5 py-1 bg-blue-50 border border-blue-200/60 rounded-lg tabular-nums">
                          {ev.jam_mulai} - {ev.jam_selesai} WIB
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
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
                      <h4 className="text-sm font-bold text-slate-900 mt-2">
                        {ev.nama_event}
                      </h4>
                      <p className="text-xs text-blue-800 font-semibold flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Ruangan: {roomNames}</span>
                      </p>
                      <p className="text-xs text-stone-500 font-medium">
                        PIC: <strong className="text-stone-800">{ev.pic}</strong> ({ev.nomor_hp_pic}) • {ev.jumlah_peserta} Orang Peserta
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <button className="px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 shadow-xs">
                        Buka Detail
                      </button>
                    </div>
                  </div>
                );
              })}

            {filteredEvents.filter((e) => e.tanggal === currentDate.toISOString().split('T')[0]).length === 0 && (
              <div className="py-12 text-center text-stone-400">
                <CalendarIcon className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-stone-600">Tidak ada event terjadwal pada hari ini</p>
                <p className="text-[11px] text-stone-400">Seluruh ruangan kampus berstatus siap digunakan</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
