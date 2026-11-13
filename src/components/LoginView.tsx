import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Shield,
  Sparkles,
  User as UserIcon,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { User, UserRole } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

interface DemoAccountInfo {
  role: UserRole;
  name: string;
  email: string;
  password: string;
  department: string;
  summary: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const DEMO_ACCOUNTS: DemoAccountInfo[] = [
  {
    role: 'Administrator',
    name: 'Dr. Ir. Agus Wibowo, M.Kom',
    email: 'admin@stekom.ac.id',
    password: 'admin123',
    department: 'Biro Administrasi Akademik & Sarpras',
    summary: 'Akses penuh: kelola event, konfirmasi/pembatalan, master 21 ruangan, manajemen akun pengguna, audit log & pengaturan.',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80',
    icon: Shield
  },
  {
    role: 'Operator',
    name: 'Rahmat Hidayat, S.Kom',
    email: 'operator@stekom.ac.id',
    password: 'operator123',
    department: 'Bagian Rumah Tangga & Penjadwalan',
    summary: 'Kelola jadwal event, validasi status Scheduled/Dibatalkan, pantau penggunaan ruangan, kelola kapasitas ruangan & audit log.',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    icon: UserCheck
  },
  {
    role: 'Viewer',
    name: 'Siti Nurhaliza',
    email: 'viewer@stekom.ac.id',
    password: 'viewer123',
    department: 'BEM Universitas STEKOM',
    summary: 'Mode baca saja (Read-only): memantau dashboard, kalender jadwal kampus, status ketersediaan 21 ruangan & unduh rekap bulanan.',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    icon: UserIcon
  }
];

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filledRole, setFilledRole] = useState<UserRole | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Silakan masukkan email kampus dan kata sandi Anda.');
      return;
    }

    try {
      setLoading(true);
      const result = await api.login(email.trim(), password);
      onLoginSuccess(result.user);
    } catch (err: any) {
      setError(err.message || 'Gagal masuk ke sistem. Periksa email dan kata sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (account: DemoAccountInfo) => {
    setEmail(account.email);
    setPassword(account.password);
    setFilledRole(account.role);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-stone-800 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 font-sans antialiased selection:bg-blue-700 selection:text-white">
      <div className="max-w-5xl w-full mx-auto space-y-6">
        {/* Top Campus Brand Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-800 flex items-center justify-center font-black text-white text-lg tracking-wider shadow-md shadow-blue-900/10 border border-blue-600/30">
              ST
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-xl sm:text-2xl tracking-tight text-stone-900">
                  STEKOM <span className="text-blue-700 font-semibold">CAMPUS EVENT</span>
                </h1>
              </div>
              <p className="text-xs text-stone-500 font-medium">
                Sistem Manajemen Jadwal Event & Ruangan Universitas STEKOM
              </p>
            </div>
          </div>

          <div className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-[#FCFBF8] border border-stone-200/90 shadow-xs text-xs text-stone-600 self-start sm:self-auto">
            <CalendarDays className="w-4 h-4 text-blue-700" strokeWidth={1.75} />
            <span className="font-semibold">Zona Waktu: Asia/Jakarta (WIB)</span>
          </div>
        </div>

        {/* Main 2-Column Auth Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Login Form */}
          <div className="lg:col-span-5 bg-[#FCFBF8] rounded-[28px] border border-stone-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200/70 text-[11px] font-bold mb-3">
                  <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Portal Autentikasi Kampus</span>
                </div>
                <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
                  Masuk ke Sistem
                </h2>
                <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                  Gunakan akun resmi Universitas STEKOM untuk mengelola jadwal event, memvalidasi bentrok ruangan, dan mengunduh rekap bulanan.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span className="font-medium leading-relaxed">{error}</span>
                </div>
              )}

              {filledRole && !error && (
                <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-900 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={1.75} />
                  <span className="font-medium">
                    Kredensial <strong>{filledRole}</strong> siap digunakan. Klik tombol Masuk di bawah.
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Email Kampus
                  </label>
                  <div className="relative">
                    <Mail
                      className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                      strokeWidth={1.75}
                    />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="contoh: admin@stekom.ac.id"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setFilledRole(null);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F7F5F0] border border-stone-200 rounded-xl text-stone-900 font-medium placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <KeyRound
                      className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                      strokeWidth={1.75}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Masukkan kata sandi"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFilledRole(null);
                      }}
                      className="w-full pl-10 pr-10 py-2.5 text-xs bg-[#F7F5F0] border border-stone-200 rounded-xl text-stone-900 font-medium placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                      ) : (
                        <Eye className="w-4 h-4" strokeWidth={1.75} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 inline-flex items-center justify-center space-x-2 px-5 py-3 text-xs font-bold text-white bg-gradient-to-r from-blue-700 to-slate-800 hover:from-blue-800 hover:to-slate-900 active:scale-[0.99] rounded-xl shadow-md shadow-blue-900/15 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Memverifikasi Akun...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" strokeWidth={1.75} />
                      <span>Masuk ke Sistem</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="pt-5 mt-6 border-t border-stone-200/80 text-[11px] text-stone-500 leading-relaxed">
              <div className="flex items-center space-x-1.5 text-stone-700 font-bold mb-1">
                <Building2 className="w-3.5 h-3.5 text-blue-700" strokeWidth={1.75} />
                <span>Pengelolaan Akun Baru</span>
              </div>
              Akun tambahan dibuat oleh <strong>Administrator</strong> melalui menu <strong>Pengguna</strong> setelah login. Setiap pengguna juga dapat mengganti kata sandi secara mandiri dari menu profil.
            </div>
          </div>

          {/* Right: Available Accounts & Credentials Guide */}
          <div className="lg:col-span-7 bg-[#FCFBF8] rounded-[28px] border border-stone-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-bold mb-2">
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Akun Bawaan Sistem (Siap Pakai)</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-stone-900 tracking-tight">
                    Daftar Akun & Hak Akses (RBAC)
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-stone-500">
                  Klik &ldquo;Isi Otomatis&rdquo; untuk mencoba
                </span>
              </div>

              <div className="space-y-3">
                {DEMO_ACCOUNTS.map((acc) => {
                  const Icon = acc.icon;
                  const isSelected = filledRole === acc.role;

                  return (
                    <div
                      key={acc.role}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-white border-blue-400 shadow-sm ring-2 ring-blue-500/10'
                          : 'bg-[#F7F5F0]/80 border-stone-200/90 hover:bg-white hover:border-stone-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span
                              className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${acc.badgeClass}`}
                            >
                              <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                              <span>{acc.role}</span>
                            </span>
                            <span className="text-xs font-bold text-stone-900">
                              {acc.name}
                            </span>
                          </div>

                          <p className="text-[11px] text-stone-500 leading-relaxed">
                            {acc.summary}
                          </p>

                          <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                            <div className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 font-mono">
                              <span className="text-stone-400 font-sans mr-1">Email:</span>
                              <strong className="text-stone-900">{acc.email}</strong>
                            </div>
                            <div className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 font-mono">
                              <span className="text-stone-400 font-sans mr-1">Sandi:</span>
                              <strong className="text-stone-900">{acc.password}</strong>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleQuickFill(acc)}
                          className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                            isSelected
                              ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-200'
                          }`}
                        >
                          {isSelected ? 'Terpilih' : 'Isi Otomatis'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F7F5F0] border border-stone-200/80 text-[11px] text-stone-600 flex items-start space-x-2.5">
              <Shield className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>
                <strong className="text-stone-800">Keamanan & Audit Log:</strong> Setiap aktivitas Login, Logout, perubahan jadwal event, ruangan, dan pengguna tercatat otomatis di Audit Log beserta identitas akun aktif.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
