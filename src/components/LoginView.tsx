import React, { useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Database,
  Lock,
  Shield
} from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      setLoading(true);
      const user = await api.loginWithGoogle();
      onLoginSuccess(user);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setError('Jendela login Google ditutup sebelum proses selesai. Silakan coba lagi.');
      } else if (code === 'auth/popup-blocked') {
        setError('Popup login Google diblokir browser. Izinkan popup untuk halaman ini lalu coba kembali.');
      } else if (code === 'auth/cancelled-popup-request') {
        setError('Permintaan login dibatalkan. Silakan klik tombol masuk kembali.');
      } else if (code === 'auth/unauthorized-domain') {
        setError('Domain ini belum terdaftar pada OAuth Authorized Domains Firebase Console.');
      } else {
        setError(err?.message || 'Gagal masuk dengan akun Google. Silakan coba kembali.');
      }
    } finally {
      setLoading(false);
    }
  };

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

        {/* Clean Single Login Card */}
        <div className="bg-[#FCFBF8] rounded-[28px] border border-stone-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.05)] p-6 sm:p-8 space-y-6">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200/70 text-[11px] font-bold mb-3">
              <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Portal Autentikasi Kampus</span>
            </div>
            <h2 className="text-lg font-extrabold text-stone-900 tracking-tight">
              Masuk ke Sistem
            </h2>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Masuk menggunakan akun Google Anda untuk mengakses dashboard, jadwal event, dan penggunaan 21 ruangan Universitas STEKOM.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={1.75} />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full inline-flex items-center justify-center space-x-3 px-5 py-3.5 text-xs font-bold text-stone-800 bg-white hover:bg-stone-50 active:scale-[0.99] border border-stone-300 rounded-xl shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                  <span>Menghubungkan ke Akun Google...</span>
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

            <p className="text-[11px] text-stone-500 text-center leading-relaxed px-2">
              Akun yang telah didaftarkan oleh Administrator otomatis mendapatkan hak akses Operator atau Administrator saat login.
            </p>
          </div>

          <div className="pt-4 border-t border-stone-200/80 space-y-2.5">
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
