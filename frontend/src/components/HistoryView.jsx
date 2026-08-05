import React, { useState } from 'react';
import { ClockWaves, Search, CheckCircle, ClockCircle, TrashTwo, LayersTwo, HardDrive } from '@mynaui/icons-react';

export default function HistoryView({ historyList, onClearHistory }) {
  const [search, setSearch] = useState('');

  const filteredHistory = historyList.filter((item) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.format && item.format.toLowerCase().includes(q)) ||
      (item.outputDir && item.outputDir.toLowerCase().includes(q))
    );
  });

  const totalChaptersDownloaded = historyList.length;
  const totalImagesDownloaded = historyList.reduce((acc, item) => acc + (item.completedCount || 0), 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2 select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-5 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <ClockWaves style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Download History & Session Logs</h2>
            <p className="text-xs opacity-60 mt-0.5">Complete log of downloaded webtoon chapters in this session.</p>
          </div>
        </div>

        {historyList.length > 0 && (
          <button
            onClick={onClearHistory}
            className="h-8 px-3 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-[0.98] shrink-0"
          >
            <TrashTwo className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-[var(--border-color)] flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 shrink-0">
            <LayersTwo className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-mono tracking-tight">{totalChaptersDownloaded}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-50">Completed Chapters</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-[var(--border-color)] flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-mono tracking-tight">{totalImagesDownloaded}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-50">Total Images</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-[var(--border-color)] flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-mono tracking-tight">Direct</div>
            <div className="text-[10px] uppercase tracking-wider opacity-50">Streaming Mode</div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 opacity-40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Filter history by chapter title, format, or directory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl glass-input placeholder:opacity-40"
        />
      </div>

      {/* History Items List */}
      {filteredHistory.length === 0 ? (
        <div className="p-12 text-center text-xs opacity-50 space-y-2 glass-card rounded-2xl border border-[var(--border-color)]">
          <p>No history records found in this session.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredHistory.map((item, index) => (
            <div
              key={index}
              className="px-4 py-3 rounded-xl glass-card border border-[var(--border-color)] flex items-center justify-between gap-3 hover:border-blue-500/40 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs font-mono shrink-0">
                  #{index + 1}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold truncate">{item.title}</h4>
                  <div className="text-[10px] opacity-60 flex items-center gap-1.5 font-mono">
                    <span>{item.completedCount} / {item.totalCount} Images</span>
                    <span className="opacity-40">•</span>
                    <span>Format: {item.format}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs opacity-60 font-mono shrink-0">
                <span className="flex items-center gap-1 text-[10px]">
                  <ClockCircle className="w-3 h-3" /> {item.timestamp}
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold text-[9px] uppercase tracking-wider border border-blue-500/20">
                  Success
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
