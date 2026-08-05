import React, { useState } from 'react';
import { FineTune, Folder, Microchip, ImageRectangle, ShieldCheck, BookOpen } from '@mynaui/icons-react';
import AppleSelect from './AppleSelect';

export default function SettingsView({
  outputDir,
  onSelectFolder,
  selectedFormat,
  setSelectedFormat,
  selectedWorkers,
  setSelectedWorkers,
  onReloadCatalog,
  botConfig,
  onSaveBotConfig
}) {
  const formats = ['WEBP', 'JPEG', 'PNG'];
  const workerOptions = [
    { label: '6 Workers (Standard)', value: 6 },
    { label: '8 Workers (Balanced)', value: 8 },
    { label: '20 Workers (High Speed - 100 Mbps+)', value: 20 },
    { label: '32 Workers (Ultra Speed - 200 Mbps+)', value: 32 },
  ];

  const [botToken, setBotToken] = useState('');
  const [botChatIDs, setBotChatIDs] = useState('');
  const [savingBot, setSavingBot] = useState(false);

  const handleSaveBot = async () => {
    if (!botToken.trim()) {
      return;
    }
    setSavingBot(true);
    try {
      await onSaveBotConfig(botToken.trim(), botChatIDs.trim());
    } finally {
      setSavingBot(false);
    }
  };

  const botOnline = botConfig?.running === true;
  const botConfigured = botConfig?.configured === true;
  const keepSavedToken = botConfigured && !botToken.trim();
  const savedChatIDs = botConfig?.chatIDs || '';

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2 select-none">
      <div className="flex items-center gap-3 pb-5 border-b border-[var(--border-color)]">
        <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
          <FineTune style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">System Preferences & Settings</h2>
          <p className="text-xs opacity-60 mt-0.5">Configure default storage, image format, worker concurrency, and Telegram remote control.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Storage & Format */}
        <div className="glass-card rounded-2xl p-5 space-y-5 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 pb-2.5 border-b border-[var(--border-color)]">
            <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-semibold">Storage & Output Format</h3>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest opacity-60">Default Output Directory</label>
            <div className="flex items-center gap-2">
              <div className="h-8 px-3 flex items-center rounded-lg glass-input text-xs flex-1 truncate font-mono">
                {outputDir || "Select directory..."}
              </div>
              <button
                onClick={onSelectFolder}
                className="h-8 px-3 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs font-semibold border border-[var(--border-color)] transition-all shrink-0 active:scale-[0.98]"
              >
                Change
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest opacity-60 flex items-center gap-1.5">
              <ImageRectangle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Default Image Format
            </label>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--border-color)]">
              {formats.map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setSelectedFormat(fmt)}
                  className={`flex-1 py-1.5 text-xs rounded-md font-semibold transition-all ${
                    selectedFormat === fmt
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Performance & Concurrency */}
        <div className="glass-card rounded-2xl p-5 space-y-5 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 pb-2.5 border-b border-[var(--border-color)]">
            <Microchip className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-semibold">Performance & Concurrency</h3>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest opacity-60">Worker Concurrency Profile</label>
            <AppleSelect
              value={selectedWorkers}
              onChange={(v) => setSelectedWorkers(Number(v))}
              options={workerOptions}
            />
          </div>

          <div className="pt-1">
            <button
              onClick={() => onReloadCatalog(true)}
              className="w-full h-8 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 opacity-80 border border-[var(--border-color)] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Force Refresh Catalog Cache
            </button>
          </div>
        </div>
      </div>

      {/* Telegram Remote Control */}
      <div className="glass-card rounded-2xl p-5 space-y-5 border border-[var(--border-color)]">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-semibold">Telegram Remote Control</h3>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold">
            <span className={`w-2 h-2 rounded-full ${botOnline ? 'bg-green-500 animate-pulse' : botConfigured ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
            {botOnline ? 'Bot Online' : botConfigured ? 'Bot Offline' : 'Not Configured'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest opacity-60">Bot Token (from @BotFather)</label>
            <input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder={botConfig?.token ? `Saved: ${botConfig.token}` : "123456:ABC-DEF..."}
              className="w-full h-8 px-3 text-xs rounded-lg glass-input font-mono"
            />
            {botConfigured && (
              <p className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                ✓ Token saved — leave the field empty to keep using the saved token
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest opacity-60">Chat ID Allowlist (comma separated)</label>
            <input
              type="text"
              value={botChatIDs || savedChatIDs}
              onChange={(e) => setBotChatIDs(e.target.value)}
              placeholder={savedChatIDs ? `Saved: ${savedChatIDs}` : "123456789"}
              className="w-full h-8 px-3 text-xs rounded-lg glass-input font-mono"
            />
            {savedChatIDs && !botChatIDs && (
              <p className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">✓ {savedChatIDs} registered</p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[10px] opacity-60 leading-relaxed max-w-md">
            Token & chat ID are stored permanently — no need to re-enter them every time you open the app. The bot starts automatically when the app is opened. Message the bot <code className="font-mono">/start</code> to see your chat ID. Features: check webtoon, catalog, download, stop, status, change output folder, benchmark, history.
          </p>
          <button
            onClick={handleSaveBot}
            disabled={(!botToken.trim() && !botConfigured) || savingBot}
            className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50 active:scale-[0.98] shrink-0"
          >
            <BookOpen className={`w-3.5 h-3.5 ${savingBot ? 'animate-spin' : ''}`} />
            {savingBot ? 'Saving...' : keepSavedToken ? 'Restart Bot' : 'Save & Start Bot'}
          </button>
        </div>

        {botConfig?.lastError && (
          <p className="text-[10px] text-rose-500 dark:text-rose-400 font-mono break-all">{botConfig.lastError}</p>
        )}
      </div>
    </div>
  );
}
