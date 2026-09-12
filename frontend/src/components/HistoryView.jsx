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
    <div className="space-y-5 max-w-5xl mx-auto select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--accent-border)]">
            <ClockWaves className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-[var(--text-main)]">Download History & Performance</h2>
            <p className="text-xs text-[var(--text-sub)]">Execution logs, duration, and transfer throughput per session.</p>
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

      {/* Analytics Metric Cards (Unified, Clean Palette) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-3.5 border border-[var(--border-color)] flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--btn-secondary-bg)] text-[var(--text-sub)] shrink-0">
            <LayersTwo className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold font-mono text-[var(--text-main)]">{totalSessions}</div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted-custom)] font-medium">Total Sessions</div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-[var(--border-color)] flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--btn-secondary-bg)] text-[var(--text-sub)] shrink-0">
            <ClockCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold font-mono text-[var(--text-main)]">{formatTotalTime(totalElapsedMs)}</div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted-custom)] font-medium">Total Time</div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-[var(--border-color)] flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--btn-secondary-bg)] text-[var(--text-sub)] shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold font-mono text-[var(--text-main)]">{totalChaptersDownloaded}</div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted-custom)] font-medium">Chapters</div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-[var(--border-color)] flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--btn-secondary-bg)] text-[var(--text-sub)] shrink-0">
            <Lightning className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold font-mono text-[var(--text-main)]">{totalImagesDownloaded.toLocaleString()}</div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted-custom)] font-medium">Images</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[var(--text-muted-custom)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Filter history by comic title, format, or folder..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-8.5 pl-10 pr-4 text-xs rounded-xl glass-input"
        />
      </div>

      {/* History Session Cards List */}
      {filteredHistory.length === 0 ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted-custom)] space-y-2 glass-card rounded-2xl">
          <p>No download history records found.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredHistory.map((item, index) => {
            const itemKey = item.id || index;
            const isStopped = item.status === 'stopped' || item.type === 'warning';
            const durationDisplay = item.durationText || (item.elapsedSec ? `${item.elapsedSec.toFixed(1)}s` : 'N/A');

            return (
              <div
                key={itemKey}
                className="p-3.5 rounded-xl glass-card border border-[var(--border-color)] hover:border-[var(--border-hover)] transition-all space-y-2.5"
              >
                {/* Top: Title & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-12 rounded-md overflow-hidden bg-[var(--btn-secondary-bg)] shrink-0 border border-[var(--border-color)]">
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
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="neutral">
                          {item.genre || 'COMIC'}
                        </Badge>
                        <Badge variant={isStopped ? 'amber' : 'emerald'} icon={isStopped ? DangerOctagon : CheckCircle}>
                          {isStopped ? 'Stopped' : 'Completed'}
                        </Badge>
                      </div>

                      <h3 className="text-xs font-semibold text-[var(--text-main)] truncate" title={item.title || item.comicTitle}>
                        {item.title || item.comicTitle || 'Webtoon Download'}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    <Badge variant="neutral" icon={ClockCircle} className="font-mono">
                      {durationDisplay}
                    </Badge>
                  </div>
                </div>

                {/* Middle: Horizontal Metrics Strip */}
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-[var(--btn-secondary-bg)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[var(--text-muted-custom)] uppercase font-medium">Chapters:</span>
                    <span className="font-mono text-xs font-semibold text-[var(--text-main)]">{item.completedCount || 0} / {item.totalCount || item.completedCount || 0}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[var(--text-muted-custom)] uppercase font-medium">Images:</span>
                    <span className="font-mono text-xs font-semibold text-[var(--text-main)]">{item.totalImages || item.completedCount || 0}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[var(--text-muted-custom)] uppercase font-medium">Speed:</span>
                    <span className="font-mono text-xs font-semibold text-[var(--accent)] flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {item.avgSpeed ? `${item.avgSpeed} imgs/s` : '-'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[var(--text-muted-custom)] uppercase font-medium">Config:</span>
                    <span className="font-mono text-[11px] text-[var(--text-sub)]">{item.workers || 6}w • {item.format || 'WEBP'}</span>
                  </div>
                </div>

                {/* Bottom: Path & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1.5 text-xs">
                  <div className="text-[10px] font-mono text-[var(--text-muted-custom)] truncate max-w-md" title={item.outputDir}>
                    📁 {item.outputDir || 'Default Output Directory'}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <span className="text-[10px] font-mono text-[var(--text-muted-custom)]">
                      {item.finishedDate || ''} {item.timestamp || ''}
                    </span>

                    {item.outputDir && onOpenFolder && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenFolder(item.outputDir)}
                        icon={Folder}
                        className="!h-6.5 !px-2 !text-[11px]"
                        title="Open in File Explorer"
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
                        className="!h-6.5 !px-2 !text-[11px]"
                        title="Copy Path"
                      >
                        {copiedId === itemKey ? 'Copied' : 'Copy'}
                      </Button>
                    )}

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteItem(itemKey)}
                      icon={TrashTwo}
                      className="!h-6.5 !w-6.5 !px-0"
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
