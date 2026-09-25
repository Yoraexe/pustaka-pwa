/**
 * @file src/client/pages/LoginPage.tsx
 * @description Dialog autentikasi akun sekolah berbasis Shadcn UI Dialog, Input, Label, dan Button dengan presisi tipografi editorial.
 * @layer Page Component
 * 
 * Tujuan: Menyediakan antarmuka login NISN/NIP sekolah yang aman, cepat, dan terintegrasi dengan arsitektur modal Shadcn.
 * Caller: src/client/App.tsx
 * Dependensi: react, src/client/hooks/useAuth.ts, src/client/components/ui/dialog.ts, src/client/components/ui/button.ts, src/client/components/ui/input.ts, src/client/components/ui/label.ts
 * Main Functions: LoginPage
 * Side Effects: Memanggil API login, menyimpan token ke localStorage, mengupdate sesi auth.
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog.js';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { Label } from '../components/ui/label.js';
import { toast } from 'sonner';

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
        password,
      });
      toast.success('Autentikasi Berhasil', {
        description: 'Selamat datang kembali di Pustaka Sekolah.',
      });
      onSuccess?.();
      onClose?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal melakukan verifikasi akun.';
      setErrorMsg(msg);
      toast.error('Gagal Masuk', { description: msg });
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
    <Dialog open={true} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-md p-6 sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            Masuk
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Masuk menggunakan NISN atau NIP terdaftar.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 my-2">
          <div>
            <Label htmlFor="identityNumber">NISN / NIP</Label>
            <Input
              id="identityNumber"
              type="text"
              required
              value={identityNumber}
              onChange={(e) => setIdentityNumber(e.target.value)}
              placeholder="Contoh: NISN202601"
              className="font-mono"
            />
          </div>

          <div>
            <Label htmlFor="password">Kata Sandi</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 text-xs font-semibold shadow-xs"
          >
            {isSubmitting ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>

        {/* Quick Demo Access - Formatted as refined Shadcn Cards */}
        <div className="pt-4 border-t border-border space-y-2.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block text-center font-medium">
            Akun Demo
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('NISN202601', 'siswa123')}
              className="p-2.5 text-left rounded-xl border border-border bg-muted/40 hover:bg-muted hover:border-primary/40 transition-colors text-xs cursor-pointer group"
            >
              <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Siswa (X RPL 1)
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">NISN202601</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('PUSTAKA01', 'pustaka123')}
              className="p-2.5 text-left rounded-xl border border-border bg-muted/40 hover:bg-muted hover:border-primary/40 transition-colors text-xs cursor-pointer group"
            >
              <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Pustakawan
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">PUSTAKA01</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('GURU001', 'guru123')}
              className="p-2.5 text-left rounded-xl border border-border bg-muted/40 hover:bg-muted hover:border-primary/40 transition-colors text-xs cursor-pointer group"
            >
              <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Guru TIK
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">GURU001</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('ADMIN01', 'admin123')}
              className="p-2.5 text-left rounded-xl border border-border bg-muted/40 hover:bg-muted hover:border-primary/40 transition-colors text-xs cursor-pointer group"
            >
              <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                Administrator
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">ADMIN01</div>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
