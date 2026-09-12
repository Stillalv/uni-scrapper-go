# Antigravity Project Rules & Guidelines

## 🌐 Language & Communication Rules (Strict)
1. **User Interface (UI/UX) - English ONLY**:
   - All UI/UX elements, labels, buttons, descriptions, tooltips, progress updates, status messages, dialog cards, and interactive responses across both the **Desktop App (React Frontend)** and **Telegram Remote Control Bot** MUST be written in **English ONLY**.
   - Do NOT use Indonesian text anywhere in the user-facing app UI or Telegram bot responses.
   - Telegram Bot Keyboard buttons MUST be standardized to English:
     - `🔍 Check Webtoon`
     - `📚 Catalog`
     - `⬇️ Download`
     - `📊 Status`
     - `⏹ Stop`
     - `📂 Output Folder`
     - `🕘 History`
     - `⚡ Benchmark`
     - `⚙️ Settings`
     - `ℹ️ Help`

2. **Antigravity Chat Response - Bahasa Indonesia ONLY**:
   - All explanations, summaries, code reviews, and responses from Antigravity to the user in the chat conversation MUST always be written in **Bahasa Indonesia**.

---

## 🎨 UI/UX Design & Frontend Performance Standards
1. **Design System & Semantic Palette**:
   - Dark Mode MUST be based on clean, deep neutral tokens (Zinc 950 `#09090b`, surface `#18181b`, border `rgba(255,255,255,0.08)`, text `#fafafa`).
   - Light Mode MUST be based on clean, crisp neutral tokens (Slate 50 `#f8fafc`, surface `#ffffff`, border `rgba(0,0,0,0.08)`, text `#0f172a`).
   - Use a **Single Primary Accent** (Electric Blue `#0071E3` / `#0A84FF`) for active/focused states and primary CTAs. Do NOT employ multi-colored rainbow palettes for metric cards or lists.
2. **Anti-Clutter & Surface Elevation (No Nested Border Hell)**:
   - Avoid nesting borders within borders. Use background tonal contrast (`surface` vs `surface-elevated`) rather than 1px borders around every inner element.
   - Maintain consistent border radiuses across components (`rounded-lg` for inputs/buttons, `rounded-xl` for cards, `rounded-2xl` for dialogs/panels).
3. **Zero `!important` CSS Hacks**:
   - Theme switching (Light vs Dark) MUST use unified CSS variables or native Tailwind `dark:` classes. NEVER inject brute-force `!important` overrides in CSS files.
4. **High-Performance & Zero-Jank Animation**:
   - Animations MUST be subtle and GPU-friendly (150ms–200ms transitions).
   - NEVER use continuous heavy animations (e.g. infinite pulsing loops `worker-active pulse`) on multi-item lists or worker grids.
5. **Strict Functional Invariance**:
   - Frontend styling refactors MUST preserve all existing props, handlers, SSE subscriptions, and Go API contracts intact.

---

## 🏗️ Code Quality, Architecture & Design Standards
1. **Enterprise-Grade Modular Architecture (Anti-Monolith)**:
   - Use the **Strategy Pattern + Provider Registry** (`engine/providers/`) for adding any new comic catalog or scraper source.
   - Every provider MUST implement the standard `providers.Provider` interface and register itself in `engine/providers/init.go`.
   - Never add hardcoded `if/else` source checks directly inside `server/api.go` or `main.go`.

2. **Zero-Regression & Compatibility Principle**:
   - New features or refactoring MUST NOT break or alter existing working features (LINE Webtoon ID/EN, MANGA Plus ID, Desktop GUI, SSE progress, Telegram Bot).
   - Maintain backward compatibility bridges in `engine/` for top-level structs and functions.

3. **Clean Code & Best Standards**:
   - Keep code decoupled, highly readable, and well-structured.
   - Centralize HTTP clients, connection pooling, and file sanitization in `engine/utils/`.
   - Maintain clean error handling and avoid silent failures or swallowing errors.
   - Windows binaries MUST be compiled with `-ldflags="-H windowsgui -s -w"` to run natively without opening a black CMD console window.

---

## 🐙 Git & Version Control Rules
1. **Local Commits on Active Branch**:
   - Antigravity MUST commit code changes locally on the currently active branch (e.g. `feat/naver-webtoon-provider`) after completing milestones, modifying files, fixing issues, or refactoring.
   - All commits MUST stay strictly on the local active branch without pushing to remote until explicit user permission is given.
2. **Remote Push Protection (Strict)**:
   - Antigravity MUST ALWAYS ask for explicit user permission before executing `git push` to remote repositories. NEVER push automatically without user approval.
3. **GitHub Release Naming & Formatting Standard**:
   - Release Titles MUST follow the standardized format: `<tag> - <Descriptive Feature Subject>` (e.g. `v2.2.0 - IDM-Style Parallel Chunking & High-Speed Optimizations`).
   - NEVER name releases with just the version tag alone (e.g. `v2.2.0`). Always append the feature subject after the hyphen `-`.
   - Release notes body MUST follow the structured GitHub Flavored Markdown format (`# 🚀 Release Notes - Version X.Y.Z` with numbered feature highlights and emoji headers).

