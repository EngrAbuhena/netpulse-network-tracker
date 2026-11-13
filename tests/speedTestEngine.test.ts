import { afterEach, describe, expect, it, vi } from 'vitest';
import { measureLatency, pingHost, runDownloadTest, runUploadTest } from '../src/utils/speedTestEngine';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('network measurement failures', () => {
  it('reports successful HTTP endpoint samples and actual failed-probe percentage', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(new Response('{"status":"ok"}', { status: 200 }))
      .mockRejectedValueOnce(new TypeError('network unavailable'))
      .mockResolvedValueOnce(new Response('{"status":"ok"}', { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);

    const result = await measureLatency(3);
    expect(result.pings).toHaveLength(2);
    expect(result.avgPing).toBeGreaterThan(0);
    expect(result.packetLossPercent).toBe(33);
  });

  it('throws when every app ping request fails instead of inventing latency', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(measureLatency(2)).rejects.toThrow(/no ping requests succeeded/i);
  });

  it('rejects host probes with no successful requests instead of returning random samples', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('blocked')));
    await expect(pingHost('example.test', 2)).rejects.toThrow(/all HTTP probes/i);
  });

  it('validates host input and sample count', async () => {
    await expect(pingHost('not a valid host', 2)).rejects.toThrow(/valid hostname/i);
    await expect(pingHost('example.test', 21)).rejects.toThrow(/valid hostname/i);
  });

  it('does not report a download speed when the transfer endpoint is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(runDownloadTest(0.05, () => undefined)).rejects.toThrow(/no bytes were received/i);
  });

  it('does not count failed upload requests as transferred bytes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    await expect(runUploadTest(1, () => undefined)).rejects.toThrow(/HTTP 503/i);
  });
});
