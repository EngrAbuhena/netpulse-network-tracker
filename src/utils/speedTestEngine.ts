import { ConnectionApiDetails, HostPingResult } from '../types/network';

function linkedTimeoutSignal(parent: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return parent ? AbortSignal.any([parent, timeoutSignal]) : timeoutSignal;
}

export function getNavigatorConnection(): ConnectionApiDetails {
  if (typeof navigator === 'undefined') return { online: true };
  type BrowserConnection = {
    effectiveType?: ConnectionApiDetails['effectiveType'];
    type?: ConnectionApiDetails['type'];
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  const nav = navigator as Navigator & {
    connection?: BrowserConnection;
    mozConnection?: BrowserConnection;
    webkitConnection?: BrowserConnection;
  };
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  return {
    online: navigator.onLine,
    effectiveType: conn?.effectiveType,
    type: conn?.type,
    downlink: conn?.downlink,
    rtt: conn?.rtt,
    saveData: conn?.saveData,
  };
}

export interface LatencyResult {
  avgPing: number;
  minPing: number;
  maxPing: number;
  jitter: number;
  pings: number[];
  packetLossPercent: number;
}

export async function measureLatency(
  samples = 6,
  onProgress?: (progress: number, currentPing: number) => void,
  signal?: AbortSignal,
): Promise<LatencyResult> {
  if (!Number.isInteger(samples) || samples < 1 || samples > 30) {
    throw new RangeError('Sample count must be an integer between 1 and 30.');
  }
  const pings: number[] = [];
  let failures = 0;
  for (let i = 0; i < samples; i++) {
    if (signal?.aborted) throw new DOMException('Test cancelled', 'AbortError');
    const started = performance.now();
    try {
      const response = await fetch(`/api/ping?_t=${Date.now()}_${i}`, {
        method: 'GET',
        cache: 'no-store',
        signal: linkedTimeoutSignal(signal, 2500),
      });
      if (!response.ok) throw new Error(`Ping endpoint returned HTTP ${response.status}`);
      pings.push(Math.max(1, Math.round(performance.now() - started)));
    } catch (error) {
      if (signal?.aborted) throw new DOMException('Test cancelled', 'AbortError');
      failures++;
    }
    onProgress?.(Math.round(((i + 1) / samples) * 100), pings[pings.length - 1] ?? 0);
    if (i < samples - 1) await new Promise((resolve) => setTimeout(resolve, 80));
  }
  if (pings.length === 0) throw new Error('Latency test failed: no ping requests succeeded.');
  const avgPing = Math.round(pings.reduce((sum, ping) => sum + ping, 0) / pings.length);
  const jitter = pings.length > 1
    ? Math.round((pings.slice(1).reduce((sum, ping, index) => sum + Math.abs(ping - pings[index]), 0) / (pings.length - 1)) * 10) / 10
    : 0;
  return {
    avgPing,
    minPing: Math.min(...pings),
    maxPing: Math.max(...pings),
    jitter,
    pings,
    packetLossPercent: Math.round((failures / samples) * 100),
  };
}

const DOWNLOAD_CHUNK_BYTES = 1024 * 1024;
const MAX_DOWNLOAD_BYTES = 24 * 1024 * 1024;

export async function runDownloadTest(
  targetDurationSeconds = 6,
  onUpdate: (currentMbps: number, peakMbps: number, progress: number, bytes: number) => void,
  signal?: AbortSignal,
): Promise<{ avgMbps: number; peakMbps: number; totalBytes: number }> {
  if (!Number.isFinite(targetDurationSeconds) || targetDurationSeconds <= 0) {
    throw new RangeError('Test duration must be greater than zero.');
  }
  const startedAt = performance.now();
  const deadline = startedAt + targetDurationSeconds * 1000;
  let totalBytes = 0;
  let peakMbps = 0;
  let streamId = 0;
  let completedStreams = 0;
  let failures = 0;

  const fetchStream = async () => {
    while (performance.now() < deadline && totalBytes < MAX_DOWNLOAD_BYTES) {
      if (signal?.aborted) throw new DOMException('Test cancelled', 'AbortError');
      const url = `/api/speedtest/download?bytes=${DOWNLOAD_CHUNK_BYTES}&_t=${Date.now()}_${streamId++}`;
      try {
        const response = await fetch(url, {
          cache: 'no-store',
          signal: linkedTimeoutSignal(signal, 3500),
        });
        if (!response.ok) throw new Error(`Download endpoint returned HTTP ${response.status}`);
        if (!response.body) throw new Error('Streaming response bodies are unavailable in this browser.');
        const reader = response.body.getReader();
        try {
          while (performance.now() < deadline && totalBytes < MAX_DOWNLOAD_BYTES) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;
            totalBytes += value.byteLength;
            const elapsed = Math.max((performance.now() - startedAt) / 1000, 0.05);
            const currentMbps = (totalBytes * 8) / (elapsed * 1_000_000);
            peakMbps = Math.max(peakMbps, currentMbps);
            onUpdate(
              Math.round(currentMbps * 10) / 10,
              Math.round(peakMbps * 10) / 10,
              Math.min(100, Math.round((elapsed / targetDurationSeconds) * 100)),
              totalBytes,
            );
          }
        } finally {
          await reader.cancel().catch(() => undefined);
        }
        completedStreams++;
      } catch (error) {
        if (signal?.aborted) throw new DOMException('Test cancelled', 'AbortError');
        failures++;
        // Do not invent transferred bytes. A later request can retry while time remains.
        if (failures >= 3) break;
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }
  };

  await Promise.all([fetchStream(), fetchStream()]);
  const elapsedSeconds = (performance.now() - startedAt) / 1000;
  if (totalBytes === 0 || completedStreams === 0) {
    throw new Error('Download test failed: no bytes were received from the test endpoint.');
  }
  const avgMbps = (totalBytes * 8) / (elapsedSeconds * 1_000_000);
  return {
    avgMbps: Math.round(avgMbps * 10) / 10,
    peakMbps: Math.round(Math.max(avgMbps, peakMbps) * 10) / 10,
    totalBytes,
  };
}

const UPLOAD_CHUNK_BYTES = 256 * 1024;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function runUploadTest(
  targetDurationSeconds = 4,
  onUpdate: (currentMbps: number, progress: number, bytes: number) => void,
  signal?: AbortSignal,
): Promise<{ avgMbps: number; totalBytes: number }> {
  if (!Number.isFinite(targetDurationSeconds) || targetDurationSeconds <= 0) {
    throw new RangeError('Test duration must be greater than zero.');
  }
  const startedAt = performance.now();
  const deadline = startedAt + targetDurationSeconds * 1000;
  const payload = new Uint8Array(UPLOAD_CHUNK_BYTES);
  for (let offset = 0; offset < payload.length; offset += 65_536) {
    crypto.getRandomValues(payload.subarray(offset, Math.min(offset + 65_536, payload.length)));
  }

  let totalBytes = 0;
  while (performance.now() < deadline && totalBytes < MAX_UPLOAD_BYTES) {
    if (signal?.aborted) throw new DOMException('Test cancelled', 'AbortError');
    const response = await fetch('/api/speedtest/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: payload,
      cache: 'no-store',
      signal: linkedTimeoutSignal(signal, 3000),
    });
    if (!response.ok) {
      const details = await response.json().catch(() => ({}));
      throw new Error(details.error || `Upload endpoint returned HTTP ${response.status}`);
    }
    const result = await response.json() as { bytesReceived?: number };
    if (result.bytesReceived !== payload.byteLength) {
      throw new Error('Upload endpoint did not confirm the complete payload.');
    }
    totalBytes += result.bytesReceived;
    const elapsed = Math.max((performance.now() - startedAt) / 1000, 0.05);
    const currentMbps = (totalBytes * 8) / (elapsed * 1_000_000);
    onUpdate(
      Math.round(currentMbps * 10) / 10,
      Math.min(100, Math.round((elapsed / targetDurationSeconds) * 100)),
      totalBytes,
    );
  }

  const elapsedSeconds = (performance.now() - startedAt) / 1000;
  if (totalBytes === 0) throw new Error('Upload test failed: no bytes were confirmed by the server.');
  return {
    avgMbps: Math.round(((totalBytes * 8) / (elapsedSeconds * 1_000_000)) * 10) / 10,
    totalBytes,
  };
}

export async function pingHost(host: string, samples = 4): Promise<HostPingResult> {
  const normalized = host.trim().replace(/^https?:\/\//i, '').split(/[/?#]/, 1)[0];
  let parsed: URL;
  try {
    parsed = new URL(`https://${normalized}`);
  } catch {
    throw new Error('Enter a valid hostname or IP address.');
  }
  const hostName = parsed.hostname;
  const validDomain = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*\.?$/i.test(hostName);
  const validIpv6Literal = /^\[[0-9a-f:]+\]$/i.test(hostName);
  if (!hostName || parsed.username || parsed.password || (!validDomain && !validIpv6Literal) || /\s|%/.test(normalized) || !Number.isInteger(samples) || samples < 1 || samples > 20) {
    throw new Error('Enter a valid hostname or IP address.');
  }

  const pings: number[] = [];
  for (let i = 0; i < samples; i++) {
    const started = performance.now();
    try {
      // This is an HTTP(S) browser probe, not ICMP ping. Opaque no-cors responses
      // are expected for other origins; only network failures count as lost probes.
      await fetch(`https://${parsed.host}/favicon.ico?_np=${Date.now()}_${i}`, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: AbortSignal.timeout(2500),
      });
      pings.push(Math.max(1, Math.round(performance.now() - started)));
    } catch {
      // Failed samples are omitted and included in packetLossPercent.
    }
    if (i < samples - 1) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (pings.length === 0) throw new Error(`All HTTP probes to ${parsed.host} failed.`);
  const avgMs = Math.round(pings.reduce((sum, value) => sum + value, 0) / pings.length);
  const jitterMs = pings.length > 1
    ? Math.round((pings.slice(1).reduce((sum, value, index) => sum + Math.abs(value - pings[index]), 0) / (pings.length - 1)) * 10) / 10
    : 0;
  return {
    host: parsed.host,
    pings,
    avgMs,
    minMs: Math.min(...pings),
    maxMs: Math.max(...pings),
    jitterMs,
    lossPercent: Math.round(((samples - pings.length) / samples) * 100),
    status: 'success',
  };
}
