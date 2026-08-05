import React, { useState } from 'react';
import { History, Search, CheckCircle2, Clock, Trash2, Layers, HardDrive } from 'lucide-react';

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
      <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Download History & Session Logs</h2>
            <p className="text-xs opacity-60">Complete log of downloaded webtoon chapters in this session.</p>
          </div>
        </div>

        {historyList.length > 0 && (
          <button
            onClick={onClearHistory}
            className="px-3 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear History
          </button>
        )}
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4 border border-black/10 dark:border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono">{totalChaptersDownloaded}</div>
            <div className="text-xs opacity-60">Completed Chapters</div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-black/10 dark:border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono">{totalImagesDownloaded}</div>
            <div className="text-xs opacity-60">Total Downloaded Images</div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-black/10 dark:border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono">Direct Streaming</div>
            <div className="text-xs opacity-60">Zero Heap Overhead</div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 opacity-40 absolute left-3.5 top-3.5 pointer-events-none" />
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
        <div className="p-12 text-center text-xs opacity-50 glass-card rounded-2xl border border-black/5 dark:border-white/5">
          <p>No history records found in this session.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredHistory.map((item, index) => (
            <div
              key={index}
              className="p-3.5 rounded-xl glass-card border border-black/10 dark:border-white/10 flex items-center justify-between hover:border-blue-500/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs font-mono">
                  #{index + 1}
                </div>
                <div>
                  <h4 className="text-xs font-bold">{item.title}</h4>
                  <div className="text-[10px] opacity-60 flex items-center gap-2 font-mono">
                    <span>{item.completedCount} / {item.totalCount} Images</span>
                    <span>•</span>
                    <span>Format: {item.format}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs opacity-60 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {item.timestamp}
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-600 dark:text-blue-300 font-semibold text-[10px] border border-blue-500/20">
                  SUCCESS
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
