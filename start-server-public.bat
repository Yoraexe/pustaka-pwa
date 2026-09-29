@echo off
title Pustaka Sekolah PWA - Server & Public Tunnel
cd /d "%~dp0"
echo ===================================================
echo   PUSTAKA SEKOLAH PWA - LOCAL SERVER + CLOUDFLARE
echo ===================================================
echo.
echo Menjalankan Server Backend (Port 3001)...
echo Menjalankan Client PWA (Port 5173)...
echo Mengaktifkan Cloudflare Tunnel...
echo.
echo * Salin link HTTPS (xxx.trycloudflare.com) yang muncul di terminal
echo * Buka link tersebut di browser HP / bagikan untuk demo
echo * Tekan Ctrl+C jika ingin mematikan server
echo ===================================================
echo.
npm run dev:public
pause
