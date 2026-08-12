import React from 'react';
import { PlaySolid, SquareSolid, Search, Microchip, ImageRectangle, LayersTwo, CheckCircle } from '@mynaui/icons-react';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Dropdown from './ui/Dropdown';

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
          <Button
            variant="primary"
            size="sm"
            onClick={onCheckInfo}
            loading={checkingInfo}
            disabled={checkingInfo || isDownloading || !comicUrl}
            icon={Search}
            className="!h-8 shrink-0"
          >
            {checkingInfo ? 'Checking...' : 'Fetch Info'}
          </Button>
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
          <Badge variant="emerald" icon={CheckCircle} className="shrink-0">
            Validated
          </Badge>
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
              <Button
                key={fmt}
                variant={selectedFormat === fmt ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedFormat(fmt)}
                className="flex-1 !h-7 !px-1"
              >
                {fmt}
              </Button>
            ))}
          </div>
        </div>

        {/* Worker Performance */}
        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-widest opacity-60 flex items-center gap-1.5">
            <Microchip className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Worker Profile
          </label>
          <Dropdown
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
          <Button
            variant="danger"
            onClick={onCancelDownload}
            icon={SquareSolid}
            className="!px-5 !py-2"
          >
            Stop Download
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={onStartDownload}
            disabled={!webtoonInfo || checkingInfo}
            icon={PlaySolid}
            className="!px-6 !py-2"
          >
            Start Download
          </Button>
        )}
      </div>
    </div>
  );
}
