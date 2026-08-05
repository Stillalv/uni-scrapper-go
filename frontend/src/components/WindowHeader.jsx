import React from 'react';
import { Folder, FolderOpen, PanelLeft, Layers, Sun, Moon } from 'lucide-react';

export default function WindowHeader({
  isSidebarOpen,
  onToggleSidebar,
  onSelectFolder,
  onOpenFolder,
  outputDir,
  serverStatus,
  theme,
  onToggleTheme
}) {
  return (
    <header className="h-11 border-b border-black/10 dark:border-white/10 glass-panel flex items-center justify-between px-4 select-none z-20">
      {/* Left: macOS Traffic Light Buttons & Sidebar Toggle & Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 group">
          <span className="traffic-btn traffic-close shadow-sm cursor-pointer"></span>
          <span className="traffic-btn traffic-minimize shadow-sm cursor-pointer"></span>
          <span className="traffic-btn traffic-maximize shadow-sm cursor-pointer"></span>
        </div>

        <button
          onClick={onToggleSidebar}
          className={`p-1.5 rounded-lg border transition-all active:scale-95 ${
            isSidebarOpen
              ? 'bg-blue-600/30 text-blue-300 border-blue-500/40'
              : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 opacity-60 border-black/10 dark:border-white/10'
          }`}
          title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-black/10 dark:bg-white/10 mx-1"></div>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-sm tracking-wide">Webtoon Scraper</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-medium border border-blue-500/30">
            macOS Pro v2.0
          </span>
        </div>
      </div>

      {/* Right: Theme Toggle & Folder Controls */}
      <div className="flex items-center gap-2 text-xs">
        {/* Light / Dark Mode Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-md bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/15 border border-black/10 dark:border-white/10 transition-all active:scale-95 flex items-center gap-1 font-medium"
          title={`Switch to ${theme === 'dark' ? 'Light Mode (Apple macOS)' : 'Dark Mode'}`}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
          <span className="hidden sm:inline text-[11px] opacity-70">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        {/* Click folder path to trigger VS Code style Open Folder dialog */}
        <div
          onClick={onSelectFolder}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 opacity-70 max-w-[280px] truncate cursor-pointer transition-all group"
          title="Click to Choose Output Directory (Open Folder Dialog)"
        >
          <Folder className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="truncate">{outputDir || "Select directory..."}</span>
        </div>

        {/* Button to open output location directly in File Explorer */}
        <button
          onClick={onOpenFolder}
          className="p-1.5 rounded-md bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition-all font-medium flex items-center gap-1 active:scale-95"
          title="Open Current Output Directory in Windows File Explorer"
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>

        {/* Button to open VS Code style Open Folder Dialog */}
        <button
          onClick={onSelectFolder}
          className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all border border-blue-400/30 shadow-sm flex items-center gap-1 active:scale-95"
        >
          Select Directory
        </button>

        <div className="flex items-center gap-1.5 pl-2 border-l border-black/10 dark:border-white/10">
          <span className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
          <span className="text-[11px] uppercase tracking-wider font-semibold opacity-70">
            {serverStatus === 'online' ? 'Online' : 'Connecting...'}
          </span>
        </div>
      </div>
    </header>
  );
}
