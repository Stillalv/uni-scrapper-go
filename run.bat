@echo off
title Webtoon Scraper - Golang Edition
echo ============================================================
echo           Webtoon Scraper - Golang Edition
echo ============================================================
echo.

where go >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Golang belum terinstal di sistem Anda!
    echo Silakan unduh dan instal Go dari: https://go.dev/dl/
    echo.
    echo Tekan sembarang tombol untuk keluar...
    pause >nul
    exit /b 1
)

echo Memulai aplikasi GUI Webtoon Scraper (Go)...
go run .
pause
