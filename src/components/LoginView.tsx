import React, { useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Shield
} from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);

    if (resetMode) {
      if (!identifier.trim()) {
        setError('Masukkan email atau username kampus Anda untuk mengirim link reset sandi.');
        return;
      }
      try {
        setLoading(true);
        await api.sendPasswordReset(identifier);
        setResetSuccess(
          'Link reset kata sandi telah dikirim ke email Anda. Periksa kotak masuk atau folder spam.'
        );
      } catch (err: any) {
        setError(err?.message || 'Gagal mengirim email reset kata sandi.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!identifier.trim() || !password) {
      setError('Silakan masukkan email/username dan kata sandi Anda.');
      return;
    }

    try {
      setLoading(true);
      const user = await api.loginWithEmailPassword(identifier, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err?.message || 'Email/username atau kata sandi salah. Silakan periksa kembali.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setResetSuccess(null);
    try {
      setGoogleLoading(true);
      const user = await api.loginWithGoogle();
      onLoginSuccess(user);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setError('Jendela login Google ditutup sebelum selesai. Silakan coba lagi.');
      } else if (code === 'auth/popup-blocked') {
        setError('Popup login Google diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.');
      } else if (code === 'auth/cancelled-popup-request') {
        setError('Permintaan login dibatalkan. Silakan coba kembali.');
      } else {
        setError(err?.message || 'Gagal masuk dengan akun Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const busy = loading || googleLoading;

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-stone-800 flex flex-col items-center justify-center py-10 px-4 sm:px-6 font-sans antialiased selection:bg-blue-700 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Campus Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-slate-800 flex items-center justify-center font-black text-white text-xl tracking-wider shadow-md shadow-blue-900/15 border border-blue-600/30">
            ST
          </div>
          <div>
            <h1 className="font-extrabold text-xl sm:text-2xl tracking-tight text-stone-900">
              STEKOM <span className="text-blue-700 font-semibold">CAMPUS EVENT</span>
            </h1>
            <p className="text-xs text-stone-500 font-medium mt-1">
              Sistem Manajemen Jadwal Event & Ruangan Universitas STEKOM
            </p>
          </div>
        </div>

        {/* Clean Login Card (No Account Templates) */}
        <div className="bg-[#FCFBF8] rounded-[28px] border border-stone-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.05)] p-6 sm:p-8 space-y-5">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200/70 text-[11px] font-bold mb-3">
              <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Portal Autentikasi Kampus</span>
            </div>
            <h2 className="text-lg font-extrabold text-stone-900 tracking-tight">
              {resetMode ? 'Reset Kata Sandi' : 'Masuk ke Sistem'}
            </h2>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              {resetMode
                ? 'Masukkan email atau username akun Anda untuk menerima tautan reset kata sandi.'
                : 'Masukkan email/username dan kata sandi akun Anda untuk mengakses dashboard, jadwal event, dan penggunaan 21 ruangan.'}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={1.75} />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" strokeWidth={1.75} />
              <span className="font-medium leading-relaxed">{resetSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Email / Username Kampus
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                  strokeWidth={1.75}
                />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="nama@stekom.ac.id"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F7F5F0] border border-stone-200 rounded-xl text-stone-900 font-medium placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>
            </div>

            {!resetMode && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-stone-700">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetMode(true);
                      setError(null);
                      setResetSuccess(null);
                    }}
                    className="text-[11px] font-semibold text-blue-700 hover:underline"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
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
                      if (error) setError(null);
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
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center space-x-2 px-5 py-3 text-xs font-bold text-white bg-gradient-to-r from-blue-700 to-slate-800 hover:from-blue-800 hover:to-slate-900 active:scale-[0.99] rounded-xl shadow-md shadow-blue-900/15 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{resetMode ? 'Mengirim Tautan...' : 'Memverifikasi Akun...'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" strokeWidth={1.75} />
                  <span>{resetMode ? 'Kirim Email Reset Sandi' : 'Masuk ke Sistem'}</span>
                </>
              )}
            </button>

            {resetMode && (
              <button
                type="button"
                onClick={() => {
                  setResetMode(false);
                  setError(null);
                  setResetSuccess(null);
                }}
                className="w-full text-center text-xs font-semibold text-stone-500 hover:text-stone-800 py-1"
              >
                Kembali ke form login
              </button>
            )}
          </form>

          {!resetMode && (
            <>
              <div className="relative flex items-center py-0.5">
                <div className="flex-grow border-t border-stone-200/90" />
                <span className="shrink mx-3 text-[11px] font-semibold text-stone-400">atau</span>
                <div className="flex-grow border-t border-stone-200/90" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={busy}
                className="w-full inline-flex items-center justify-center space-x-2.5 px-4 py-2.5 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-xl shadow-xs transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                    <span>Menghubungkan Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                      />
                    </svg>
                    <span>Masuk dengan Akun Google</span>
                  </>
                )}
              </button>
            </>
          )}

          <div className="pt-3 border-t border-stone-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <span className="inline-flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-700" strokeWidth={1.75} />
                <span>Firebase Auth RBAC</span>
              </span>
              <span className="inline-flex items-center space-x-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.75} />
                <span>WIB (Asia/Jakarta)</span>
              </span>
            </div>

            <div className="px-3 py-2 rounded-xl border text-[11px] flex items-center space-x-2 bg-emerald-50/70 border-emerald-200/80 text-emerald-800">
              <Database className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              <span className="font-medium leading-snug">
                Terhubung ke Cloud Firestore Real-Time (Sinkron Lintas Perangkat)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
