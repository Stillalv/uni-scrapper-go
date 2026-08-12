import React, { useState } from 'react';
import { Search, Refresh, BookOpen, LayoutDashboard, List, ArrowRight, Heart } from '@mynaui/icons-react';

export default function CatalogView({
  catalog,
  loadingCatalog,
  selectedLang,
  selectedSource = 'webtoon',
  onChangeSource,
  onChangeLang,
  onReloadCatalog,
  selectedComic,
  onSelectComic,
  onNavigateScraper,
  bookmarks = [],
  onToggleBookmark
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const isBookmarked = (comic) => {
    if (!comic) return false;
    const comicID = String(comic.id || comic.title_no || comic.url);
    return bookmarks.some((b) => String(b.id || b.title_no || b.url) === comicID);
  };

  const filteredCatalog = (catalog || []).filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const comicID = String(c.id || c.title_no || '');
    const title = String(c.title || '').toLowerCase();
    const genre = String(c.genre || '').toLowerCase();
    const author = String(c.author || '').toLowerCase();
    return (
      title.includes(q) ||
      comicID.includes(q) ||
      genre.includes(q) ||
      author.includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2 select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <BookOpen className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Comic Catalog ({selectedSource === 'mangaplus_id' ? 'MANGA Plus Indonesia' : 'LINE Webtoon'})</h2>
            <p className="text-xs opacity-60 mt-0.5">Browse and pick your favorite comics ({catalog.length} comics registered).</p>
          </div>
        </div>

        {/* Language & Source Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border-color)] text-xs">
            <button
              onClick={() => onChangeSource ? onChangeSource('webtoon', 'id') : onChangeLang('id')}
              className={`h-7 px-2.5 rounded-md font-semibold transition-all ${
                selectedSource === 'webtoon' && selectedLang === 'id' ? 'bg-blue-600 text-white shadow-sm' : 'opacity-60 hover:opacity-100'
              }`}
            >
              🇮🇩 Webtoon (ID)
            </button>
            <button
              onClick={() => onChangeSource ? onChangeSource('mangaplus_id', 'id') : null}
              className={`h-7 px-2.5 rounded-md font-semibold transition-all ${
                selectedSource === 'mangaplus_id' ? 'bg-red-600 text-white shadow-sm' : 'opacity-60 hover:opacity-100'
              }`}
            >
              🔴 MANGA Plus (ID)
            </button>
            <button
              onClick={() => onChangeSource ? onChangeSource('webtoon', 'en') : onChangeLang('en')}
              className={`h-7 px-2.5 rounded-md font-semibold transition-all ${
                selectedSource === 'webtoon' && selectedLang === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'opacity-60 hover:opacity-100'
              }`}
            >
              🇬🇧 Webtoon (EN)
            </button>
          </div>

          <button
            onClick={() => onReloadCatalog(true)}
            disabled={loadingCatalog}
            className="h-8 w-8 flex items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 opacity-80 border border-[var(--border-color)] transition-all disabled:opacity-50 active:scale-95"
            title="Reload Catalog"
          >
            <Refresh className={`w-3.5 h-3.5 ${loadingCatalog ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
          </button>

          <div className="h-4 w-px bg-[var(--border-color)]"></div>

          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border-color)]">
            <button
              onClick={() => setViewMode('grid')}
              className={`h-7 w-7 flex items-center justify-center rounded-md transition-all ${
                viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'opacity-40 hover:opacity-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`h-7 w-7 flex items-center justify-center rounded-md transition-all ${
                viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'opacity-40 hover:opacity-100'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${catalog.length} comics by title, ID, genre, or author...`}
          className="w-full h-10 pl-10 pr-4 rounded-xl glass-input text-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100 font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* Catalog Content Area */}
      {loadingCatalog ? (
        <div className="p-16 text-center space-y-4 glass-card rounded-2xl border border-[var(--border-color)]">
          <Refresh className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto opacity-80" />
          <p className="text-xs opacity-60">Loading official comic catalog...</p>
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className="p-16 text-center text-xs opacity-50 space-y-2 glass-card rounded-2xl border border-[var(--border-color)]">
          <p>No comics match your search "{searchQuery}".</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredCatalog.map((comic) => {
            const comicID = comic.id || comic.title_no;
            const isSelected = selectedComic && (selectedComic.id === comicID || selectedComic.title_no === comicID);
            const bookmarked = isBookmarked(comic);

            return (
              <div
                key={comicID}
                onClick={() => {
                  onSelectComic(comic);
                  onNavigateScraper();
                }}
                className={`p-2 rounded-xl glass-card border transition-all cursor-pointer flex flex-col justify-between group hover:scale-[1.02] hover:shadow-xl relative ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600/10 shadow-md ring-1 ring-blue-500/50'
                    : 'border-[var(--border-color)] hover:border-blue-500/40'
                }`}
              >
                <div>
                  {/* Poster Cover Container */}
                  <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-black/30 mb-2 group/cover border border-white/5">
                    {comic.cover_url ? (
                      <img
                        src={`/api/proxy-image?url=${encodeURIComponent(comic.cover_url)}`}
                        alt={comic.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center opacity-40">
                        <BookOpen className="w-6 h-6 mb-1" />
                        <span className="text-[9px] uppercase tracking-wider font-semibold">{comic.genre || 'Webtoon'}</span>
                      </div>
                    )}

                    {/* Bookmark Toggle Button Overlay */}
                    {onToggleBookmark && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(comic);
                        }}
                        title={bookmarked ? 'Remove Bookmark' : 'Add to Bookmarks'}
                        className={`absolute top-1.5 right-1.5 z-20 p-1.5 rounded-full backdrop-blur-md transition-all shadow-md active:scale-95 ${
                          bookmarked
                            ? 'bg-pink-600 text-white'
                            : 'bg-black/60 text-white/70 hover:text-white hover:bg-black/90'
                        }`}
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}

                    <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-white font-semibold uppercase tracking-wider border border-white/10 truncate max-w-[65%]">
                        {comic.genre || 'DRAMA'}
                      </span>
                    </div>
                  </div>

                  {/* Title & Author below poster */}
                  <div className="px-0.5">
                    <h3 className="text-xs font-bold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight" title={comic.title}>
                      {comic.title}
                    </h3>
                    {comic.author && (
                      <p className="text-[10px] opacity-60 truncate mt-0.5">{comic.author}</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform px-0.5">
                  <span>Select</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCatalog.map((comic) => {
            const comicID = comic.id || comic.title_no;
            const isSelected = selectedComic && (selectedComic.id === comicID || selectedComic.title_no === comicID);
            const bookmarked = isBookmarked(comic);

            return (
              <div
                key={comicID}
                onClick={() => {
                  onSelectComic(comic);
                  onNavigateScraper();
                }}
                className={`px-3 py-2 rounded-xl glass-card border transition-all cursor-pointer flex items-center justify-between group hover:border-blue-500/40 ${
                  isSelected ? 'border-blue-600 bg-blue-600/10' : 'border-[var(--border-color)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-12 rounded-md overflow-hidden bg-black/30 shrink-0 border border-white/10 relative">
                    {comic.cover_url ? (
                      <img
                        src={`/api/proxy-image?url=${encodeURIComponent(comic.cover_url)}`}
                        alt={comic.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-30">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={comic.title}>
                        {comic.title}
                      </h3>
                      <span className="text-[9px] font-mono opacity-50 shrink-0">#{comicID}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] opacity-60 mt-0.5">
                      <span>{comic.genre || 'Webtoon'}</span>
                      {comic.author && <span>• {comic.author}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onToggleBookmark && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(comic);
                      }}
                      title={bookmarked ? 'Remove Bookmark' : 'Add to Bookmarks'}
                      className={`p-1.5 rounded-lg transition-all ${
                        bookmarked
                          ? 'bg-pink-600 text-white'
                          : 'bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}

                  <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Select</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
