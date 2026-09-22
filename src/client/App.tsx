/**
 * @file src/client/App.tsx
 * @description Komponen utama aplikasi PWA dengan global Sonner Toaster, shortcut Command Palette (Ctrl+K), dan layout responsive.
 * @layer Application Root Component
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { Navbar } from './components/common/Navbar.js';
import { BottomNav } from './components/common/BottomNav.js';
import { OfflineBanner } from './components/pwa/OfflineBanner.js';
import { InstallPromptIOS } from './components/pwa/InstallPromptIOS.js';
import { CatalogPage } from './pages/CatalogPage.js';
import { MyBooksPage } from './pages/MyBooksPage.js';
import { CirculationDesk } from './components/circulation/CirculationDesk.js';
import { LoginPage } from './pages/LoginPage.js';
import { Toaster } from './components/ui/sonner.js';
import { Button } from './components/ui/button.js';
import { Badge } from './components/ui/badge.js';
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
import { Shield, User as UserIcon, BookOpen, Layers, BookmarkCheck, LogIn } from 'lucide-react';
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
            <div className="text-center py-20 bg-card rounded-3xl border border-border p-8 max-w-md mx-auto shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                <BookOpen size={32} />
              </div>
              <h2 className="text-lg font-bold text-foreground">Masuk untuk Melihat Rak Buku</h2>
              <p className="text-xs text-muted-foreground mt-1 mb-6 leading-relaxed">
                Silakan masuk menggunakan Nomor Induk Siswa Nasional (NISN) atau NIP untuk mengakses buku yang sedang dipinjam.
              </p>
              <Button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full gap-2 shadow-xs"
              >
                <LogIn size={15} />
                <span>Masuk Akun Sekarang</span>
              </Button>
            </div>
          )
        )}

        {currentTab === 'circulation' && (
          isAuthenticated && (user?.role === 'LIBRARIAN' || user?.role === 'ADMIN') ? (
            <CirculationDesk />
          ) : (
            <div className="text-center py-20 bg-card rounded-3xl border border-border p-8 max-w-md mx-auto shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <Shield size={32} />
              </div>
              <h2 className="text-lg font-bold text-foreground">Akses Terbatas</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Halaman Meja Sirkulasi hanya dapat diakses oleh akun Pustakawan atau Administrator sekolah.
              </p>
            </div>
          )
        )}

        {currentTab === 'profile' && (
          <div className="max-w-md mx-auto bg-card rounded-3xl border border-border shadow-xs p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                <UserIcon size={32} />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">{user?.name}</h3>
                <p className="text-xs text-muted-foreground font-mono">{user?.identityNumber}</p>
                <div className="mt-1">
                  <Badge variant="outline">
                    {user?.role}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border space-y-3 text-xs">
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
              className="mt-6 w-full"
            >
              Keluar dari Akun
            </Button>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* iOS Safari 'Add to Home Screen' Interactive Sheet */}
      <InstallPromptIOS />

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
              <BookOpen className="mr-2 h-4 w-4 text-primary" />
              <span>Buka Katalog Utama</span>
            </CommandItem>
            {isAuthenticated && (
              <CommandItem
                onSelect={() => {
                  setCurrentTab('my-books');
                  setIsCommandOpen(false);
                }}
              >
                <BookmarkCheck className="mr-2 h-4 w-4 text-emerald-600" />
                <span>Buka Rak Buku Saya</span>
              </CommandItem>
            )}
            {isAuthenticated && (user?.role === 'LIBRARIAN' || user?.role === 'ADMIN') && (
              <CommandItem
                onSelect={() => {
                  setCurrentTab('circulation');
                  setIsCommandOpen(false);
                }}
              >
                <Layers className="mr-2 h-4 w-4 text-amber-600" />
                <span>Buka Meja Sirkulasi Pustakawan</span>
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
                  <Badge variant="outline" className="text-[9px] shrink-0 ml-2">
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
