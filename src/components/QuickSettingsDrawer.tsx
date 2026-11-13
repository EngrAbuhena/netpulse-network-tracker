import React from 'react';
import { Wifi, Signal, Shield, ShieldCheck, RefreshCw, Smartphone, Maximize2, Palette, X, Database } from 'lucide-react';

interface QuickSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  networkType: 'wifi' | 'cellular';
  onToggleNetworkType: () => void;
  isVpnActive: boolean;
  onToggleVpn: () => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  dataSaver: boolean;
  onToggleDataSaver: () => void;
  isPhoneFrame: boolean;
  onTogglePhoneFrame: () => void;
  accentColor: string;
  onChangeAccentColor: (color: string) => void;
}

export const QuickSettingsDrawer: React.FC<QuickSettingsDrawerProps> = ({
  isOpen,
  onClose,
  networkType,
  onToggleNetworkType,
  isVpnActive,
  onToggleVpn,
  autoRefresh,
  onToggleAutoRefresh,
  dataSaver,
  onToggleDataSaver,
  isPhoneFrame,
  onTogglePhoneFrame,
  accentColor,
  onChangeAccentColor,
}) => {
  if (!isOpen) return null;

  const colorThemes = [
    { id: 'teal', label: 'Pixel Teal', bg: 'bg-teal-500' },
    { id: 'indigo', label: 'OneUI Indigo', bg: 'bg-indigo-500' },
    { id: 'emerald', label: 'Android Green', bg: 'bg-emerald-500' },
    { id: 'coral', label: 'Sunset Coral', bg: 'bg-rose-500' },
    { id: 'obsidian', label: 'AMOLED Cyan', bg: 'bg-cyan-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-start bg-slate-950/85 backdrop-blur-md transition-opacity">
      {/* Drawer Container */}
      <div className="w-full max-w-md mx-auto bg-slate-900 border-b border-slate-800 rounded-b-3xl shadow-2xl p-5 pt-8 animate-in slide-in-from-top duration-250">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-slate-100">Android UI Preview Settings</span>
            <span className="text-xs text-slate-400">· Display only</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-3 rounded-xl border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-[11px] text-amber-200">These are visual preview toggles only. They do not change Wi-Fi, mobile data, VPN, or Android settings.</p>
        {/* 2x3 Grid of Android Quick Tiles */}
        <div className="grid grid-cols-2 gap-3 my-4">
          {/* Tile 1: Wi-Fi / Cellular Switch */}
          <button
            onClick={onToggleNetworkType}
            className={`flex items-center gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer ${
              networkType === 'wifi'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
            }`}
          >
            <div className={`p-2 rounded-xl ${networkType === 'wifi' ? 'bg-teal-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
              <Wifi className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">Wi-Fi 6</div>
              <div className="text-[11px] text-slate-400 truncate">{networkType === 'wifi' ? 'Preview only' : 'Preview only'}</div>
            </div>
          </button>

          {/* Tile 2: Cellular Data */}
          <button
            onClick={onToggleNetworkType}
            className={`flex items-center gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer ${
              networkType === 'cellular'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
            }`}
          >
            <div className={`p-2 rounded-xl ${networkType === 'cellular' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
              <Signal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">Mobile 5G</div>
              <div className="text-[11px] text-slate-400 truncate">{networkType === 'cellular' ? 'Preview only' : 'Preview only'}</div>
            </div>
          </button>

          {/* Tile 3: Secure VPN */}
          <button
            onClick={onToggleVpn}
            className={`flex items-center gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer ${
              isVpnActive
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
            }`}
          >
            <div className={`p-2 rounded-xl ${isVpnActive ? 'bg-indigo-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
              {isVpnActive ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">VPN Tunnel</div>
              <div className="text-[11px] text-slate-400 truncate">{isVpnActive ? 'Preview active' : 'Preview off'}</div>
            </div>
          </button>

          {/* Tile 4: Auto-Refresh */}
          <button
            onClick={onToggleAutoRefresh}
            className={`flex items-center gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer ${
              autoRefresh
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
            }`}
          >
            <div className={`p-2 rounded-xl ${autoRefresh ? 'bg-teal-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">Auto IP refresh</div>
              <div className="text-[11px] text-slate-400 truncate">{autoRefresh ? 'IP check every 30s' : 'Manual only'}</div>
            </div>
          </button>

          {/* Tile 5: Data Saver */}
          <button
            onClick={onToggleDataSaver}
            className={`flex items-center gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer ${
              dataSaver
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800/80 text-slate-300 border border-slate-700/60'
            }`}
          >
            <div className={`p-2 rounded-xl ${dataSaver ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
              <Database className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">Data Saver (preview)</div>
              <div className="text-[11px] text-slate-400 truncate">{dataSaver ? 'Preview on' : 'Preview off'}</div>
            </div>
          </button>

          {/* Tile 6: Phone Frame Toggle */}
          <button
            onClick={onTogglePhoneFrame}
            className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/80 text-slate-300 border border-slate-700/60 text-left transition-all cursor-pointer hover:bg-slate-800"
          >
            <div className="p-2 rounded-xl bg-slate-700 text-slate-200">
              {isPhoneFrame ? <Maximize2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">Display Mode</div>
              <div className="text-[11px] text-slate-400 truncate">{isPhoneFrame ? 'Pixel 9 Frame' : 'Full Screen'}</div>
            </div>
          </button>
        </div>

        {/* Material You Accent Color Row */}
        <div className="pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Palette className="w-3.5 h-3.5 text-slate-400" /> Material You Palette
            </span>
            <span className="text-[11px]">Dynamic Color</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            {colorThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => onChangeAccentColor(theme.id)}
                className={`flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  accentColor === theme.id
                    ? 'border-teal-400 bg-white/5 shadow-sm'
                    : 'border-transparent hover:bg-white/5 text-slate-400'
                }`}
              >
                <span className={`w-5 h-5 rounded-full ${theme.bg} ring-2 ${accentColor === theme.id ? 'ring-white/80' : 'ring-transparent'}`} />
                <span className="text-[10px] truncate max-w-full font-medium">{theme.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Drag handle */}
        <div onClick={onClose} className="pt-4 flex justify-center cursor-pointer">
          <div className="w-12 h-1 rounded-full bg-slate-600 hover:bg-slate-400 transition-colors" />
        </div>
      </div>

      {/* Backdrop click to dismiss */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
};
