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
1. **Local Commits**:
   - Antigravity MUST commit code changes locally after completing milestones, fixing issues, or refactoring.
2. **Remote Push Protection (Strict)**:
   - Antigravity MUST ALWAYS ask for explicit user permission before executing `git push` to remote repositories. NEVER push automatically without user approval.
