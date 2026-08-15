import React from 'react';
import { createPortal } from 'react-dom';
import { PlaySolid, SquareSolid, Search, Microchip, ImageRectangle, LayersTwo, CheckCircle, ChevronDown, X } from '@mynaui/icons-react';
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
  const [showChapterSelection, setShowChapterSelection] = React.useState(false);
  const [smartSelection, setSmartSelection] = React.useState('');
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

  const parseSmartSelection = (value) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return [];
    if (normalized === 'all') return episodes.map((episode) => episode.episode_no);

    const selected = new Set();
    normalized.split(',').forEach((part) => {
      const token = part.trim();
      if (!token) return;
      const range = token.match(/^(\d+(?:\.\d+)?)[ ]*-[ ]*(\d+(?:\.\d+)?)$/);
      if (range) {
        const start = Number(range[1]);
        const end = Number(range[2]);
        episodes.forEach((episode) => {
          const displayNumber = Number(episode.ch_num || episode.episode_no);
          if (displayNumber >= Math.min(start, end) && displayNumber <= Math.max(start, end)) {
            selected.add(episode.episode_no);
          }
        });
        return;
      }

      const number = Number(token);
      if (!Number.isNaN(number)) {
        episodes.forEach((episode) => {
          const displayNumber = Number(episode.ch_num || episode.episode_no);
          if (episode.episode_no === number || displayNumber === number) {
            selected.add(episode.episode_no);
          }
        });
      }
    });
    return episodes
      .map((episode) => episode.episode_no)
      .filter((episodeNo) => selected.has(episodeNo));
  };

  const applySmartSelection = () => {
    const selected = parseSmartSelection(smartSelection);
    if (selected.length) {
      setSelectedChapterNos(selected);
      return;
    }
    setSelectedChapterNos([]);
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

        {/* Chapter Selection Trigger */}
        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-widest opacity-60">
            Chapter Selection
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChapterSelection(true)}
            disabled={!episodes.length}
            icon={ChevronDown}
            className="w-full !h-8 justify-between"
          >
            <span>{episodes.length ? `${selectedCount} of ${episodes.length} selected` : 'Fetch info first'}</span>
          </Button>
        </div>
      </div>

      {showChapterSelection && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/45 dark:bg-black/65 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chapter-selection-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowChapterSelection(false);
          }}
        >
          <div className="w-full max-w-3xl max-h-[calc(100vh-4rem)] glass-panel rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between gap-3">
              <div>
                <h2 id="chapter-selection-title" className="text-sm font-bold">Chapter Selection</h2>
                <p className="text-[11px] opacity-55 mt-1">Choose the chapters you want to download.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowChapterSelection(false)}
                className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Close chapter selection"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2 p-3 border-b border-[var(--border-color)]">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="search"
                  value={chapterFilter}
                  onChange={(e) => setChapterFilter(e.target.value)}
                  placeholder="Search chapters..."
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
                    Unselect all
                  </Button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={smartSelection}
                  onChange={(e) => setSmartSelection(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applySmartSelection();
                  }}
                  placeholder="Smart Select: 4-10, 12, 000.5"
                  className="flex-1 h-8 px-3 text-xs rounded-lg glass-input font-mono"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={applySmartSelection}
                  className="!h-8"
                >
                  Apply Smart Select
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
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
                <div className="col-span-full py-8 text-center text-xs opacity-50">
                  {episodes.length ? 'No chapters match your search.' : 'Fetch comic info to load chapters.'}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-[var(--border-color)] flex items-center justify-between gap-3">
              <span className="text-xs opacity-60">{selectedCount} of {episodes.length} chapters selected</span>
              <Button variant="primary" size="sm" onClick={() => setShowChapterSelection(false)} className="!h-8">
                Done
              </Button>
            </div>
          </div>
        </div>
      , document.body)}

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
