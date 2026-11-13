import React, { useState } from 'react';
import {
  Globe,
  MapPin,
  Server,
  Shield,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Compass,
  ArrowRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { IpChangeEvent, LocalIpInfo, PublicIpInfo } from '../../types/network';
import { copyText } from '../../utils/clipboard';

interface IpTrackerTabProps {
  publicIp: PublicIpInfo | null;
  localIp: LocalIpInfo | null;
  ipHistory: IpChangeEvent[];
  onRefreshIp: () => void;
  isRefreshing: boolean;
  onShowToast: (msg: string) => void;
}

export const IpTrackerTab: React.FC<IpTrackerTabProps> = ({
  publicIp,
  localIp,
  ipHistory,
  onRefreshIp,
  isRefreshing,
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

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 overflow-y-auto max-w-xl mx-auto">
      <p className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
        Public IP is read by this app’s server; the hosting provider necessarily sees your request IP. No third-party geolocation provider is contacted. Browsers may hide local IP details.
      </p>
      {/* 1. Public IP Hero Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Public IP Address (WAN)</h3>
          </div>
          <button
            onClick={onRefreshIp}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Public IPv4 Display */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-slate-300">Public IP Address</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-400 font-bold">
              {publicIp?.type || 'Unavailable'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="font-mono text-xl font-extrabold text-white tracking-wider select-all tabular-nums">
              {publicIp ? publicIp.ip : (isRefreshing ? 'Looking up…' : 'Unavailable')}
            </div>
            <button
              onClick={() => publicIp && copyToClipboard(publicIp.ip, 'Public IP', 'pub-ip')}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Copy IPv4"
            >
              {copiedKey === 'pub-ip' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Public IPv6 Display */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-slate-300">IPv6 Address</span>
            <span className="text-[10px] font-mono text-indigo-400 font-semibold">Dual-Stack</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs font-semibold text-slate-300 truncate max-w-[240px] select-all">
              {publicIp?.type === 'IPv6' ? publicIp.ip : 'Not detected'}
            </div>
            <button
              disabled={publicIp?.type !== 'IPv6'}
              onClick={() => publicIp?.type === 'IPv6' && copyToClipboard(publicIp.ip, 'IPv6', 'pub-ipv6')}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Copy IPv6"
            >
              {copiedKey === 'pub-ipv6' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ISP & Autonomous System (ASN) */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block mb-0.5">ISP / Provider</span>
            <span className="font-semibold text-slate-200 block truncate" title={publicIp?.isp}>
              {publicIp?.isp || 'Not provided'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block mb-0.5">Autonomous System (ASN)</span>
            <span className="font-semibold text-teal-400 block truncate font-mono text-[11px]" title={publicIp?.asn}>
              {publicIp?.asn || 'Not provided'}
            </span>
          </div>
        </div>
      </div>

      {/* Geo-location is intentionally omitted; no location provider is used. */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-5 h-5 text-slate-400" />
          <h3 className="text-sm font-semibold text-white">Geographic IP Location</h3>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">Location, ISP, ASN, and coordinates are not looked up. No estimated location is shown in order to avoid presenting guesses as facts.</p>
      </div>

      {/* 3. Local Private Network (LAN) Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Local Device LAN (Private IP)</h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
            Browser candidate (may be hidden)
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-medium text-slate-300">Client Private IP</span>
            <span className="text-[10px] font-mono text-teal-400">{localIp ? 'Browser candidate' : 'Not available'}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="font-mono text-lg font-bold text-white tracking-wider select-all tabular-nums">
              {localIp?.ip || 'Unavailable in this browser'}
            </div>
            <button
              disabled={!localIp}
              onClick={() => localIp && copyToClipboard(localIp.ip, 'LAN IP', 'lan-ip-full')}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Copy LAN IP"
            >
              {copiedKey === 'lan-ip-full' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Subnet Specs */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block">Subnet Mask</span>
            <span className="font-mono font-semibold text-slate-200">{localIp?.subnetMask || 'Not available'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block">Default Gateway (Router)</span>
            <span className="font-mono font-semibold text-slate-200">{localIp?.gateway || 'Not available'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block">Broadcast Address</span>
            <span className="font-mono font-semibold text-slate-200">{localIp?.broadcast || 'Not available'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block">STUN NAT Type</span>
            <span className="font-semibold text-emerald-400">{localIp?.natType || 'Not measured'}</span>
          </div>
        </div>
      </div>

      {/* 4. Real-Time IP Handoff Log */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Network IP Change Log</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Real-time Handoffs</span>
        </div>

        {ipHistory.length === 0 ? (
          <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800/60 text-xs text-slate-400 text-center">
            Public IP changes are logged only when the server reports a different address. Preview toggles do not change your network.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {ipHistory.map((item) => (
              <div key={item.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs">
                <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
                  <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  <span className="font-medium text-teal-400">{item.networkType}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-slate-200">
                  <span className="text-slate-400 truncate max-w-[110px]">{item.oldIp}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="font-bold text-white truncate max-w-[110px]">{item.newIp}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{item.reason}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
