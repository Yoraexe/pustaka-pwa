/**
 * @file src/client/pages/LoginPage.tsx
 * @description Dialog / Halaman login akun lokal sekolah (NISN / NIP) dengan quick demo access.
 * @layer Page Component
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { LogIn, UserCheck, Shield, BookOpen, X, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onClose, onSuccess }) => {
  const { login } = useAuth();
  const [identityNumber, setIdentityNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await login({
        identityNumber: identityNumber.trim(),
        password
      });
      onSuccess?.();
      onClose?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal melakukan login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (id: string, pass: string) => {
    setIdentityNumber(id);
    setPassword(pass);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-surface-card rounded-3xl border border-border-subtle shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-main rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        )}

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white mx-auto flex items-center justify-center shadow-md mb-3">
            <BookOpen size={24} />
          </div>
          <h2 className="text-xl font-bold text-text-main">Masuk ke Pustaka Sekolah</h2>
          <p className="text-xs text-text-muted mt-1">
            Gunakan Nomor Induk Siswa Nasional (NISN) atau NIP yang terdaftar di sekolah.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-main mb-1">
              Nomor Identitas (NISN / NIP)
            </label>
            <input
              type="text"
              required
              value={identityNumber}
              onChange={(e) => setIdentityNumber(e.target.value)}
              placeholder="Contoh: NISN202601"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-main mb-1">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <LogIn size={16} />
            <span>{isSubmitting ? 'Memverifikasi...' : 'Masuk Akun'}</span>
          </button>
        </form>

        {/* Demo Quick Access Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-2 text-center">
            Pilih Cepat Akun Demo (Untuk Pengujian)
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('NISN202601', 'siswa123')}
              className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs transition-colors"
            >
              <div className="font-semibold text-primary-700 flex items-center gap-1">
                <UserCheck size={12} /> Siswa 1 (X RPL 1)
              </div>
              <div className="text-[10px] text-text-muted font-mono">NISN202601</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('PUSTAKA01', 'pustaka123')}
              className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs transition-colors"
            >
              <div className="font-semibold text-amber-700 flex items-center gap-1">
                <Shield size={12} /> Pustakawan
              </div>
              <div className="text-[10px] text-text-muted font-mono">PUSTAKA01</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('GURU001', 'guru123')}
              className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs transition-colors"
            >
              <div className="font-semibold text-blue-700 flex items-center gap-1">
                <UserCheck size={12} /> Guru TIK
              </div>
              <div className="text-[10px] text-text-muted font-mono">GURU001</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('ADMIN01', 'admin123')}
              className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs transition-colors"
            >
              <div className="font-semibold text-red-700 flex items-center gap-1">
                <Shield size={12} /> Admin
              </div>
              <div className="text-[10px] text-text-muted font-mono">ADMIN01</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
