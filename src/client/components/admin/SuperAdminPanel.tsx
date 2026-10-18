/**
 * @file src/client/components/admin/SuperAdminPanel.tsx
 * @description Panel Manajemen Akun Superadmin untuk pembuatan akun baru (Siswa, Guru, Pustakawan, Superadmin), aktivasi/nonaktivasi akun, reset kata sandi, dan impor CSV.
 * @layer Presentation Component
 * 
 * Tujuan: Menyediakan antarmuka pusat kendali Superadmin (ADMIN) untuk membuat dan mengelola seluruh akun pengguna perpustakaan sekolah.
 * Caller: src/client/App.tsx (Tab Superadmin), src/client/components/circulation/CirculationDesk.tsx.
 * Dependensi: react, src/client/services/api.ts, src/client/hooks/useAuth.tsx, shared/types, UserImportModal, Shadcn UI (Card, Table, Dialog, Button, Input, Label, Badge), sonner.
 * Main Functions: SuperAdminPanel
 * Side Effects: Memanggil endpoint REST /api/auth/users, /api/auth/register, PATCH status, dan PATCH password.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../hooks/useAuth.js';
import type { User, UserRole } from '../../../shared/types/index.js';
import { UserImportModal } from './UserImportModal.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card.js';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog.js';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Badge } from '../ui/badge.js';
import { toast } from 'sonner';

const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: 'Siswa',
  TEACHER: 'Guru',
  LIBRARIAN: 'Pustakawan',
  ADMIN: 'Superadmin',
};

export const SuperAdminPanel: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');

  // Modal Create Account State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newIdentity, setNewIdentity] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('STUDENT');
  const [newClassName, setNewClassName] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  // Modal Reset Password State
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState<string>('');
  const [isSubmittingReset, setIsSubmittingReset] = useState<boolean>(false);

  // Modal Import CSV State
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: unknown) {
      toast.error('Gagal Memuat Daftar Akun', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data pengguna.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchId = u.identityNumber.toLowerCase().includes(q);
        const matchClass = (u.className || '').toLowerCase().includes(q);
        return matchName || matchId || matchClass;
      }
      return true;
    });
  }, [users, roleFilter, searchQuery]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdentity.trim() || !newName.trim() || !newPassword.trim()) {
      toast.warning('Data Belum Lengkap', {
        description: 'NISN/NIP, Nama Lengkap, dan Kata Sandi wajib diisi.',
      });
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const created = await api.registerUserByAdmin({
        identityNumber: newIdentity.trim(),
        name: newName.trim(),
        role: newRole,
        className: newClassName.trim() || null,
        password: newPassword,
      });

      toast.success('Akun Berhasil Dibuat', {
        description: `[${ROLE_LABELS[created.role]}] ${created.name} (${created.identityNumber}) telah terdaftar.`,
      });

      setNewIdentity('');
      setNewName('');
      setNewRole('STUDENT');
      setNewClassName('');
      setNewPassword('');
      setIsCreateOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      toast.error('Gagal Membuat Akun', {
        description: err instanceof Error ? err.message : 'Terjadi kendala saat membuat akun baru.',
      });
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleToggleStatus = async (target: User) => {
    try {
      const updated = await api.updateUserStatus(target.id, !target.isActive);
      toast.success(updated.isActive ? 'Akun Diaktifkan' : 'Akun Dinonaktifkan', {
        description: `Status akun ${updated.name} (${updated.identityNumber}) diperbarui.`,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err: unknown) {
      toast.error('Gagal Mengubah Status', {
        description: err instanceof Error ? err.message : 'Tidak dapat mengubah status akun.',
      });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || resetPasswordValue.length < 4) {
      toast.warning('Kata Sandi Terlalu Pendek', {
        description: 'Kata sandi baru minimal 4 karakter.',
      });
      return;
    }

    setIsSubmittingReset(true);
    try {
      await api.resetUserPassword(resetTarget.id, resetPasswordValue);
      toast.success('Kata Sandi Direset', {
        description: `Kata sandi untuk ${resetTarget.name} (${resetTarget.identityNumber}) berhasil diperbarui.`,
      });
      setResetTarget(null);
      setResetPasswordValue('');
    } catch (err: unknown) {
      toast.error('Gagal Mereset Kata Sandi', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan saat mereset kata sandi.',
      });
    } finally {
      setIsSubmittingReset(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Metrics Card */}
      <Card className="rounded-3xl border-border shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="default" className="text-[10px] font-mono uppercase">
                Panel Superadmin
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {users.length} Total Akun
              </Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold">Manajemen Akun & Pengguna</CardTitle>
            <CardDescription className="text-xs mt-1 max-w-2xl">
              Buat akun baru (Siswa, Guru, Pustakawan, Superadmin), kelola status aktif, dan atur ulang kata sandi.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={isLoading}
              className="text-xs"
            >
              {isLoading ? 'Memuat...' : 'Segarkan'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportOpen(true)}
              className="text-xs font-semibold"
            >
              Impor CSV
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="text-xs font-semibold shadow-xs"
            >
              + Buat Akun Baru
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60">
            <div className="p-3 rounded-2xl bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground font-mono uppercase block">Siswa</span>
              <span className="text-lg font-bold font-mono text-foreground">
                {users.filter((u) => u.role === 'STUDENT').length}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground font-mono uppercase block">Guru</span>
              <span className="text-lg font-bold font-mono text-foreground">
                {users.filter((u) => u.role === 'TEACHER').length}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground font-mono uppercase block">Pustakawan</span>
              <span className="text-lg font-bold font-mono text-primary">
                {users.filter((u) => u.role === 'LIBRARIAN').length}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground font-mono uppercase block">Superadmin</span>
              <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {users.filter((u) => u.role === 'ADMIN').length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter & User Table */}
      <Card className="rounded-3xl border-border shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NISN/NIP, atau kelas..."
              className="text-xs h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'STUDENT', 'TEACHER', 'LIBRARIAN', 'ADMIN'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  roleFilter === r
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {r === 'ALL' ? 'Semua Peran' : ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Pengguna</TableHead>
              <TableHead>NISN / NIP</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead>Kelas / Unit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi Superadmin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const isSelf = currentUser?.id === u.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-semibold text-xs text-foreground">
                      {u.name}
                      {isSelf && (
                        <span className="ml-1.5 text-[10px] font-mono text-primary font-normal">(Anda)</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {u.identityNumber}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          u.role === 'ADMIN'
                            ? 'default'
                            : u.role === 'LIBRARIAN'
                            ? 'hybrid'
                            : u.role === 'TEACHER'
                            ? 'ebook'
                            : 'outline'
                        }
                        className="text-[10px]"
                      >
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.className || '-'}
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          Aktif
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full border border-destructive/20">
                          Nonaktif
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-[11px] font-semibold"
                          onClick={() => {
                            setResetTarget(u);
                            setResetPasswordValue('');
                          }}
                        >
                          Reset Sandi
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSelf}
                          className={`h-7 px-2.5 text-[11px] font-semibold ${
                            u.isActive
                              ? 'text-destructive hover:bg-destructive/10 border-destructive/30'
                              : 'text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30'
                          }`}
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                  Tidak ada akun pengguna yang sesuai dengan filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog: Buat Akun Baru oleh Superadmin */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-bold">Buat Akun Pengguna Baru</DialogTitle>
            <DialogDescription className="text-xs">
              Daftarkan akun Siswa, Guru, Pustakawan, atau Superadmin baru secara langsung.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 my-2">
            <div>
              <Label htmlFor="newRole">Peran Akun (Role)</Label>
              <select
                id="newRole"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="STUDENT">Siswa (STUDENT)</option>
                <option value="TEACHER">Guru (TEACHER)</option>
                <option value="LIBRARIAN">Pustakawan (LIBRARIAN)</option>
                <option value="ADMIN">Superadmin (ADMIN)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="newIdentity">Nomor Identitas (NISN / NIP / Username)</Label>
              <Input
                id="newIdentity"
                value={newIdentity}
                onChange={(e) => setNewIdentity(e.target.value)}
                placeholder="Contoh: NISN202699 atau PUSTAKA02"
                className="font-mono text-xs"
                required
              />
            </div>

            <div>
              <Label htmlFor="newName">Nama Lengkap</Label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: Drs. Hendra Wijaya"
                className="text-xs"
                required
              />
            </div>

            <div>
              <Label htmlFor="newClassName">Kelas / Jabatan / Unit (Opsional)</Label>
              <Input
                id="newClassName"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Contoh: XI RPL 1 atau Staf Perpustakaan"
                className="text-xs"
              />
            </div>

            <div>
              <Label htmlFor="newPassword">Kata Sandi Awal</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 4 karakter"
                className="text-xs"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmittingCreate} className="text-xs font-semibold">
                {isSubmittingCreate ? 'Menyimpan...' : 'Buat Akun'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reset Kata Sandi */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-bold">Reset Kata Sandi</DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan kata sandi baru untuk <strong>{resetTarget?.name}</strong> ({resetTarget?.identityNumber}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4 my-2">
            <div>
              <Label htmlFor="resetPasswordInput">Kata Sandi Baru</Label>
              <Input
                id="resetPasswordInput"
                type="password"
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
                placeholder="Minimal 4 karakter"
                className="text-xs"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetTarget(null)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmittingReset} className="text-xs font-semibold">
                {isSubmittingReset ? 'Memperbarui...' : 'Simpan Sandi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Impor CSV */}
      <UserImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => {
          setIsImportOpen(false);
          fetchUsers();
        }}
      />
    </div>
  );
};
