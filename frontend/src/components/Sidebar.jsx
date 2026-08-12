import React from 'react';
import { BookOpen, LayersTwo, ClockWaves, FineTune, Wrench, Sparkles, CheckCircle, ChevronLeft, ChevronRight, Heart } from '@mynaui/icons-react';

export default function Sidebar({
  isOpen,
  onToggle,
  activeTab,
  setActiveTab,
  selectedComic,
  outputDir,
  bookmarkCount = 0
}) {
  const menuItems = [
    { id: 'catalog', label: 'Catalog Explorer', icon: BookOpen },
    { id: 'bookmarks', label: 'Bookmarked Comics', icon: Heart, count: bookmarkCount > 0 ? bookmarkCount : null },
    { id: 'scraper', label: 'Scraper Dashboard', icon: LayersTwo },
    { id: 'history', label: 'Download History', icon: ClockWaves },
    { id: 'settings', label: 'System Preferences', icon: FineTune },
    { id: 'tools', label: 'Diagnostics & Tools', icon: Wrench },
  ];

  if (!isOpen) {
    return (
      <div className="relative shrink-0 h-[calc(100vh-2.75rem)] w-0">
        <button
          onClick={onToggle}
          title="Show Sidebar"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 h-10 w-5 flex items-center justify-center rounded-r-md border border-l-0 border-[var(--border-color)] bg-[var(--sidebar-bg)] text-[var(--text-sub)] opacity-60 hover:opacity-100 transition-all active:scale-95"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <aside className="relative w-64 glass-sidebar flex flex-col h-[calc(100vh-2.75rem)] shrink-0 select-none border-r border-[var(--border-color)] transition-all duration-300">
      {/* Collapse arrow on right edge of sidebar */}
      <button
        onClick={onToggle}
        title="Hide Sidebar"
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-30 h-10 w-5 flex items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--sidebar-bg)] text-[var(--text-sub)] opacity-50 hover:opacity-100 transition-all active:scale-95 shadow-sm"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Brand Header */}
      <div className="px-4 py-3.5 border-b border-[var(--border-color)] flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
          WS
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-tight truncate">Webtoon Scraper</div>
        </div>
      </div>

      {/* Navigation List Menu */}
      <div className="p-2.5 space-y-0.5 flex-1 overflow-y-auto">
        <div className="text-[10px] font-medium text-[var(--text-sub)] opacity-50 px-3 pt-2 pb-1.5">
          Main Menu
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all active:scale-[0.98] ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'opacity-60'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.count !== null && item.count !== undefined && (
                <span className={`text-[11px] font-medium shrink-0 ${
                  isActive ? 'text-white/80' : 'text-[var(--text-sub)] opacity-60'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Selected Comic Card */}
      {selectedComic && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-color)] space-y-1">
          <div className="flex items-center justify-between text-[10px] text-[var(--text-sub)] font-medium">
            <span>Active Comic</span>
            <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xs font-semibold truncate">{selectedComic.title}</div>
          <div className="text-[10px] opacity-50 font-mono">ID: #{selectedComic.id || selectedComic.title_no}</div>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-4 py-3 border-t border-[var(--border-color)] text-[10px] opacity-60 flex items-center justify-between gap-2">
        <span className="truncate min-w-0" title={outputDir}>
          <span className="opacity-50">📁 </span>
          {outputDir ? outputDir.split('\\').pop() : 'Default'}
        </span>
        <span className="flex items-center gap-1 text-[var(--text-sub)] font-medium text-[10px] shrink-0">
          <Sparkles className="w-3 h-3 text-blue-500" /> Ready
        </span>
      </div>
    </aside>
  );
}
