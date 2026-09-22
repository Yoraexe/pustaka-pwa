/**
 * @file src/client/components/common/Navbar.tsx
 * @description Header navigasi desktop dengan logo sekolah, informasi pengguna, dan navigasi peran.
 * @layer Presentation Component
 */

import React from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { BookOpen, LogOut, User as UserIcon, Shield, Layers } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onOpenLogin }) => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="bg-surface-card border-b border-border-subtle sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & School Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => onSelectTab('catalog')}
        >
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-md">
            <BookOpen size={22} />
          </div>
          <div>
            <span className="font-bold text-lg text-primary-600 tracking-tight leading-none block">
              PustakaSekolah
            </span>
            <span className="text-[11px] text-text-muted font-medium block">
              Digital & Physical PWA Library
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => onSelectTab('catalog')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentTab === 'catalog'
                ? 'bg-primary-50 text-primary-600 font-semibold'
                : 'text-text-muted hover:text-text-main hover:bg-slate-50'
            }`}
          >
            Katalog Buku
          </button>

          {isAuthenticated && (
            <button
              onClick={() => onSelectTab('my-books')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'my-books'
                  ? 'bg-primary-50 text-primary-600 font-semibold'
                  : 'text-text-muted hover:text-text-main hover:bg-slate-50'
              }`}
            >
              Rak Buku Saya
            </button>
          )}

          {isAuthenticated && (user?.role === 'LIBRARIAN' || user?.role === 'ADMIN') && (
            <button
              onClick={() => onSelectTab('circulation')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                currentTab === 'circulation'
                  ? 'bg-primary-50 text-primary-600 font-semibold'
                  : 'text-text-muted hover:text-text-main hover:bg-slate-50'
              }`}
            >
              <Layers size={16} />
              <span>Meja Sirkulasi</span>
            </button>
          )}
        </nav>

        {/* User Profile / Login Action */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-text-main leading-tight flex items-center justify-end gap-1">
                  <span>{user.name}</span>
                  {user.role === 'ADMIN' && <Shield size={12} className="text-red-500" />}
                </div>
                <span className="text-[10px] text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                  {user.role === 'STUDENT' ? `Siswa • ${user.className || 'Reguler'}` : user.role}
                </span>
              </div>
              <button
                onClick={logout}
                title="Keluar"
                className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs md:text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <UserIcon size={16} />
              <span>Masuk (NISN/NIP)</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
