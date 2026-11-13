import React, { useState } from 'react';
import {
  AlertCircle,
  Edit3,
  Eye,
  EyeOff,
  Info,
  KeyRound,
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
  onAddUser: (user: Partial<User> & { password?: string }) => Promise<void>;
  onUpdateUser: (userId: string, data: Partial<User>) => Promise<void>;
  onResetPassword: (userId: string, newPassword: string) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onResetPassword,
  onDeleteUser
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  // Reset Password Modal
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !email.trim()) {
      setFormError('Nama lengkap dan email wajib diisi.');
      return;
    }

    const hasPasswordInput = password.trim().length > 0;
    if (hasPasswordInput && password !== password.trim()) {
      setFormError('Kata sandi tidak boleh diawali atau diakhiri spasi.');
      return;
    }
    if (hasPasswordInput && password.length < 6) {
      setFormError('Kata sandi awal minimal 6 karakter (atau kosongkan untuk default: stekom123).');
      return;
    }

    try {
      setLoading(true);
      await onAddUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        department: department.trim(),
        phone: phone.trim(),
        password: hasPasswordInput ? password : 'stekom123'
      });
      setModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setShowPassword(false);
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
        email: editEmail.trim().toLowerCase(),
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

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError(null);
    if (newPassword !== newPassword.trim()) {
      setResetError('Kata sandi baru tidak boleh diawali atau diakhiri spasi.');
      return;
    }
    if (newPassword.length < 6) {
      setResetError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }
    try {
      setResetLoading(true);
      await onResetPassword(resetTarget.id, newPassword);
      setResetTarget(null);
      setNewPassword('');
      setShowNewPassword(false);
    } catch (err: any) {
      setResetError(err.message || 'Gagal mereset kata sandi');
    } finally {
      setResetLoading(false);
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
            Pengaturan akun login, kata sandi, dan peran Administrator, Operator, serta Viewer Universitas STEKOM
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setShowPassword(false);
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

      {/* Info Akun & Kebijakan Sandi */}
      <div className="p-4 rounded-[22px] bg-[#FCFBF8] border border-stone-200/90 shadow-xs flex items-start space-x-3 text-xs">
        <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" strokeWidth={1.75} />
        <div className="space-y-1 text-stone-600 leading-relaxed">
          <p className="font-bold text-stone-800">Informasi Login Pengguna Baru & Hak Akses Event</p>
          <p className="text-[11px]">
            Pengguna baru yang dibuat tanpa mengisi kata sandi awal otomatis mendapatkan kata sandi default{' '}
            <code className="px-1.5 py-0.5 rounded bg-[#F7F5F0] border border-stone-200 font-mono font-bold text-stone-800">stekom123</code>.
            Pastikan memilih peran <strong>Operator</strong> atau <strong>Administrator</strong> jika akun tersebut akan digunakan untuk menambah dan menjadwalkan event.
          </p>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-[#FCFBF8] rounded-[26px] border border-stone-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-200/80 font-bold text-xs text-stone-800 flex items-center justify-between">
          <span>Daftar Pengguna Terdaftar ({users.length} Akun)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F5F0] border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase">
                <th className="py-3 px-4">Nama & Email</th>
                <th className="py-3 px-4">Peran Hak Akses</th>
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

                        <button
                          onClick={() => {
                            setResetTarget(u);
                            setNewPassword('');
                            setShowNewPassword(false);
                            setResetError(null);
                          }}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/70 transition"
                          title="Reset Kata Sandi Pengguna"
                        >
                          <KeyRound className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Reset Sandi</span>
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
                Tambah Akun Pengguna Baru
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 py-4 text-xs">
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
                  placeholder="Misal: Dr. Eko Prasetyo, M.Kom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Email Login (@stekom.ac.id)</label>
                <input
                  type="email"
                  required
                  placeholder="nama@stekom.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Kata Sandi Awal <span className="text-stone-400 font-normal">(opsional, default: stekom123)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Kosongkan untuk pakai default: stekom123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-stone-700"
                    title={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                  {loading ? 'Menyimpan...' : 'Simpan Pengguna'}
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
                <label className="block font-bold text-stone-700 mb-1">Email Login</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
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

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-[#FCFBF8] rounded-[26px] shadow-2xl max-w-sm w-full p-6 border border-stone-200/90 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-blue-700" strokeWidth={1.75} />
                <h3 className="text-sm font-extrabold text-stone-900">Reset Kata Sandi</h3>
              </div>
              <button
                onClick={() => setResetTarget(null)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-4 pt-4 text-xs">
              <div className="p-3 rounded-xl bg-[#F7F5F0] border border-stone-200/80">
                <p className="font-bold text-stone-900">{resetTarget.name}</p>
                <p className="text-[11px] text-stone-500">{resetTarget.email}</p>
              </div>

              {resetError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium">
                  {resetError}
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 mb-1.5">
                  Kata Sandi Baru (min. 6 karakter)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Masukkan kata sandi baru"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-stone-700"
                    title={showNewPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition"
                >
                  {resetLoading ? 'Menyimpan...' : 'Simpan Sandi Baru'}
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
            <h3 className="text-sm font-extrabold text-stone-900">Hapus Akun Pengguna?</h3>
            <p className="text-stone-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun <strong>{deleteTarget.name}</strong> ({deleteTarget.email})? Pengguna ini tidak akan bisa login lagi.
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
                Ya, Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
