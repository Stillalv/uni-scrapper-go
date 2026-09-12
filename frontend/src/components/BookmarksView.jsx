import React, { useState } from 'react';
import { Heart, BookOpen, Trash, Search, LayersTwo, Filter } from '@mynaui/icons-react';
import webtoonLogo from '../assets/logo/WEBTOON_Logo.png';
import mangaplusLogo from '../assets/logo/mangaplus.png';
import Button from './ui/Button';
import Badge from './ui/Badge';

export default function BookmarksView({
  bookmarks = [],
  onRemoveBookmark,
  onSelectComic,
  onNavigateCatalog,
  onNavigateScraper
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCatalogFilter, setActiveCatalogFilter] = useState('all');

  const catalogOptions = [
    { id: 'all', label: 'All Catalogs' },
    { id: 'webtoon_id', label: 'Webtoon (ID)', flag: 'fi-id' },
    { id: 'webtoon_en', label: 'Webtoon (EN)', flag: 'fi-gb' },
    { id: 'naver_ko', label: 'Naver (KO)', flag: 'fi-kr' },
    { id: 'mangaplus_id', label: 'MANGA Plus (ID)', flag: 'fi-id' },
  ];

  const getCatalogCount = (catId) => {
    if (catId === 'all') return bookmarks.length;
    return bookmarks.filter((b) => (b.source || 'webtoon_id') === catId).length;
  };

  const filteredBookmarks = bookmarks.filter((comic) => {
    const matchesCatalog =
      activeCatalogFilter === 'all' || (comic.source || 'webtoon_id') === activeCatalogFilter;
    const matchesSearch =
      !searchTerm ||
      (comic.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (comic.genre || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCatalog && matchesSearch;
  });

  return (
    <div className="space-y-5 max-w-6xl mx-auto select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-[var(--text-main)]">Bookmarked Comics</h1>
            <p className="text-xs text-[var(--text-sub)]">Your saved collection across all comic providers</p>
          </div>
        </div>

        {/* Search Bar & Total Counter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted-custom)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-8 pl-9 pr-3 rounded-lg text-xs glass-input focus:outline-none"
            />
          </div>
          <Badge variant="rose" className="shrink-0">
            {bookmarks.length} saved
          </Badge>
        </div>
      </div>

      {/* Catalog Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-xs text-[var(--text-muted-custom)] font-medium flex items-center gap-1 shrink-0 mr-1">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {catalogOptions.map((cat) => {
          const count = getCatalogCount(cat.id);
          const isActive = activeCatalogFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCatalogFilter(cat.id)}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 select-none border ${
                isActive
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm font-semibold'
                  : 'bg-[var(--btn-secondary-bg)] border-[var(--border-color)] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--btn-secondary-hover)]'
              }`}
            >
              {cat.flag && <span className={`fi ${cat.flag} rounded-[2px] w-3 h-2 shrink-0`}></span>}
              <span className="truncate">{cat.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-[var(--text-muted-custom)]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid of Bookmarked Comic Cards */}
      {filteredBookmarks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredBookmarks.map((comic) => {
            const isMangaPlus = comic.source === 'mangaplus_id';
            const isNaver = comic.source === 'naver_ko' || comic.source === 'naver';
            const sourceLogo = isMangaPlus ? mangaplusLogo : webtoonLogo;
            const flagClass =
              comic.source === 'webtoon_en'
                ? 'fi-gb'
                : isNaver
                ? 'fi-kr'
                : 'fi-id';
            const sourceLabel = isMangaPlus
              ? 'MANGA Plus (ID)'
              : comic.source === 'webtoon_en'
              ? 'Webtoon (EN)'
              : isNaver
              ? 'Naver (KO)'
              : 'Webtoon (ID)';

            return (
              <div
                key={comic.id || comic.title_no || comic.url}
                className="glass-card rounded-xl p-3 border border-[var(--border-color)] hover:border-[var(--border-hover)] transition-all flex flex-col justify-between group space-y-2.5"
              >
                {/* Cover Image & Info */}
                <div className="flex items-start gap-2.5">
                  <div className="relative w-14 h-18 shrink-0 rounded-lg overflow-hidden bg-[var(--btn-secondary-bg)] border border-[var(--border-color)] flex items-center justify-center">
                    {comic.cover ? (
                      <img
                        src={`/api/proxy-image?url=${encodeURIComponent(comic.cover)}`}
                        alt={comic.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = sourceLogo;
                          e.target.className = 'w-6 h-6 object-contain opacity-40';
                        }}
                      />
                    ) : (
                      <img src={sourceLogo} alt={comic.title} className="w-6 h-6 object-contain opacity-40" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-[10px] text-[var(--text-muted-custom)] truncate flex items-center gap-1">
                      <span className={`fi ${flagClass} rounded-xs shrink-0`}></span>
                      <span className="truncate">{sourceLabel}</span>
                    </div>

                    <h3 className="text-xs font-semibold text-[var(--text-main)] truncate group-hover:text-[var(--accent)] transition-colors leading-tight" title={comic.title}>
                      {comic.title}
                    </h3>

                    <p className="text-[11px] text-[var(--text-sub)] truncate">
                      {comic.genre || 'Comic'}
                    </p>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2 border-t border-[var(--border-color)] flex items-center gap-1.5">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onSelectComic(comic);
                      onNavigateScraper();
                    }}
                    icon={LayersTwo}
                    className="flex-1 !h-7.5"
                  >
                    Select & Download
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onRemoveBookmark(comic)}
                    title="Remove from Bookmarks"
                    icon={Trash}
                    className="!h-7.5 !w-7.5 !px-0"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="glass-card rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
            <Heart className="w-6 h-6 opacity-60" />
          </div>

          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-xs font-semibold text-[var(--text-main)]">No Bookmarks Found</h3>
            <p className="text-xs text-[var(--text-sub)]">
              {searchTerm || activeCatalogFilter !== 'all'
                ? 'No bookmarks match your search filter or catalog selection.'
                : 'You have not added any comics to your bookmarks yet.'}
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={onNavigateCatalog}
            icon={BookOpen}
          >
            Browse Catalog
          </Button>
        </div>
      )}
    </div>
  );
}
