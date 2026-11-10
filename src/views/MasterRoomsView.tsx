import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  Edit,
  Info,
  Layers,
  MapPin,
  Plus,
  Shield,
  Trash2,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { Room, UserRole } from '../types';

interface MasterRoomsViewProps {
  rooms: Room[];
  userRole: UserRole;
  onUpdateRoom: (id: string, updated: Partial<Room>) => Promise<void>;
  onCreateRoom: (newRoom: Partial<Room>) => Promise<void>;
}

export const MasterRoomsView: React.FC<MasterRoomsViewProps> = ({
  rooms,
  userRole,
  onUpdateRoom,
  onCreateRoom
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'general' | 'classes'>('all');
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editCapacity, setEditCapacity] = useState<number | ''>(0);
  const [editStatus, setEditStatus] = useState<'Tersedia' | 'Pemeliharaan'>('Tersedia');
  const [editFacilities, setEditFacilities] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const canModify = userRole === 'Administrator';

  // 8 general rooms vs 13 specific rooms
  const generalRooms = rooms.filter((r) => r.is_general);
  const classRooms = rooms.filter((r) => !r.is_general);

  const filteredRooms = rooms.filter((r) => {
    if (selectedCategory === 'general' && !r.is_general) return false;
    if (selectedCategory === 'classes' && r.is_general) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.floor.toLowerCase().includes(q) ||
        r.building.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleStartEdit = (room: Room) => {
    setEditingRoom(room);
    setEditCapacity(room.capacity);
    setEditStatus(room.status);
    setEditFacilities((room.facilities || []).join(', '));
    setEditNotes(room.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingRoom) return;
    try {
      setSaving(true);
      await onUpdateRoom(editingRoom.id, {
        capacity: Number(editCapacity) || 0,
        status: editStatus,
        facilities: editFacilities
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean),
        notes: editNotes.trim()
      });
      setEditingRoom(null);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan perubahan ruangan');
    } finally {
      setSaving(false);
    }
  };

  const totalCampusCapacity = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-blue-700" />
            <span>Master Data 21 Ruangan Universitas STEKOM</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            Data resmi aula, ruang rapat, laboratorium riset, studio kreatif, dan ruang kelas kampus STEKOM
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200/70 shadow-xs tabular-nums">
            Total: {rooms.length} Ruangan | Kapasitas: ~{totalCampusCapacity.toLocaleString('id-ID')} Orang
          </div>
        </div>
      </div>

      {/* Info notice about 8 general rooms capacity rule */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-950 flex items-start space-x-3 shadow-xs">
        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed font-medium">
          <strong className="font-bold">Ketentuan Kapasitas Ruangan Kampus STEKOM:</strong> Sesuai ketentuan universitas,
          8 ruangan umum (Aula Utama, Ruang Pertemuan LT 2, Ruang Conferences LT 1, Ruang Serbaguna LT 3, Studio Musik, Studio Karaoke, Ruang Hukum, Lab Sepeda Listrik) memiliki kapasitas fleksibel yang dapat disesuaikan dan diedit kapan saja oleh Administrator sesuai susunan layout acara. Sedangkan 13 ruangan kelas/diskusi (B.2.8, B.2.9, B.2.10, B.3.6, B.3.7, B.3.8, B.3.9, B.3.10, B.3.11, B.2.7.1, B.2.7.2, B.2.7.3, B.2.7.4) memiliki kapasitas baku bawaan yang tercatat di sistem.
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center bg-stone-100/90 rounded-xl p-1 border border-stone-200/80 text-xs font-bold">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedCategory === 'all'
                ? 'bg-white text-blue-900 shadow-xs border border-stone-200/70'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Semua (21 Ruang)
          </button>
          <button
            onClick={() => setSelectedCategory('general')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedCategory === 'general'
                ? 'bg-white text-blue-900 shadow-xs border border-stone-200/70'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            8 Ruang Umum
          </button>
          <button
            onClick={() => setSelectedCategory('classes')}
            className={`px-3 py-1.5 rounded-lg transition ${
              selectedCategory === 'classes'
                ? 'bg-white text-blue-900 shadow-xs border border-stone-200/70'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            13 Ruang Kelas
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Cari nama ruangan, kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-1.5 text-xs bg-stone-50/80 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64 font-medium text-stone-800"
          />
        </div>
      </div>

      {/* Room Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((room) => {
          return (
            <div
              key={room.id}
              className="bg-white rounded-3xl border border-stone-200/90 shadow-xs hover:border-blue-300 hover:shadow-md transition p-5 flex flex-col justify-between"
            >
              <div>
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
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                      room.status === 'Tersedia'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    {room.status}
                  </span>
                </div>

                {/* Capacity badge */}
                <div className="flex items-center space-x-2 my-2.5">
                  <span className="flex items-center space-x-1 font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg text-xs border border-blue-200/60 tabular-nums">
                    <Users className="w-3.5 h-3.5" />
                    <span>Kapasitas: {room.capacity} Orang</span>
                  </span>

                  {room.is_general ? (
                    <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                      Kapasitas Fleksibel
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                      Baku (Gedung B)
                    </span>
                  )}
                </div>

                {/* Facilities List */}
                <div className="my-2 space-y-1">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    Fasilitas Tersedia:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(room.facilities || []).map((fac, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md"
                      >
                        {fac}
                      </span>
                    ))}
                  </div>
                </div>

                {room.notes && (
                  <p className="text-[11px] text-stone-500 italic mt-2 border-t border-stone-100 pt-1.5 font-normal">
                    "{room.notes}"
                  </p>
                )}
              </div>

              {canModify && (
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[10px] text-stone-400 font-medium">Akses Admin</span>
                  <button
                    onClick={() => handleStartEdit(room)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs transition border border-blue-200/60"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit Kapasitas & Data</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Room Modal */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Edit Master Ruangan: {editingRoom.name}
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  {editingRoom.code} • {editingRoom.building} ({editingRoom.floor})
                </p>
              </div>
              <button
                onClick={() => setEditingRoom(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Kapasitas Ruangan (Orang)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-stone-50/80 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-stone-900"
                />
                {editingRoom.is_general && (
                  <p className="text-[11px] text-blue-800 font-medium mt-1">
                    * Ruangan ini termasuk 8 Ruangan Umum dengan kapasitas fleksibel yang dapat disesuaikan.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Status Operasional Ruangan
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50/80 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-stone-900"
                >
                  <option value="Tersedia">Tersedia (Dapat Dipinjam)</option>
                  <option value="Pemeliharaan">Pemeliharaan / Maintenance (Tidak Dapat Digunakan)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Daftar Fasilitas (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={editFacilities}
                  onChange={(e) => setEditFacilities(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50/80 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-stone-900"
                  placeholder="Proyektor, AC, Sound System, dll"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Catatan Ruangan
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50/80 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-stone-900"
                  placeholder="Keterangan peruntukan atau tata letak"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-end space-x-2">
              <button
                onClick={() => setEditingRoom(null)}
                className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
