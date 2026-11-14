import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  ShieldCheck,
  Trash2,
  User,
  Users,
  X,
  XCircle
} from 'lucide-react';
import { CampusEvent, Room, UserRole } from '../types';
import { formatDateFullIndo, formatDateIndo } from '../utils/conflictDetector';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CampusEvent | null;
  rooms: Room[];
  userRole: UserRole;
  onEdit: (event: CampusEvent) => void;
  onDelete: (id: string) => Promise<void> | void;
  onUpdateStatus: (id: string, newStatus: 'Scheduled' | 'Dibatalkan' | 'Menunggu Konfirmasi') => Promise<void>;
  onPrintTicket?: (event: CampusEvent) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  onClose,
  event,
  rooms,
  userRole,
  onEdit,
  onDelete,
  onUpdateStatus,
  onPrintTicket
}) => {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setConfirmDeleteOpen(false);
    setStatusError(null);
    setDeleting(false);
  }, [isOpen, event?.id]);

  if (!isOpen || !event) return null;

  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const eventRooms = (event.ruangan_ids || []).map((id) => roomMap.get(id)).filter(Boolean) as Room[];
  const canModify = userRole === 'Administrator' || userRole === 'Operator';

  const handleStatusChange = async (newStatus: 'Scheduled' | 'Dibatalkan' | 'Menunggu Konfirmasi') => {
    try {
      setStatusError(null);
      setUpdatingStatus(true);
      await onUpdateStatus(event.id, newStatus);
      onClose();
    } catch (err: any) {
      setStatusError(err.message || 'Gagal mengubah status event');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setStatusError(null);
      setDeleting(true);
      await onDelete(event.id);
      setConfirmDeleteOpen(false);
      onClose();
    } catch (err: any) {
      setStatusError(err?.message || 'Gagal menghapus event');
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const statusBadgeColor =
    event.status === 'Scheduled'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
      : event.status === 'Menunggu Konfirmasi'
      ? 'bg-amber-50 text-amber-800 border-amber-300'
      : 'bg-rose-50 text-rose-800 border-rose-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full flex flex-col border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-white px-6 py-4.5 border-b border-stone-200/90 text-stone-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadgeColor}`}
            >
              {event.status}
            </span>
            <span className="text-xs text-stone-400 font-medium">ID: {event.id}</span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {statusError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{statusError}</div>
            </div>
          )}

          {/* Event Title */}
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-snug">
              {event.nama_event}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Universitas STEKOM • Biro Administrasi Akademik & Sarana Prasarana
            </p>
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-blue-900 uppercase tracking-wide">
                  Tanggal Kegiatan
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {formatDateFullIndo(event.tanggal)}
                </p>
                <p className="text-[11px] text-slate-500">({formatDateIndo(event.tanggal)})</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center space-x-3">
              <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-indigo-900 uppercase tracking-wide">
                  Waktu Pelaksanaan
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {event.jam_mulai} - {event.jam_selesai} WIB
                </p>
                <p className="text-[11px] text-slate-500">Zona Waktu: Asia/Jakarta</p>
              </div>
            </div>
          </div>

          {/* Rooms Multi-Select Display */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Ruangan Kampus yang Digunakan ({eventRooms.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {eventRooms.map((room) => (
                <div
                  key={room.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="font-bold text-slate-900">{room.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Kode: <strong className="text-slate-700">{room.code}</strong> • {room.building} ({room.floor})
                  </div>
                  <div className="text-[11px] text-blue-700 mt-1 font-medium">
                    Kapasitas Ruang: {room.capacity ? `${room.capacity} orang` : 'Fleksibel'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PIC and Participants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p className="text-slate-500 font-medium">Penanggung Jawab (PIC)</p>
              <p className="font-bold text-slate-900 text-sm">{event.pic}</p>
              <div className="flex items-center space-x-2 pt-1">
                <a
                  href={`https://wa.me/${event.nomor_hp_pic.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{event.nomor_hp_pic}</span>
                </a>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p className="text-slate-500 font-medium">Jumlah Peserta Terdaftar</p>
              <p className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{event.jumlah_peserta.toLocaleString('id-ID')} Orang</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Daftar hadir dan izin kegiatan diterbitkan otomatis
              </p>
            </div>
          </div>

          {/* Notes */}
          {event.catatan && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-700">Catatan Khusus / Fasilitas Tambahan:</p>
              <p className="text-slate-600 leading-relaxed">{event.catatan}</p>
            </div>
          )}

          {/* Metadata Audit */}
          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 text-[11px] text-slate-500 flex flex-wrap justify-between gap-2">
            <span>Dibuat oleh: <strong className="text-slate-700">{event.created_by}</strong></span>
            <span>
              Tanggal Pengajuan: {event.created_at ? formatDateIndo(event.created_at.split('T')[0]) : '-'}
            </span>
          </div>
        </div>

        {/* Delete Confirmation Box */}
        {confirmDeleteOpen && (
          <div className="p-4 bg-rose-50 border-t border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="text-xs text-rose-900">
              <p className="font-bold">Konfirmasi Hapus Event?</p>
              <p>Tindakan ini akan menghapus jadwal permanen dan dicatat dalam Audit Log.</p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={deleting}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            {canModify && !confirmDeleteOpen && (
              <button
                onClick={() => setConfirmDeleteOpen(true)}
                className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
                title="Hapus Event"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {canModify && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(event);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition"
              >
                <Edit className="w-3.5 h-3.5 text-blue-600" />
                <span>Edit Data</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Status change shortcuts for Admin / Operator */}
            {canModify && event.status !== 'Scheduled' && (
              <button
                onClick={() => handleStatusChange('Scheduled')}
                disabled={updatingStatus}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tetapkan Jadwal (Scheduled)</span>
              </button>
            )}

            {canModify && event.status !== 'Dibatalkan' && (
              <button
                onClick={() => handleStatusChange('Dibatalkan')}
                disabled={updatingStatus}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-xl transition disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Batalkan Event</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
