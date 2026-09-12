import React, { useState } from 'react';
import { FineTune, Folder, Microchip, ImageRectangle, ShieldCheck, BookOpen } from '@mynaui/icons-react';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Dropdown from './ui/Dropdown';
import Alert from './ui/Alert';

export default function SettingsView({
  outputDir,
  onSelectFolder,
  selectedFormat,
  setSelectedFormat,
  selectedWorkers,
  setSelectedWorkers,
  onReloadCatalog,
  botConfig,
  onSaveBotConfig,
  cloudConfig,
  cloudStatus,
  onSaveCloudConfig
}) {
  const formats = ['WEBP', 'JPEG', 'PNG'];
  const workerOptions = [
    { label: '6 Workers (Standard)', value: 6 },
    { label: '8 Workers (Balanced)', value: 8 },
    { label: '20 Workers (High Speed)', value: 20 },
    { label: '32 Workers (Ultra Speed)', value: 32 },
  ];

  const [botToken, setBotToken] = useState('');
  const [botChatIDs, setBotChatIDs] = useState('');
  const [savingBot, setSavingBot] = useState(false);
  const [syncURL, setSyncURL] = useState('');
  const [syncToken, setSyncToken] = useState('');
  const [syncUserID, setSyncUserID] = useState('default');
  const [syncDeviceName, setSyncDeviceName] = useState('');
  const [savingSync, setSavingSync] = useState(false);

  const handleSaveBot = async () => {
    if (!botToken.trim() && !botConfigured) {
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

  const saveCloud = async () => {
    setSavingSync(true);
    try {
      await onSaveCloudConfig({ url: syncURL, token: syncToken, userID: syncUserID, deviceName: syncDeviceName });
      setSyncToken('');
    } finally {
      setSavingSync(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto select-none">
      {/* Header Bar */}
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--accent-border)]">
          <FineTune className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-[var(--text-main)]">System Preferences & Settings</h2>
          <p className="text-xs text-[var(--text-sub)]">Default storage, image format, concurrency profile, and cloud synchronization.</p>
        </div>
      </div>

      {/* Cloud Sync Section */}
      <div className="glass-card rounded-2xl p-5 space-y-4 border border-[var(--border-color)]">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-color)]">
          <div>
            <h3 className="text-xs font-semibold text-[var(--text-main)]">Cloud Sync (Cloudflare D1)</h3>
            <p className="text-[11px] text-[var(--text-sub)]">Synchronize bookmarks, download history, and preferences across devices.</p>
          </div>
          <Badge variant={cloudStatus === 'online' ? 'emerald' : cloudStatus === 'disabled' ? 'amber' : 'rose'}>
            {cloudStatus === 'online' ? 'Cloud Online' : cloudStatus === 'disabled' ? 'Not Configured' : cloudStatus === 'checking' ? 'Checking...' : 'Offline'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={syncURL}
            onChange={(e) => setSyncURL(e.target.value)}
            placeholder={cloudConfig?.url || 'https://sync.example.com'}
            className="h-8.5 px-3 text-xs rounded-lg glass-input font-mono"
          />
          <input
            type="password"
            value={syncToken}
            onChange={(e) => setSyncToken(e.target.value)}
            placeholder={cloudConfig?.token ? 'Saved (leave empty to keep)' : 'Personal sync token'}
            className="h-8.5 px-3 text-xs rounded-lg glass-input font-mono"
          />
          <input
            value={syncUserID}
            onChange={(e) => setSyncUserID(e.target.value)}
            placeholder={cloudConfig?.userID || 'default'}
            className="h-8.5 px-3 text-xs rounded-lg glass-input font-mono"
          />
          <input
            value={syncDeviceName}
            onChange={(e) => setSyncDeviceName(e.target.value)}
            placeholder={cloudConfig?.deviceName || 'This computer'}
            className="h-8.5 px-3 text-xs rounded-lg glass-input"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-[10px] text-[var(--text-muted-custom)]">
            Tokens are stored securely in local Go configuration and never exposed to the frontend bundle.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={saveCloud}
            loading={savingSync}
            disabled={savingSync}
            className="!h-8 shrink-0"
          >
            Save & Sync
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Storage & Format Card */}
        <div className="glass-card rounded-2xl p-5 space-y-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
            <Folder className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-xs font-semibold text-[var(--text-main)]">Storage & Output Format</h3>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted-custom)]">Default Output Directory</label>
            <div className="flex items-center gap-2">
              <div className="h-8 px-3 flex items-center rounded-lg glass-input text-xs flex-1 truncate font-mono text-[var(--text-sub)]">
                {outputDir || "Select directory..."}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={onSelectFolder}
                className="!h-8 shrink-0"
              >
                Change
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted-custom)] flex items-center gap-1.5">
              <ImageRectangle className="w-3.5 h-3.5 text-[var(--accent)]" /> Default Image Format
            </label>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--btn-secondary-bg)] border border-[var(--border-color)]">
              {formats.map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setSelectedFormat(fmt)}
                  className={`flex-1 h-7 rounded-md text-xs font-medium transition-all ${
                    selectedFormat === fmt
                      ? 'bg-[var(--accent)] text-white shadow-sm font-semibold'
                      : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Card */}
        <div className="glass-card rounded-2xl p-5 space-y-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
            <Microchip className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-xs font-semibold text-[var(--text-main)]">Performance & Concurrency</h3>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted-custom)]">Worker Concurrency</label>
            <Dropdown
              value={selectedWorkers}
              onChange={(v) => setSelectedWorkers(Number(v))}
              options={workerOptions}
            />
          </div>

          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onReloadCatalog(true)}
              icon={ShieldCheck}
              className="w-full !h-8"
            >
              Purge Catalog Cache & Sync
            </Button>
          </div>
        </div>
      </div>

      {/* Telegram Remote Control */}
      <div className="glass-card rounded-2xl p-5 space-y-4 border border-[var(--border-color)]">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-xs font-semibold text-[var(--text-main)]">Telegram Remote Control</h3>
          </div>
          <Badge variant={botOnline ? 'emerald' : botConfigured ? 'amber' : 'rose'}>
            <span className={`w-1.5 h-1.5 rounded-full ${botOnline ? 'bg-emerald-500' : botConfigured ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
            {botOnline ? 'Bot Online' : botConfigured ? 'Bot Offline' : 'Not Configured'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted-custom)]">Bot Token (from @BotFather)</label>
            <input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder={botConfig?.token ? `Saved: ${botConfig.token}` : "123456:ABC-DEF..."}
              className="w-full h-8.5 px-3 text-xs rounded-lg glass-input font-mono"
            />
            {botConfigured && (
              <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                ✓ Token saved — leave empty to keep using saved token
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted-custom)]">Chat ID Allowlist (comma separated)</label>
            <input
              type="text"
              value={botChatIDs || savedChatIDs}
              onChange={(e) => setBotChatIDs(e.target.value)}
              placeholder={savedChatIDs ? `Saved: ${savedChatIDs}` : "123456789"}
              className="w-full h-8.5 px-3 text-xs rounded-lg glass-input font-mono"
            />
            {savedChatIDs && !botChatIDs && (
              <p className="text-[10px] text-emerald-500 flex items-center gap-1">✓ {savedChatIDs} registered</p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          <p className="text-[10px] text-[var(--text-muted-custom)] leading-relaxed max-w-md">
            The bot auto-starts on app launch. Message <code className="font-mono text-[var(--text-sub)]">/start</code> to your bot to retrieve your Chat ID.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveBot}
            loading={savingBot}
            disabled={(!botToken.trim() && !botConfigured) || savingBot}
            className="!h-8 shrink-0"
          >
            {savingBot ? 'Saving...' : keepSavedToken ? 'Restart Bot' : 'Save & Start Bot'}
          </Button>
        </div>

        {botConfig?.lastError && (
          <Alert type="error" title="Telegram Bot Connection Error">
            {botConfig.lastError}
          </Alert>
        )}
      </div>
    </div>
  );
}
