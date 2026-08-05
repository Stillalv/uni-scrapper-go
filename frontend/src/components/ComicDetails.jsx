import React from 'react';
import { Play, Square, Search, Cpu, FileImage, Layers, CheckCircle } from 'lucide-react';

export default function ComicDetails({
  comicUrl,
  setComicUrl,
  webtoonInfo,
  onCheckInfo,
  checkingInfo,
  selectedFormat,
  setSelectedFormat,
  selectedWorkers,
  setSelectedWorkers,
  outputDir,
  onSelectFolder,
  chapterRange,
  setChapterRange,
  isDownloading,
  onStartDownload,
  onCancelDownload
}) {
  const formats = ['WEBP', 'JPEG', 'PNG'];
  const workerOptions = [
    { label: '6 Workers (Standard)', value: 6 },
    { label: '8 Workers (Balanced)', value: 8 },
    { label: '20 Workers (High Speed - 100 Mbps+)', value: 20 },
    { label: '32 Workers (Ultra Speed - 200 Mbps+)', value: 32 },
  ];

  return (
    <div className="glass-card rounded-xl p-4 space-y-4 shadow-lg border border-black/10 dark:border-white/10 select-none">
      {/* Top Section: URL Input & Fetch Button */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold flex items-center justify-between">
          <span>Webtoon URL or Title ID:</span>
          <span className="text-[11px] opacity-50 font-normal">e.g. 9523 or https://www.webtoons.com/...</span>
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={comicUrl}
              onChange={(e) => setComicUrl(e.target.value)}
              placeholder="Enter Webtoon URL or Title ID..."
              className="w-full pl-3 pr-3 py-2 text-xs rounded-lg glass-input font-mono"
            />
          </div>
          <button
            onClick={onCheckInfo}
            disabled={checkingInfo || isDownloading || !comicUrl}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 active:scale-95 shrink-0"
          >
            <Search className={`w-3.5 h-3.5 ${checkingInfo ? 'animate-spin' : ''}`} />
            {checkingInfo ? 'Checking...' : 'Fetch Info'}
          </button>
        </div>
      </div>

      {/* Metadata Display */}
      {webtoonInfo && (
        <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {webtoonInfo.Title}
            </div>
            <div className="text-xs opacity-70 flex items-center gap-3">
              <span>Language: <strong className="uppercase">{webtoonInfo.Lang}</strong></span>
              <span>Genre: <strong className="capitalize">{webtoonInfo.Genre}</strong></span>
              <span>Total: <strong className="text-blue-600 dark:text-blue-400 font-bold">{webtoonInfo.TotalEpisodes} Chapters</strong> ({webtoonInfo.EpisodeRange})</span>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-300 font-semibold border border-blue-500/20 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Validated
          </span>
        </div>
      )}

      {/* Grid Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {/* Format Pills */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold flex items-center gap-1">
            <FileImage className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Image Format:
          </label>
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
            {formats.map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`flex-1 py-1 text-xs rounded-md font-medium transition-all ${
                  selectedFormat === fmt
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Worker Performance */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Worker Profile:
          </label>
          <select
            value={selectedWorkers}
            onChange={(e) => setSelectedWorkers(Number(e.target.value))}
            className="w-full py-1.5 px-3 text-xs rounded-lg glass-input font-medium cursor-pointer"
          >
            {workerOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Chapter Selection Range */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold flex items-center justify-between">
            <span>Chapter Range:</span>
            <span className="text-[10px] opacity-50">e.g. 'all', '1-10', '1,3'</span>
          </label>
          <input
            type="text"
            value={chapterRange}
            onChange={(e) => setChapterRange(e.target.value)}
            placeholder="all, 1-10, 20-"
            className="w-full px-3 py-1.5 text-xs rounded-lg glass-input font-mono"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center justify-end gap-2 border-t border-black/5 dark:border-white/5">
        {isDownloading ? (
          <button
            onClick={onCancelDownload}
            className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs border border-rose-500/30 transition-all flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Square className="w-3.5 h-3.5 fill-current" /> Stop Download
          </button>
        ) : (
          <button
            onClick={onStartDownload}
            disabled={!webtoonInfo || checkingInfo}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs border border-blue-500/30 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Start Download
          </button>
        )}
      </div>
    </div>
  );
}
