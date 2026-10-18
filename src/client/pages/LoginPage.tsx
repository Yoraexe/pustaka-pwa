/**
 * @file src/client/pages/LoginPage.tsx
 * @description Dialog autentikasi & registrasi akun mandiri sekolah berbasis Shadcn UI Dialog, Tabs, Input, Label, dan Button.
 * @layer Page Component
 * 
 * Tujuan: Menyediakan antarmuka login NISN/NIP serta pendaftaran akun mandiri bagi Siswa dan Guru yang terintegrasi dengan modal Shadcn.
 * Caller: src/client/App.tsx
 * Dependensi: react, src/client/hooks/useAuth.tsx, Shadcn UI (Dialog, Tabs, Button, Input, Label), sonner.
 * Main Functions: LoginPage
 * Side Effects: Memanggil API login atau signup, menyimpan token ke localStorage, mengupdate sesi auth.
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs.js';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { Label } from '../components/ui/label.js';
import { toast } from 'sonner';

interface LoginPageProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onClose, onSuccess }) => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Login Form State
  const [identityNumber, setIdentityNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Signup Form State
  const [regIdentity, setRegIdentity] = useState<string>('');
  const [regName, setRegName] = useState<string>('');
  const [regRole, setRegRole] = useState<'STUDENT' | 'TEACHER' | 'LIBRARIAN' | 'ADMIN'>('STUDENT');
  const [regClassName, setRegClassName] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
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

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await signup({
        identityNumber: regIdentity.trim(),
        name: regName.trim(),
        role: regRole,
        className: regClassName.trim() || null,
        password: regPassword,
      });
      toast.success('Pendaftaran Akun Berhasil', {
        description: `Selamat datang, ${regName.trim()}! Akun Anda telah aktif.`,
      });
      onSuccess?.();
      onClose?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mendaftarkan akun baru.';
      setErrorMsg(msg);
      toast.error('Gagal Mendaftar', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-md p-6 sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            {mode === 'login' ? 'Masuk ke Pustaka Sekolah' : 'Buat Akun Baru'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {mode === 'login'
              ? 'Masuk menggunakan NISN, NIP, atau ID pengguna terdaftar Anda.'
              : 'Daftarkan akun pengguna baru (Siswa, Guru, Pustakawan, atau Superadmin).'}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as 'login' | 'signup');
            setErrorMsg(null);
          }}
          className="mt-1"
        >
          <TabsList className="grid grid-cols-2 w-full h-10 rounded-xl bg-muted/60 p-1">
            <TabsTrigger value="login" className="text-xs font-semibold rounded-lg">
              Masuk
            </TabsTrigger>
            <TabsTrigger value="signup" className="text-xs font-semibold rounded-lg">
              Daftar Akun
            </TabsTrigger>
          </TabsList>

          {errorMsg && (
            <div className="mt-3 p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* TAB 1: MASUK */}
          <TabsContent value="login" className="space-y-4 pt-3">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <Label htmlFor="identityNumber">NISN / NIP / ID Pengguna</Label>
                <Input
                  id="identityNumber"
                  type="text"
                  required
                  value={identityNumber}
                  onChange={(e) => setIdentityNumber(e.target.value)}
                  placeholder="Masukkan NISN, NIP, atau ID Akun"
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
          </TabsContent>

          {/* TAB 2: DAFTAR AKUN BARU */}
          <TabsContent value="signup" className="space-y-3.5 pt-3">
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <Label htmlFor="regRole">Peran Akun</Label>
                <select
                  id="regRole"
                  value={regRole}
                  onChange={(e) =>
                    setRegRole(e.target.value as 'STUDENT' | 'TEACHER' | 'LIBRARIAN' | 'ADMIN')
                  }
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="STUDENT">Siswa (STUDENT)</option>
                  <option value="TEACHER">Guru (TEACHER)</option>
                  <option value="LIBRARIAN">Pustakawan (LIBRARIAN)</option>
                  <option value="ADMIN">Superadmin / Administrator (ADMIN)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="regIdentity">
                  {regRole === 'STUDENT' ? 'Nomor Induk (NISN)' : 'Nomor Induk (NIP / ID Pengguna)'}
                </Label>
                <Input
                  id="regIdentity"
                  type="text"
                  required
                  value={regIdentity}
                  onChange={(e) => setRegIdentity(e.target.value)}
                  placeholder="Masukkan NISN, NIP, atau ID unik"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label htmlFor="regName">Nama Lengkap</Label>
                <Input
                  id="regName"
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="text-xs"
                />
              </div>

              <div>
                <Label htmlFor="regClassName">
                  {regRole === 'STUDENT' ? 'Kelas / Jurusan' : 'Jabatan / Unit Kerja (Opsional)'}
                </Label>
                <Input
                  id="regClassName"
                  type="text"
                  value={regClassName}
                  onChange={(e) => setRegClassName(e.target.value)}
                  placeholder={regRole === 'STUDENT' ? 'Contoh: X RPL 1' : 'Contoh: Staf Perpustakaan'}
                  className="text-xs"
                />
              </div>

              <div>
                <Label htmlFor="regPassword">Buat Kata Sandi</Label>
                <Input
                  id="regPassword"
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimal 4 karakter"
                  className="text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 text-xs font-semibold shadow-xs"
              >
                {isSubmitting ? 'Mendaftarkan...' : 'Daftar & Masuk'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

