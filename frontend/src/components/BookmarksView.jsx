import React, { useState } from 'react';
import { Heart, BookOpen, Trash, Search, ExternalLink, LayersTwo, Sparkles, Filter } from '@mynaui/icons-react';
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
    { id: 'webtoon_id', label: 'Webtoon (ID)', flag: 'fi-id', logo: webtoonLogo },
    { id: 'webtoon_en', label: 'Webtoon (EN)', flag: 'fi-gb', logo: webtoonLogo },
    { id: 'mangaplus_id', label: 'MANGA Plus (ID)', flag: 'fi-id', logo: mangaplusLogo },
  ];

  // Count bookmarks per catalog
  const getCatalogCount = (catId) => {
    if (catId === 'all') return bookmarks.length;
    return bookmarks.filter((b) => (b.source || 'webtoon_id') === catId).length;
  };

  // Filter bookmarks by catalog & search term
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-card rounded-2xl p-5 border border-[var(--border-color)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5 text-pink-500 fill-current shrink-0" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">Bookmarked Comics</h1>
            <p className="text-xs opacity-60">Your saved collection categorized by catalog provider</p>
          </div>
        </div>

        {/* Search Bar & Total Counter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs bg-black/5 dark:bg-white/5 border border-[var(--border-color)] focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <Badge variant="rose" className="shrink-0 !py-1">
            {bookmarks.length} saved
          </Badge>
        </div>
      </div>

      {/* Catalog Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[var(--border-color)]">
        <span className="text-xs font-medium opacity-50 flex items-center gap-1 shrink-0 mr-1">
          <Filter className="w-3.5 h-3.5" /> Catalog:
        </span>
        {catalogOptions.map((cat) => {
          const count = getCatalogCount(cat.id);
          const isActive = activeCatalogFilter === cat.id;
          return (
            <Button
              key={cat.id}
              variant={isActive ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveCatalogFilter(cat.id)}
              className="!h-8 !px-3 shrink-0"
            >
              {cat.flag && <span className={`fi ${cat.flag} rounded-[2px] shadow-sm w-4 h-3 shrink-0`}></span>}
              {cat.logo && <img src={cat.logo} alt={cat.label} className="w-4 h-4 object-contain shrink-0" />}
              <span>{cat.label}</span>
              <span className={`text-[11px] font-medium opacity-80 ${isActive ? 'text-white/80' : 'text-[var(--text-sub)]'}`}>
                {count}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Grid of Bookmarked Comic Cards */}
      {filteredBookmarks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBookmarks.map((comic) => {
            const isMangaPlus = comic.source === 'mangaplus_id';
            const sourceLogo = isMangaPlus ? mangaplusLogo : webtoonLogo;
            const flagClass = comic.source === 'webtoon_en' ? 'fi-gb' : 'fi-id';
            const sourceLabel =
              isMangaPlus
                ? 'MANGA Plus (ID)'
                : comic.source === 'webtoon_en'
                ? 'Webtoon (EN)'
                : 'Webtoon (ID)';

            return (
              <div
                key={comic.id || comic.title_no || comic.url}
                className="glass-card rounded-2xl p-4 border border-[var(--border-color)] shadow-sm hover:border-blue-500/50 transition-all flex flex-col justify-between group space-y-3"
              >
                {/* Cover Image & Info Header */}
                <div className="flex items-start gap-3">
                  <div className="relative w-16 h-20 shrink-0 rounded-xl overflow-hidden bg-black/10 dark:bg-white/5 border border-[var(--border-color)] flex items-center justify-center p-1">
                    {comic.cover ? (
                      <img
                        src={comic.cover}
                        alt={comic.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300 rounded-lg"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = sourceLogo;
                          e.target.className = 'w-8 h-8 object-contain opacity-40';
                        }}
                      />
                    ) : (
                      <img src={sourceLogo} alt={comic.title} className="w-8 h-8 object-contain opacity-40" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-[11px] text-[var(--text-sub)] opacity-70 truncate font-medium flex items-center gap-1.5">
                      <span className={`fi ${flagClass} rounded-sm shrink-0`}></span>
                      <img src={sourceLogo} alt={sourceLabel} className="w-3 h-3 object-contain shrink-0" />
                      <span className="truncate">{sourceLabel}</span>
                    </div>

                    <h3 className="text-xs font-semibold tracking-tight leading-snug line-clamp-2 title-hover group-hover:text-blue-500 transition-colors" title={comic.title}>
                      {comic.title}
                    </h3>

                    <p className="text-[11px] opacity-50 truncate">
                      {comic.genre || 'Comic'}
                    </p>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2 border-t border-[var(--border-color)] flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onSelectComic(comic);
                      onNavigateScraper();
                    }}
                    icon={LayersTwo}
                    className="flex-1 !h-8"
                  >
                    Select & Download
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onRemoveBookmark(comic)}
                    title="Remove from Bookmarks"
                    icon={Trash}
                    className="!h-8 !w-8 !px-0"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="glass-card rounded-2xl p-12 border border-[var(--border-color)] text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-pink-600/10 text-pink-600 dark:text-pink-400 flex items-center justify-center mx-auto border border-pink-500/20">
            <Heart className="w-8 h-8 opacity-60" />
          </div>

          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-bold">No Bookmarks Found</h3>
            <p className="text-xs opacity-60">
              {searchTerm || activeCatalogFilter !== 'all'
                ? 'No bookmarks match your search filter or catalog selection.'
                : 'You have not added any comics to your bookmarks yet.'}
            </p>
          </div>

          <Button
            variant="primary"
            onClick={onNavigateCatalog}
            icon={BookOpen}
          >
            Browse Catalog Explorer
          </Button>
        </div>
      )}
    </div>
  );
}
