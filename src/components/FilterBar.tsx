import React from 'react';
import { Filter, RotateCcw, Search, X } from 'lucide-react';
import { FilterOptions, Room } from '../types';

interface FilterBarProps {
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  rooms: Room[];
  onReset: () => void;
  showPicFilter?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  rooms,
  onReset,
  showPicFilter = true
}) => {
  const months = [
    { value: 'all', label: 'Semua Bulan' },
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' }
  ];

  const currentYearNum = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: Math.max(4, currentYearNum - 2025 + 3) },
    (_, idx) => String(2025 + idx)
  );
  const years = [
    { value: 'all', label: 'Semua Tahun' },
    ...yearOptions.map((y) => ({ value: y, label: y }))
  ];

  const statuses = [
    { value: 'all', label: 'Semua Status' },
    { value: 'Scheduled', label: 'Scheduled' },
    { value: 'Menunggu Konfirmasi', label: 'Menunggu Konfirmasi' },
    { value: 'Dibatalkan', label: 'Dibatalkan' }
  ];

  const hasActiveFilters =
    filters.month !== 'all' ||
    filters.year !== 'all' ||
    filters.status !== 'all' ||
    filters.roomId !== 'all' ||
    filters.pic.trim() !== '' ||
    filters.search.trim() !== '';

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-stone-200/90 p-4 mb-5 transition">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center space-x-2 text-stone-800 font-bold text-xs">
          <Filter className="w-3.5 h-3.5 text-blue-700" />
          <span>Filter & Pencarian Agenda Kampus</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-[10px] bg-blue-50 text-blue-800 font-bold rounded-full border border-blue-200/80">
              Filter Aktif
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="self-start lg:self-auto inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Semua Filter</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
        {/* Search Nama Event */}
        <div className="lg:col-span-2 relative">
          <label className="block text-[11px] font-bold text-stone-500 mb-1">
            Pencarian Nama Agenda / Catatan
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama event, catatan..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full pl-9 pr-8 py-2 text-xs bg-stone-50/80 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium text-stone-800"
            />
            {filters.search && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Bulan */}
        <div>
          <label className="block text-[11px] font-bold text-stone-500 mb-1">
            Bulan
          </label>
          <select
            value={filters.month}
            onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))}
            className="w-full py-2 px-2.5 text-xs bg-stone-50/80 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-700 font-semibold"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Tahun */}
        <div>
          <label className="block text-[11px] font-bold text-stone-500 mb-1">
            Tahun
          </label>
          <select
            value={filters.year}
            onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}
            className="w-full py-2 px-2.5 text-xs bg-stone-50/80 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-700 font-semibold"
          >
            {years.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Status */}
        <div>
          <label className="block text-[11px] font-bold text-stone-500 mb-1">
            Status Event
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full py-2 px-2.5 text-xs bg-stone-50/80 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-700 font-semibold"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Ruangan */}
        <div>
          <label className="block text-[11px] font-bold text-stone-500 mb-1">
            Ruangan
          </label>
          <select
            value={filters.roomId}
            onChange={(e) => setFilters((prev) => ({ ...prev, roomId: e.target.value }))}
            className="w-full py-2 px-2.5 text-xs bg-stone-50/80 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-700 font-semibold truncate"
          >
            <option value="all">Semua Ruang ({rooms.length})</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PIC Filter bar if requested */}
      {showPicFilter && (
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2">
          <span className="text-[11px] font-bold text-stone-500 whitespace-nowrap">
            Filter PIC:
          </span>
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Ketik nama penanggung jawab..."
              value={filters.pic}
              onChange={(e) => setFilters((prev) => ({ ...prev, pic: e.target.value }))}
              className="w-full px-3 py-1.5 text-xs bg-stone-50/80 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-stone-800"
            />
            {filters.pic && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, pic: '' }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
