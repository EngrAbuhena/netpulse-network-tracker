import type { IncomingMessage, ServerResponse } from 'node:http';
import { isIP } from 'node:net';

export type ApiRequest = IncomingMessage & {
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
};
export type ApiResponse = ServerResponse;

export function setNoStore(res: ApiResponse): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

export function methodNotAllowed(res: ApiResponse, allow: string): void {
  res.setHeader('Allow', allow);
  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}

export function clientIp(req: ApiRequest): string | null {
  // Vercel supplies these forwarding headers. Never trust a client-provided value
  // as authentication; this is informational and only used for rate limiting.
  const candidates = [
    req.headers['x-real-ip'],
    typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0] : undefined,
    req.socket.remoteAddress,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const normalized = candidate.trim().replace(/^::ffff:/i, '');
    if (isIP(normalized)) return normalized;
  }
  return null;
}

export function queryValue(req: ApiRequest, key: string): string | undefined {
  const queryValue = req.query?.[key];
  if (typeof queryValue === 'string') return queryValue;
  if (Array.isArray(queryValue)) return queryValue[0];
  const url = new URL(req.url || '/', 'https://netpulse.invalid');
  return url.searchParams.get(key) || undefined;
}

// Per warm function instance guard. Configure Vercel Firewall rate limits too,
// since serverless instances do not share memory between cold starts/regions.
const windows = new Map<string, { start: number; count: number }>();
export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || now - current.start >= windowMs) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 2000) {
      for (const [entryKey, entry] of windows) {
        if (now - entry.start >= windowMs) windows.delete(entryKey);
      }
    }
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
