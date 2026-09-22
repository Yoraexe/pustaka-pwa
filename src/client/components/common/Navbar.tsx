/**
 * @file src/client/components/common/Navbar.tsx
 * @description Header navigasi desktop dengan logo sekolah, Command Palette trigger (Ctrl+K), dan peran pengguna.
 * @layer Presentation Component
 */

import React from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { BookOpen, LogOut, User as UserIcon, Shield, Layers, Search } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenLogin: () => void;
  onOpenCommand?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenLogin,
  onOpenCommand,
}) => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & School Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => onSelectTab('catalog')}
        >
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
            <BookOpen size={20} />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg text-foreground tracking-tight leading-none block">
              PustakaSekolah
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium block">
              Digital & Physical PWA Library
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => onSelectTab('catalog')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              currentTab === 'catalog'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            Katalog Buku
          </button>

          {isAuthenticated && (
            <button
              onClick={() => onSelectTab('my-books')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'my-books'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Rak Buku Saya
            </button>
          )}

          {isAuthenticated && (user?.role === 'LIBRARIAN' || user?.role === 'ADMIN') && (
            <button
              onClick={() => onSelectTab('circulation')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentTab === 'circulation'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Layers size={15} />
              <span>Meja Sirkulasi</span>
            </button>
          )}
        </nav>

        {/* Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search Button (Command Palette) */}
          {onOpenCommand && (
            <button
              type="button"
              onClick={onOpenCommand}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-xs transition-colors"
            >
              <Search size={14} />
              <span>Cari koleksi...</span>
              <kbd className="text-[10px] font-mono bg-background border px-1.5 py-0.5 rounded shadow-2xs">
                ⌘K
              </kbd>
            </button>
          )}

          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-foreground leading-tight flex items-center justify-end gap-1">
                  <span>{user.name}</span>
                  {user.role === 'ADMIN' && <Shield size={12} className="text-destructive" />}
                </div>
                <div className="mt-0.5">
                  <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                    {user.role === 'STUDENT' ? `Siswa • ${user.className || 'Reguler'}` : user.role}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                title="Keluar dari Akun"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut size={16} />
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={onOpenLogin}
              className="gap-1.5 shadow-xs"
            >
              <UserIcon size={14} />
              <span>Masuk (NISN/NIP)</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
