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
  selectedChapterNos,
  setSelectedChapterNos,
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
  const episodes = webtoonInfo?.Episodes || [];
  const [chapterFilter, setChapterFilter] = React.useState('');
  const visibleEpisodes = episodes.filter((episode) => {
    const search = chapterFilter.trim().toLowerCase();
    if (!search) return true;
    return `${episode.ch_num || ''} ${episode.title || ''}`.toLowerCase().includes(search);
  });
  const selectedCount = selectedChapterNos.length;
  const allSelected = episodes.length > 0 && selectedCount === episodes.length;

  const selectAllChapters = () => {
    setSelectedChapterNos(episodes.map((episode) => episode.episode_no));
  };

  const clearChapters = () => {
    setSelectedChapterNos([]);
  };

  const toggleChapter = (episodeNo) => {
    setSelectedChapterNos((current) => current.includes(episodeNo)
      ? current.filter((number) => number !== episodeNo)
      : [...current, episodeNo]);
  };

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

        {/* Interactive Chapter Selection */}
        <div className="md:col-span-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-[10px] font-semibold uppercase tracking-widest opacity-60">
              Chapter Selection
            </label>
            <span className="text-[10px] opacity-50">
              {selectedCount} of {episodes.length || 0} selected
            </span>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-black/[0.02] dark:bg-white/[0.03] overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-2 p-2 border-b border-[var(--border-color)]">
              <input
                type="search"
                value={chapterFilter}
                onChange={(e) => setChapterFilter(e.target.value)}
                placeholder={episodes.length ? 'Search chapters...' : 'Fetch comic info to load chapters'}
                disabled={!episodes.length}
                className="flex-1 h-8 px-3 text-xs rounded-lg glass-input"
              />
              <div className="flex gap-1.5">
                <Button
                  variant={allSelected ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={selectAllChapters}
                  disabled={!episodes.length || allSelected}
                  className="!h-8"
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChapters}
                  disabled={!selectedCount}
                  className="!h-8"
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
              {visibleEpisodes.map((episode) => {
                const checked = selectedChapterNos.includes(episode.episode_no);
                return (
                  <label
                    key={episode.episode_no}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs cursor-pointer transition-colors ${checked ? 'bg-blue-600/10 text-blue-700 dark:text-blue-300' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChapter(episode.episode_no)}
                      className="accent-blue-600"
                    />
                    <span className="font-mono font-semibold">{episode.ch_num || String(episode.episode_no).padStart(3, '0')}</span>
                    <span className="truncate opacity-75">{episode.title || 'Untitled chapter'}</span>
                  </label>
                );
              })}
              {!visibleEpisodes.length && (
                <div className="col-span-full py-5 text-center text-xs opacity-50">
                  {episodes.length ? 'No chapters match your search.' : 'Fetch comic info to load chapters.'}
                </div>
              )}
            </div>
          </div>
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
