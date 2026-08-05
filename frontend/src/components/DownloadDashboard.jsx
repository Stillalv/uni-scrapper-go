import React from 'react';
import { Cpu, CheckCircle2, Zap, Activity } from 'lucide-react';

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
    <div className="glass-card rounded-xl p-4 space-y-4 border border-black/10 dark:border-white/10 shadow-lg">
      {/* Header Stat Ring & Main Status */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-black/[0.02] dark:bg-white/[0.02] p-4 rounded-xl border border-black/5 dark:border-white/5">
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
        <div className="flex-1 space-y-2 w-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
              {statusText}
            </span>
            <span className="text-xs font-mono font-semibold bg-blue-600/10 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-600/20">
              {downloadedImages} / {totalImages} Total Images
            </span>
          </div>

          {/* Granular Progress Bar */}
          <div className="w-full h-2.5 bg-black/10 dark:bg-black/40 rounded-full overflow-hidden border border-black/5 dark:border-white/10">
            <div
              className="h-full bg-blue-600 transition-all duration-300 rounded-full"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[11px] opacity-60">
            <span>Chapter: <strong>{currentChapter} of {totalChapters}</strong></span>
            <span>Current Chapter Images: <strong>{currentImage} / {chapterTotalImages}</strong></span>
          </div>
        </div>
      </div>

      {/* Active Worker Pool Visualizer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="flex items-center gap-1.5 opacity-80">
            <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Active Worker Pool ({activeWorkers.length} Goroutines):
          </span>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal flex items-center gap-1">
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
                className={`p-2.5 rounded-xl border text-xs transition-all space-y-1.5 ${
                  worker.active
                    ? 'bg-blue-600/10 border-blue-500/50 text-blue-600 dark:text-blue-100 worker-active shadow-md'
                    : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] font-mono">Worker #{worker.id}</span>
                  {worker.active ? (
                    <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                      {prog.toFixed(0)}%
                    </span>
                  ) : (
                    <CheckCircle2 className="w-3 h-3 opacity-30" />
                  )}
                </div>

                {/* Individual Worker Mini Progress Bar */}
                {worker.active && (
                  <div className="w-full h-1 bg-black/10 dark:bg-black/50 rounded-full overflow-hidden border border-black/5 dark:border-white/10">
                    <div
                      className="h-full bg-blue-600 transition-all duration-200"
                      style={{ width: `${Math.min(100, Math.max(0, prog))}%` }}
                    ></div>
                  </div>
                )}

                <p className="text-[10px] truncate opacity-70 font-mono" title={worker.status}>
                  {worker.active ? (worker.status || 'Active') : 'Waiting...'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
