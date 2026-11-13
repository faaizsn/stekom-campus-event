import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, X } from 'lucide-react';
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
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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

    if (newPassword.length < 6) {
      setError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    try {
      setLoading(true);
      await api.changePassword(currentPassword, newPassword);
      onSuccessToast('Kata sandi akun berhasil diperbarui.');
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
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/70 flex items-center justify-center">
              <KeyRound className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-stone-900">
                Ubah Kata Sandi
              </h3>
              <p className="text-[11px] text-stone-500 font-medium">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={1.75} />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-stone-700 mb-1.5">
              Kata Sandi Saat Ini
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              placeholder="Masukkan kata sandi lama"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1.5">
              Kata Sandi Baru (min. 6 karakter)
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              minLength={6}
              placeholder="Minimal 6 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1.5">
              Konfirmasi Kata Sandi Baru
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              minLength={6}
              placeholder="Ulangi kata sandi baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F7F5F0] border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-stone-500 hover:text-stone-800"
          >
            {showPasswords ? (
              <>
                <EyeOff className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Sembunyikan kata sandi</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Tampilkan karakter kata sandi</span>
              </>
            )}
          </button>

          <div className="pt-3 border-t border-stone-200/80 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={resetAndClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition disabled:opacity-60"
            >
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>{loading ? 'Menyimpan...' : 'Simpan Kata Sandi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
