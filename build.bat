@echo off
title Build Webtoon Scraper Executable
echo ============================================================
echo       Membangun Standalone Executable (.exe) Go
echo ============================================================
echo.

where go >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Golang belum terinstal di sistem Anda!
    echo Silakan unduh dan instal Go dari: https://go.dev/dl/
    echo.
    pause
    exit /b 1
)

echo Mengunduh dependensi (go mod tidy)...
go mod tidy

echo.
echo Kompilasi aplikasi menjadi webtoon-scraper.exe...
go build -ldflags="-H windowsgui -s -w" -o webtoon-scraper.exe .

if %errorlevel% eq 0 (
    echo.
    echo ============================================================
    echo SUKSES! File executable berhasil dibuat:
    echo  - webtoon-scraper.exe (Standalone, tanpa butuh Python/Go)
    echo ============================================================
) else (
    echo.
    echo [ERROR] Kompilasi gagal. Pastikan C compiler (GCC/MinGW) terinstal untuk Fyne GUI.
)

pause
