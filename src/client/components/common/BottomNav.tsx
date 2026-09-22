/**
 * @file src/client/components/common/BottomNav.tsx
 * @description Bottom Navigation Bar untuk mobile view PWA (Android & iOS).
 * @layer Presentation Component
 */

import React from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { BookOpen, BookmarkCheck, Layers, User as UserIcon } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenLogin: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab, onOpenLogin }) => {
  const { user, isAuthenticated } = useAuth();
  const isStaff = user?.role === 'LIBRARIAN' || user?.role === 'ADMIN';

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-surface-card border-t border-border-subtle z-40 pb-safe shadow-lg">
      <div className="grid grid-cols-4 h-16 max-w-md mx-auto">
        {/* Tab 1: Katalog */}
        <button
          onClick={() => onSelectTab('catalog')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] ${
            currentTab === 'catalog' ? 'text-primary-600 font-bold' : 'text-text-muted hover:text-text-main'
          }`}
        >
          <BookOpen size={20} />
          <span className="text-[11px]">Katalog</span>
        </button>

        {/* Tab 2: Rak Saya */}
        <button
          onClick={() => {
            if (!isAuthenticated) {
              onOpenLogin();
            } else {
              onSelectTab('my-books');
            }
          }}
          className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] ${
            currentTab === 'my-books' ? 'text-primary-600 font-bold' : 'text-text-muted hover:text-text-main'
          }`}
        >
          <BookmarkCheck size={20} />
          <span className="text-[11px]">Rak Saya</span>
        </button>

        {/* Tab 3: Sirkulasi (Staff Only) atau Info */}
        {isStaff ? (
          <button
            onClick={() => onSelectTab('circulation')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] ${
              currentTab === 'circulation' ? 'text-primary-600 font-bold' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Layers size={20} />
            <span className="text-[11px]">Sirkulasi</span>
          </button>
        ) : (
          <button
            onClick={() => onSelectTab('catalog')}
            className="flex flex-col items-center justify-center gap-1 text-text-muted hover:text-text-main min-h-[44px]"
          >
            <span className="text-lg">📚</span>
            <span className="text-[11px]">Hybrid</span>
          </button>
        )}

        {/* Tab 4: Profil / Login */}
        <button
          onClick={() => {
            if (!isAuthenticated) {
              onOpenLogin();
            } else {
              onSelectTab('profile');
            }
          }}
          className={`flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] ${
            currentTab === 'profile' ? 'text-primary-600 font-bold' : 'text-text-muted hover:text-text-main'
          }`}
        >
          <UserIcon size={20} />
          <span className="text-[11px] truncate max-w-[60px]">
            {isAuthenticated && user ? user.name.split(' ')[0] : 'Masuk'}
          </span>
        </button>
      </div>
    </div>
  );
};
