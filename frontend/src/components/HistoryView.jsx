import React, { useState } from 'react';
import { ClockWaves, Search, CheckCircle, ClockCircle, TrashTwo, LayersTwo, Folder, Copy, Lightning, Zap, DangerOctagon, BookOpen } from '@mynaui/icons-react';
import Button from './ui/Button';
import Badge from './ui/Badge';

export default function HistoryView({ historyList, onClearHistory, onOpenFolder }) {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const safeHistory = Array.isArray(historyList) ? historyList.filter(Boolean) : [];

  const handleDeleteItem = (idToDelete) => {
    const updated = safeHistory.filter((item) => (item.id || item.timestamp) !== idToDelete);
    try {
      localStorage.setItem('webtoon_download_history_v2', JSON.stringify(updated));
    } catch (e) {}
    if (onClearHistory) {
      onClearHistory(updated);
    }
  };

  const handleCopyPath = (path, id) => {
    if (!path) return;
    try {
      navigator.clipboard.writeText(path);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {}
  };

  const filteredHistory = safeHistory.filter((item) => {
    if (!item) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const title = String(item.title || item.comicTitle || '').toLowerCase();
    const format = String(item.format || '').toLowerCase();
    const dir = String(item.outputDir || '').toLowerCase();
    const genre = String(item.genre || '').toLowerCase();
    return title.includes(q) || format.includes(q) || dir.includes(q) || genre.includes(q);
  });

  const totalSessions = safeHistory.length;
  const totalChaptersDownloaded = safeHistory.reduce((acc, item) => acc + (Number(item?.completedCount) || 0), 0);
  const totalImagesDownloaded = safeHistory.reduce((acc, item) => acc + (Number(item?.totalImages) || Number(item?.completedCount) || 0), 0);

  const totalElapsedMs = safeHistory.reduce((acc, item) => acc + (Number(item?.elapsedMs) || (Number(item?.elapsedSec) ? item.elapsedSec * 1000 : 0)), 0);
  
  const formatTotalTime = (ms) => {
    if (!ms || ms <= 0) return '0s';
    const totalSec = Math.round(ms / 1000);
    if (totalSec < 60) return `${totalSec}s`;
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2 select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-5 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <ClockWaves style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Download History & Session Performance</h2>
            <p className="text-xs opacity-60 mt-0.5">Detailed execution logs, download duration, and speed metrics per session.</p>
          </div>
        </div>

        {safeHistory.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (window.confirm('Clear all download history logs?')) {
                handleDeleteItem(null);
                if (onClearHistory) onClearHistory([]);
              }
            }}
            icon={TrashTwo}
            className="!h-8 !px-3 shrink-0"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-2xl p-3.5 border border-[var(--border-color)] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 shrink-0">
            <LayersTwo className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold font-mono tracking-tight">{totalSessions}</div>
            <div className="text-[9px] uppercase tracking-wider opacity-50 font-semibold">Total Sessions</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-3.5 border border-[var(--border-color)] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-600/10 text-amber-600 dark:text-amber-400 shrink-0">
            <ClockCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">{formatTotalTime(totalElapsedMs)}</div>
            <div className="text-[9px] uppercase tracking-wider opacity-50 font-semibold">Total Download Time</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-3.5 border border-[var(--border-color)] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold font-mono tracking-tight">{totalChaptersDownloaded}</div>
            <div className="text-[9px] uppercase tracking-wider opacity-50 font-semibold">Chapters Downloaded</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-3.5 border border-[var(--border-color)] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Lightning className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold font-mono tracking-tight">{totalImagesDownloaded.toLocaleString()}</div>
            <div className="text-[9px] uppercase tracking-wider opacity-50 font-semibold">Total Images</div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 opacity-40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Filter history by comic title, format, or directory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl glass-input placeholder:opacity-40"
        />
      </div>

      {/* History Session Cards List */}
      {filteredHistory.length === 0 ? (
        <div className="p-12 text-center text-xs opacity-50 space-y-2 glass-card rounded-2xl border border-[var(--border-color)]">
          <p>No download history records found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item, index) => {
            const itemKey = item.id || index;
            const isStopped = item.status === 'stopped' || item.type === 'warning';
            const durationDisplay = item.durationText || (item.elapsedSec ? `${item.elapsedSec.toFixed(1)}s` : 'N/A');

            return (
              <div
                key={itemKey}
                className="p-4 rounded-2xl glass-card border border-[var(--border-color)] space-y-3 hover:border-blue-500/40 transition-all group"
              >
                {/* Top Row: Title, Source/Genre Badge, Status, Elapsed Time Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Thumbnail Poster Cover */}
                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-black/30 shrink-0 border border-white/10 relative">
                      {item.coverUrl ? (
                        <img
                          src={`/api/proxy-image?url=${encodeURIComponent(item.coverUrl)}`}
                          alt={item.title || 'Comic'}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-30">
                          <BookOpen className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="blue">
                          {item.genre || 'COMIC'}
                        </Badge>
                        <Badge variant={isStopped ? 'amber' : 'emerald'} icon={isStopped ? DangerOctagon : CheckCircle}>
                          {isStopped ? 'Stopped' : 'Completed'}
                        </Badge>
                      </div>

                      <h3 className="text-sm font-bold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.title || item.comicTitle || 'Webtoon Download'}
                      </h3>
                    </div>
                  </div>

                  {/* Elapsed Time Prominent Badge */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <Badge variant="amber" icon={ClockCircle} className="!px-3 !py-1.5 !text-xs font-mono font-bold">
                      Duration: {durationDisplay}
                    </Badge>
                  </div>
                </div>

                {/* Middle Row: Detailed Performance Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1 text-xs">
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-color)]">
                    <span className="text-[9px] opacity-50 uppercase tracking-wider block font-semibold">Chapters</span>
                    <span className="font-mono font-bold">{item.completedCount || 0} / {item.totalCount || item.completedCount || 0}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-color)]">
                    <span className="text-[9px] opacity-50 uppercase tracking-wider block font-semibold">Total Images</span>
                    <span className="font-mono font-bold">{item.totalImages || item.completedCount || 0}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-color)]">
                    <span className="text-[9px] opacity-50 uppercase tracking-wider block font-semibold">Avg Speed</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {item.avgSpeed ? `${item.avgSpeed} imgs/s` : '-'}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-color)]">
                    <span className="text-[9px] opacity-50 uppercase tracking-wider block font-semibold">Config / Format</span>
                    <span className="font-mono font-bold">{item.workers || 6} workers • {item.format || 'WEBP'}</span>
                  </div>
                </div>

                {/* Bottom Row: Path & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)] text-xs">
                  <div className="text-[10px] font-mono opacity-50 truncate max-w-lg" title={item.outputDir}>
                    📁 {item.outputDir || 'Default Output Directory'}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <span className="text-[10px] font-mono opacity-40 mr-1">
                      {item.finishedDate || ''} {item.timestamp || ''}
                    </span>

                    {item.outputDir && onOpenFolder && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenFolder(item.outputDir)}
                        icon={Folder}
                        className="!h-7 !px-2.5 !text-[11px]"
                        title="Open Output Directory in Explorer"
                      >
                        Open
                      </Button>
                    )}

                    {item.outputDir && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopyPath(item.outputDir, itemKey)}
                        icon={Copy}
                        className="!h-7 !px-2.5 !text-[11px]"
                        title="Copy Directory Path"
                      >
                        {copiedId === itemKey ? 'Copied!' : 'Copy'}
                      </Button>
                    )}

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteItem(itemKey)}
                      icon={TrashTwo}
                      className="!h-7 !w-7 !px-0"
                      title="Delete Entry"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
