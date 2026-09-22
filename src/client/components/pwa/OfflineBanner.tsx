/**
 * @file src/client/components/pwa/OfflineBanner.tsx
 * @description Indikator banner saat perangkat berada dalam mode offline (luring).
 * @layer Presentation Component
 */

import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-center gap-2 shadow-sm sticky top-0 z-50 animate-fadeIn">
      <WifiOff size={16} className="shrink-0" />
      <span>
        Mode Offline aktif. Anda tetap dapat membaca buku yang telah disimpan di <strong>Rak Buku Saya</strong>.
      </span>
    </div>
  );
};
