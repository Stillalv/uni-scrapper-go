import React from 'react';
import { BookOpen, LayersTwo, ClockWaves, FineTune, Wrench, Sparkles, CheckCircle, ChevronLeft, ChevronRight, Heart } from '@mynaui/icons-react';
import Badge from './ui/Badge';

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
      <div className="relative shrink-0 h-[calc(100vh-2.5rem)] w-0">
        <button
          type="button"
          onClick={onToggle}
          title="Show Sidebar"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 h-9 w-4 flex items-center justify-center rounded-r-md border border-l-0 border-[var(--border-color)] bg-[var(--sidebar-bg)] text-[var(--text-sub)] hover:text-[var(--text-main)] transition-all shadow-sm"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <aside className="relative w-60 glass-sidebar flex flex-col h-[calc(100vh-2.5rem)] shrink-0 select-none border-r border-[var(--border-color)] transition-all duration-200">
      {/* Collapse button on edge */}
      <button
        type="button"
        onClick={onToggle}
        title="Hide Sidebar"
        className="absolute -right-3 top-1/2 -translate-y-1/2 z-30 h-8 w-4 flex items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--sidebar-bg)] text-[var(--text-sub)] hover:text-[var(--text-main)] transition-all shadow-sm"
      >
        <ChevronLeft className="w-3 h-3" />
      </button>

      {/* Brand Header */}
      <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
          WS
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-tight text-[var(--text-main)] truncate">Webtoon Scraper</div>
        </div>
      </div>

      {/* Navigation List Menu */}
      <div className="p-2 space-y-1 flex-1 overflow-y-auto">
        <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted-custom)] px-2.5 pt-2 pb-1">
          Menu
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${
                isActive
                  ? 'bg-[var(--accent)] text-white shadow-sm font-semibold'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--btn-secondary-hover)]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--text-sub)]'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.count !== null && item.count !== undefined && (
                <Badge variant={isActive ? 'blue' : 'neutral'} className={isActive ? '!bg-white/20 !text-white !border-white/20' : ''}>
                  {item.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Selected Comic Card (Surface Elevated without Double Borders) */}
      {selectedComic && (
        <div className="mx-2 mb-2 p-2.5 rounded-lg bg-[var(--btn-secondary-bg)] border border-[var(--border-color)] space-y-0.5">
          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted-custom)] font-medium">
            <span>Active Target</span>
            <CheckCircle className="w-3 h-3 text-[var(--accent)]" />
          </div>
          <div className="text-xs font-medium text-[var(--text-main)] truncate" title={selectedComic.title}>
            {selectedComic.title}
          </div>
          <div className="text-[10px] text-[var(--text-muted-custom)] font-mono">
            ID: #{selectedComic.id || selectedComic.title_no}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-3.5 py-2.5 border-t border-[var(--border-color)] text-[11px] text-[var(--text-sub)] flex items-center justify-between gap-2">
        <span className="truncate min-w-0 font-mono text-[10px]" title={outputDir}>
          📁 {outputDir ? outputDir.split('\\').pop() : 'Default'}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--accent)] shrink-0">
          <Sparkles className="w-3 h-3" /> Ready
        </span>
      </div>
    </aside>
  );
}
