import React from 'react';
import { Microchip, Activity, CheckCircle, Zap } from '@mynaui/icons-react';
import Badge from './ui/Badge';

export default function DownloadDashboard({ progress, activeWorkers = [] }) {
  if (!progress) return null;

  const rawPct = progress.percentage || 0;
  const percentage = Math.min(100, Math.max(0, rawPct));
  const downloadedImages = progress.downloadedImages || 0;
  const totalImages = progress.totalImages || 0;
  const currentChapter = progress.currentChapter || 0;
  const totalChapters = progress.totalChapters || 0;
  const currentImage = progress.currentImage || 0;
  const chapterTotalImages = progress.chapterTotalImages || 0;
  const statusText = progress.status || 'Processing download...';

  const activeWorkerCount = activeWorkers.filter((w) => w.active).length;

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4 border border-[var(--border-color)] shadow-sm animate-slide-up select-none">
      {/* Main Status & Progress Bar */}
      <div className="p-4 rounded-xl bg-[var(--btn-secondary-bg)] border border-[var(--border-color)] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--text-main)] truncate">{statusText}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-bold font-mono text-[var(--accent)]">{percentage.toFixed(1)}%</span>
            <Badge variant="blue" className="font-mono">
              {downloadedImages} / {totalImages} imgs
            </Badge>
          </div>
        </div>

        {/* Smooth High-Performance Progress Bar */}
        <div className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300 ease-out rounded-full"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>

        {/* Secondary Detail Counters */}
        <div className="flex items-center justify-between text-[11px] text-[var(--text-sub)]">
          <span>
            Chapter: <strong className="text-[var(--text-main)] font-semibold">{currentChapter} of {totalChapters}</strong>
          </span>
          <span>
            Chapter Images: <strong className="text-[var(--text-main)] font-semibold">{currentImage} / {chapterTotalImages}</strong>
          </span>
        </div>
      </div>

      {/* Worker Pool Activity Matrix (Clean & Zero-Jitter) */}
      {activeWorkers.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--text-sub)] flex items-center gap-1.5">
              <Microchip className="w-3.5 h-3.5 text-[var(--accent)]" /> Active Workers ({activeWorkerCount} of {activeWorkers.length} busy)
            </span>
            <span className="text-[11px] text-[var(--accent)] font-medium flex items-center gap-1">
              <Zap className="w-3 h-3" /> Concurrent Direct Streaming
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {activeWorkers.map((worker) => {
              const prog = worker.progress || 0;
              const isActive = worker.active;
              return (
                <div
                  key={worker.id}
                  className={`p-2 rounded-lg border text-xs transition-all duration-150 space-y-1 ${
                    isActive
                      ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent)]'
                      : 'bg-[var(--btn-secondary-bg)] border-[var(--border-color)] opacity-40 text-[var(--text-muted-custom)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[10px] font-semibold truncate">#{worker.id}</span>
                    {isActive ? (
                      <span className="text-[10px] font-mono font-bold">{prog.toFixed(0)}%</span>
                    ) : (
                      <CheckCircle className="w-3 h-3 opacity-40 shrink-0" />
                    )}
                  </div>

                  {isActive && (
                    <div className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] transition-all duration-150 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, prog))}%` }}
                      ></div>
                    </div>
                  )}

                  <p className="text-[9px] truncate opacity-75 font-mono" title={worker.status}>
                    {isActive ? (worker.status || 'Active') : 'Idle'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
