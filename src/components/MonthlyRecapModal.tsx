import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  MapPin,
  Users,
  X
} from 'lucide-react';
import { CampusEvent, Room, User } from '../types';
import { formatDateIndo } from '../utils/conflictDetector';
import { exportEventsToExcel, exportEventsToPdf } from '../utils/exportUtils';

interface MonthlyRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CampusEvent[];
  rooms: Room[];
  currentUser: User;
  initialMonth?: string; // '01'-'12'
  initialYear?: string; // '2026'
}

export const MonthlyRecapModal: React.FC<MonthlyRecapModalProps> = ({
  isOpen,
  onClose,
  events,
  rooms,
  currentUser,
  initialMonth = '11',
  initialYear = '2026'
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);

  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(initialMonth);
      setSelectedYear(initialYear);
    }
  }, [isOpen, initialMonth, initialYear]);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  // Filter events for the selected month and year
  const monthEvents = useMemo(() => {
    return events.filter((ev) => {
      const parts = ev.tanggal.split('-');
      return parts[1] === selectedMonth && parts[0] === selectedYear;
    }).sort((a, b) => `${a.tanggal} ${a.jam_mulai}`.localeCompare(`${b.tanggal} ${b.jam_mulai}`));
  }, [events, selectedMonth, selectedYear]);

  // Statistics for this month
  const totalEvents = monthEvents.length;
  const scheduledCount = monthEvents.filter((e) => e.status === 'Scheduled').length;
  const pendingCount = monthEvents.filter((e) => e.status === 'Menunggu Konfirmasi').length;
  const cancelledCount = monthEvents.filter((e) => e.status === 'Dibatalkan').length;
  const totalParticipants = monthEvents.reduce((sum, e) => sum + (e.jumlah_peserta || 0), 0);

  const monthNameText = monthNames[parseInt(selectedMonth, 10) - 1] || selectedMonth;
  const periodLabel = `Bulan ${monthNameText} ${selectedYear}`;

  const handleDownloadPdf = () => {
    exportEventsToPdf(monthEvents, rooms, {
      title: `REKAPITULASI BULANAN EVENT KAMPUS STEKOM`,
      periodLabel: periodLabel,
      printedBy: currentUser.name,
      printedRole: currentUser.role
    });
  };

  const handleDownloadExcel = () => {
    exportEventsToExcel(
      monthEvents,
      rooms,
      `Rekap_Bulanan_Event_STEKOM_${monthNameText}_${selectedYear}.xlsx`
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full flex flex-col border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-white px-6 py-4.5 border-b border-stone-200/90 text-stone-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center font-bold text-blue-700 shadow-xs">
              <Download className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Download Rekap Bulanan Event
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                Universitas Sains & Teknologi Komputer (STEKOM)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Month & Year Selection Bar */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-blue-900">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Pilih Periode Bulan Rekap:</span>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {monthNames.map((m, idx) => (
                  <option key={idx} value={String(idx + 1).padStart(2, '0')}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from(
                  new Set([
                    '2025',
                    '2026',
                    '2027',
                    String(new Date().getFullYear()),
                    String(new Date().getFullYear() + 1),
                    selectedYear,
                    ...events.map((e) => (e.tanggal || '').split('-')[0]).filter((y) => /^\d{4}$/.test(y))
                  ])
                )
                  .sort()
                  .map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Quick Stats Summary for Selected Month */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Event</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{totalEvents}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-[10px] font-semibold text-emerald-800 uppercase">Scheduled</p>
              <p className="text-lg font-black text-emerald-700 mt-0.5">{scheduledCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <p className="text-[10px] font-semibold text-amber-800 uppercase">Menunggu</p>
              <p className="text-lg font-black text-amber-700 mt-0.5">{pendingCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
              <p className="text-[10px] font-semibold text-blue-800 uppercase">Total Peserta</p>
              <p className="text-lg font-black text-blue-700 mt-0.5">
                {totalParticipants.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Preview list of events */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">
                Daftar Kegiatan {periodLabel} ({totalEvents} Event):
              </span>
              <span className="text-[11px] text-slate-400">
                Format resmi ber-kop surat Universitas STEKOM
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
              {monthEvents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Tidak ada event terdaftar pada {periodLabel}.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {monthEvents.map((ev, idx) => {
                    const roomNames = (ev.ruangan_ids || [])
                      .map((id) => roomMap.get(id)?.name || id)
                      .join(', ');

                    return (
                      <div key={ev.id} className="p-2.5 text-xs flex items-center justify-between gap-3 hover:bg-slate-50">
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                              {formatDateIndo(ev.tanggal)}
                            </span>
                            <span className="font-bold text-slate-900 truncate">
                              {ev.nama_event}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            📍 {roomNames} • 🕒 {ev.jam_mulai} - {ev.jam_selesai} WIB • PIC: {ev.pic} ({ev.jumlah_peserta} org)
                          </p>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                            ev.status === 'Scheduled'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ev.status === 'Menunggu Konfirmasi'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer with Direct Download Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition text-center"
          >
            Tutup
          </button>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              onClick={handleDownloadExcel}
              disabled={totalEvents === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl shadow-xs transition disabled:opacity-40"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={totalEvents === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-40"
            >
              <FileText className="w-4 h-4" />
              <span>Download PDF Resmi STEKOM</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
