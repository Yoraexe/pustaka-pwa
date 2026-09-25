/**
 * @file src/client/App.tsx
 * @description Komponen utama aplikasi PWA dengan layout editorial bersih, Command Palette, dan Sonner Toaster.
 * @layer Application Root Component
 * 
 * Tujuan: Root komponen aplikasi yang mengatur state navigasi antar tab, otentikasi sesi, shortcut pencarian global (Cmd+K), dan banner offline.
 * Caller: src/client/main.tsx
 * Dependensi: react, useAuth, Navbar, BottomNav, OfflineBanner, CatalogPage, MyBooksPage, CirculationDesk, LoginPage, UI components.
 * Main Functions: App
 * Side Effects: Mendaftarkan global keydown listener untuk Cmd+K, memuat daftar buku untuk command palette.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { Navbar } from './components/common/Navbar.js';
import { BottomNav } from './components/common/BottomNav.js';
import { OfflineBanner } from './components/pwa/OfflineBanner.js';
import { CatalogPage } from './pages/CatalogPage.js';
import { MyBooksPage } from './pages/MyBooksPage.js';
import { CirculationDesk } from './components/circulation/CirculationDesk.js';
import { LoginPage } from './pages/LoginPage.js';
import { Toaster } from './components/ui/sonner.js';
import { Button } from './components/ui/button.js';
import { Badge } from './components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card.js';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from './components/ui/command.js';
import { api } from './services/api.js';
import type { Book } from '../shared/types/index.js';
import { BookDetailModal } from './components/catalog/BookDetailModal.js';
import { toast } from 'sonner';

export const App: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('catalog');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Command Palette State
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const [commandBooks, setCommandBooks] = useState<Book[]>([]);
  const [activeDetailBook, setActiveDetailBook] = useState<Book | null>(null);

  // Keyboard shortcut listener for Command Palette (Ctrl+K / Cmd+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Fetch quick search books list when command palette opens
  useEffect(() => {
    if (isCommandOpen && commandBooks.length === 0) {
      api.getBooks().then((data) => {
        setCommandBooks(data);
      }).catch((err) => {
        console.error('Gagal mengambil daftar buku untuk command palette:', err);
      });
    }
  }, [isCommandOpen, commandBooks.length]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground pb-20 md:pb-10 selection:bg-primary/20 selection:text-primary">
      {/* Sonner Toast Notification Root */}
      <Toaster richColors position="top-right" />

      {/* Offline Status Bar */}
      <OfflineBanner />

      {/* Desktop / Tablet Top Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenCommand={() => setIsCommandOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'catalog' && (
          <CatalogPage
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onNavigateToMyBooks={() => setCurrentTab('my-books')}
            onOpenCommand={() => setIsCommandOpen(true)}
          />
        )}

        {currentTab === 'my-books' && (
          isAuthenticated && user ? (
            <MyBooksPage user={user} />
          ) : (
            <Card className="text-center p-8 max-w-md mx-auto shadow-xs rounded-3xl border-border">
              <CardHeader className="p-0 pb-6">
                <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest block mb-2">
                  Autentikasi Diperlukan
                </span>
                <CardTitle className="text-lg font-bold">Masuk untuk Melihat Rak Buku</CardTitle>
                <CardDescription className="text-xs mt-2 leading-relaxed">
                  Silakan masuk menggunakan Nomor Induk Siswa Nasional (NISN) atau NIP untuk mengakses buku yang sedang dipinjam.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="w-full text-xs font-semibold py-2.5 shadow-xs"
                >
                  Masuk Akun Sekarang
                </Button>
              </CardContent>
            </Card>
          )
        )}

        {currentTab === 'circulation' && (
          isAuthenticated && (user?.role === 'LIBRARIAN' || user?.role === 'ADMIN') ? (
            <CirculationDesk />
          ) : (
            <Card className="text-center p-8 max-w-md mx-auto shadow-xs rounded-3xl border-border">
              <CardHeader className="p-0">
                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 uppercase tracking-widest block mb-2">
                  Hak Akses Terbatas
                </span>
                <CardTitle className="text-lg font-bold">Akses Khusus Staf Perpustakaan</CardTitle>
                <CardDescription className="text-xs mt-2 leading-relaxed">
                  Halaman Meja Sirkulasi hanya dapat diakses oleh akun Pustakawan atau Administrator sekolah.
                </CardDescription>
              </CardHeader>
            </Card>
          )
        )}

        {currentTab === 'profile' && (
          <Card className="max-w-md mx-auto rounded-3xl border-border shadow-xs p-6">
            <CardHeader className="p-0 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg font-mono">
                  {user?.name?.slice(0, 2).toUpperCase() || 'US'}
                </div>
                <div>
                  <CardTitle className="text-base font-bold">{user?.name}</CardTitle>
                  <CardDescription className="text-xs font-mono">{user?.identityNumber}</CardDescription>
                  <div className="mt-1">
                    <Badge variant="outline" className="font-normal text-[10px]">
                      {user?.role}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="pt-4 border-t border-border space-y-3 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Kelas / Penugasan:</span>
                  <span className="font-semibold text-foreground">{user?.className || 'Staf Sekolah'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Status Akun:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Aktif Terverifikasi</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Penyimpanan Offline:</span>
                  <span className="font-semibold text-foreground">IndexedDB Siap</span>
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={() => {
                  logout();
                  setCurrentTab('catalog');
                  toast.info('Sesi Telah Berakhir', {
                    description: 'Anda telah berhasil keluar dari akun perpustakaan.',
                  });
                }}
                className="mt-6 w-full text-xs font-semibold"
              >
                Keluar dari Akun
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />



      {/* Login Modal */}
      {isLoginModalOpen && (
        <LoginPage
          onClose={() => setIsLoginModalOpen(false)}
          onSuccess={() => setIsLoginModalOpen(false)}
        />
      )}

      {/* Global Command Palette (Ctrl+K / Cmd+K) */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder="Ketik judul buku, pengarang, kurikulum, atau navigasi..." />
        <CommandList>
          <CommandEmpty>Tidak ada hasil yang ditemukan.</CommandEmpty>
          <CommandGroup heading="Navigasi Cepat">
            <CommandItem
              onSelect={() => {
                setCurrentTab('catalog');
                setIsCommandOpen(false);
              }}
            >
              <span>Katalog Utama</span>
            </CommandItem>
            {isAuthenticated && (
              <CommandItem
                onSelect={() => {
                  setCurrentTab('my-books');
                  setIsCommandOpen(false);
                }}
              >
                <span>Rak Buku Saya</span>
              </CommandItem>
            )}
            {isAuthenticated && (user?.role === 'LIBRARIAN' || user?.role === 'ADMIN') && (
              <CommandItem
                onSelect={() => {
                  setCurrentTab('circulation');
                  setIsCommandOpen(false);
                }}
              >
                <span>Meja Sirkulasi Pustakawan</span>
              </CommandItem>
            )}
          </CommandGroup>

          <CommandGroup heading="Koleksi Buku Sekolah">
            {commandBooks.map((book) => (
              <CommandItem
                key={book.id}
                onSelect={() => {
                  setActiveDetailBook(book);
                  setIsCommandOpen(false);
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="truncate max-w-[280px] sm:max-w-md">
                    <span className="font-semibold text-foreground">{book.title}</span>
                    <span className="text-[11px] text-muted-foreground ml-2">by {book.author}</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0 ml-2 font-normal">
                    {book.bookType === 'DIGITAL_ONLY' ? 'E-Book' : book.bookType === 'PHYSICAL_ONLY' ? 'Fisik' : 'Hybrid'}
                  </Badge>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Detail Book Modal triggered from Command Palette */}
      {activeDetailBook && (
        <BookDetailModal
          book={activeDetailBook}
          onClose={() => setActiveDetailBook(null)}
          onBorrowDigital={async (book) => {
            if (!isAuthenticated) {
              toast.warning('Akses Dibatasi', {
                description: 'Silakan masuk untuk meminjam buku.',
                action: {
                  label: 'Masuk Sekarang',
                  onClick: () => setIsLoginModalOpen(true),
                },
              });
              return;
            }
            try {
              await api.borrowDigitalBook(book.id);
              toast.success('Peminjaman Berhasil', {
                description: `Buku "${book.title}" telah ditambahkan ke Rak Buku Saya.`,
              });
              setCurrentTab('my-books');
            } catch (err: unknown) {
              toast.error(err instanceof Error ? err.message : 'Gagal meminjam e-book.');
            }
          }}
        />
      )}
    </div>
  );
};
