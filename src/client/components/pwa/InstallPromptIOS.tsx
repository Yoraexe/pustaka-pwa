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
    <div className="fixed inset-x-0 bottom-16 md:bottom-6 z-40 px-4 flex justify-center animate-slideUp">
      <div className="bg-surface-card border border-primary-100 shadow-xl rounded-2xl p-4 max-w-sm w-full text-text-main relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-text-muted hover:text-text-main p-1"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3">
          <div>
            <h4 className="font-semibold text-sm">Pasang Aplikasi</h4>
            <p className="text-xs text-text-muted mt-0.5">
              Tambahkan ke layar utama untuk akses cepat:
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs text-text-main">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px]">1</span>
            <span>Tekan ikon <strong>Share</strong></span>
            <Share size={14} className="text-primary-600 inline" />
            <span>di toolbar bawah.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px]">2</span>
            <span>Pilih <strong>Add to Home Screen</strong></span>
            <PlusSquare size={14} className="text-primary-600 inline" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px]">3</span>
            <span>Tekan <strong>Add</strong> di kanan atas.</span>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="mt-3 w-full py-1.5 text-center text-xs font-semibold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
