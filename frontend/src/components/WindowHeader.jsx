import React from 'react';
import { Folder, FolderTwo, LayersTwo, Sun, Moon } from '@mynaui/icons-react';

const callNative = (name) => {
  try {
    if (typeof window[name] === 'function') {
      window[name]();
    }
  } catch (_) {}
};

export default function WindowHeader({
  onSelectFolder,
  onOpenFolder,
  outputDir,
  serverStatus,
  theme,
  onToggleTheme
}) {
  const startDrag = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, a, input, [data-no-drag]')) return;
    callNative('windowDrag');
  };

  return (
    <header
      onMouseDown={startDrag}
      className="h-11 border-b border-[var(--border-color)] glass-panel flex items-center justify-between px-4 select-none z-20 cursor-default"
      style={{ WebkitAppRegion: 'drag', appRegion: 'drag' }}
    >
      <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag' }}>
        <div className="flex items-center gap-2 mr-1" data-no-drag>
          <span
            className="traffic-btn traffic-close shadow-sm cursor-pointer"
            title="Close"
            onClick={() => callNative('windowClose')}
          />
          <span
            className="traffic-btn traffic-minimize shadow-sm cursor-pointer"
            title="Minimize"
            onClick={() => callNative('windowMinimize')}
          />
          <span
            className="traffic-btn traffic-maximize shadow-sm cursor-pointer"
            title="Maximize / Restore"
            onClick={() => callNative('windowMaximize')}
          />
        </div>

        <div className="h-4 w-px bg-[var(--border-color)]"></div>
        <div className="flex items-center gap-2">
          <LayersTwo className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-[13px] tracking-tight">Webtoon Scraper</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider border border-blue-500/20">
            Pro v2.0
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs" style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag' }} data-no-drag>
        <button
          onClick={onToggleTheme}
          className="h-7 px-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-all active:scale-95 flex items-center gap-1.5 font-medium text-[var(--text-sub)]"
          title={`Switch to ${theme === 'dark' ? 'Light Mode (Apple macOS)' : 'Dark Mode'}`}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />}
          <span className="hidden sm:inline text-[10px] uppercase tracking-wider">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        <div
          onClick={onSelectFolder}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 border border-transparent text-[var(--text-sub)] max-w-[260px] truncate cursor-pointer transition-all group"
          title="Click to Choose Output Directory (Open Folder Dialog)"
        >
          <Folder className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="truncate text-[11px]">{outputDir || "Select directory..."}</span>
        </div>

        <button
          onClick={onOpenFolder}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-sub)] transition-all active:scale-95"
          title="Open Current Output Directory in Windows File Explorer"
        >
          <FolderTwo className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onSelectFolder}
          className="h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition-all border border-blue-400/20 shadow-sm flex items-center gap-1.5 active:scale-95"
        >
          Select Directory
        </button>

        <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--border-color)]">
          <span className={`w-1.5 h-1.5 rounded-full ${serverStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
          <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--text-sub)]">
            {serverStatus === 'online' ? 'Online' : 'Connecting'}
          </span>
        </div>
      </div>
    </header>
  );
}
