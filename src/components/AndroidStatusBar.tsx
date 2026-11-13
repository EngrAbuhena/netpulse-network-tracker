import React, { useState, useEffect } from 'react';
import { Wifi, Signal, Battery, SlidersHorizontal, Moon, Sun, Shield, ShieldCheck } from 'lucide-react';
import { ConnectionApiDetails } from '../types/network';

interface AndroidStatusBarProps {
  connection: ConnectionApiDetails;
  isVpnActive: boolean;
  onOpenQuickSettings: () => void;
  networkType: 'wifi' | 'cellular';
}

export const AndroidStatusBar: React.FC<AndroidStatusBarProps> = ({
  connection,
  isVpnActive,
  onOpenQuickSettings,
  networkType,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [batteryLevel, setBatteryLevel] = useState<number>(88);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      onClick={onOpenQuickSettings}
      className="relative z-30 flex items-center justify-between px-6 pt-2 pb-1 text-xs select-none cursor-pointer transition-colors hover:bg-white/5 active:bg-white/10"
      title="Tap to open Android Quick Settings"
    >
      {/* Left Slot: Time & Notifications */}
      <div className="flex items-center gap-2">
        <span className="font-semibold tracking-tight text-slate-100 font-mono text-[13px]">
          {timeStr || '12:00'}
        </span>
        {isVpnActive && (
          <span title="VPN UI preview" className="flex items-center text-teal-400">
            <ShieldCheck className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Center Slot: Camera Punch hole clearance */}
      <div className="w-4 h-4 rounded-full bg-black/80 border border-slate-800/80 mx-auto" />

      {/* Right Slot: Signal, Wi-Fi / 5G, Battery */}
      <div className="flex items-center gap-2 text-slate-300">
        {networkType === 'wifi' ? (
          <div className="flex items-center gap-0.5" title="Wi-Fi UI preview">
            <Wifi className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-[10px] font-mono font-bold leading-none text-teal-400/90">6</span>
          </div>
        ) : (
          <div className="flex items-center gap-0.5" title="Cellular UI preview">
            <Signal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold font-mono text-emerald-400 leading-none">5G</span>
          </div>
        )}

        {/* Cellular Signal Bars */}
        <div className="flex items-end gap-0.5 h-3 w-3.5" title="Signal display preview only">
          <span className="w-0.5 h-1 bg-slate-300 rounded-sm" />
          <span className="w-0.5 h-1.5 bg-slate-300 rounded-sm" />
          <span className="w-0.5 h-2.5 bg-slate-300 rounded-sm" />
          <span className="w-0.5 h-3 bg-slate-300 rounded-sm" />
        </div>

        {/* Battery */}
        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-200" title="Battery 88%">
          <span>88%</span>
          <div className="relative w-5 h-2.5 rounded-xs border border-slate-400 p-0.5 flex items-center">
            <div className="h-full bg-teal-400 rounded-2xs" style={{ width: '88%' }} />
            <span className="absolute -right-1 top-0.5 w-0.5 h-1 bg-slate-400 rounded-r-xs" />
          </div>
        </div>
      </div>
    </div>
  );
};
