import React, { useState } from 'react';
import {
  Wrench,
  Radio,
  Calculator,
  ShieldAlert,
  History,
  Download,
  FileText,
  Copy,
  Check,
  Trash2,
  Play,
  Share2,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';
import { HostPingResult, LocalIpInfo, PublicIpInfo, SpeedTestRecord, SubnetCalcResult } from '../../types/network';
import { pingHost } from '../../utils/speedTestEngine';
import { calculateSubnet } from '../../utils/ipUtils';
import { copyText } from '../../utils/clipboard';

interface ToolsTabProps {
  publicIp: PublicIpInfo | null;
  localIp: LocalIpInfo | null;
  speedRecords: SpeedTestRecord[];
  onClearRecords: () => void;
  onShowToast: (msg: string) => void;
}

export const ToolsTab: React.FC<ToolsTabProps> = ({
  publicIp,
  localIp,
  speedRecords,
  onClearRecords,
  onShowToast,
}) => {
  // 1. Host Ping State
  const [pingTarget, setPingTarget] = useState<string>('1.1.1.1');
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<HostPingResult | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);

  // 2. Subnet Calc State
  const [subnetIp, setSubnetIp] = useState<string>('192.168.1.1');
  const [subnetCidr, setSubnetCidr] = useState<number>(24);
  let subnetResult: SubnetCalcResult | null = null;
  let subnetError = '';
  try { subnetResult = calculateSubnet(subnetIp, subnetCidr); }
  catch (error) { subnetError = error instanceof Error ? error.message : 'Invalid IPv4 input.'; }

  // 3. WebRTC Leak Test
  const [leakAudited, setLeakAudited] = useState<boolean>(false);

  // 4. Copied key
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleRunPing = async () => {
    if (!pingTarget) return;
    setIsPinging(true);
    setPingError(null);
    try {
      const res = await pingHost(pingTarget, 5);
      setPingResult(res);
      onShowToast(`HTTP probe to ${res.host} completed: ${res.avgMs} ms avg`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'HTTP probe failed';
      setPingResult(null);
      setPingError(message);
      onShowToast(message);
    } finally {
      setIsPinging(false);
    }
  };

  const handleExportCsv = () => {
    if (speedRecords.length === 0) {
      onShowToast('No speed test records to export');
      return;
    }

    const headers = 'Timestamp,Download (Mbps),Upload (Mbps),HTTP latency (ms),Jitter (ms),Failed probes (%),Type,Server,Public IP\n';
    const rows = speedRecords
      .map(
        (r) =>
          `"${new Date(r.timestamp).toISOString()}",${r.downloadMbps},${r.uploadMbps},${r.pingMs},${r.jitterMs},${r.packetLossPercent ?? ''},"${r.connectionType}","${r.serverLocation}","${r.publicIp}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netpulse-speed-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Exported speed records to CSV');
  };

  const handleExportJson = () => {
    const report = {
      device: 'NetPulse browser diagnostics',
      generatedAt: new Date().toISOString(),
      publicIp,
      localIp,
      speedHistory: speedRecords,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netpulse-diagnostic-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Exported diagnostic report JSON');
  };

  const handleCopyDiagnosticSummary = () => {
    const text = `=== NetPulse Browser Network Diagnostic ===
Generated: ${new Date().toLocaleString()}
Public IPv4: ${publicIp?.ip || 'N/A'}
ISP / Organization: ${publicIp?.isp || 'N/A'} (${publicIp?.asn || ''})
Location: ${publicIp?.city || ''}, ${publicIp?.region || ''}, ${publicIp?.country || ''}
LAN IP: ${localIp?.ip || 'Unavailable'}
Subnet Mask: ${localIp?.subnetMask || 'Unavailable'}
Gateway: ${localIp?.gateway || 'Unavailable'}
Latest Download: ${speedRecords[0] ? `${speedRecords[0].downloadMbps} Mbps` : 'N/A'}
Latest Upload: ${speedRecords[0] ? `${speedRecords[0].uploadMbps} Mbps` : 'N/A'}
HTTP latency: ${speedRecords[0] ? `${speedRecords[0].pingMs} ms` : 'N/A'} (Jitter: ${speedRecords[0]?.jitterMs ?? 'N/A'} ms, failed probes: ${speedRecords[0]?.packetLossPercent ?? 'N/A'}%)
===========================================`;

    void copyText(text).then((copied) => {
      if (!copied) { onShowToast('Clipboard unavailable; select and copy the report manually.'); return; }
      setCopiedKey('summary');
      onShowToast('Copied browser diagnostic report to clipboard');
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 overflow-y-auto max-w-xl mx-auto">
      {/* 1. Host Ping & Latency Utility */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Target Host HTTP Latency Probe</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Browser HTTP(S) probe · not ICMP</span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={pingTarget}
            onChange={(e) => setPingTarget(e.target.value)}
            placeholder="Host or IP (e.g. 1.1.1.1 or google.com)"
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
          />
          <button
            onClick={handleRunPing}
            disabled={isPinging}
            className="min-h-[42px] px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isPinging ? 'Pinging...' : 'Ping'}</span>
          </button>
        </div>

        {/* Preset quick buttons */}
        <div className="flex items-center gap-2 flex-wrap mb-3 text-[10px] text-slate-400">
          <span>Presets:</span>
          {['1.1.1.1 (Cloudflare)', '8.8.8.8 (Google)', '9.9.9.9 (Quad9)', 'github.com'].map((preset) => {
            const host = preset.split(' ')[0];
            return (
              <button
                key={host}
                onClick={() => setPingTarget(host)}
                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white font-mono cursor-pointer transition-colors"
              >
                {preset}
              </button>
            );
          })}
        </div>

        {pingError && <p role="alert" className="mb-3 text-xs text-rose-300">{pingError}</p>}

        {/* Ping Results */}
        {pingResult && (
          <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 text-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="font-semibold text-white font-mono">{pingResult.host}</span>
              <span className="text-emerald-400 font-semibold font-mono">{pingResult.lossPercent}% failed probes</span>
            </div>

            <p className="text-[10px] text-slate-500 mb-2">HTTP(S) timing from this browser; not ICMP ping. Cross-origin probes may be blocked or opaque.</p>
            <div className="grid grid-cols-4 gap-2 text-center py-2 border-y border-slate-800/80 mb-2">
              <div>
                <div className="text-[10px] text-slate-400">Average</div>
                <div className="font-mono font-bold text-white text-sm tabular-nums">{pingResult.avgMs} ms</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Min</div>
                <div className="font-mono font-bold text-slate-300 text-sm tabular-nums">{pingResult.minMs} ms</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Max</div>
                <div className="font-mono font-bold text-slate-300 text-sm tabular-nums">{pingResult.maxMs} ms</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Jitter</div>
                <div className="font-mono font-bold text-teal-400 text-sm tabular-nums">{pingResult.jitterMs} ms</div>
              </div>
            </div>

            {/* Individual samples strip */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <span>Samples:</span>
              {pingResult.pings.map((p, idx) => (
                <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                  {p}ms
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Interactive Subnet Calculator */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">IPv4 Subnet Calculator</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">CIDR Math</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="col-span-2">
            <label className="text-[10px] text-slate-400 block mb-1">IPv4 address (example input)</label>
            <input
              type="text"
              value={subnetIp}
              onChange={(e) => setSubnetIp(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-teal-400"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Prefix / CIDR</label>
            <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-teal-400 font-bold text-center">
              /{subnetCidr}
            </div>
          </div>
        </div>

        {subnetError && <p role="alert" className="mb-2 text-[11px] text-rose-300">{subnetError}</p>}

        {/* CIDR Slider */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Subnet Slider</span>
            <span className="font-mono text-slate-300">Mask: {subnetResult?.mask || '—'}</span>
          </div>
          <input
            type="range"
            min="8"
            max="30"
            value={subnetCidr}
            onChange={(e) => setSubnetCidr(parseInt(e.target.value, 10))}
            className="w-full accent-teal-400 cursor-pointer"
          />
        </div>

        {/* Calculation Matrix */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block">Network Address</span>
            <span className="font-mono font-semibold text-white">{subnetResult?.networkAddress || '—'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block">Broadcast Address</span>
            <span className="font-mono font-semibold text-white">{subnetResult?.broadcastAddress || '—'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block">Usable Host Range</span>
            <span className="font-mono text-[11px] font-semibold text-slate-200">
              {subnetResult ? `${subnetResult.firstUsableIp} - ${subnetResult.lastUsableIp}` : '—'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block">Total Usable Hosts</span>
            <span className="font-mono font-bold text-teal-400 tabular-nums">
              {subnetResult ? `${subnetResult.usableHosts.toLocaleString()} hosts` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. WebRTC & DNS Privacy Audit */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Network Leak & Security Audit</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">WebRTC / DNS</span>
        </div>

        <div className="flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div>
              <div className="font-semibold text-slate-200">WebRTC Private IP Exposure</div>
              <div className="text-[11px] text-slate-400">
                {localIp ? (localIp.isWebrtcExposed ? 'A private host candidate was visible to this page' : 'No private candidate was exposed to this page') : 'The browser did not expose a detectable local candidate.'}
              </div>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                !localIp ? 'bg-slate-800 text-slate-400' : localIp.isWebrtcExposed
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {localIp ? (localIp.isWebrtcExposed ? 'Visible' : 'Not exposed') : 'Unavailable'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div>
              <div className="font-semibold text-slate-200">DNS Server Alignment</div>
              <div className="text-[11px] text-slate-400">Browser pages cannot inspect the device’s DNS resolver.</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
              Not measured
            </span>
          </div>
        </div>
      </div>

      {/* 4. Speed Test History & Export */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Speed Test Records & Export</h3>
          </div>
          {speedRecords.length > 0 && (
            <button
              onClick={onClearRecords}
              className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Action Export Buttons */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            onClick={handleExportCsv}
            disabled={speedRecords.length === 0}
            className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportJson}
            className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-teal-400" />
            <span>JSON</span>
          </button>
          <button
            onClick={handleCopyDiagnosticSummary}
            className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedKey === 'summary' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-teal-400" />}
            <span>Report</span>
          </button>
        </div>

        {/* History Table List */}
        {speedRecords.length === 0 ? (
          <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800/60 text-xs text-slate-400 text-center">
            No speed benchmark tests conducted yet. Run a test in the Speed tab to populate records.
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
            {speedRecords.map((rec) => (
              <div
                key={rec.id}
                className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-0.5">
                    <span>{new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>·</span>
                    <span className="capitalize">{rec.connectionType}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono font-bold text-white tabular-nums">
                    <span className="text-teal-400">↓ {rec.downloadMbps.toFixed(1)} M</span>
                    <span className="text-indigo-400">↑ {rec.uploadMbps.toFixed(1)} M</span>
                    <span className="text-slate-300">HTTP {rec.pingMs} ms · {rec.packetLossPercent ?? '—'}% failed</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-mono text-right">
                  {rec.publicIp}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Vercel deployment information */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-5 h-5 text-teal-400" />
          <h3 className="text-sm font-semibold text-white">Vercel deployment</h3>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          This project includes Vercel Functions for the measured IP, latency, and speed-test endpoints. Deploy the repository root with the included vercel.json. Configure a Vercel Firewall rate limit for the public upload-test route before sharing the site.
        </p>
      </div>
    </div>
  );
};

