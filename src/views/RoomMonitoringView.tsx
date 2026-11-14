import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  MapPin,
  Plus,
  Users,
  Wrench
} from 'lucide-react';
import { CampusEvent, Room, RoomLiveStatus, UserRole } from '../types';
import {
  formatDateFullIndo,
  formatDateIndo,
  getRoomLiveStatus,
  getTodayWibDateStr
} from '../utils/conflictDetector';

interface RoomMonitoringViewProps {
  rooms: Room[];
  events: CampusEvent[];
  userRole: UserRole;
  onBookRoom: (roomId: string, dateStr: string) => void;
  onSelectEvent: (event: CampusEvent) => void;
}

export const RoomMonitoringView: React.FC<RoomMonitoringViewProps> = ({
  rooms,
  events,
  userRole,
  onBookRoom,
  onSelectEvent
}) => {
  const [selectedDate, setSelectedDate] = useState(() => getTodayWibDateStr());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Calculate live status for each room on selectedDate
  const roomsWithStatus = useMemo(() => {
    return rooms.map((room) => {
      // If room is under maintenance
      if (room.status === 'Pemeliharaan') {
        return {
          room,
          liveStatus: 'Tidak Dapat Digunakan' as RoomLiveStatus,
          activeEvent: undefined,
          nextEvent: undefined,
          dayEvents: []
        };
      }

      const dayEvents = events
        .filter(
          (e) =>
            e.tanggal === selectedDate &&
            e.status !== 'Dibatalkan' &&
            e.ruangan_ids?.includes(room.id)
        )
        .sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));

      const live = getRoomLiveStatus(room.id, dayEvents, selectedDate);

      return {
        room,
        liveStatus: live.status,
        activeEvent: live.activeEvent,
        nextEvent: live.nextEvent,
        dayEvents
      };
    });
  }, [rooms, events, selectedDate]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return roomsWithStatus.filter(({ room, liveStatus }) => {
      if (statusFilter !== 'all' && liveStatus !== statusFilter) return false;
      if (buildingFilter !== 'all' && room.building !== buildingFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = room.name.toLowerCase().includes(q);
        const matchCode = room.code.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [roomsWithStatus, statusFilter, buildingFilter, search]);

  const availableCount = roomsWithStatus.filter((r) => r.liveStatus === 'Tersedia').length;
  const inUseCount = roomsWithStatus.filter((r) => r.liveStatus === 'Sedang Digunakan').length;
  const willUseCount = roomsWithStatus.filter((r) => r.liveStatus === 'Akan Digunakan').length;
  const maintenanceCount = roomsWithStatus.filter(
    (r) => r.liveStatus === 'Tidak Dapat Digunakan'
  ).length;

  const canModify = userRole === 'Administrator' || userRole === 'Operator';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Live Monitoring 21 Ruangan STEKOM
          </h1>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            Status ketersediaan real-time seluruh aula, laboratorium, studio, dan ruang kelas
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center space-x-2 bg-white px-3.5 py-2 rounded-2xl border border-stone-200/90 shadow-xs">
          <Calendar className="w-4 h-4 text-blue-700 shrink-0" />
          <span className="text-xs font-bold text-stone-600">Pilih Tanggal:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Status Counters (Soothing Warm Active States) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => setStatusFilter(statusFilter === 'Tersedia' ? 'all' : 'Tersedia')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-xs ${
            statusFilter === 'Tersedia'
              ? 'bg-emerald-50/90 text-emerald-950 border-emerald-400 ring-2 ring-emerald-400/20'
              : 'bg-white text-stone-800 border-stone-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span>Tersedia (Kosong)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black mt-2 text-emerald-900 tabular-nums">{availableCount}</div>
          <p className="text-[10px] text-stone-400 mt-0.5 font-medium">
            Siap digunakan
          </p>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'Sedang Digunakan' ? 'all' : 'Sedang Digunakan')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-xs ${
            statusFilter === 'Sedang Digunakan'
              ? 'bg-blue-50/90 text-blue-950 border-blue-400 ring-2 ring-blue-400/20'
              : 'bg-white text-stone-800 border-stone-200/90 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span>Sedang Digunakan</span>
            <Clock className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl font-black mt-2 text-blue-900 tabular-nums">{inUseCount}</div>
          <p className="text-[10px] text-stone-400 mt-0.5 font-medium">
            Kegiatan sedang aktif
          </p>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'Akan Digunakan' ? 'all' : 'Akan Digunakan')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-xs ${
            statusFilter === 'Akan Digunakan'
              ? 'bg-amber-50/90 text-amber-950 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-white text-stone-800 border-stone-200/90 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span>Akan Digunakan</span>
            <Calendar className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-black mt-2 text-amber-900 tabular-nums">{willUseCount}</div>
          <p className="text-[10px] text-stone-400 mt-0.5 font-medium">
            Terjadwal hari ini
          </p>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'Tidak Dapat Digunakan' ? 'all' : 'Tidak Dapat Digunakan')}
          className={`p-4 rounded-2xl border cursor-pointer transition shadow-xs ${
            statusFilter === 'Tidak Dapat Digunakan'
              ? 'bg-stone-100 text-stone-900 border-stone-400 ring-2 ring-stone-400/20'
              : 'bg-white text-stone-800 border-stone-200/90 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span>Pemeliharaan</span>
            <Wrench className="w-4 h-4 text-stone-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-stone-800 tabular-nums">{maintenanceCount}</div>
          <p className="text-[10px] text-stone-400 mt-0.5 font-medium">
            Perawatan berkala
          </p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs">
          <span className="font-bold text-stone-500">Filter Gedung:</span>
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="px-3 py-1.5 bg-stone-50/80 border border-stone-200 rounded-xl text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Semua Gedung</option>
            <option value="Gedung Pusat STEKOM">Gedung Pusat STEKOM</option>
            <option value="Gedung Rektorat">Gedung Rektorat</option>
            <option value="Gedung Akademik">Gedung Akademik</option>
            <option value="Gedung Inovasi & Riset STEKOM">Gedung Inovasi & Riset</option>
            <option value="Gedung Kreatif">Gedung Kreatif</option>
            <option value="Gedung B">Gedung B (Lantai 2 & 3)</option>
          </select>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Cari nama ruangan / kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-1.5 text-xs bg-stone-50/80 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-60 font-medium text-stone-800"
          />
        </div>
      </div>

      {/* Room Grid with Live Timelines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map(({ room, liveStatus, activeEvent, nextEvent, dayEvents }) => {
          const badgeColor =
            liveStatus === 'Tersedia'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : liveStatus === 'Sedang Digunakan'
              ? 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse'
              : liveStatus === 'Akan Digunakan'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-stone-100 text-stone-700 border-stone-200';

          return (
            <div
              key={room.id}
              className="bg-white rounded-3xl border border-stone-200/90 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between"
            >
              <div>
                {/* Header: Name, Code & Live Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-snug">
                      {room.name}
                    </h3>
                    <p className="text-[11px] text-stone-500 font-medium">
                      Kode: <strong className="text-stone-800">{room.code}</strong> • {room.building} ({room.floor})
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${badgeColor}`}
                  >
                    {liveStatus}
                  </span>
                </div>

                {/* Capacity & General badge */}
                <div className="flex items-center space-x-2 my-2 text-xs">
                  <span className="flex items-center space-x-1 font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200/60 tabular-nums">
                    <Users className="w-3.5 h-3.5" />
                    <span>Kapasitas: {room.capacity ? `${room.capacity} org` : 'Fleksibel'}</span>
                  </span>
                  {room.is_general && (
                    <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">
                      Ruangan Umum
                    </span>
                  )}
                </div>

                {/* Facilities tags */}
                <div className="flex flex-wrap gap-1 my-2.5">
                  {(room.facilities || []).slice(0, 3).map((fac, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-medium px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md"
                    >
                      {fac}
                    </span>
                  ))}
                  {(room.facilities || []).length > 3 && (
                    <span className="text-[10px] text-stone-400 self-center">
                      +{room.facilities.length - 3} lagi
                    </span>
                  )}
                </div>

                {/* Day Schedule Visual Mini-Timeline */}
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="font-bold text-stone-700">
                      Jadwal Pemakaian ({dayEvents.length} Event):
                    </span>
                    <span className="text-stone-400 text-[10px] font-medium">08:00 - 18:00 WIB</span>
                  </div>

                  {dayEvents.length === 0 ? (
                    <div className="py-2.5 px-3 rounded-xl bg-stone-50/70 text-[11px] text-stone-400 text-center font-medium">
                      Ruangan kosong sepanjang hari pada tanggal ini
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => onSelectEvent(ev)}
                          className="p-2 rounded-xl bg-blue-50/70 border border-blue-200/60 hover:bg-blue-100/70 text-xs cursor-pointer transition shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-blue-900 tabular-nums">
                              🕒 {ev.jam_mulai} - {ev.jam_selesai} WIB
                            </span>
                            <span className="text-[10px] font-bold text-blue-700">
                              {ev.status}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900 truncate text-[11px] mt-0.5">
                            {ev.nama_event}
                          </div>
                          <div className="text-[10px] text-stone-500 font-medium">
                            PIC: {ev.pic} ({ev.jumlah_peserta} org)
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom booking action */}
              {canModify && liveStatus !== 'Tidak Dapat Digunakan' && (
                <button
                  onClick={() => onBookRoom(room.id, selectedDate)}
                  className="mt-4 w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shadow-sm shadow-blue-700/20 active:scale-98"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Jadwalkan Event di Ruangan Ini</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
