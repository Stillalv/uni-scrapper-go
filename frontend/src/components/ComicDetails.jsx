import React from 'react';
import { createPortal } from 'react-dom';
import { PlaySolid, SquareSolid, Search, Microchip, ImageRectangle, LayersTwo, CheckCircle, ChevronDown, X, BookOpen } from '@mynaui/icons-react';
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
    { label: '20 Workers (High Speed)', value: 20 },
    { label: '32 Workers (Ultra Speed)', value: 32 },
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
    <div className="glass-card rounded-2xl p-5 space-y-4 shadow-sm border border-[var(--border-color)] select-none">
      {/* URL Input & Fetch Omnibox */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted-custom)] flex items-center justify-between">
          <span>Webtoon URL or Title ID</span>
          <span className="opacity-60 normal-case tracking-normal">e.g. 9523 or full webtoon URL</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={comicUrl}
            onChange={(e) => setComicUrl(e.target.value)}
            placeholder="Paste Webtoon URL or enter Title ID..."
            className="flex-1 h-8.5 px-3 text-xs rounded-lg glass-input font-mono min-w-0"
          />
          <Button
            variant="primary"
            size="md"
            onClick={onCheckInfo}
            loading={checkingInfo}
            disabled={checkingInfo || isDownloading || !comicUrl}
            icon={Search}
            className="!h-8.5 shrink-0"
          >
            {checkingInfo ? 'Checking...' : 'Fetch Info'}
          </Button>
        </div>
      </div>

      {/* Metadata Banner */}
      {webtoonInfo && (
        <div className="p-3 rounded-xl bg-[var(--btn-secondary-bg)] border border-[var(--border-color)] flex items-center justify-between gap-3 animate-slide-up">
          <div className="space-y-0.5 min-w-0">
            <div className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-2">
              <LayersTwo className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span className="truncate">{webtoonInfo.Title}</span>
            </div>
            <div className="text-[11px] text-[var(--text-sub)] flex items-center gap-2 flex-wrap">
              <span>Lang: <strong className="uppercase font-semibold text-[var(--text-main)]">{webtoonInfo.Lang}</strong></span>
              <span className="opacity-30">•</span>
              <span>Genre: <strong className="capitalize font-semibold text-[var(--text-main)]">{webtoonInfo.Genre}</strong></span>
              <span className="opacity-30">•</span>
              <span>Total: <strong className="text-[var(--accent)] font-semibold">{webtoonInfo.TotalEpisodes} Chapters</strong></span>
            </div>
          </div>
          <Badge variant="emerald" icon={CheckCircle} className="shrink-0">
            Ready
          </Badge>
        </div>
      )}

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Format Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted-custom)] flex items-center gap-1.5">
            <ImageRectangle className="w-3.5 h-3.5 text-[var(--accent)]" /> Image Format
          </label>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--btn-secondary-bg)] border border-[var(--border-color)]">
            {formats.map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setSelectedFormat(fmt)}
                className={`flex-1 h-7 rounded-md text-xs font-medium transition-all ${
                  selectedFormat === fmt
                    ? 'bg-[var(--accent)] text-white shadow-sm font-semibold'
                    : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Worker Performance */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted-custom)] flex items-center gap-1.5">
            <Microchip className="w-3.5 h-3.5 text-[var(--accent)]" /> Worker Concurrency
          </label>
          <Dropdown
            value={selectedWorkers}
            onChange={(v) => setSelectedWorkers(Number(v))}
            options={workerOptions}
          />
        </div>

        {/* Chapter Selection Trigger */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted-custom)] flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" /> Chapter Range
          </label>
          <button
            type="button"
            onClick={() => setShowChapterSelection(true)}
            disabled={!episodes.length}
            className="w-full h-8 flex items-center justify-between gap-2 px-3 text-xs rounded-lg font-medium transition-all border select-none
              bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-main)]
              hover:border-[var(--border-hover)] disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="truncate text-left">
              {episodes.length ? `${selectedCount} of ${episodes.length} chapters` : 'Fetch info first'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[var(--text-sub)]" />
          </button>
        </div>
      </div>

      {/* Chapter Selection Modal */}
      {showChapterSelection && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chapter-selection-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowChapterSelection(false);
          }}
        >
          <div className="w-full max-w-2xl max-h-[calc(100vh-6rem)] glass-panel rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden animate-slide-up">
            <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between gap-3">
              <div>
                <h2 id="chapter-selection-title" className="text-xs font-semibold text-[var(--text-main)]">Select Chapters</h2>
                <p className="text-[11px] text-[var(--text-sub)]">Choose specific chapters or use smart range expressions.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowChapterSelection(false)}
                className="p-1 rounded-lg text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--btn-secondary-bg)] transition-colors"
                aria-label="Close chapter selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2 p-3 border-b border-[var(--border-color)] bg-[var(--btn-secondary-bg)]">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="search"
                  value={chapterFilter}
                  onChange={(e) => setChapterFilter(e.target.value)}
                  placeholder="Filter chapters by title or number..."
                  className="flex-1 h-8 px-3 text-xs rounded-lg glass-input"
                />
                <div className="flex gap-1.5">
                  <Button
                    variant={allSelected ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={selectAllChapters}
                    disabled={!episodes.length || allSelected}
                    className="!h-8"
                  >
                    Select all
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={clearChapters}
                    disabled={!selectedCount}
                    className="!h-8"
                  >
                    Clear
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
                  placeholder="Smart range: 1-10, 15, 20"
                  className="flex-1 h-8 px-3 text-xs rounded-lg glass-input font-mono"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={applySmartSelection}
                  className="!h-8"
                >
                  Apply
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
              {visibleEpisodes.map((episode) => {
                const checked = selectedChapterNos.includes(episode.episode_no);
                return (
                  <label
                    key={episode.episode_no}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                        : 'hover:bg-[var(--btn-secondary-bg)] text-[var(--text-main)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChapter(episode.episode_no)}
                      className="accent-[var(--accent)] rounded"
                    />
                    <span className="font-mono text-[11px] font-semibold">{episode.ch_num || String(episode.episode_no).padStart(3, '0')}</span>
                    <span className="truncate text-[11px] opacity-80">{episode.title || 'Untitled'}</span>
                  </label>
                );
              })}
              {!visibleEpisodes.length && (
                <div className="col-span-full py-8 text-center text-xs text-[var(--text-muted-custom)]">
                  {episodes.length ? 'No chapters match your search filter.' : 'Fetch comic info to load chapters.'}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-[var(--border-color)] flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--text-sub)]">{selectedCount} of {episodes.length} chapters selected</span>
              <Button variant="primary" size="sm" onClick={() => setShowChapterSelection(false)} className="!h-8">
                Done
              </Button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Action CTA Button */}
      <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border-color)]">
        {isDownloading ? (
          <Button
            variant="danger"
            size="md"
            onClick={onCancelDownload}
            icon={SquareSolid}
            className="!px-5 !h-9"
          >
            Stop Download
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={onStartDownload}
            disabled={!webtoonInfo || checkingInfo}
            icon={PlaySolid}
            className="!px-6 !h-9"
          >
            Start Download
          </Button>
        )}
      </div>
    </div>
  );
}
