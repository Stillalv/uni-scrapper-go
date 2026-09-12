import React, { useState } from 'react';
import { Search, Refresh, BookOpen, LayoutDashboard, List, ArrowRight, Heart } from '@mynaui/icons-react';
import webtoonLogo from '../assets/logo/WEBTOON_Logo.png';
import mangaplusLogo from '../assets/logo/mangaplus.png';
import Button from './ui/Button';

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

  const activeLogo = selectedSource === 'mangaplus_id' ? mangaplusLogo : webtoonLogo;

  const sources = [
    { source: 'webtoon', lang: 'id', label: 'Webtoon (ID)', flag: 'fi-id', logo: webtoonLogo },
    { source: 'webtoon', lang: 'en', label: 'Webtoon (EN)', flag: 'fi-gb', logo: webtoonLogo },
    { source: 'naver_ko', lang: 'ko', label: 'Naver (KO)', flag: 'fi-kr', logo: webtoonLogo },
    { source: 'mangaplus_id', lang: 'id', label: 'MANGA Plus (ID)', flag: 'fi-id', logo: mangaplusLogo },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto select-none">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] p-1.5 flex items-center justify-center shrink-0 shadow-sm">
            <img src={activeLogo} alt="Catalog Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-[var(--text-main)]">
              Comic Catalog ({
                selectedSource === 'mangaplus_id'
                  ? 'MANGA Plus Indonesia'
                  : selectedSource === 'naver_ko'
                  ? 'Naver Webtoon Korea'
                  : selectedLang === 'en'
                  ? 'LINE Webtoon English'
                  : 'LINE Webtoon Indonesia'
              })
            </h2>
            <p className="text-xs text-[var(--text-sub)] mt-0.5">
              Browse and pick your favorite comics ({catalog.length} titles available).
            </p>
          </div>
        </div>

        {/* Language & Source Tabs */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--btn-secondary-bg)] border border-[var(--border-color)] text-xs">
            {sources.map((s) => {
              const isActive = selectedSource === s.source && (s.source !== 'webtoon' || selectedLang === s.lang);
              return (
                <button
                  key={`${s.source}-${s.lang}`}
                  type="button"
                  onClick={() => onChangeSource ? onChangeSource(s.source, s.lang) : onChangeLang(s.lang)}
                  className={`h-7.5 px-2.5 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 select-none ${
                    isActive
                      ? 'bg-[var(--accent)] text-white shadow-sm font-semibold'
                      : 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--btn-secondary-hover)]'
                  }`}
                >
                  <span className={`fi ${s.flag} rounded-[2px] w-3.5 h-2.5 shrink-0`}></span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onReloadCatalog(true)}
            disabled={loadingCatalog}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-[var(--btn-secondary-bg)] hover:bg-[var(--btn-secondary-hover)] text-[var(--text-sub)] hover:text-[var(--text-main)] border border-[var(--border-color)] transition-all disabled:opacity-50 active:scale-95 shrink-0"
            title="Reload Catalog"
          >
            <Refresh className={`w-4 h-4 ${loadingCatalog ? 'animate-spin text-[var(--accent)]' : ''}`} />
          </button>

          <div className="h-4 w-px bg-[var(--border-color)]"></div>

          <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-[var(--btn-secondary-bg)] border border-[var(--border-color)] shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
              title="Grid View"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted-custom)] pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${catalog.length} comics by title, ID, genre, or author...`}
          className="w-full h-9 pl-10 pr-8 rounded-xl glass-input text-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted-custom)] hover:text-[var(--text-main)] font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* Catalog Content Area */}
      {loadingCatalog ? (
        <div className="p-16 text-center space-y-3 glass-card rounded-2xl">
          <Refresh className="w-7 h-7 animate-spin text-[var(--accent)] mx-auto opacity-80" />
          <p className="text-xs text-[var(--text-sub)]">Loading official comic catalog...</p>
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className="p-16 text-center text-xs text-[var(--text-muted-custom)] space-y-2 glass-card rounded-2xl">
          <p>No comics match your search "{searchQuery}".</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredCatalog.map((comic) => {
            const comicID = comic.id || comic.title_no;
            const isSelected = selectedComic && (selectedComic.id === comicID || selectedComic.title_no === comicID);
            const bookmarked = isBookmarked(comic);
            const displayGenre = (comic.genre || 'COMIC').replace(/^MANGA PLUS.*$/i, 'MANGA');

            return (
              <div
                key={comicID}
                onClick={() => {
                  onSelectComic(comic);
                  onNavigateScraper();
                }}
                className={`p-2 rounded-xl glass-card transition-all duration-200 cursor-pointer flex flex-col justify-between group hover:-translate-y-0.5 hover:shadow-lg relative ${
                  isSelected
                    ? 'border-[var(--accent)] ring-1 ring-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'hover:border-[var(--border-hover)]'
                }`}
              >
                <div>
                  {/* Poster Cover Container */}
                  <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-[var(--btn-secondary-bg)] mb-2 group/cover">
                    {comic.cover_url ? (
                      <img
                        src={`/api/proxy-image?url=${encodeURIComponent(comic.cover_url)}`}
                        alt={comic.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = activeLogo;
                          e.target.className = 'w-full h-full object-contain p-4 opacity-40';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center opacity-40">
                        <img src={activeLogo} alt={comic.title} className="w-8 h-8 object-contain mb-1" />
                        <span className="text-[9px] uppercase tracking-wider font-semibold">{displayGenre}</span>
                      </div>
                    )}

                    {/* Bookmark Toggle Button Overlay */}
                    {onToggleBookmark && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(comic);
                        }}
                        title={bookmarked ? 'Remove Bookmark' : 'Add to Bookmarks'}
                        className={`absolute top-1.5 right-1.5 z-20 p-1.5 rounded-full backdrop-blur-md transition-all active:scale-95 shadow-sm ${
                          bookmarked
                            ? 'bg-rose-600 text-white'
                            : 'bg-black/40 text-white/80 hover:text-white hover:bg-black/60'
                        }`}
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}
                  </div>

                  {/* Title, Author & Genre */}
                  <div className="px-0.5 space-y-0.5">
                    <h3 className="text-xs font-semibold text-[var(--text-main)] truncate group-hover:text-[var(--accent)] transition-colors leading-tight" title={comic.title}>
                      {comic.title}
                    </h3>
                    <p className="text-[11px] text-[var(--text-sub)] truncate">
                      {comic.author ? `${comic.author} • ${displayGenre}` : displayGenre}
                    </p>
                  </div>
                </div>

                <div className="pt-2 mt-1.5 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-[var(--accent)] font-medium px-0.5">
                  <span>Select</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
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
                className={`px-3 py-2 rounded-xl glass-card transition-all cursor-pointer flex items-center justify-between group hover:border-[var(--border-hover)] ${
                  isSelected ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-10 rounded-md overflow-hidden bg-[var(--btn-secondary-bg)] shrink-0 border border-[var(--border-color)]">
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
                      <h3 className="text-xs font-semibold text-[var(--text-main)] truncate group-hover:text-[var(--accent)] transition-colors" title={comic.title}>
                        {comic.title}
                      </h3>
                      <span className="text-[10px] font-mono text-[var(--text-muted-custom)] shrink-0">#{comicID}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-sub)] mt-0.5">
                      <span>{comic.genre || 'Webtoon'}</span>
                      {comic.author && <span>• {comic.author}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onToggleBookmark && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(comic);
                      }}
                      title={bookmarked ? 'Remove Bookmark' : 'Add to Bookmarks'}
                      className={`p-1.5 rounded-lg transition-all ${
                        bookmarked
                          ? 'bg-rose-600 text-white'
                          : 'text-[var(--text-sub)] hover:text-rose-500 hover:bg-[var(--btn-secondary-bg)]'
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}

                  <div className="text-xs text-[var(--accent)] font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
