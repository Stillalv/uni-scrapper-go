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
          <span className="text-[11px] text-[var(--text-sub)] opacity-50 font-normal ml-0.5">v2.0</span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs" style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag' }} data-no-drag>
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 text-[var(--text-sub)] hover:text-[var(--text-primary)] transition-colors active:scale-95"
          title={`Switch to ${theme === 'dark' ? 'Light Mode (Apple macOS)' : 'Dark Mode'}`}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
          <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-medium">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        <span className="w-px h-4 bg-[var(--border-color)]"></span>

        <div
          onClick={onSelectFolder}
          className="flex items-center gap-1.5 text-[var(--text-sub)] hover:text-[var(--text-primary)] max-w-[260px] truncate cursor-pointer transition-colors"
          title="Click to Choose Output Directory (Open Folder Dialog)"
        >
          <Folder className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
          <span className="truncate text-[11px]">{outputDir || "Select directory..."}</span>
        </div>

        <button
          onClick={onOpenFolder}
          className="flex items-center justify-center text-[var(--text-sub)] hover:text-[var(--text-primary)] transition-colors active:scale-95"
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

        <span className="w-px h-4 bg-[var(--border-color)]"></span>

        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${serverStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
          <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--text-sub)]">
            {serverStatus === 'online' ? 'Online' : 'Connecting'}
          </span>
        </div>
      </div>
    </header>
  );
}
