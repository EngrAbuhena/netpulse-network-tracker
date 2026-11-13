import React, { useState } from 'react';
import {
  Wifi,
  Signal,
  Globe,
  Cpu,
  Gauge,
  Copy,
  Check,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Share2,
  ChevronRight,
  Info
} from 'lucide-react';
import { ConnectionApiDetails, LocalIpInfo, NetworkInterface, PublicIpInfo, SpeedTestRecord } from '../../types/network';
import { TabType } from '../AndroidNavBar';
import { copyText } from '../../utils/clipboard';

interface DashboardTabProps {
  publicIp: PublicIpInfo | null;
  localIp: LocalIpInfo | null;
  interfaces: NetworkInterface[];
  connection: ConnectionApiDetails;
  networkType: 'wifi' | 'cellular';
  isVpnActive: boolean;
  latestSpeedRecord: SpeedTestRecord | null;
  onNavigateTab: (tab: TabType) => void;
  onRefreshIp: () => void;
  isRefreshingIp: boolean;
  onShowToast: (msg: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  publicIp,
  localIp,
  interfaces,
  connection,
  networkType,
  isVpnActive,
  latestSpeedRecord,
  onNavigateTab,
  onRefreshIp,
  isRefreshingIp,
  onShowToast,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string, key: string) => {
    void copyText(text).then((copied) => {
      if (!copied) { onShowToast('Clipboard unavailable; select and copy the text manually.'); return; }
      setCopiedKey(key);
      onShowToast(`Copied ${label} to clipboard`);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const primaryInterface = interfaces.find((i) => i.name === (networkType === 'wifi' ? 'wlan0' : 'rmnet_data0')) || interfaces[0];

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 overflow-y-auto max-w-xl mx-auto">
      {/* 1. Primary Network Connection Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 shadow-lg">
        {/* Ambient background glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-500/15 text-teal-400 border border-teal-500/30 shadow-inner">
              {networkType === 'wifi' ? <Wifi className="w-6 h-6" /> : <Signal className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-tight">
                  {networkType === 'wifi' ? (primaryInterface.ssid || 'Wi-Fi profile') : 'Cellular profile'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                  Sample profile
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {primaryInterface.frequency || 'Radio details unavailable'} · {primaryInterface.linkSpeedMbps ? `${primaryInterface.linkSpeedMbps} Mbps sample link` : 'link speed unavailable'}
              </div>
            </div>
          </div>

          <button
            onClick={onRefreshIp}
            disabled={isRefreshingIp}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Network Status"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingIp ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Network Metrics Strip */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800/80">
          <div>
            <div className="text-[11px] text-slate-400">Signal Level</div>
            <div className="text-xs font-mono font-bold text-slate-200 mt-0.5 tabular-nums">
              {primaryInterface.signalDbm ? `${primaryInterface.signalDbm} dBm (sample)` : 'Unavailable in browser'}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Est. Downlink</div>
            <div className="text-xs font-mono font-bold text-teal-400 mt-0.5 tabular-nums">
              {connection.downlink ? `${connection.downlink} Mbps (estimate)` : 'Unavailable'}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Base RTT</div>
            <div className="text-xs font-mono font-bold text-slate-200 mt-0.5 tabular-nums">
              {connection.rtt ? `${connection.rtt} ms (estimate)` : 'Unavailable'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Device IP Address Card */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-slate-200">Device IP Addresses</h3>
          </div>
          <button
            onClick={() => onNavigateTab('ip')}
            className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors font-medium cursor-pointer"
          >
            Details <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Public IPv4 */}
        <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800/80 mb-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 font-medium">
              <span>Public IP Address</span>
              {publicIp?.flag && <span>{publicIp.flag}</span>}
            </span>
            <span className="text-[10px] font-mono text-teal-400">WAN</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="font-mono text-base font-bold text-white tracking-wide select-all tabular-nums">
              {publicIp ? publicIp.ip : (isRefreshingIp ? 'Looking up…' : 'Unavailable')}
            </div>
            <button
              onClick={() => publicIp && copyToClipboard(publicIp.ip, 'Public IP', 'public-ip')}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Copy Public IP"
            >
              {copiedKey === 'public-ip' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {publicIp && (
            <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-2 truncate">
              <span>{publicIp.isp || 'Not provided'}</span>
              <span>·</span>
              <span>{publicIp.city ? `${publicIp.city}, ${publicIp.country}` : 'Location unavailable'}</span>
            </div>
          )}
        </div>

        {/* Local / LAN IP */}
        <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Local Device LAN IP</span>
            <span className="text-[10px] font-mono text-indigo-400">Browser candidate</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="font-mono text-base font-bold text-slate-200 tracking-wide select-all tabular-nums">
              {localIp?.ip || 'Unavailable in this browser'}
            </div>
            <button
              onClick={() => localIp && copyToClipboard(localIp.ip, 'LAN IP', 'lan-ip')}
              disabled={!localIp}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Copy LAN IP"
            >
              {copiedKey === 'lan-ip' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
            <span>Subnet: {localIp?.subnetMask || 'Unavailable'}</span>
            <span>·</span>
            <span>Gateway: {localIp?.gateway || 'Unavailable'}</span>
          </div>
        </div>
      </div>

      {/* 3. Device MAC Address Quick Card */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-slate-200">Sample Device MAC Profile</h3>
          </div>
          <button
            onClick={() => onNavigateTab('mac')}
            className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors font-medium cursor-pointer"
          >
            Manage <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium">Sample Wi-Fi MAC ({primaryInterface.name})</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
              Sample value only
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="font-mono text-base font-bold text-white tracking-widest select-all">
              {primaryInterface.activeMac}
            </div>
            <button
              onClick={() => copyToClipboard(primaryInterface.activeMac, 'MAC Address', 'mac-addr')}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Copy MAC Address"
            >
              {copiedKey === 'mac-addr' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="text-xs text-slate-400 mt-1.5 flex items-center justify-between">
            <span>Sample hardware MAC: <code className="text-slate-300">{primaryInterface.hardwareMac}</code></span>
            <span className="text-[11px] text-teal-400 font-medium">Demo profile</span>
          </div>
        </div>
      </div>

      {/* 4. Live Speed Test Action Card */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-slate-200">Connection Benchmark</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Real-time Engine</span>
        </div>

        {latestSpeedRecord ? (
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 mb-3 text-center">
            <div>
              <div className="text-[10px] text-slate-400">Download</div>
              <div className="text-sm font-mono font-bold text-teal-400 mt-0.5 tabular-nums">
                {latestSpeedRecord.downloadMbps.toFixed(1)} <span className="text-[10px]">Mbps</span>
              </div>
            </div>
            <div className="border-x border-slate-800">
              <div className="text-[10px] text-slate-400">Upload</div>
              <div className="text-sm font-mono font-bold text-indigo-400 mt-0.5 tabular-nums">
                {latestSpeedRecord.uploadMbps.toFixed(1)} <span className="text-[10px]">Mbps</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Ping</div>
              <div className="text-sm font-mono font-bold text-slate-200 mt-0.5 tabular-nums">
                {latestSpeedRecord.pingMs} <span className="text-[10px]">ms</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 mb-3 text-center text-xs text-slate-400">
            No speed benchmark run yet. Tap below to test latency, download, and upload speeds.
          </div>
        )}

        <button
          onClick={() => onNavigateTab('speed')}
          className="w-full min-h-[46px] rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-teal-500/20 cursor-pointer"
        >
          <Gauge className="w-4 h-4 stroke-[2.5]" />
          <span>Launch Full Speed Test</span>
        </button>
      </div>

      {/* 5. Android Privacy & System Summary */}
      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400">
        <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          The MAC and interface values above are sample profile data only. Browser controls cannot change Wi-Fi, cellular, VPN, or device MAC settings; public IP changes are recorded only when the server measures a different address.
        </p>
      </div>
    </div>
  );
};
