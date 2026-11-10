import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  MapPin,
  Plus,
  ShieldAlert,
  Trash2,
  Users
} from 'lucide-react';
import { FilterBar } from '../components/FilterBar';
import { CampusEvent, FilterOptions, Room, UserRole } from '../types';
import { checkEventConflict, formatDateIndo } from '../utils/conflictDetector';
import { exportEventsToExcel } from '../utils/exportUtils';

interface EventsViewProps {
  events: CampusEvent[];
  rooms: Room[];
  userRole: UserRole;
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  onResetFilters: () => void;
  onOpenCreateModal: () => void;
  onSelectEvent: (event: CampusEvent) => void;
  onEditEvent: (event: CampusEvent) => void;
  onDeleteEvent: (id: string) => void;
  onOpenMonthlyRecap: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  rooms,
  userRole,
  filters,
  setFilters,
  onResetFilters,
  onOpenCreateModal,
  onSelectEvent,
  onEditEvent,
  onDeleteEvent,
  onOpenMonthlyRecap
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  // Filter application (consistent across views)
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Month
      if (filters.month !== 'all') {
        const parts = ev.tanggal.split('-');
        if (parts[1] !== filters.month) return false;
      }
      // Year
      if (filters.year !== 'all') {
        const parts = ev.tanggal.split('-');
        if (parts[0] !== filters.year) return false;
      }
      // Status
      if (filters.status !== 'all') {
        if (ev.status !== filters.status) return false;
      }
      // Room
      if (filters.roomId !== 'all') {
        if (!ev.ruangan_ids?.includes(filters.roomId)) return false;
      }
      // PIC
      if (filters.pic.trim()) {
        if (!ev.pic.toLowerCase().includes(filters.pic.toLowerCase())) return false;
      }
      // Search
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchTitle = ev.nama_event.toLowerCase().includes(q);
        const matchPic = ev.pic.toLowerCase().includes(q);
        const matchNote = ev.catatan?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchPic && !matchNote) return false;
      }
      return true;
    });
  }, [events, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage) || 1;
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, currentPage]);

  const canModify = userRole === 'Administrator' || userRole === 'Operator';

  const handleExportExcel = () => {
    exportEventsToExcel(filteredEvents, rooms, 'Daftar_Event_Kampus_STEKOM.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Data & Jadwal Kegiatan Kampus
          </h1>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            Manajemen lengkap peminjaman ruangan dan jadwal agenda Universitas STEKOM
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onOpenMonthlyRecap}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-emerald-900 bg-emerald-50/80 border border-emerald-200 hover:bg-emerald-100 rounded-xl shadow-xs transition"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-700" />
            <span>Download Rekap Bulanan</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          {canModify && (
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 active:scale-98 rounded-xl shadow-sm shadow-blue-700/25 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Event Baru</span>
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

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-900">
            Ditemukan: <span className="text-blue-700">{filteredEvents.length}</span> Agenda Event
          </div>
          <div className="text-[11px] text-stone-400 font-medium">
            Halaman {currentPage} dari {totalPages}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-stone-700">Tidak ada event yang sesuai</h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1">
              Cobalah mereset filter atau melakukan pencarian dengan kata kunci lain.
            </p>
            <button
              onClick={onResetFilters}
              className="mt-4 px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
            >
              Reset Filter Pencarian
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200/80 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">Nama Event & Jadwal</th>
                  <th className="py-3.5 px-4">Ruangan STEKOM</th>
                  <th className="py-3.5 px-4">Peserta & PIC</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {paginatedEvents.map((ev, index) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  const eventRooms = (ev.ruangan_ids || [])
                    .map((id) => roomMap.get(id))
                    .filter(Boolean) as Room[];

                  // Check conflict alert for this event
                  const conflictResult = checkEventConflict(
                    {
                      id: ev.id,
                      tanggal: ev.tanggal,
                      jam_mulai: ev.jam_mulai,
                      jam_selesai: ev.jam_selesai,
                      ruangan_ids: ev.ruangan_ids,
                      status: ev.status
                    },
                    events,
                    rooms
                  );

                  return (
                    <tr
                      key={ev.id}
                      className="hover:bg-stone-50/70 transition-colors group"
                    >
                      <td className="py-3.5 px-4 text-center font-bold text-stone-400 tabular-nums">
                        {itemIndex}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-blue-700 transition flex items-center space-x-1.5">
                          <span>{ev.nama_event}</span>
                          {conflictResult.hasConflict && (
                            <span
                              title={`Bentrok dengan: ${conflictResult.conflicts
                                .map((c) => c.conflictingEvent.nama_event)
                                .join(', ')}`}
                              className="inline-flex items-center text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-200 cursor-help"
                            >
                              <ShieldAlert className="w-3 h-3 mr-0.5 text-amber-600" />
                              Bentrok
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-stone-500 mt-1">
                          <span className="flex items-center space-x-1 font-semibold text-stone-700">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            <span>{formatDateIndo(ev.tanggal)}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1 text-stone-600 tabular-nums">
                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            <span>
                              {ev.jam_mulai} - {ev.jam_selesai} WIB
                            </span>
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {eventRooms.map((r) => (
                            <span
                              key={r.id}
                              className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200/60 font-bold text-[11px]"
                            >
                              {r.name}
                            </span>
                          ))}
                          {eventRooms.length === 0 && (
                            <span className="text-stone-400 text-xs">-</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{ev.pic}</div>
                        <div className="text-[11px] text-stone-500 flex items-center space-x-2 mt-0.5 font-medium">
                          <span className="tabular-nums">{ev.nomor_hp_pic}</span>
                          <span>•</span>
                          <span className="font-bold text-blue-800 tabular-nums">
                            {ev.jumlah_peserta} Peserta
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            ev.status === 'Scheduled'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : ev.status === 'Menunggu Konfirmasi'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            onClick={() => onSelectEvent(ev)}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-blue-700 hover:bg-blue-50 transition"
                            title="Lihat Detail Event"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canModify && (
                            <button
                              onClick={() => onEditEvent(ev)}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-indigo-700 hover:bg-indigo-50 transition"
                              title="Edit Data"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {canModify && (
                            <button
                              onClick={() => setDeleteCandidateId(ev.id)}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-rose-700 hover:bg-rose-50 transition"
                              title="Hapus Event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {filteredEvents.length > 0 && (
          <div className="px-6 py-4 bg-stone-50/50 border-t border-stone-100 flex items-center justify-between">
            <div className="text-xs text-stone-500 font-medium">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(currentPage * itemsPerPage, filteredEvents.length)} dari {filteredEvents.length} data
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-xl text-xs font-bold transition ${
                    currentPage === pageNum
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-200/60'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteCandidateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center mb-3 border border-rose-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Hapus Jadwal Event Ini?
            </h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Tindakan ini tidak dapat dibatalkan. Riwayat event akan dihapus dan dicatat di sistem Audit Log.
            </p>
            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                onClick={() => setDeleteCandidateId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDeleteEvent(deleteCandidateId);
                  setDeleteCandidateId(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
