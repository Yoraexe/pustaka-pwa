/**
 * @file src/client/components/common/Navbar.tsx
 * @description Header navigasi desktop dengan tipografi bersih, pencarian kilat, dan navigasi peran tanpa icon dekoratif.
 * @layer Presentation Component
 */

import React from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { LogOut, Search } from 'lucide-react';

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
    <header className="w-full bg-card border-b border-border sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-opacity-95">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & School Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none shrink-0"
          onClick={() => onSelectTab('catalog')}
        >
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm font-mono shadow-xs">
            P
          </div>
          <div>
            <span className="font-bold text-base sm:text-lg text-foreground tracking-tight block">
              Pustaka Sekolah
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
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'circulation'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Meja Sirkulasi
            </button>
          )}
        </nav>

        {/* Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Search Button (Command Palette) */}
          {onOpenCommand && (
            <button
              type="button"
              onClick={onOpenCommand}
              className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-xs transition-colors"
            >
              <Search size={14} />
              <span>Cari katalog...</span>
              <kbd className="text-[10px] font-mono bg-background border px-1.5 py-0.5 rounded shadow-2xs">
                ⌘K
              </kbd>
            </button>
          )}

          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-foreground leading-tight">
                  {user.name}
                </div>
                <div className="mt-0.5">
                  <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-normal">
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
              className="shadow-xs text-xs font-semibold px-4"
            >
              Masuk Akun
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
