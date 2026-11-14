import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  X
} from 'lucide-react';
import { api } from '../services/api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  onSuccessToast: (message: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  onSuccessToast
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Semua kolom kata sandi wajib diisi.');
      return;
    }
    if (newPassword !== newPassword.trim()) {
      setError('Kata sandi baru tidak boleh diawali atau diakhiri spasi.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Kata sandi baru harus berbeda dengan kata sandi saat ini.');
      return;
    }

    try {
      setLoading(true);
      await api.changePassword(currentPassword, newPassword);
      onSuccessToast('Kata sandi akun Anda berhasil diperbarui.');
      resetAndClose();
    } catch (err: any) {
      setError(err.message || 'Gagal memperbarui kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
      <div className="bg-[#FCFBF8] rounded-[26px] shadow-2xl max-w-md w-full p-6 border border-stone-200/90 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-blue-700" strokeWidth={1.75} />
            <h3 className="text-sm font-extrabold text-stone-900">Ubah Kata Sandi Akun</h3>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs">
          <div className="p-3 rounded-xl bg-[#F7F5F0] border border-stone-200/80">
            <span className="text-stone-500">Akun aktif:</span>
            <p className="font-bold text-stone-900 mt-0.5">{userEmail}</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={1.75} />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-stone-700 mb-1">Kata Sandi Saat Ini</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Masukkan kata sandi saat ini"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">
              Kata Sandi Baru (min. 6 karakter)
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Masukkan kata sandi baru"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowNew((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Konfirmasi Kata Sandi Baru</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Ulangi kata sandi baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="pt-3 border-t border-stone-200/80 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={resetAndClose}
              className="px-3.5 py-2 font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition disabled:opacity-60"
            >
              {loading ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
