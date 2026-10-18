@echo off
title Pustaka Sekolah PWA - Production Server & Public Tunnel
cd /d "%~dp0"
echo ===================================================
echo   PUSTAKA SEKOLAH PWA - PRODUCTION + CLOUDFLARE
echo ===================================================
echo.
echo Menyiapkan production build...
call npm run build
echo.
echo Menjalankan Server Production (Port 3001) dan Cloudflare Tunnel...
echo.
echo * Salin link HTTPS (xxx.trycloudflare.com) yang muncul di terminal
echo * Buka link tersebut di browser HP / PC (PWA dapat langsung di-install)
echo * Tekan Ctrl+C jika ingin mematikan server
echo ===================================================
echo.
npm run start:public
pause
