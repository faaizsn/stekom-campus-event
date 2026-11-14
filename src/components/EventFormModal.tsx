import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Info,
  MapPin,
  Phone,
  ShieldAlert,
  User,
  Users,
  X
} from 'lucide-react';
import { CampusEvent, EventStatus, Room } from '../types';
import { checkEventConflict, getTodayWibDateStr } from '../utils/conflictDetector';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Partial<CampusEvent>) => Promise<void>;
  initialEvent?: CampusEvent | null;
  initialDate?: string;
  initialRoomId?: string;
  allEvents: CampusEvent[];
  rooms: Room[];
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEvent,
  initialDate,
  initialRoomId,
  allEvents,
  rooms
}) => {
  const [namaEvent, setNamaEvent] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [jamMulai, setJamMulai] = useState('08:00');
  const [jamSelesai, setJamSelesai] = useState('11:00');
  const [jumlahPeserta, setJumlahPeserta] = useState<number | ''>(50);
  const [pic, setPic] = useState('');
  const [nomorHpPic, setNomorHpPic] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [status, setStatus] = useState<EventStatus>('Menunggu Konfirmasi');
  const [catatan, setCatatan] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or populate form
  useEffect(() => {
    if (isOpen) {
      if (initialEvent) {
        setNamaEvent(initialEvent.nama_event);
        setTanggal(initialEvent.tanggal);
        setJamMulai(initialEvent.jam_mulai);
        setJamSelesai(initialEvent.jam_selesai);
        setJumlahPeserta(initialEvent.jumlah_peserta);
        setPic(initialEvent.pic);
        setNomorHpPic(initialEvent.nomor_hp_pic);
        setSelectedRoomIds(initialEvent.ruangan_ids || []);
        setStatus(initialEvent.status);
        setCatatan(initialEvent.catatan || '');
      } else {
        // Reset to default new event
        setNamaEvent('');
        setTanggal(initialDate || getTodayWibDateStr());
        setJamMulai('09:00');
        setJamSelesai('12:00');
        setJumlahPeserta(30);
        setPic('');
        setNomorHpPic('');
        setSelectedRoomIds(initialRoomId ? [initialRoomId] : []);
        setStatus('Menunggu Konfirmasi');
        setCatatan('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, initialEvent, initialDate, initialRoomId]);

  // Real-time conflict checking
  const conflictCheck = useMemo(() => {
    if (!tanggal || !jamMulai || !jamSelesai || selectedRoomIds.length === 0) {
      return { hasConflict: false, conflicts: [] };
    }

    return checkEventConflict(
      {
        id: initialEvent?.id,
        tanggal,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        ruangan_ids: selectedRoomIds,
        status
      },
      allEvents,
      rooms
    );
  }, [initialEvent, tanggal, jamMulai, jamSelesai, selectedRoomIds, status, allEvents, rooms]);

  // Calculate total room capacity for selected rooms
  const totalSelectedCapacity = useMemo(() => {
    return selectedRoomIds.reduce((sum, rId) => {
      const room = rooms.find((r) => r.id === rId);
      return sum + (room ? room.capacity || 0 : 0);
    }, 0);
  }, [selectedRoomIds, rooms]);

  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validations
    if (!namaEvent.trim()) {
      setErrorMsg('Nama event wajib diisi.');
      return;
    }
    if (!tanggal) {
      setErrorMsg('Tanggal pelaksanaan wajib ditentukan.');
      return;
    }
    if (!jamMulai || !jamSelesai) {
      setErrorMsg('Jam mulai dan jam selesai wajib diisi.');
      return;
    }
    if (jamSelesai <= jamMulai) {
      setErrorMsg('Jam selesai harus lebih akhir daripada jam mulai.');
      return;
    }
    if (jumlahPeserta === '' || Number(jumlahPeserta) <= 0) {
      setErrorMsg('Jumlah peserta harus berupa bilangan bulat positif (> 0).');
      return;
    }
    if (!pic.trim()) {
      setErrorMsg('Nama PIC (Penanggung Jawab) wajib diisi.');
      return;
    }
    if (!nomorHpPic.trim()) {
      setErrorMsg('Nomor HP / WhatsApp PIC wajib diisi.');
      return;
    }
    if (selectedRoomIds.length === 0) {
      setErrorMsg('Pilih minimal satu ruangan kampus untuk kegiatan ini.');
      return;
    }

    // Rule: "Jangan izinkan status Scheduled pada jadwal yang bentrok"
    if (status === 'Scheduled' && conflictCheck.hasConflict) {
      setErrorMsg(
        `Jadwal bentrok terdeteksi! Tidak diizinkan menetapkan status "Scheduled" pada jadwal yang bentrok dengan event lain. Silakan ubah jam, tanggal, atau gunakan status "Menunggu Konfirmasi".`
      );
      return;
    }

    try {
      setLoading(true);
      await onSave({
        id: initialEvent?.id,
        nama_event: namaEvent.trim(),
        tanggal,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        jumlah_peserta: Number(jumlahPeserta),
        pic: pic.trim(),
        nomor_hp_pic: nomorHpPic.trim(),
        ruangan_ids: selectedRoomIds,
        status,
        catatan: catatan.trim()
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data event.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-white px-6 py-4.5 border-b border-stone-200/90 text-stone-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/70 flex items-center justify-center font-bold text-blue-700 shadow-xs">
              <Calendar className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {initialEvent ? 'Edit Jadwal & Data Event' : 'Pengajuan & Tambah Event Baru'}
              </h2>
              <p className="text-xs text-stone-500 font-medium">Universitas STEKOM Campus Event Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Realtime Conflict Warning Banner */}
          {conflictCheck.hasConflict && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-bold text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>PERINGATAN BENTROK JADWAL RUANGAN!</span>
              </div>
              <p className="leading-relaxed text-amber-800">
                Kombinasi tanggal, jam, dan ruangan yang Anda pilih beririsan dengan jadwal event berikut:
              </p>
              <div className="space-y-1.5 pl-2 border-l-2 border-amber-400">
                {conflictCheck.conflicts.map((c, i) => (
                  <div key={i} className="text-[11px] text-amber-950 font-medium">
                    • <strong>{c.conflictingEvent.nama_event}</strong> ({c.conflictingEvent.status})
                    <br />
                    &nbsp;&nbsp;Ruangan: {c.conflictingRoomNames.join(', ')} | Jam: {c.conflictingEvent.jam_mulai} - {c.conflictingEvent.jam_selesai} WIB
                  </div>
                ))}
              </div>
              {status === 'Scheduled' && (
                <p className="text-[11px] font-semibold text-rose-700 bg-rose-100/80 p-2 rounded-lg">
                  Aturan Sistem: Status "Scheduled" tidak dapat disimpan jika jadwal bentrok. Anda dapat menyimpannya sebagai "Menunggu Konfirmasi" atau memilih ruangan/jam lain.
                </p>
              )}
            </div>
          )}

          {/* Basic Info */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Event / Kegiatan Kampus <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Kuliah Umum Artificial Intelligence & IoT 2026"
              value={namaEvent}
              onChange={(e) => setNamaEvent(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800 font-medium"
            />
          </div>

          {/* Date and Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Pelaksanaan <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jam Mulai (WIB) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={jamMulai}
                  onChange={(e) => setJamMulai(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jam Selesai (WIB) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={jamSelesai}
                  onChange={(e) => setJamSelesai(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Participants, PIC, Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estimasi Peserta <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="1"
                  required
                  value={jumlahPeserta}
                  onChange={(e) => setJumlahPeserta(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                  placeholder="Jumlah orang"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama PIC (Penanggung Jawab) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap PIC"
                  value={pic}
                  onChange={(e) => setPic(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor HP / WA PIC <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="0812xxxxxxxx"
                  value={nomorHpPic}
                  onChange={(e) => setNomorHpPic(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Multi-Select Ruangan (Total 21 STEKOM Rooms) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700">
                Pilih Ruangan Kampus STEKOM (Multi-Select) <span className="text-rose-500">*</span>
              </label>
              <div className="text-[11px] text-slate-500">
                Dipilih:{' '}
                <strong className="text-blue-600 font-semibold">{selectedRoomIds.length} Ruangan</strong>
                {selectedRoomIds.length > 0 && (
                  <span className="ml-1 text-slate-400">
                    (Total Kapasitas: ~{totalSelectedCapacity} org)
                  </span>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 max-h-52 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {rooms.map((room) => {
                const isSelected = selectedRoomIds.includes(room.id);
                return (
                  <div
                    key={room.id}
                    onClick={() => toggleRoomSelection(room.id)}
                    className={`p-2 rounded-lg cursor-pointer border text-xs flex items-center justify-between transition select-none ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                    }`}
                  >
                    <div className="truncate mr-1">
                      <div className="font-semibold truncate">{room.name}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        {room.code} • Kap: {room.capacity || 'Fleksibel'} org
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-white text-blue-600 border-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Selection & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Status Pengajuan <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
                className={`w-full px-3 py-2 text-xs font-bold rounded-xl border focus:outline-none focus:ring-2 transition ${
                  status === 'Scheduled'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-500'
                    : status === 'Menunggu Konfirmasi'
                    ? 'bg-amber-50 text-amber-800 border-amber-300 focus:ring-amber-500'
                    : 'bg-rose-50 text-rose-800 border-rose-300 focus:ring-rose-500'
                }`}
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Menunggu Konfirmasi">Menunggu Konfirmasi</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Fasilitas / Kebutuhan Khusus
              </label>
              <input
                type="text"
                placeholder="Misal: Memerlukan proyektor laser, kabel HDMI, dan mic wireless"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition"
          >
            {loading ? (
              <span>Menyimpan...</span>
            ) : (
              <span>{initialEvent ? 'Perbarui Jadwal Event' : 'Simpan & Jadwalkan Event'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
