import React, { useState } from 'react';
import { Heart, BookOpen, Trash, Search, ExternalLink, LayersTwo, Sparkles, Filter } from '@mynaui/icons-react';

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
    { id: 'webtoon_id', label: 'Webtoon (ID)' },
    { id: 'webtoon_en', label: 'Webtoon (EN)' },
    { id: 'mangaplus_id', label: 'MANGA Plus (ID)' },
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
          <span className="text-xs text-[var(--text-sub)] opacity-60 font-medium shrink-0">
            {bookmarks.length} saved
          </span>
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
            <button
              key={cat.id}
              onClick={() => setActiveCatalogFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-2 border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-black/[0.02] dark:bg-white/[0.02] border-[var(--border-color)] opacity-60 hover:opacity-100'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[11px] font-medium opacity-80 ${
                  isActive ? 'text-white/80' : 'text-[var(--text-sub)]'
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBookmarks.map((comic) => {
            const sourceLabel =
              comic.source === 'mangaplus_id'
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
                  <div className="relative w-16 h-20 shrink-0 rounded-xl overflow-hidden bg-black/10 dark:bg-white/10 border border-[var(--border-color)]">
                    {comic.cover ? (
                      <img
                        src={comic.cover}
                        alt={comic.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/150?text=Comic';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-30 text-xs font-bold font-mono">
                        N/A
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-[11px] text-[var(--text-sub)] opacity-70 truncate font-medium">
                      {sourceLabel}
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
                  <button
                    onClick={() => {
                      onSelectComic(comic);
                      onNavigateScraper();
                    }}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <LayersTwo className="w-3.5 h-3.5" /> Select & Download
                  </button>

                  <button
                    onClick={() => onRemoveBookmark(comic)}
                    title="Remove from Bookmarks"
                    className="p-1.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 border border-red-500/20 transition-all active:scale-95"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
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

          <button
            onClick={onNavigateCatalog}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-2 transition-all hover:bg-blue-500 active:scale-95 shadow-sm"
          >
            <BookOpen className="w-4 h-4" /> Browse Catalog Explorer
          </button>
        </div>
      )}
    </div>
  );
}
