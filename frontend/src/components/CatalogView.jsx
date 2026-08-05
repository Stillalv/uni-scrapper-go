import React, { useState } from 'react';
import { Search, RefreshCw, BookOpen, LayoutGrid, List, ArrowRight } from 'lucide-react';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Katalog Komik LINE Webtoon</h2>
            <p className="text-xs opacity-60">Jelajahi dan pilih komik favorit Anda ({catalog.length} komik terdaftar).</p>
          </div>
        </div>

        {/* Language Tabs & View Mode */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/10 dark:border-white/10 text-xs">
            <button
              onClick={() => onChangeLang('id')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                selectedLang === 'id' ? 'bg-blue-600 text-white shadow-sm' : 'opacity-60 hover:opacity-100'
              }`}
            >
              🇮🇩 Indonesia
            </button>
            <button
              onClick={() => onChangeLang('en')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                selectedLang === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'opacity-60 hover:opacity-100'
              }`}
            >
              🇬🇧 English
            </button>
          </div>

          <button
            onClick={() => onReloadCatalog(true)}
            disabled={loadingCatalog}
            className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 opacity-80 border border-black/10 dark:border-white/10 transition-all disabled:opacity-50 active:scale-95"
            title="Reload Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loadingCatalog ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
          </button>

          <div className="h-4 w-[1px] bg-black/10 dark:bg-white/10 mx-1"></div>

          {/* Grid / List Toggle */}
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/10 dark:border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'opacity-40 hover:opacity-100'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'opacity-40 hover:opacity-100'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar Input */}
      <div className="relative">
        <Search className="w-4 h-4 opacity-40 absolute left-3.5 top-3.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Cari judul komik, genre, atau ID title_no (contoh: 9523, MyFirstLove, Romantis)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl glass-input placeholder:opacity-40"
        />
      </div>

      {/* Catalog Content Area */}
      {loadingCatalog ? (
        <div className="p-16 text-center space-y-4 glass-card rounded-2xl border border-black/5 dark:border-white/5">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto opacity-80" />
          <p className="text-xs opacity-60">Memuat katalog resmi LINE Webtoon...</p>
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className="p-16 text-center text-xs opacity-50 space-y-2 glass-card rounded-2xl border border-black/5 dark:border-white/5">
          <p>Tidak ada komik yang cocok dengan pencarian "{searchQuery}".</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View Mode */
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
                className={`p-4 rounded-xl glass-card border transition-all cursor-pointer space-y-3 group hover:scale-[1.02] ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600/10 shadow-md'
                    : 'border-black/10 dark:border-white/10 hover:border-blue-500/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-300 font-medium uppercase tracking-wider border border-blue-500/20">
                    {comic.genre || 'DRAMA'}
                  </span>
                  <span className="text-[11px] font-mono opacity-50 font-bold">
                    #{comic.title_no}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {comic.title}
                  </h3>
                </div>

                <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Pilih Komik Ini</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View Mode */
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
                className={`p-3.5 rounded-xl glass-card border transition-all cursor-pointer flex items-center justify-between group hover:border-blue-500/40 ${
                  isSelected ? 'border-blue-600 bg-blue-600/10' : 'border-black/10 dark:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-blue-600/10 text-blue-600 dark:text-blue-300 font-medium font-mono">
                    #{comic.title_no}
                  </span>
                  <div>
                    <h3 className="text-xs font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {comic.title}
                    </h3>
                    <span className="text-[10px] opacity-50 uppercase tracking-wider">
                      {comic.genre || 'DRAMA'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                  <span>Select</span>
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
