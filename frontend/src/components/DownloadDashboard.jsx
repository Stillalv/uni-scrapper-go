import React from 'react';
import { Microchip, CheckCircle, Zap, Activity } from '@mynaui/icons-react';

export default function DownloadDashboard({ progress, activeWorkers }) {
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

  return (
    <div className="glass-card rounded-2xl p-5 space-y-5 border border-[var(--border-color)] shadow-lg">
      {/* Header Stat Ring & Main Status */}
      <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border-color)]">
        {/* Progress Ring / Percentage */}
        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-black/10 dark:text-white/10"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-blue-600 dark:text-blue-500 transition-all duration-500 ease-out"
              strokeDasharray={`${percentage}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-base font-bold font-mono">{percentage.toFixed(1)}%</span>
          </div>
        </div>

        {/* Text Status & Granular Image Counts */}
        <div className="flex-1 space-y-2.5 w-full">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold flex items-center gap-1.5 truncate">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse shrink-0" />
              <span className="truncate">{statusText}</span>
            </span>
            <span className="text-[10px] font-mono font-semibold bg-blue-600/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded border border-blue-600/20 shrink-0">
              {downloadedImages} / {totalImages} Images
            </span>
          </div>

          {/* Granular Progress Bar */}
          <div className="w-full h-2 bg-black/10 dark:bg-black/40 rounded-full overflow-hidden border border-black/5 dark:border-white/10">
            <div
              className="h-full bg-blue-600 transition-all duration-300 rounded-full"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[10px] opacity-60">
            <span>Chapter: <strong className="font-semibold">{currentChapter} of {totalChapters}</strong></span>
            <span>Chapter Images: <strong className="font-semibold">{currentImage} / {chapterTotalImages}</strong></span>
          </div>
        </div>
      </div>

      {/* Active Worker Pool Visualizer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="flex items-center gap-1.5 opacity-80">
            <Microchip className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Active Worker Pool ({activeWorkers.length} Goroutines)
          </span>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal flex items-center gap-1">
            <Zap className="w-3 h-3" /> Concurrent Direct Streaming
          </span>
        </div>

        {/* Grid Cards of Worker Threads */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {activeWorkers.map((worker) => {
            const prog = worker.progress || 0;
            return (
              <div
                key={worker.id}
                className={`p-3 rounded-xl border text-xs transition-all space-y-1.5 ${
                  worker.active
                    ? 'bg-blue-600/10 border-blue-500/50 text-blue-600 dark:text-blue-100 worker-active shadow-md'
                    : 'bg-black/[0.02] dark:bg-white/[0.02] border-[var(--border-color)] opacity-40'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-[10px] font-mono truncate">Worker #{worker.id}</span>
                  {worker.active ? (
                    <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">
                      {prog.toFixed(0)}%
                    </span>
                  ) : (
                    <CheckCircle className="w-3 h-3 opacity-30 shrink-0" />
                  )}
                </div>

                {/* Individual Worker Mini Progress Bar */}
                {worker.active && (
                  <div className="w-full h-1 bg-black/10 dark:bg-black/50 rounded-full overflow-hidden border border-black/5 dark:border-white/10">
                    <div
                      className="h-full bg-blue-600 transition-all duration-200 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, prog))}%` }}
                    ></div>
                  </div>
                )}

                <p className="text-[9px] truncate opacity-60 font-mono" title={worker.status}>
                  {worker.active ? (worker.status || 'Active') : 'Waiting'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
