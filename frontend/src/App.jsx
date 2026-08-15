import React, { useState, useEffect } from 'react';
import WindowHeader from './components/WindowHeader';
import Sidebar from './components/Sidebar';
import ComicDetails from './components/ComicDetails';
import DownloadDashboard from './components/DownloadDashboard';
import NotificationToast from './components/NotificationToast';
import HistoryDrawer from './components/HistoryDrawer';
import SettingsView from './components/SettingsView';
import HistoryView from './components/HistoryView';
import ToolsView from './components/ToolsView';
import CatalogView from './components/CatalogView';
import BookmarksView from './components/BookmarksView';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog', 'bookmarks', 'scraper', 'history', 'settings', 'tools'

  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedLang, setSelectedLang] = useState('id');
  const [selectedSource, setSelectedSource] = useState('webtoon');
  const [selectedComic, setSelectedComic] = useState(null);
  const [cloudStatus, setCloudStatus] = useState('checking');
  const [cloudConfig, setCloudConfig] = useState({ configured: false, url: '', token: '', userID: '', deviceID: '', deviceName: '' });
  
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('webtoon_bookmarks_v1');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });

  const recordID = (record, kind) => String(
    record?.[kind === 'bookmarks' ? 'bookmark_id' : 'history_id'] ||
    record?.id || record?.url || record?.download_id || ''
  );

  const mergeRecords = (local, remote, kind) => {
    const merged = new Map();
    [...(Array.isArray(remote) ? remote : []), ...(Array.isArray(local) ? local : [])].forEach((record) => {
      const id = recordID(record, kind);
      if (!id) return;
      const current = merged.get(id);
      const currentTime = Date.parse(current?.updated_at || '') || 0;
      const recordTime = Date.parse(record?.updated_at || '') || 0;
      if (!current || recordTime >= currentTime) merged.set(id, { ...record, id: record.id || id });
    });
    return Array.from(merged.values());
  };

  const syncCloud = async ({ bookmarks: nextBookmarks, history: nextHistory, deletedBookmarks = [], deletedHistory = [], settings = [] } = {}) => {
    try {
      const res = await fetch('/api/cloud-sync/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmarks: (nextBookmarks || []).map((item) => ({ ...item, updated_at: item.updated_at || new Date().toISOString() })),
          history: (nextHistory || []).map((item) => ({ ...item, updated_at: item.updated_at || new Date().toISOString() })),
          settings,
          deletedBookmarks,
          deletedHistory,
        }),
      });
      const data = await res.json();
      if (data.status === 'online') {
        setCloudStatus('online');
        if (Array.isArray(data.bookmarks)) {
          setBookmarks(data.bookmarks);
          localStorage.setItem('webtoon_bookmarks_v1', JSON.stringify(data.bookmarks));
        }
        if (Array.isArray(data.history)) {
          setHistoryList(data.history);
          localStorage.setItem('webtoon_download_history_v2', JSON.stringify(data.history));
        }
      } else {
        setCloudStatus(data.status === 'disabled' ? 'disabled' : 'offline');
      }
      return data;
    } catch (e) {
      setCloudStatus('offline');
      return null;
    }
  };

  // Bootstrap cloud state, then merge local cache so first migration is non-destructive.
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const configRes = await fetch('/api/cloud-sync/config');
        const configData = await configRes.json();
        if (configData.cloud) setCloudConfig(configData.cloud);
        const res = await fetch('/api/cloud-sync/bootstrap');
        const data = await res.json();
        if (data.status === 'online') {
          setCloudStatus('online');
          const localBookmarks = JSON.parse(localStorage.getItem('webtoon_bookmarks_v1') || '[]');
          const localHistory = JSON.parse(localStorage.getItem('webtoon_download_history_v2') || '[]');
          const mergedBookmarks = mergeRecords(localBookmarks, data.bookmarks, 'bookmarks');
          const mergedHistory = mergeRecords(localHistory, data.history, 'history');
          setBookmarks(mergedBookmarks);
          setHistoryList(mergedHistory);
          (Array.isArray(data.settings) ? data.settings : []).forEach((setting) => {
            const key = setting.key;
            const value = setting.value;
            if (key === 'theme' && (value === 'dark' || value === 'light')) setTheme(value);
            if (key === 'format' && ['WEBP', 'JPEG', 'PNG'].includes(value)) setSelectedFormat(value);
            if (key === 'workers' && Number(value) > 0) setSelectedWorkers(Number(value));
            if (key === 'outputDir' && setting.device_id === data.deviceID && typeof value === 'string' && value) updateOutputDirState(value);
          });
          await syncCloud({ bookmarks: mergedBookmarks, history: mergedHistory });
        } else {
          setCloudStatus(data.status === 'disabled' ? 'disabled' : 'offline');
        }
      } catch (e) {
        setCloudStatus('offline');
      }
    };
    bootstrap();
  }, []);

  const saveBookmarks = (newList, deletedID = '') => {
    const safeList = Array.isArray(newList) ? newList : [];
    setBookmarks(safeList);
    try {
      localStorage.setItem('webtoon_bookmarks_v1', JSON.stringify(safeList));
    } catch (e) {}
    
    // Persist locally and synchronize through the Go backend when cloud is configured.
    fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safeList),
    }).catch(() => {});
    syncCloud({ bookmarks: safeList, history: historyList, deletedBookmarks: deletedID ? [deletedID] : [] });
  };

  const handleToggleBookmark = (comic) => {
    if (!comic) return;
    const comicID = String(comic.id || comic.title_no || comic.TitleNo || comic.url);
    const exists = bookmarks.some((b) => String(b.id || b.title_no || b.TitleNo || b.url) === comicID);

    if (exists) {
      const updated = bookmarks.filter((b) => String(b.id || b.title_no || b.TitleNo || b.url) !== comicID);
      saveBookmarks(updated, comicID);
      addToast('Bookmark Removed', `Removed '${comic.title || comic.Title}' from bookmarks.`, 'info');
    } else {
      const source = comic.source || selectedSource || 'webtoon_id';
      const newBookmark = {
        id: comicID,
        title_no: comic.title_no || comic.TitleNo || comicID,
        title: comic.title || comic.Title,
        genre: comic.genre || comic.Genre || 'Comic',
        author: comic.author || comic.Author || '',
        cover: comic.cover || comic.cover_url || comic.CoverURL || '',
        url: comic.url || comic.ListURL || comicUrl,
        source: source,
        addedAt: Date.now(),
        updated_at: new Date().toISOString(),
      };
      const updated = [newBookmark, ...bookmarks];
      saveBookmarks(updated);
      addToast('Bookmark Saved', `Added '${newBookmark.title}' to bookmarks!`, 'success');
    }
  };

  const [comicUrl, setComicUrl] = useState('');
  const [webtoonInfo, setWebtoonInfo] = useState(null);
  const [checkingInfo, setCheckingInfo] = useState(false);
  
  const [selectedFormat, setSelectedFormat] = useState('WEBP');
  const [selectedWorkers, setSelectedWorkers] = useState(6);
  const [selectedChapterNos, setSelectedChapterNos] = useState([]);
  const [outputDir, setOutputDir] = useState(() => {
    return window.__INITIAL_OUTPUT_DIR__ || localStorage.getItem('webtoon_output_dir') || '';
  });
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [activeWorkers, setActiveWorkers] = useState([]);
  
  const [toasts, setToasts] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState(() => {
    try {
      const saved = localStorage.getItem('webtoon_download_history_v2');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });

  const saveHistoryList = (newList, deletedID = '') => {
    const safeList = Array.isArray(newList) ? newList : [];
    const explicitDeletedIDs = Array.isArray(deletedID) ? deletedID : (deletedID ? [deletedID] : []);
    const remainingIDs = new Set(safeList.map((item) => recordID(item, 'history')).filter(Boolean));
    const removedIDs = historyList
      .map((item) => recordID(item, 'history'))
      .filter((id) => id && !remainingIDs.has(id));
    setHistoryList(safeList);
    try {
      localStorage.setItem('webtoon_download_history_v2', JSON.stringify(safeList));
    } catch (e) {}
    syncCloud({ bookmarks, history: safeList, deletedHistory: [...new Set([...explicitDeletedIDs, ...removedIDs])] });
  };
  const [serverStatus, setServerStatus] = useState('online');

  const [botConfig, setBotConfig] = useState({
    configured: false,
    running: false,
    token: '',
    chatIDs: '',
    lastError: ''
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('webtoon_theme') || 'dark';
  });

  useEffect(() => {
    if (cloudStatus === 'online' || cloudStatus === 'disabled') {
      syncCloud({ bookmarks, history: historyList, settings: [
        { key: 'theme', value: theme },
        { key: 'format', value: selectedFormat },
        { key: 'workers', value: selectedWorkers },
        { key: 'outputDir', value: outputDir, device_id: cloudConfig.deviceID },
      ]});
    }
  }, [theme, selectedFormat, selectedWorkers, outputDir]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('webtoon_theme', nextTheme);
    } catch (e) {}
  };

  const handleSaveCloudConfig = async (config) => {
    const res = await fetch('/api/cloud-sync/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config),
    });
    const data = await res.json();
    if (data.cloud) setCloudConfig(data.cloud);
    if (data.status === 'success') {
      const bootstrapRes = await fetch('/api/cloud-sync/bootstrap');
      const bootstrapData = await bootstrapRes.json();
      if (bootstrapData.status === 'online') {
        setCloudStatus('online');
        const mergedBookmarks = mergeRecords(bookmarks, bootstrapData.bookmarks, 'bookmarks');
        const mergedHistory = mergeRecords(historyList, bootstrapData.history, 'history');
        setBookmarks(mergedBookmarks);
        setHistoryList(mergedHistory);
        await syncCloud({ bookmarks: mergedBookmarks, history: mergedHistory });
      } else setCloudStatus('offline');
    }
    return data;
  };

  const updateOutputDirState = (newPath) => {
    if (newPath) {
      setOutputDir(newPath);
      try {
        localStorage.setItem('webtoon_output_dir', newPath);
      } catch (e) {}
    }
  };

  // Helper for adding toast notifications
  const addToast = (title, message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch initial config with auto-retry on initial connection
  const loadConfig = async (retryCount = 0) => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.status === 'success' && data.outputDir) {
        updateOutputDirState(data.outputDir);
      }
    } catch (err) {
      if (retryCount < 5) {
        setTimeout(() => loadConfig(retryCount + 1), 500);
      }
    }
  };

  // Fetch initial catalog
  const loadCatalog = async (lang = selectedLang, source = selectedSource, forceRefresh = false) => {
    setLoadingCatalog(true);
    try {
      const res = await fetch(`/api/catalog?lang=${lang}&source=${source}&refresh=${forceRefresh}`);
      const data = await res.json();
      if (data.status === 'success') {
        setCatalog(data.catalog || []);
        const sourceLabel = source === 'mangaplus_id' ? 'MANGA Plus (Indonesia)' : 'Webtoon';
        addToast('Catalog Ready', `Successfully loaded ${data.catalog.length} ${sourceLabel} comics.`, 'success');
      } else {
        addToast('Catalog Failed', data.message || 'Failed to load comic catalog.', 'error');
      }
    } catch (err) {
      addToast('Connection Failed', 'Failed to connect to the Go server.', 'error');
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    loadCatalog('id', 'webtoon', false);
  }, []);

  // Load Telegram bot config on mount
  const loadBotConfig = async () => {
    try {
      const res = await fetch('/api/bot-config');
      const data = await res.json();
      if (data.status === 'success') {
        setBotConfig(data.bot);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadBotConfig();
  }, []);

  // Save Telegram bot config & (re)start bot
  const handleSaveBotConfig = async (token, chatIDs) => {
    try {
      const res = await fetch('/api/bot-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, chatIDs }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setBotConfig(data.bot);
        addToast('Telegram Bot', data.bot.running ? 'Bot is online & ready for commands.' : 'Bot saved (inactive).', data.bot.running ? 'success' : 'info');
      } else {
        addToast('Save Failed', data.message || 'Failed to save bot configuration.', 'error');
      }
    } catch (err) {
      addToast('Network Error', 'Failed to connect to server.', 'error');
    }
  };

  // Subscribe to SSE real-time events
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'PROGRESS_UPDATE' || payload.type === 'SCANNING') {
          setDownloadProgress(payload.data);
          if (payload.data.activeWorkers) {
            setActiveWorkers(payload.data.activeWorkers);
          }
          if (payload.data.percentage >= 100) {
            setIsDownloading(false);
          }
        } else if (payload.type === 'CHAPTER_FINISHED') {
          addToast(
            `Chapter ${payload.data.chapterNum} Completed`,
            `Successfully downloaded ${payload.data.imageCount} images (${payload.data.chapterTitle || 'Chapter'})`,
            'success'
          );
        } else if (payload.type === 'TOAST_NOTIFICATION') {
          addToast(payload.data.title, payload.data.message, payload.data.type);
        } else if (payload.type === 'DOWNLOAD_STOPPED' || payload.type === 'DOWNLOAD_FINISHED') {
          setIsDownloading(false);
          setDownloadProgress(null);
          const isStop = payload.type === 'DOWNLOAD_STOPPED';
          addToast(payload.data.title || (isStop ? 'Download Stopped' : 'Download Complete'), payload.data.message, isStop ? 'warning' : 'success');

          const ms = payload.data.elapsedMs || 0;
          const sec = payload.data.elapsedSec || (ms / 1000) || 0;
          let durationText = '0s';
          if (sec < 60) {
            durationText = `${sec.toFixed(1)}s`;
          } else {
            const mins = Math.floor(sec / 60);
            const secs = Math.round(sec % 60);
            durationText = `${mins}m ${secs}s`;
          }

          const imgs = payload.data.totalImages || payload.data.completedCount || 0;
          const avgSpeed = sec > 0 && imgs > 0 ? (imgs / sec).toFixed(1) : '-';

          const newHistoryItem = {
            id: Date.now() + Math.random(),
            title: payload.data.title || payload.data.comicTitle || 'Webtoon Download',
            comicTitle: payload.data.comicTitle || payload.data.title,
            completedCount: payload.data.completedCount || 0,
            totalCount: payload.data.totalCount || 0,
            totalImages: imgs,
            format: payload.data.format || 'WEBP',
            workers: payload.data.workers || 6,
            outputDir: payload.data.outputDir,
            coverUrl: payload.data.coverUrl,
            genre: payload.data.genre,
            durationText,
            elapsedMs: ms,
            elapsedSec: sec,
             avgSpeed,
             status: isStop ? 'stopped' : 'completed',
             updated_at: new Date().toISOString(),
             timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            finishedDate: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
          };

          saveHistoryList([newHistoryItem, ...(Array.isArray(historyList) ? historyList : [])]);
        }
      } catch (err) {
        console.error('SSE Error:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Handle Comic Selection from Sidebar
  const handleSelectComic = (comic) => {
    setSelectedComic(comic);
    setComicUrl(comic.url);
    addToast('Comic Selected', `Selected '${comic.title}' (#${comic.title_no})`, 'info');
    handleCheckInfo(comic.url);
  };

  // Handle Check Info
  const handleCheckInfo = async (targetUrl = comicUrl) => {
    if (!targetUrl) return;
    setCheckingInfo(true);
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, lang: selectedLang }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setWebtoonInfo(data.info);
        setSelectedChapterNos((data.info.Episodes || []).map((episode) => episode.episode_no));
        if (data.info.OutputDir) {
          updateOutputDirState(data.info.OutputDir);
        }
        addToast('Information Validated', `Found ${data.info.TotalEpisodes} chapters. Ready.`, 'success');
      } else {
        addToast('Fetch Failed', data.message || 'Failed to check comic info.', 'error');
      }
    } catch (err) {
      addToast('Network Error', 'Failed to process request.', 'error');
    } finally {
      setCheckingInfo(false);
    }
  };

  // Handle Open Folder in Windows File Explorer
  const handleOpenFolder = async () => {
    try {
      const res = await fetch(`/api/open-folder?path=${encodeURIComponent(outputDir)}`);
      const data = await res.json();
      if (data.status === 'success') {
        addToast('Explorer Opened', `Opened: ${data.path}`, 'info');
      } else {
        addToast('Error', data.message || 'Failed to open File Explorer', 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Select Folder via Native Dialog
  const handleSelectFolder = async () => {
    try {
      const res = await fetch('/api/select-folder', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success' && data.path) {
        updateOutputDirState(data.path);
        addToast('Folder Updated', `Destination: ${data.path}`, 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Start Download
  const handleStartDownload = async () => {
    if (!webtoonInfo) return;
    const episodes = webtoonInfo.Episodes || [];
    const selectedSet = new Set(selectedChapterNos);
    const orderedSelectedChapterNos = episodes
      .map((episode) => episode.episode_no)
      .filter((episodeNo) => selectedSet.has(episodeNo));
    const selectedRange = orderedSelectedChapterNos.length === episodes.length
      ? 'all'
      : orderedSelectedChapterNos.join(',');
    if (!selectedRange || orderedSelectedChapterNos.length === 0) {
      addToast('No Chapters Selected', 'Select at least one chapter before starting the download.', 'warning');
      return;
    }
    setIsDownloading(true);
    setDownloadProgress({
      status: `Initializing scan for chapters (${selectedRange})...`,
      percentage: 0,
      downloadedImages: 0,
      totalImages: 0,
      currentChapter: 0,
      totalChapters: 0,
      currentImage: 0,
      chapterTotalImages: 0,
    });
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: comicUrl,
          range: selectedRange,
          format: selectedFormat,
          workers: selectedWorkers,
          outputDir: outputDir,
        }),
      });
      const data = await res.json();
      if (data.status !== 'started') {
        setIsDownloading(false);
        addToast('Download Failed', data.message || 'Failed to start download.', 'error');
      } else {
        addToast('Download Started', `Downloading ${webtoonInfo.Title}...`, 'info');
      }
    } catch (err) {
      setIsDownloading(false);
      addToast('Network Error', 'Failed to connect to download server.', 'error');
    }
  };

  // Handle Cancel Download
  const handleCancelDownload = async () => {
    try {
      await fetch('/api/cancel', { method: 'POST' });
      addToast('Stopping...', 'The in-progress chapter will be completed, then the download stops.', 'warning');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={`theme-root flex flex-col h-screen overflow-hidden ${theme === 'light' ? 'light-theme bg-[#f5f5f7] text-[#1d1d1f]' : 'dark bg-[#141416] text-[#ededef]'}`}>
      {/* Header Toolbar */}
      <WindowHeader
        onSelectFolder={handleSelectFolder}
        onOpenFolder={handleOpenFolder}
        outputDir={outputDir}
        serverStatus={serverStatus}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedComic={selectedComic}
          outputDir={outputDir}
          bookmarkCount={bookmarks.length}
        />

        {/* Workspace Main Panel */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {activeTab === 'catalog' && (
            <CatalogView
              catalog={catalog}
              loadingCatalog={loadingCatalog}
              selectedLang={selectedLang}
              selectedSource={selectedSource}
              onChangeSource={(source, lang) => {
                setSelectedSource(source);
                setSelectedLang(lang);
                loadCatalog(lang, source, false);
              }}
              onChangeLang={(lang) => {
                setSelectedLang(lang);
                loadCatalog(lang, selectedSource, false);
              }}
              onReloadCatalog={(refresh) => loadCatalog(selectedLang, selectedSource, refresh)}
              selectedComic={selectedComic}
              onSelectComic={handleSelectComic}
              onNavigateScraper={() => setActiveTab('scraper')}
              bookmarks={bookmarks}
              onToggleBookmark={handleToggleBookmark}
            />
          )}

          {activeTab === 'bookmarks' && (
            <BookmarksView
              bookmarks={bookmarks}
              onRemoveBookmark={handleToggleBookmark}
              onSelectComic={handleSelectComic}
              onNavigateCatalog={() => setActiveTab('catalog')}
              onNavigateScraper={() => setActiveTab('scraper')}
            />
          )}

          {activeTab === 'scraper' && (
            <>
              {/* Comic Config Card */}
              <ComicDetails
                comicUrl={comicUrl}
                setComicUrl={setComicUrl}
                webtoonInfo={webtoonInfo}
                selectedChapterNos={selectedChapterNos}
                setSelectedChapterNos={setSelectedChapterNos}
                onCheckInfo={() => handleCheckInfo()}
                checkingInfo={checkingInfo}
                selectedFormat={selectedFormat}
                setSelectedFormat={setSelectedFormat}
                selectedWorkers={selectedWorkers}
                setSelectedWorkers={setSelectedWorkers}
                outputDir={outputDir}
                onSelectFolder={handleSelectFolder}
                isDownloading={isDownloading}
                onStartDownload={handleStartDownload}
                onCancelDownload={handleCancelDownload}
              />

              {/* Download Dashboard Visualizer */}
              {downloadProgress && (
                <DownloadDashboard
                  progress={downloadProgress}
                  activeWorkers={activeWorkers}
                />
              )}
            </>
          )}

          {activeTab === 'history' && (
            <HistoryView
              historyList={historyList}
              onClearHistory={(newList) => saveHistoryList(newList || [])}
              onOpenFolder={handleOpenFolder}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              outputDir={outputDir}
              onSelectFolder={handleSelectFolder}
              selectedFormat={selectedFormat}
              setSelectedFormat={setSelectedFormat}
              selectedWorkers={selectedWorkers}
              setSelectedWorkers={setSelectedWorkers}
              onReloadCatalog={(refresh) => loadCatalog(selectedLang, refresh)}
              botConfig={botConfig}
              onSaveBotConfig={handleSaveBotConfig}
              cloudConfig={cloudConfig}
              cloudStatus={cloudStatus}
              onSaveCloudConfig={handleSaveCloudConfig}
            />
          )}

          {activeTab === 'tools' && (
            <ToolsView
              selectedWorkers={selectedWorkers}
              setSelectedWorkers={setSelectedWorkers}
              onReloadCatalog={(refresh) => loadCatalog(selectedLang, refresh)}
            />
          )}
        </main>
      </div>

      {/* Floating Apple-style Toast Notifications */}
      <NotificationToast toasts={toasts} onCloseToast={removeToast} />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyList={historyList}
         onClearHistory={() => saveHistoryList([], 'clear-all')}
      />
    </div>
  );
}
