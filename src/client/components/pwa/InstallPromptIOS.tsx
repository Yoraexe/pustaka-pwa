/**
 * @file src/client/components/pwa/InstallPromptIOS.tsx
 * @description Dialog panduan interaktif 'Add to Home Screen' khusus perangkat iOS Safari.
 * @layer Presentation Component
 */

import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';

export const InstallPromptIOS: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  useEffect(() => {
    // Deteksi apakah perangkat menggunakan iOS (iPhone/iPad)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    // Cek apakah sudah terinstal dalam standalone mode
    const isStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    const dismissed = sessionStorage.getItem('ios_pwa_dismissed');

    if (isIOS && !isStandalone && !dismissed) {
      setShowPrompt(true);
    }
  }, []);

  if (!showPrompt) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('ios_pwa_dismissed', 'true');
    setShowPrompt(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-20 md:bottom-8 z-50 px-4 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border shadow-2xl rounded-3xl p-5 max-w-sm w-full text-card-foreground relative">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X size={16} />
        </button>

        <div className="pr-6">
          <h4 className="font-bold text-sm text-foreground">Pasang Aplikasi Pustaka</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Akses katalog dan bacaan luring lebih cepat dari layar utama iPhone/iPad:
          </p>
        </div>

        <div className="mt-4 space-y-2.5 border-t border-border pt-3.5 text-xs text-foreground">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
              1
            </span>
            <span>
              Tekan tombol <strong>Share</strong>{' '}
              <Share size={13} className="text-primary inline mx-0.5 align-middle" /> di Safari.
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
              2
            </span>
            <span>
              Pilih <strong>Add to Home Screen</strong>{' '}
              <PlusSquare size={13} className="text-primary inline mx-0.5 align-middle" />.
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
              3
            </span>
            <span>
              Tekan <strong>Add</strong> di pojok kanan atas layar.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="mt-4 w-full py-2 text-center text-xs font-semibold text-primary bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors cursor-pointer border border-primary/20"
        >
          Mengerti
        </button>
      </div>
    </div>
  );
};
