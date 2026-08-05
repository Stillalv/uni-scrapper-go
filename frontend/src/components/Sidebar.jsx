import React from 'react';
import { BookOpen, Layers, History, Settings, Wrench, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Sidebar({
  isOpen,
  activeTab,
  setActiveTab,
  selectedComic,
  outputDir
}) {
  if (!isOpen) return null;

  const menuItems = [
    { id: 'catalog', label: 'Catalog Explorer', icon: BookOpen, badge: 'Gallery' },
    { id: 'scraper', label: 'Scraper Dashboard', icon: Layers, badge: 'Download' },
    { id: 'history', label: 'Download History', icon: History },
    { id: 'settings', label: 'System Preferences', icon: Settings },
    { id: 'tools', label: 'Diagnostics & Tools', icon: Wrench },
  ];

  return (
    <aside className="w-64 glass-sidebar flex flex-col h-[calc(100vh-2.75rem)] shrink-0 select-none border-r border-black/10 dark:border-white/10 transition-all duration-300">
      {/* Brand Header */}
      <div className="p-3 border-b border-black/10 dark:border-white/10 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
          WS
        </div>
        <div>
          <div className="text-xs font-bold tracking-wide">Webtoon Scraper</div>
          <div className="text-[10px] opacity-50 font-mono">macOS Edition</div>
        </div>
      </div>

      {/* Navigation List Menu */}
      <div className="p-3 space-y-1 flex-1">
        <div className="text-[10px] font-bold opacity-40 uppercase tracking-wider px-2 mb-2">
          MAIN MENU
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all active:scale-[0.98] ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md border border-blue-500/30'
                  : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'opacity-60'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-blue-600/10 text-blue-600 dark:text-blue-300'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Selected Comic Card */}
      {selectedComic && (
        <div className="m-3 p-3 rounded-xl bg-blue-600/10 border border-blue-500/20 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">
            <span>ACTIVE COMIC</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xs font-bold truncate">{selectedComic.title}</div>
          <div className="text-[10px] opacity-50 font-mono">ID: #{selectedComic.title_no}</div>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-3 border-t border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[11px] opacity-60 flex items-center justify-between">
        <span className="truncate max-w-[140px]" title={outputDir}>
          📁 {outputDir ? outputDir.split('\\').pop() : 'Default'}
        </span>
        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold text-[10px]">
          <Sparkles className="w-3 h-3" /> Ready
        </span>
      </div>
    </aside>
  );
}
