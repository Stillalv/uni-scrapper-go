import React from 'react';
import { Folder, FolderTwo, Sun, Moon } from '@mynaui/icons-react';
import Button from './ui/Button';
import Badge from './ui/Badge';
import AppLogo from './ui/AppLogo';

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

  const folderName = outputDir ? outputDir.split('\\').pop() || outputDir : 'Select directory...';

  return (
    <header
      onMouseDown={startDrag}
      className="h-10 border-b border-[var(--border-color)] glass-panel flex items-center justify-between px-3.5 select-none z-20 cursor-default shrink-0"
      style={{ WebkitAppRegion: 'drag', appRegion: 'drag' }}
    >
      {/* Left side: Window Controls & Title */}
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag' }}>
        <div className="flex items-center gap-1.5" data-no-drag>
          <span
            className="traffic-btn traffic-close cursor-pointer"
            title="Close"
            onClick={() => callNative('windowClose')}
          />
          <span
            className="traffic-btn traffic-minimize cursor-pointer"
            title="Minimize"
            onClick={() => callNative('windowMinimize')}
          />
          <span
            className="traffic-btn traffic-maximize cursor-pointer"
            title="Maximize / Restore"
            onClick={() => callNative('windowMaximize')}
          />
        </div>

        <div className="h-3.5 w-px bg-[var(--border-color)]"></div>

        <div className="flex items-center gap-2">
          <AppLogo className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="font-semibold text-xs tracking-tight text-[var(--text-main)]">Webtoon Scraper</span>
          <span className="text-[10px] text-[var(--text-sub)] font-mono">v2.6</span>
        </div>
      </div>

      {/* Right side: Toolbar Actions */}
      <div className="flex items-center gap-2 text-xs" style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag' }} data-no-drag>
        {/* Output Directory Pill */}
        <div className="flex items-center rounded-lg bg-[var(--btn-secondary-bg)] hover:bg-[var(--btn-secondary-hover)] border border-[var(--border-color)] transition-colors">
          <button
            type="button"
            onClick={onSelectFolder}
            title={`Output Directory: ${outputDir || 'Not set'}\nClick to change destination folder`}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors max-w-[220px] truncate"
          >
            <Folder className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
            <span className="truncate text-[11px] font-medium">{folderName}</span>
          </button>
          <button
            type="button"
            onClick={onOpenFolder}
            title="Open Directory in Windows File Explorer"
            className="p-1 pr-2 text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors border-l border-[var(--border-color)]"
          >
            <FolderTwo className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-3.5 w-px bg-[var(--border-color)]"></div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--btn-secondary-bg)] transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-500" />
          )}
        </button>

        {/* Status Indicator */}
        <Badge variant={serverStatus === 'online' ? 'emerald' : 'amber'} className="!py-0.5 !px-2">
          <span className={`w-1.5 h-1.5 rounded-full ${serverStatus === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          <span className="text-[10px] tracking-wider uppercase font-semibold">
            {serverStatus === 'online' ? 'Online' : 'Connecting'}
          </span>
        </Badge>
      </div>
    </header>
  );
}
