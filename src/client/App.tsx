/**
 * @file src/client/App.tsx
 * @description Komponen utama aplikasi PWA, mengelola routing internal dan wrapper layout global.
 * @layer Application Root Component
 */

import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { Navbar } from './components/common/Navbar.js';
import { BottomNav } from './components/common/BottomNav.js';
import { OfflineBanner } from './components/pwa/OfflineBanner.js';
import { InstallPromptIOS } from './components/pwa/InstallPromptIOS.js';
import { CatalogPage } from './pages/CatalogPage.js';
import { MyBooksPage } from './pages/MyBooksPage.js';
import { CirculationDesk } from './components/circulation/CirculationDesk.js';
import { LoginPage } from './pages/LoginPage.js';
import { Shield, User as UserIcon, BookOpen } from 'lucide-react';

export const App: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('catalog');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen flex flex-col bg-surface-bg text-text-main pb-20 md:pb-10">
      {/* Offline Status Bar */}
      <OfflineBanner />

      {/* Desktop / Tablet Top Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'catalog' && (
          <CatalogPage
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onNavigateToMyBooks={() => setCurrentTab('my-books')}
          />
        )}

        {currentTab === 'my-books' && (
          isAuthenticated && user ? (
            <MyBooksPage user={user} />
          ) : (
            <div className="text-center py-20 bg-surface-card rounded-3xl border border-border-subtle p-8 max-w-md mx-auto">
              <BookOpen size={48} className="mx-auto text-primary-600 mb-3" />
              <h2 className="text-lg font-bold text-text-main">Masuk untuk Melihat Rak Buku</h2>
              <p className="text-xs text-text-muted mt-1 mb-5">
                Silakan masuk menggunakan NISN atau NIP Anda untuk mengakses buku yang sedang dipinjam.
              </p>
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full py-2.5 bg-primary-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-primary-700 transition-colors"
              >
                Masuk Akun Sekarang
              </button>
            </div>
          )
        )}

        {currentTab === 'circulation' && (
          isAuthenticated && (user?.role === 'LIBRARIAN' || user?.role === 'ADMIN') ? (
            <CirculationDesk />
          ) : (
            <div className="text-center py-20 bg-surface-card rounded-3xl border border-border-subtle p-8 max-w-md mx-auto">
              <Shield size={48} className="mx-auto text-amber-500 mb-3" />
              <h2 className="text-lg font-bold text-text-main">Akses Terbatas</h2>
              <p className="text-xs text-text-muted mt-1">
                Halaman Meja Sirkulasi hanya dapat diakses oleh akun Pustakawan atau Administrator sekolah.
              </p>
            </div>
          )
        )}

        {currentTab === 'profile' && (
          <div className="max-w-md mx-auto bg-surface-card rounded-3xl border border-border-subtle shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xl">
                <UserIcon size={32} />
              </div>
              <div>
                <h3 className="font-bold text-base text-text-main">{user?.name}</h3>
                <p className="text-xs text-text-muted font-mono">{user?.identityNumber}</p>
                <span className="mt-1 inline-block bg-primary-50 text-primary-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {user?.role}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-text-muted">Kelas / Penugasan:</span>
                <span className="font-semibold text-text-main">{user?.className || 'Staf Sekolah'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-muted">Status Akun:</span>
                <span className="font-semibold text-emerald-600">Aktif Terverifikasi</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-muted">Penyimpanan Offline:</span>
                <span className="font-semibold text-text-main">IndexedDB Siap</span>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                setCurrentTab('catalog');
              }}
              className="mt-6 w-full py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-semibold transition-colors"
            >
              Keluar dari Akun
            </button>
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
    </div>
  );
};
