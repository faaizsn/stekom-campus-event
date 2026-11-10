import React, { useState } from 'react';
import {
  AlertTriangle,
  Mail,
  Phone,
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
  onDeleteUser: (id: string) => Promise<void>;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  currentUser,
  onAddUser,
  onDeleteUser
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Operator');
  const [department, setDepartment] = useState('Biro Sarana Prasarana');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    try {
      setLoading(true);
      await onAddUser({
        name: name.trim(),
        email: email.trim(),
        role,
        department: department.trim(),
        phone: phone.trim()
      });
      setModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan pengguna');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Manajemen Pengguna & Hak Akses (RBAC)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengaturan peran Administrator, Operator, dan Viewer dalam ekosistem kampus STEKOM
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-md shadow-blue-500/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-blue-200/90 shadow-xs">
          <div className="flex items-center space-x-2 text-blue-600 font-bold text-xs mb-1">
            <Shield className="w-4 h-4" />
            <span>Administrator</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Akses tak terbatas: CRUD seluruh jadwal event, konfirmasi dan pembatalan, manajemen 21 ruangan, kelola akun pengguna, dan audit log lengkap.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-200/90 shadow-xs">
          <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xs mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Operator</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Kelola event dan penjadwalan ruangan, memvalidasi permohonan peminjaman, monitoring ruangan, serta mencetak laporan resmi kampus.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-indigo-200/90 shadow-xs">
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs mb-1">
            <UserIcon className="w-4 h-4" />
            <span>Viewer</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Mode baca saja (Read-only): melihat dashboard, mengecek kalender acara, memantau ketersediaan ruangan hari ini, dan mengunduh laporan PDF/Excel.
          </p>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 font-bold text-xs text-slate-800">
          Daftar Pengguna Terdaftar ({users.length} Akun)
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-3 px-4">Nama & Email</th>
                <th className="py-3 px-4">Peran Hak Akses</th>
                <th className="py-3 px-4">Unit / Departemen</th>
                <th className="py-3 px-4">Kontak Telepon</th>
                <th className="py-3 px-4">Terdaftar</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                const roleBadge =
                  u.role === 'Administrator'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : u.role === 'Operator'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-indigo-100 text-indigo-800 border-indigo-200';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{u.email}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleBadge}`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {u.department}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {u.phone || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {u.created_at ? formatDateIndo(u.created_at.split('T')[0]) : '-'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Hapus pengguna ${u.name}?`)) {
                              onDeleteUser(u.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                          title="Hapus Pengguna"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {isSelf && (
                        <span className="text-[10px] text-slate-400 font-semibold italic">
                          (Akun Anda)
                        </span>
                      )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Tambah Akun Pengguna Baru
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 py-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Dr. Eko Prasetyo, M.Kom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Kampus (@stekom.ac.id)</label>
                <input
                  type="email"
                  required
                  placeholder="nama@stekom.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Peran Hak Akses (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="Operator">Operator (Kelola Event & Ruangan)</option>
                  <option value="Administrator">Administrator (Akses Penuh)</option>
                  <option value="Viewer">Viewer (Hanya Membaca)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Unit / Bagian</label>
                <input
                  type="text"
                  placeholder="Bagian Rumah Tangga / Program Studi / BEM"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="tel"
                  placeholder="081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
