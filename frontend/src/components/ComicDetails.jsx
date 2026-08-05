import React from 'react';
import { PlaySolid, SquareSolid, Search, Microchip, ImageRectangle, LayersTwo, CheckCircle } from '@mynaui/icons-react';
import AppleSelect from './AppleSelect';

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
    <div className="glass-card rounded-2xl p-5 space-y-5 shadow-lg border border-[var(--border-color)] select-none">
      {/* Top Section: URL Input & Fetch Button */}
      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-widest opacity-60 flex items-center justify-between">
          <span>Webtoon URL or Title ID</span>
          <span className="text-[10px] opacity-40 font-normal normal-case tracking-normal">e.g. 9523 or https://www.webtoons.com/...</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={comicUrl}
            onChange={(e) => setComicUrl(e.target.value)}
            placeholder="Enter Webtoon URL or Title ID..."
            className="flex-1 h-8 px-3 text-xs rounded-lg glass-input font-mono min-w-0"
          />
          <button
            onClick={onCheckInfo}
            disabled={checkingInfo || isDownloading || !comicUrl}
            className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 active:scale-[0.98] shrink-0"
          >
            <Search className={`w-3.5 h-3.5 ${checkingInfo ? 'animate-spin' : ''}`} />
            {checkingInfo ? 'Checking...' : 'Fetch Info'}
          </button>
        </div>
      </div>

      {/* Metadata Display */}
      {webtoonInfo && (
        <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-[var(--border-color)] flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="text-sm font-semibold flex items-center gap-2 tracking-tight">
              <LayersTwo className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate">{webtoonInfo.Title}</span>
            </div>
            <div className="text-xs opacity-60 flex items-center gap-2.5 flex-wrap">
              <span>Language: <strong className="uppercase font-semibold">{webtoonInfo.Lang}</strong></span>
              <span className="opacity-30">•</span>
              <span>Genre: <strong className="capitalize font-semibold">{webtoonInfo.Genre}</strong></span>
              <span className="opacity-30">•</span>
              <span>Total: <strong className="text-blue-600 dark:text-blue-400 font-bold">{webtoonInfo.TotalEpisodes} Chapters</strong> ({webtoonInfo.EpisodeRange})</span>
            </div>
          </div>
          <span className="text-[9px] px-2 py-1 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider border border-blue-500/20 flex items-center gap-1 shrink-0">
            <CheckCircle className="w-3 h-3" /> Validated
          </span>
        </div>
      )}

      {/* Grid Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Format Pills */}
        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-widest opacity-60 flex items-center gap-1.5">
            <ImageRectangle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Image Format
          </label>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border-color)]">
            {formats.map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`flex-1 h-7 px-1 flex items-center justify-center text-xs rounded-md font-semibold transition-all ${
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
        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-widest opacity-60 flex items-center gap-1.5">
            <Microchip className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Worker Profile
          </label>
          <AppleSelect
            value={selectedWorkers}
            onChange={(v) => setSelectedWorkers(Number(v))}
            options={workerOptions}
          />
        </div>

        {/* Chapter Selection Range */}
        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-widest opacity-60 flex items-center justify-between">
            <span>Chapter Range</span>
            <span className="text-[9px] opacity-40 normal-case tracking-normal">all, 1-10, 20-</span>
          </label>
          <input
            type="text"
            value={chapterRange}
            onChange={(e) => setChapterRange(e.target.value)}
            placeholder="e.g. all, 1-10, 20-"
            className="w-full h-8 px-3 text-xs rounded-lg glass-input font-mono"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 flex items-center justify-end gap-2 border-t border-[var(--border-color)]">
        {isDownloading ? (
          <button
            onClick={onCancelDownload}
            className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs border border-rose-500/30 transition-all flex items-center gap-1.5 shadow-md active:scale-[0.98]"
          >
            <SquareSolid className="w-3.5 h-3.5" /> Stop Download
          </button>
        ) : (
          <button
            onClick={onStartDownload}
            disabled={!webtoonInfo || checkingInfo}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs border border-blue-400/20 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 active:scale-[0.98]"
          >
            <PlaySolid className="w-3.5 h-3.5" /> Start Download
          </button>
        )}
      </div>
    </div>
  );
}
