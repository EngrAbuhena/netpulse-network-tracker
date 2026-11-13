import React, { useState, useRef } from 'react';
import { Play, Square, ArrowDown, ArrowUp, Clock, Activity } from 'lucide-react';
import { ConnectionApiDetails, LiveSpeedMetrics, PublicIpInfo, RollingTelemetryPoint, SpeedTestRecord } from '../../types/network';
import { SpeedGauge } from '../SpeedGauge';
import { RollingSpeedChart } from '../RollingSpeedChart';
import { measureLatency, runDownloadTest, runUploadTest } from '../../utils/speedTestEngine';

interface SpeedTestTabProps {
  publicIp: PublicIpInfo | null;
  connection: ConnectionApiDetails;
  onAddSpeedRecord: (record: SpeedTestRecord) => void;
  onShowToast: (msg: string) => void;
}

export const SpeedTestTab: React.FC<SpeedTestTabProps> = ({
  publicIp,
  connection,
  onAddSpeedRecord,
  onShowToast,
}) => {
  const [metrics, setMetrics] = useState<LiveSpeedMetrics>({
    downloadMbps: 0,
    uploadMbps: 0,
    pingMs: 0,
    jitterMs: 0,
    packetLossPercent: 0,
    peakDownloadMbps: 0,
    minPingMs: 0,
    maxPingMs: 0,
    bytesDownloaded: 0,
    bytesUploaded: 0,
    progressPercent: 0,
    stage: 'idle',
  });

  const [testMode, setTestMode] = useState<'standard' | 'quick'>('standard');
  const [rollingData, setRollingData] = useState<RollingTelemetryPoint[]>([]);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const controllerRef = useRef<AbortController | null>(null);

  const startSpeedTest = async () => {
    if (isTesting) {
      controllerRef.current?.abort();
      setIsTesting(false);
      setMetrics((m) => ({ ...m, stage: 'idle', errorMessage: undefined }));
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setIsTesting(true);
    setRollingData([]);

    const downloadDuration = testMode === 'quick' ? 3.5 : 8;
    const uploadDuration = testMode === 'quick' ? 2.5 : 5;

    // Reset metrics
    setMetrics({
      downloadMbps: 0,
      uploadMbps: 0,
      pingMs: 0,
      jitterMs: 0,
      packetLossPercent: 0,
      peakDownloadMbps: 0,
      minPingMs: 0,
      maxPingMs: 0,
      bytesDownloaded: 0,
      bytesUploaded: 0,
      progressPercent: 0,
      stage: 'ping',
    });

    try {
      // 1. Latency & Jitter Stage
      const pingResult = await measureLatency(testMode === 'quick' ? 4 : 8, (progress, currentPing) => {
        if (controller.signal.aborted) return;
        setMetrics((m) => ({
          ...m,
          pingMs: currentPing,
          progressPercent: Math.round(progress * 0.2),
        }));
      }, controller.signal);

      if (controller.signal.aborted) return;

      setMetrics((m) => ({
        ...m,
        pingMs: pingResult.avgPing,
        minPingMs: pingResult.minPing,
        maxPingMs: pingResult.maxPing,
        jitterMs: pingResult.jitter,
        packetLossPercent: pingResult.packetLossPercent,
        stage: 'download',
        progressPercent: 20,
      }));

      // 2. Download Speed Stage
      const downloadResult = await runDownloadTest(
        downloadDuration,
        (currentMbps, peakMbps, prog, bytes) => {
          if (controller.signal.aborted) return;
          setRollingData((items) => [...items, { timestamp: Date.now(), downloadMbps: currentMbps, uploadMbps: 0, pingMs: pingResult.avgPing }].slice(-30));
          setMetrics((m) => ({
            ...m,
            downloadMbps: currentMbps,
            peakDownloadMbps: peakMbps,
            bytesDownloaded: bytes,
            progressPercent: 20 + Math.round(prog * 0.45),
          }));
        },
        controller.signal,
      );

      if (controller.signal.aborted) return;

      setMetrics((m) => ({
        ...m,
        downloadMbps: downloadResult.avgMbps,
        peakDownloadMbps: downloadResult.peakMbps,
        bytesDownloaded: downloadResult.totalBytes,
        stage: 'upload',
        progressPercent: 65,
      }));

      // 3. Upload Speed Stage
      const uploadResult = await runUploadTest(uploadDuration, (currentMbps, prog, bytes) => {
        if (controller.signal.aborted) return;
        setRollingData((items) => [...items, { timestamp: Date.now(), downloadMbps: downloadResult.avgMbps, uploadMbps: currentMbps, pingMs: pingResult.avgPing }].slice(-30));
        setMetrics((m) => ({
          ...m,
          uploadMbps: currentMbps,
          bytesUploaded: bytes,
          progressPercent: 65 + Math.round(prog * 0.35),
        }));
      }, controller.signal);

      if (controller.signal.aborted) return;

      // 4. Test Completed
      setMetrics((m) => ({
        ...m,
        uploadMbps: uploadResult.avgMbps,
        bytesUploaded: uploadResult.totalBytes,
        stage: 'complete',
        progressPercent: 100,
      }));

      setIsTesting(false);

      // Save record to history
      const newRecord: SpeedTestRecord = {
        id: `rec_${Date.now()}`,
        timestamp: Date.now(),
        downloadMbps: downloadResult.avgMbps,
        uploadMbps: uploadResult.avgMbps,
        pingMs: pingResult.avgPing,
        jitterMs: pingResult.jitter,
        packetLossPercent: pingResult.packetLossPercent,
        connectionType: connection.type || 'unknown',
        serverLocation: 'Application endpoint (region unavailable)',
        publicIp: publicIp?.ip || 'Unavailable',
      };
      onAddSpeedRecord(newRecord);
      onShowToast(`Speed test completed: ${downloadResult.avgMbps} Mbps Download`);
    } catch (err) {
      if (controller.signal.aborted) {
        setMetrics((m) => ({ ...m, stage: 'idle', errorMessage: undefined }));
      } else {
        console.error('Speed test error:', err);
        setMetrics((m) => ({
          ...m,
          stage: 'error',
          errorMessage: err instanceof Error ? err.message : 'Network test failed.',
        }));
      }
    } finally {
      setIsTesting(false);
      controllerRef.current = null;
    }
  };

  const currentDisplaySpeed =
    metrics.stage === 'upload'
      ? metrics.uploadMbps
      : metrics.stage === 'download'
      ? metrics.downloadMbps
      : metrics.downloadMbps || metrics.uploadMbps || 0;

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 overflow-y-auto max-w-xl mx-auto">
      <p className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
        Measurements use this app’s HTTP endpoints (not ICMP). A run transfers at most 24 MB down and 5 MB up; your IP is visible to the hosting provider.
      </p>

      {/* Test Mode Segmented Control */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-2xl select-none">
        <button
          onClick={() => setTestMode('standard')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            testMode === 'standard'
              ? 'bg-teal-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Standard (12s)
        </button>
        <button
          onClick={() => setTestMode('quick')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            testMode === 'quick'
              ? 'bg-teal-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Quick (6s)
        </button>
      </div>

      {/* Main Speedometer Gauge Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-lg flex flex-col items-center">
        <SpeedGauge
          speedMbps={currentDisplaySpeed}
          stage={metrics.stage}
          pingMs={metrics.pingMs}
          jitterMs={metrics.jitterMs}
          peakMbps={metrics.peakDownloadMbps}
          isTesting={isTesting}
        />

        {/* Primary CTA Button */}
        <div className="w-full max-w-xs mt-4">
          <button
            onClick={startSpeedTest}
            className={`w-full min-h-[50px] rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg cursor-pointer ${
              isTesting
                ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/25'
            }`}
          >
            {isTesting ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Cancel Benchmark</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{metrics.stage === 'complete' ? 'Run Again' : 'Start Speed Benchmark'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Download Card */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
            <ArrowDown className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Download Speed</div>
            <div className="text-lg font-mono font-bold text-white tabular-nums">
              {metrics.bytesDownloaded ? metrics.downloadMbps.toFixed(1) : '—'} <span className="text-xs text-teal-400 font-sans">Mbps</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Peak: {metrics.peakDownloadMbps > 0 ? `${metrics.peakDownloadMbps.toFixed(1)} Mbps` : '—'}
            </div>
          </div>
        </div>

        {/* Upload Card */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <ArrowUp className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Upload Speed</div>
            <div className="text-lg font-mono font-bold text-white tabular-nums">
              {metrics.bytesUploaded ? metrics.uploadMbps.toFixed(1) : '—'} <span className="text-xs text-indigo-400 font-sans">Mbps</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Sent: {(metrics.bytesUploaded / (1024 * 1024)).toFixed(1)} MB
            </div>
          </div>
        </div>

        {/* Latency (Ping) Card */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Latency / Ping</div>
            <div className="text-lg font-mono font-bold text-white tabular-nums">
              {metrics.pingMs > 0 ? metrics.pingMs : '—'} <span className="text-xs text-slate-400 font-sans">ms</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Min: {metrics.minPingMs || '—'} · Max: {metrics.maxPingMs || '—'} ms · Failed probes: {metrics.packetLossPercent}%
            </div>
          </div>
        </div>

        {/* Jitter Card */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Jitter Variance</div>
            <div className="text-lg font-mono font-bold text-white tabular-nums">
              {metrics.jitterMs > 0 ? metrics.jitterMs : '—'} <span className="text-xs text-slate-400 font-sans">ms</span>
            </div>
            <div className="text-[10px] text-slate-400">HTTP sample variation</div>
          </div>
        </div>
      </div>

      {metrics.errorMessage && <p role="alert" className="rounded-xl border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">{metrics.errorMessage}</p>}

      {/* Chart contains samples from this run only; it is not background telemetry. */}
      <RollingSpeedChart data={rollingData} height={125} />

      {/* Server & Node Details */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-3.5 text-xs text-slate-300 flex items-center justify-between">
        <div>
          <span className="text-slate-400 block text-[10px]">Test Node / Gateway</span>
          <span className="font-semibold text-slate-200">
            {publicIp?.city ? `${publicIp.city}, ${publicIp.country}` : 'Vercel endpoint (region not exposed)'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-slate-400 block text-[10px]">ISP / Backbone</span>
          <span className="font-semibold text-teal-400 truncate max-w-[160px] inline-block">
            {publicIp?.isp || 'Not provided'}
          </span>
        </div>
      </div>
    </div>
  );
};
