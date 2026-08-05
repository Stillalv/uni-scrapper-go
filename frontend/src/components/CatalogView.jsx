import React, { useState } from 'react';
import { Search, Refresh, BookOpen, LayoutDashboard, List, ArrowRight } from '@mynaui/icons-react';

export default function CatalogView({
  catalog,
  loadingCatalog,
  selectedLang,
  onChangeLang,
  onReloadCatalog,
  selectedComic,
  onSelectComic,
  onNavigateScraper
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const filteredCatalog = catalog.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      c.title_no.includes(q) ||
      (c.genre && c.genre.toLowerCase().includes(q))
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
            <h2 className="text-lg font-bold tracking-tight">LINE Webtoon Comic Catalog</h2>
            <p className="text-xs opacity-60 mt-0.5">Browse and pick your favorite comics ({catalog.length} comics registered).</p>
          </div>
        </div>

        {/* Language Tabs & View Mode */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border-color)] text-xs">
            <button
              onClick={() => onChangeLang('id')}
              className={`h-7 px-2.5 rounded-md font-semibold transition-all ${
                selectedLang === 'id' ? 'bg-blue-600 text-white shadow-sm' : 'opacity-60 hover:opacity-100'
              }`}
            >
              🇮🇩 Indonesia
            </button>
            <button
              onClick={() => onChangeLang('en')}
              className={`h-7 px-2.5 rounded-md font-semibold transition-all ${
                selectedLang === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'opacity-60 hover:opacity-100'
              }`}
            >
              🇬🇧 English
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

      {/* Search Bar Input */}
      <div className="relative">
        <Search className="w-4 h-4 opacity-40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search comic title, genre, or title_no ID (e.g. 9523, MyFirstLove, Romance)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl glass-input placeholder:opacity-40"
        />
      </div>

      {/* Catalog Content Area */}
      {loadingCatalog ? (
        <div className="p-16 text-center space-y-4 glass-card rounded-2xl border border-[var(--border-color)]">
          <Refresh className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto opacity-80" />
          <p className="text-xs opacity-60">Loading official LINE Webtoon catalog...</p>
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className="p-16 text-center text-xs opacity-50 space-y-2 glass-card rounded-2xl border border-[var(--border-color)]">
          <p>No comics match your search "{searchQuery}".</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCatalog.map((comic) => {
            const isSelected = selectedComic && selectedComic.title_no === comic.title_no;
            return (
              <div
                key={comic.title_no}
                onClick={() => {
                  onSelectComic(comic);
                  onNavigateScraper();
                }}
                className={`p-4 rounded-2xl glass-card border transition-all cursor-pointer space-y-3 group hover:scale-[1.01] hover:shadow-md ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600/10 shadow-md'
                    : 'border-[var(--border-color)] hover:border-blue-500/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[9px] px-2 py-0.5 rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider border border-blue-500/20">
                    {comic.genre || 'DRAMA'}
                  </span>
                  <span className="text-[10px] font-mono opacity-40 font-semibold">
                    #{comic.title_no}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {comic.title}
                  </h3>
                </div>

                <div className="pt-2.5 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Select This Comic</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCatalog.map((comic) => {
            const isSelected = selectedComic && selectedComic.title_no === comic.title_no;
            return (
              <div
                key={comic.title_no}
                onClick={() => {
                  onSelectComic(comic);
                  onNavigateScraper();
                }}
                className={`px-4 py-3 rounded-xl glass-card border transition-all cursor-pointer flex items-center justify-between group hover:border-blue-500/40 ${
                  isSelected ? 'border-blue-600 bg-blue-600/10' : 'border-[var(--border-color)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold font-mono">
                    #{comic.title_no}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {comic.title}
                    </h3>
                    <span className="text-[9px] opacity-50 uppercase tracking-wider">
                      {comic.genre || 'DRAMA'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-semibold shrink-0">
                  <span className="text-[10px] uppercase tracking-wider">Select</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
