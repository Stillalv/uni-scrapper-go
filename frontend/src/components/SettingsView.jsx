import React from 'react';
import { Settings, Folder, Cpu, FileImage, ShieldCheck } from 'lucide-react';

export default function SettingsView({
  outputDir,
  onSelectFolder,
  selectedFormat,
  setSelectedFormat,
  selectedWorkers,
  setSelectedWorkers,
  onReloadCatalog
}) {
  const formats = ['WEBP', 'JPEG', 'PNG'];
  const workerOptions = [
    { label: '6 Workers (Standard)', value: 6 },
    { label: '8 Workers (Balanced)', value: 8 },
    { label: '20 Workers (High Speed - 100 Mbps+)', value: 20 },
    { label: '32 Workers (Ultra Speed - 200 Mbps+)', value: 32 },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2 select-none">
      <div className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 pb-4">
        <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">System Preferences & Settings</h2>
          <p className="text-xs opacity-60">Configure default storage, image format, worker concurrency, and system cache preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Storage & Format */}
        <div className="glass-card rounded-xl p-4 space-y-4 border border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2">
            <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold">Storage & Output Format</h3>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold opacity-70">Default Output Directory:</label>
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 rounded-lg glass-input text-xs flex-1 truncate font-mono">
                {outputDir || "Select directory..."}
              </div>
              <button
                onClick={onSelectFolder}
                className="px-3 py-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs font-medium border border-black/10 dark:border-white/10 transition-all shrink-0 active:scale-95"
              >
                Change Path
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold opacity-70 flex items-center gap-1">
              <FileImage className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Default Image Format:
            </label>
            <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
              {formats.map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setSelectedFormat(fmt)}
                  className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-all ${
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
        <div className="glass-card rounded-xl p-4 space-y-4 border border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2 border-b border-black/5 dark:border-white/5 pb-2">
            <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold">Performance & Concurrency</h3>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold opacity-70">Worker Concurrency Profile:</label>
            <select
              value={selectedWorkers}
              onChange={(e) => setSelectedWorkers(Number(e.target.value))}
              className="w-full py-2 px-3 text-xs rounded-lg glass-input font-medium cursor-pointer"
            >
              {workerOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onReloadCatalog(true)}
              className="w-full py-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 opacity-80 border border-black/10 dark:border-white/10 text-xs font-medium transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Force Refresh Catalog Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
