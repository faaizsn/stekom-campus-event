import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  Info,
  Mail,
  Plus,
  Shield,
  Trash2,
  User as UserIcon,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import { User, UserRole } from '../types';
import { formatDateIndo } from '../utils/conflictDetector';

interface UsersViewProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: Partial<User>) => Promise<void>;
  onUpdateUser: (userId: string, data: Partial<User>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Operator');
  const [department, setDepartment] = useState('Biro Sarana Prasarana');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Edit User Modal
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Operator');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // Newly added invite/update confirmation banner
  const [lastAddedUser, setLastAddedUser] = useState<{
    name: string;
    email: string;
    role: UserRole;
    isPendingInvite?: boolean;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !email.trim()) {
      setFormError('Nama lengkap dan email akun Google wajib diisi.');
      return;
    }

    const finalEmail = email.trim().toLowerCase();
    const finalName = name.trim();
    const finalRole = role;

    try {
      setLoading(true);
      await onAddUser({
        name: finalName,
        email: finalEmail,
        role: finalRole,
        department: department.trim(),
        phone: phone.trim()
      });
      const existingActive = users.find(
        (u) => !u.isPendingInvite && u.email.toLowerCase() === finalEmail
      );
      setLastAddedUser({
        name: finalName,
        email: finalEmail,
        role: finalRole,
        isPendingInvite: !existingActive
      });
      setModalOpen(false);
      setName('');
      setEmail('');
      setRole('Operator');
      setPhone('');
    } catch (err: any) {
      setFormError(err.message || 'Gagal menambahkan pengguna');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (u: User) => {
    setEditTarget(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditDepartment(u.department || '');
    setEditPhone(u.phone || '');
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditError(null);
    if (!editName.trim() || !editEmail.trim()) {
      setEditError('Nama lengkap dan email wajib diisi.');
      return;
    }

    try {
      setEditLoading(true);
      await onUpdateUser(editTarget.id, {
        name: editName.trim(),
        ...(editTarget.isPendingInvite ? { email: editEmail.trim().toLowerCase() } : {}),
        role: editRole,
        department: editDepartment.trim(),
        phone: editPhone.trim()
      });
      setEditTarget(null);
    } catch (err: any) {
      setEditError(err.message || 'Gagal memperbarui data pengguna');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center space-x-2.5">
            <Users className="w-6 h-6 text-blue-700" strokeWidth={1.75} />
            <span>Manajemen Pengguna & Hak Akses (RBAC)</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1 font-medium">
            Pengaturan akun Google yang diizinkan serta peran Administrator, Operator, dan Viewer Universitas STEKOM
          </p>
        </div>

        <button
          onClick={() => {
            setName('');
            setEmail('');
            setPhone('');
            setRole('Operator');
            setDepartment('Biro Sarana Prasarana');
            setFormError(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-700 to-slate-800 hover:from-blue-800 hover:to-slate-900 active:scale-98 rounded-xl shadow-md shadow-blue-900/15 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-[22px] bg-[#FCFBF8] border border-blue-200/80 shadow-xs">
          <div className="flex items-center space-x-2 text-blue-700 font-bold text-xs mb-1.5">
            <Shield className="w-4 h-4" strokeWidth={1.75} />
            <span>Administrator</span>
          </div>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            Akses penuh: Tambah/ubah jadwal event, konfirmasi Scheduled, kelola 21 ruangan, kelola akun pengguna, audit log, dan pengaturan.
          </p>
        </div>

        <div className="p-4 rounded-[22px] bg-[#FCFBF8] border border-emerald-200/80 shadow-xs">
          <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs mb-1.5">
            <UserCheck className="w-4 h-4" strokeWidth={1.75} />
            <span>Operator</span>
          </div>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            Dapat menambah & mengelola jadwal event, mengubah status ke Scheduled/Dibatalkan, monitoring ruangan, dan mengunduh rekap bulanan.
          </p>
        </div>

        <div className="p-4 rounded-[22px] bg-[#FCFBF8] border border-amber-200/80 shadow-xs">
          <div className="flex items-center space-x-2 text-amber-700 font-bold text-xs mb-1.5">
            <UserIcon className="w-4 h-4" strokeWidth={1.75} />
            <span>Viewer</span>
          </div>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            Mode baca saja (Read-only): melihat dashboard, mengecek kalender, dan mengunduh rekap — <strong>tidak dapat menambah atau mengubah jadwal event</strong>.
          </p>
        </div>
      </div>

      {/* Info Cara Kerja Google Auth + Undangan Peran */}
      <div className="p-4 rounded-[22px] bg-[#FCFBF8] border border-stone-200/90 shadow-xs flex items-start space-x-3 text-xs">
        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" strokeWidth={1.75} />
        <div className="space-y-1 text-stone-600 leading-relaxed">
          <p className="font-bold text-stone-800">
            Alur Registrasi & Masuk Menggunakan Akun Google (Cloud Firestore)
          </p>
          <p className="text-[11px]">
            Daftarkan alamat email akun Google pengguna beserta perannya (<strong>Operator</strong> atau{' '}
            <strong>Administrator</strong>) melalui tombol <strong>Tambah Pengguna Baru</strong>. Saat pengguna masuk
            dengan akun Google tersebut dari perangkat maupun browser mana saja, sistem otomatis mengaktifkan hak akses sesuai peran yang ditetapkan. Akun Google yang belum didaftarkan di sini akan masuk otomatis sebagai{' '}
            <strong>Viewer</strong>.
          </p>
        </div>
      </div>

      {/* Confirmation Banner */}
      {lastAddedUser && (
        <div className="p-4 rounded-[22px] bg-emerald-50/90 border border-emerald-200 shadow-xs flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start space-x-2.5 text-emerald-950">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" strokeWidth={1.75} />
            <div className="space-y-1">
              <p className="font-bold">
                Akses Pengguna Berhasil Disimpan ke Cloud Firestore
              </p>
              <p className="text-[11px]">
                <strong>{lastAddedUser.name}</strong> ({lastAddedUser.email}) — Peran:{' '}
                <strong>{lastAddedUser.role}</strong>.{' '}
                {lastAddedUser.isPendingInvite
                  ? 'Pengguna kini dapat langsung mengklik "Masuk dengan Akun Google" menggunakan email tersebut.'
                  : 'Hak akses akun Google aktif telah diperbarui secara real-time.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastAddedUser(null)}
            className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Table */}
      <div className="bg-[#FCFBF8] rounded-[26px] border border-stone-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-200/80 font-bold text-xs text-stone-800 flex items-center justify-between">
          <span>Daftar Pengguna Terdaftar ({users.length} Akun)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F5F0] border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase">
                <th className="py-3 px-4">Nama & Email Google</th>
                <th className="py-3 px-4">Peran Hak Akses</th>
                <th className="py-3 px-4">Status Akun</th>
                <th className="py-3 px-4">Unit / Departemen</th>
                <th className="py-3 px-4">Kontak Telepon</th>
                <th className="py-3 px-4">Terdaftar</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/70">
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                const roleBadge =
                  u.role === 'Administrator'
                    ? 'bg-blue-50 text-blue-800 border-blue-200/80'
                    : u.role === 'Operator'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                    : 'bg-amber-50 text-amber-800 border-amber-200/80';

                return (
                  <tr key={u.id} className="hover:bg-[#F7F5F0]/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-stone-900">{u.name}</div>
                      <div className="text-[11px] text-stone-500 flex items-center space-x-1 mt-0.5">
                        <Mail className="w-3 h-3 text-stone-400" strokeWidth={1.75} />
                        <span>{u.email}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleBadge}`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.isPendingInvite ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                          <Clock className="w-3 h-3" strokeWidth={1.75} />
                          <span>Menunggu Login Google</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                          <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
                          <span>Aktif (Google)</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-stone-700">
                      {u.department}
                    </td>

                    <td className="py-3.5 px-4 text-stone-600">
                      {u.phone || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-stone-500 tabular-nums">
                      {u.created_at ? formatDateIndo(u.created_at.split('T')[0]) : '-'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-stone-700 bg-[#F7F5F0] hover:bg-stone-200/70 border border-stone-200 transition"
                          title="Edit Data & Peran Pengguna"
                        >
                          <Edit3 className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Edit</span>
                        </button>

                        {!isSelf ? (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400 font-semibold italic px-1.5">
                            (Akun Anda)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-[#FCFBF8] rounded-[26px] shadow-2xl max-w-md w-full p-6 border border-stone-200/90 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
              <h3 className="text-sm font-extrabold text-stone-900">
                Tambah Akses Pengguna Baru
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 py-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="font-medium">{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="Misal: Dr. Eko Prasetyo, M.Kom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Email Akun Google (@stekom.ac.id / Gmail)
                </label>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  placeholder="nama@stekom.ac.id atau nama@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  Pastikan email sama persis dengan akun Google yang digunakan saat menekan tombol Masuk dengan Google.
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Peran Hak Akses (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-bold"
                >
                  <option value="Operator">Operator (Bisa Tambah & Kelola Jadwal Event)</option>
                  <option value="Administrator">Administrator (Akses Penuh + Kelola Pengguna)</option>
                  <option value="Viewer">Viewer (Hanya Lihat — Tidak Bisa Tambah Event)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Unit / Bagian</label>
                <input
                  type="text"
                  placeholder="Bagian Rumah Tangga / Program Studi / BEM"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="tel"
                  placeholder="081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div className="pt-3 border-t border-stone-200/80 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Akses Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-[#FCFBF8] rounded-[26px] shadow-2xl max-w-md w-full p-6 border border-stone-200/90 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-blue-700" strokeWidth={1.75} />
                <h3 className="text-sm font-extrabold text-stone-900">Edit Data & Hak Akses Pengguna</h3>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 py-4 text-xs">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="font-medium">{editError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Email Akun Google</label>
                <input
                  type="email"
                  required
                  disabled={!editTarget.isPendingInvite}
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:opacity-60"
                />
                {!editTarget.isPendingInvite && (
                  <p className="text-[10px] text-stone-400 mt-1">
                    Email akun Google aktif terikat dengan identitas Firebase Auth.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Peran Hak Akses (Role)</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  disabled={editTarget.id === currentUser.id}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-bold disabled:opacity-60"
                >
                  <option value="Operator">Operator (Bisa Tambah & Kelola Jadwal Event)</option>
                  <option value="Administrator">Administrator (Akses Penuh + Kelola Pengguna)</option>
                  <option value="Viewer">Viewer (Hanya Lihat — Tidak Bisa Tambah Event)</option>
                </select>
                {editTarget.id === currentUser.id && (
                  <p className="text-[10px] text-stone-400 mt-1">
                    Peran akun yang sedang Anda gunakan tidak dapat diubah dari sini.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Unit / Bagian</label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div className="pt-3 border-t border-stone-200/80 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition"
                >
                  {editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-[#FCFBF8] rounded-[26px] shadow-2xl max-w-sm w-full p-6 border border-stone-200/90 animate-in fade-in zoom-in-95 text-xs space-y-4">
            <h3 className="text-sm font-extrabold text-stone-900">Hapus Akses Pengguna?</h3>
            <p className="text-stone-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data akses <strong>{deleteTarget.name}</strong> ({deleteTarget.email})?
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = deleteTarget.id;
                  setDeleteTarget(null);
                  await onDeleteUser(targetId);
                }}
                className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
              >
                Ya, Hapus Akses
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
