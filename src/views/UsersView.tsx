import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
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
import { normalizeLoginEmail } from '../services/api';
import { User, UserRole } from '../types';
import { formatDateIndo } from '../utils/conflictDetector';

interface UsersViewProps {
  users: User[];
  currentUser: User;
  serverStatus?: {
    online: boolean;
    persistence: string;
    mode: string;
    persistentServerStorage?: boolean;
  };
  onAddUser: (user: Partial<User> & { password?: string; usedDefaultPassword?: boolean }) => Promise<void>;
  onUpdateUser: (userId: string, data: Partial<User> & { new_password?: string }) => Promise<void>;
  onResetPassword: (userId: string, newPassword?: string) => Promise<{ password: string }>;
  onDeleteUser: (id: string) => Promise<void>;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  currentUser,
  serverStatus,
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
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Direct Password Reset Modal
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // Newly created or reset account confirmation banner
  const [lastAccountCreds, setLastAccountCreds] = useState<{
    title: string;
    name: string;
    email: string;
    password: string;
    role: UserRole;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const handleCopyCredentials = async () => {
    if (!lastAccountCreds) return;
    const text = `Email: ${lastAccountCreds.email}\nSandi: ${lastAccountCreds.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCreds(true);
      setTimeout(() => setCopiedCreds(false), 2000);
    } catch {
      // ignore clipboard errors in restricted iframes
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !email.trim()) {
      setFormError('Nama lengkap dan email/username wajib diisi.');
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

    const finalEmail = normalizeLoginEmail(email);
    const finalPassword = hasPasswordInput ? password : 'stekom123';
    const finalName = name.trim();
    const finalRole = role;

    try {
      setLoading(true);
      await onAddUser({
        name: finalName,
        email: finalEmail,
        role: finalRole,
        department: department.trim(),
        phone: phone.trim(),
        password: finalPassword,
        usedDefaultPassword: !hasPasswordInput
      });
      setLastAccountCreds({
        title: 'Akun Baru Berhasil Dibuat & Siap Digunakan untuk Login',
        name: finalName,
        email: finalEmail,
        password: finalPassword,
        role: finalRole
      });
      setCopiedCreds(false);
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
    setEditPassword('');
    setShowEditPassword(false);
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

    const hasNewPassword = editPassword.trim().length > 0;
    if (hasNewPassword && editPassword !== editPassword.trim()) {
      setEditError('Kata sandi baru tidak boleh diawali atau diakhiri spasi.');
      return;
    }
    if (hasNewPassword && editPassword.length < 6) {
      setEditError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    const normalizedEditEmail = normalizeLoginEmail(editEmail);
    const trimmedName = editName.trim();

    try {
      setEditLoading(true);
      await onUpdateUser(editTarget.id, {
        name: trimmedName,
        email: normalizedEditEmail,
        role: editRole,
        department: editDepartment.trim(),
        phone: editPhone.trim(),
        ...(hasNewPassword ? { new_password: editPassword } : {})
      });
      if (hasNewPassword) {
        setLastAccountCreds({
          title: 'Data & Kata Sandi Pengguna Berhasil Diperbarui',
          name: trimmedName,
          email: normalizedEditEmail,
          password: editPassword,
          role: editRole
        });
        setCopiedCreds(false);
      }
      setEditPassword('');
      setShowEditPassword(false);
      setEditTarget(null);
    } catch (err: any) {
      setEditError(err.message || 'Gagal memperbarui data pengguna');
    } finally {
      setEditLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError(null);

    const hasCustom = resetNewPassword.trim().length > 0;
    if (hasCustom && resetNewPassword !== resetNewPassword.trim()) {
      setResetError('Kata sandi baru tidak boleh diawali atau diakhiri spasi.');
      return;
    }
    if (hasCustom && resetNewPassword.length < 6) {
      setResetError('Kata sandi baru minimal 6 karakter (atau kosongkan untuk default: stekom123).');
      return;
    }

    try {
      setResetLoading(true);
      const res = await onResetPassword(resetTarget.id, hasCustom ? resetNewPassword : undefined);
      setLastAccountCreds({
        title: 'Kata Sandi Pengguna Berhasil Direset & Siap Digunakan',
        name: resetTarget.name,
        email: resetTarget.email,
        password: res.password,
        role: resetTarget.role
      });
      setCopiedCreds(false);
      setResetTarget(null);
      setResetNewPassword('');
      setShowResetPassword(false);
    } catch (err: any) {
      setResetError(err.message || 'Gagal mereset kata sandi.');
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
            Pengaturan akun login user/kata sandi dan peran Administrator, Operator, serta Viewer Universitas STEKOM
          </p>
        </div>

        <button
          onClick={() => {
            setName('');
            setEmail('');
            setPassword('');
            setPhone('');
            setRole('Operator');
            setDepartment('Biro Sarana Prasarana');
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
        <div className="space-y-1.5 text-stone-600 leading-relaxed">
          <p className="font-bold text-stone-800">
            Informasi Pembuatan Akun Login & Hak Akses Event
          </p>
          <p className="text-[11px]">
            Akun baru yang dibuat tanpa mengisi kata sandi awal otomatis mendapatkan kata sandi default{' '}
            <code className="px-1.5 py-0.5 rounded bg-[#F7F5F0] border border-stone-200 font-mono font-bold text-stone-800">
              stekom123
            </code>{' '}
            dan langsung aktif tersimpan di database sistem tanpa memerlukan konfigurasi autentikasi eksternal. Pilih peran{' '}
            <strong>Operator</strong> atau <strong>Administrator</strong> jika akun akan digunakan untuk menambah jadwal event.
          </p>
          {serverStatus?.mode === 'serverless-ephemeral' && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
              <strong>Mode Browser Lokal (Vercel tanpa Cloud KV):</strong> Perubahan akun & reset sandi tersimpan pada browser ini (<code className="font-mono">localStorage</code>). Untuk menguji login akun baru/reset, lakukan <strong>Keluar (Logout)</strong> lalu login kembali di browser yang sama. Tab Incognito/perangkat berbeda tidak dapat melihat akun lokal sebelum variabel{' '}
              <code className="font-mono font-bold">UPSTASH_REDIS_REST_URL</code> &{' '}
              <code className="font-mono font-bold">UPSTASH_REDIS_REST_TOKEN</code> dihubungkan di Vercel.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Banner */}
      {lastAccountCreds && (
        <div className="p-4 rounded-[22px] bg-emerald-50/90 border border-emerald-200 shadow-xs space-y-3 text-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 text-emerald-950">
              <p className="font-bold">
                {lastAccountCreds.title} ({lastAccountCreds.name}):
              </p>
              <p className="text-[11px]">
                Email:{' '}
                <code className="px-1.5 py-0.5 rounded bg-white border border-emerald-200 font-mono font-bold select-all">
                  {lastAccountCreds.email}
                </code>{' '}
                • Sandi:{' '}
                <code className="px-1.5 py-0.5 rounded bg-white border border-emerald-200 font-mono font-bold select-all">
                  {lastAccountCreds.password}
                </code>{' '}
                • Peran: <strong>{lastAccountCreds.role}</strong>
              </p>
              {serverStatus?.mode === 'serverless-ephemeral' && (
                <p className="text-[11px] text-amber-900 font-medium pt-0.5">
                  Catatan: Pada mode Vercel Browser Lokal, uji login di browser yang sama (bukan jendela Incognito atau perangkat lain).
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setLastAccountCreds(null)}
              className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100/60 border border-emerald-300 text-emerald-900 font-bold text-[11px] transition"
            >
              {copiedCreds ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCreds ? 'Tersalin!' : 'Salin Email & Sandi'}</span>
            </button>
          </div>
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
                <th className="py-3 px-4">Nama & Email Login</th>
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
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                        <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
                        <span>Aktif</span>
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
                            setResetNewPassword('');
                            setShowResetPassword(false);
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

            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 py-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="font-medium leading-relaxed">{formError}</span>
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
                  Email / Username Login
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="nama@stekom.ac.id (atau username -> @stekom.ac.id)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Kata Sandi Awal{' '}
                  <span className="text-stone-400 font-normal">(opsional, default: stekom123)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
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
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition disabled:opacity-60"
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

            <form onSubmit={handleEditSubmit} autoComplete="off" className="space-y-4 py-4 text-xs">
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
                  autoComplete="off"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Email / Username Login</label>
                <input
                  type="text"
                  required
                  autoComplete="off"
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

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Kata Sandi Baru <span className="text-stone-400 font-normal">(opsional, kosongkan jika tetap)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    name="edit-user-new-password"
                    autoComplete="new-password"
                    placeholder="Minimal 6 karakter untuk ganti sandi"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-stone-700"
                    title={showEditPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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

      {/* Direct Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-[#FCFBF8] rounded-[26px] shadow-2xl max-w-sm w-full p-6 border border-stone-200/90 animate-in fade-in zoom-in-95 text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-blue-700" strokeWidth={1.75} />
                <h3 className="text-sm font-extrabold text-stone-900">Reset Kata Sandi Pengguna</h3>
              </div>
              <button
                onClick={() => setResetTarget(null)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#F7F5F0] border border-stone-200/80">
              <p className="font-bold text-stone-900">{resetTarget.name}</p>
              <p className="text-[11px] text-stone-500">{resetTarget.email}</p>
            </div>

            <form onSubmit={handleConfirmResetPassword} autoComplete="off" className="space-y-4">
              {resetError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium">
                  {resetError}
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Kata Sandi Baru <span className="text-stone-400 font-normal">(opsional)</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    name="reset-user-new-password"
                    autoComplete="new-password"
                    placeholder="Kosongkan untuk reset ke: stekom123"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-stone-400 hover:text-stone-700"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-stone-500 mt-1.5 leading-relaxed">
                  Kata sandi langsung diperbarui di database sistem dan dapat segera digunakan untuk login.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-3.5 py-2 font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition disabled:opacity-60"
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
