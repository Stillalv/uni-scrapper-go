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

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog', 'scraper', 'history', 'settings', 'tools'

  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedLang, setSelectedLang] = useState('id');
  const [selectedComic, setSelectedComic] = useState(null);
  
  const [comicUrl, setComicUrl] = useState('');
  const [webtoonInfo, setWebtoonInfo] = useState(null);
  const [checkingInfo, setCheckingInfo] = useState(false);
  
  const [selectedFormat, setSelectedFormat] = useState('WEBP');
  const [selectedWorkers, setSelectedWorkers] = useState(6);
  const [chapterRange, setChapterRange] = useState('all');
  const [outputDir, setOutputDir] = useState(() => {
    return window.__INITIAL_OUTPUT_DIR__ || localStorage.getItem('webtoon_output_dir') || '';
  });
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [activeWorkers, setActiveWorkers] = useState([]);
  
  const [toasts, setToasts] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
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

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('webtoon_theme', nextTheme);
    } catch (e) {}
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
  const loadCatalog = async (lang = selectedLang, forceRefresh = false) => {
    setLoadingCatalog(true);
    try {
      const res = await fetch(`/api/catalog?lang=${lang}&refresh=${forceRefresh}`);
      const data = await res.json();
      if (data.status === 'success') {
        setCatalog(data.catalog || []);
        addToast('Catalog Ready', `Successfully loaded ${data.catalog.length} Webtoon comics.`, 'success');
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
    loadCatalog('id', false);
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
        if (payload.type === 'PROGRESS_UPDATE') {
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
          setHistoryList((prev) => [
            {
              title: `Chapter ${payload.data.chapterNum} (${payload.data.chapterTitle || 'Ep'})`,
              completedCount: payload.data.imageCount,
              totalCount: payload.data.imageCount,
              format: payload.data.format,
              outputDir: payload.data.outputDir,
              timestamp: payload.data.timestamp || new Date().toLocaleTimeString(),
            },
            ...prev,
          ]);
        } else if (payload.type === 'TOAST_NOTIFICATION') {
          addToast(payload.data.title, payload.data.message, payload.data.type);
        } else if (payload.type === 'DOWNLOAD_STOPPED') {
          setIsDownloading(false);
          setDownloadProgress(null);
          addToast(payload.data.title || 'Download Stopped', payload.data.message, payload.data.type || 'warning');
        } else if (payload.type === 'DOWNLOAD_FINISHED') {
          setIsDownloading(false);
          addToast('Download Complete', payload.data.message, 'success');
          // Add to history
          setHistoryList((prev) => [
            {
              title: payload.data.title || 'Webtoon Download',
              completedCount: payload.data.completedCount,
              totalCount: payload.data.totalCount,
              format: payload.data.format,
              outputDir: payload.data.outputDir,
              timestamp: new Date().toLocaleTimeString(),
            },
            ...prev,
          ]);
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
    setIsDownloading(true);
    setDownloadProgress(null);
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: comicUrl,
          range: chapterRange,
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
        />

        {/* Workspace Main Panel */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {activeTab === 'catalog' && (
            <CatalogView
              catalog={catalog}
              loadingCatalog={loadingCatalog}
              selectedLang={selectedLang}
              onChangeLang={(lang) => {
                setSelectedLang(lang);
                loadCatalog(lang, false);
              }}
              onReloadCatalog={(refresh) => loadCatalog(selectedLang, refresh)}
              selectedComic={selectedComic}
              onSelectComic={handleSelectComic}
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
                onCheckInfo={() => handleCheckInfo()}
                checkingInfo={checkingInfo}
                selectedFormat={selectedFormat}
                setSelectedFormat={setSelectedFormat}
                selectedWorkers={selectedWorkers}
                setSelectedWorkers={setSelectedWorkers}
                outputDir={outputDir}
                onSelectFolder={handleSelectFolder}
                chapterRange={chapterRange}
                setChapterRange={setChapterRange}
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
              onClearHistory={() => setHistoryList([])}
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
        onClearHistory={() => setHistoryList([])}
      />
    </div>
  );
}
