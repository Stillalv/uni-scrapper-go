# 🚀 Release Notes - Version 2.7.0

**Release Tag:** `v2.7.0`  
**Release Title:** `v2.7.0 - Modernized UI/UX Design System, Official Brand Logo & Global Icon Polish`  
**Repository:** [Stillalv/uni-scrapper-go](https://github.com/Stillalv/uni-scrapper-go)  
**Date:** September 26, 2026  

---

## 🌟 Highlights & Major Improvements in v2.7.0

### 1. 🎨 Modernized UI/UX Design System & Zero CSS Hacks
- **Semantic Neutral Palette**: Transitioned from multi-color visual noise to a clean Apple/macOS-inspired neutral aesthetic.
  - Dark Mode: Deep neutral Zinc 950 (`#09090b`), surface elevated (`#18181b`), subtle borders (`rgba(255,255,255,0.08)`), and crisp text (`#fafafa`).
  - Light Mode: Crisp Slate 50 (`#f8fafc`), clean surface (`#ffffff`), and slate typography (`#0f172a`).
- **Single Accent Color**: Unified all interactive states, focused rings, and primary actions under Electric Blue (`#0071E3` / `#0A84FF`).
- **Elimination of Nested Borders**: Replaced repetitive 1px border wrapping with surface elevation and background tonal contrast.
- **Zero `!important` Overrides**: Cleaned up CSS architecture into standard CSS variables and Tailwind utilities for seamless theme switching.

### 2. 💎 Official Brand Logo & Favicon Integration
- **Isometric Ribbon Logo**: Converted and centered the official 3D ribbon "S" brand logo into high-resolution assets (`app-logo.png`, `app-logo-white.png`, `app-logo-accent.png`).
- **Native Vector Component**: Built [`AppLogo.jsx`](file:///c:/Users/uni/Documents/universe/uni-scrapper-go/frontend/src/components/ui/AppLogo.jsx) using pure scalable vector paths (`fill="currentColor"`), ensuring razor-sharp rendering on Retina and 4K displays.
- **Brand Placements**: Integrated the official logo badge into the Sidebar header and Window Titlebar.
- **Full Favicon Suite**: Generated `/favicon.svg`, `/favicon.png`, and multi-resolution `/favicon.ico` (16px to 128px) for desktop and browser windows.

### 3. 🔍 Confident Iconography & Layout Enhancements
- **Global Icon Stroke Weight**: Boosted default icon stroke weight from 1.5px to a confident, readable 1.85px across all views.
- **History View Action Layout**: Fixed compressed/squished trash and action button layout in download history cards, ensuring proper flex proportions and hover states.

### 4. ⚡ High-Performance Desktop Build
- **GPU-Friendly Transitions**: Standardized subtle 150ms–200ms easing across all cards, drawers, and buttons, removing CPU-intensive pulsing loops.
- **Native Windows Desktop Binary**: Packaged and embedded frontend dist into a standalone Windows executable (`webtoon-scraper.exe`) compiled with `-ldflags="-H windowsgui -s -w"` for instant, silent startup without console windows.

---

## 🧪 Verification & Test Results
- **Go Unit Test Suite**: 100% tests passed (`go test ./server ./engine/...`).
- **Frontend Production Build**: Built cleanly with Vite 5.4 (`npm run build`).
- **Multi-Catalog Provider Compatibility**: Full backward compatibility preserved for LINE Webtoon (ID/EN), Naver Webtoon (KO), and MANGA Plus (ID).
- **Windows Executable**: Validated standalone launch and GUI interaction.

---

## 📦 Assets
- `webtoon-scraper.exe`: Native Windows Desktop Executable (GUI standalone).
