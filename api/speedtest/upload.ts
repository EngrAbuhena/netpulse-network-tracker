import { isIP } from 'node:net';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Request = IncomingMessage & { headers: IncomingMessage['headers'] };
const MAX_BYTES = 256 * 1024;
const REQUESTS_PER_MINUTE = 30;
const windows = new Map<string, { start: number; count: number }>();

export const config = { api: { bodyParser: false } };

function getClientIp(req: Request): string | null {
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

function isAllowed(key: string): boolean {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || now - current.start >= 60_000) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 2000) {
      for (const [entryKey, entry] of windows) {
        if (now - entry.start >= 60_000) windows.delete(entryKey);
      }
    }
    return true;
  }
  if (current.count >= REQUESTS_PER_MINUTE) return false;
  current.count++;
  return true;
}

export default function handler(req: Request, res: ServerResponse): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const clientIp = getClientIp(req) || 'unknown';
  if (!isAllowed(clientIp)) {
    res.setHeader('Retry-After', '60');
    res.statusCode = 429;
    res.end(JSON.stringify({ error: 'Upload test rate limit reached; retry in one minute.' }));
    req.resume();
    return;
  }

  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > MAX_BYTES) {
    res.statusCode = 413;
    res.end(JSON.stringify({ error: `Upload payload exceeds ${MAX_BYTES} bytes.` }));
    req.resume();
    return;
  }

  const startedAt = Date.now();
  let bytesReceived = 0;
  let tooLarge = false;
  req.on('data', (chunk: Buffer | string) => {
    bytesReceived += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
    if (bytesReceived > MAX_BYTES) tooLarge = true;
  });
  req.on('end', () => {
    if (tooLarge) {
      res.statusCode = 413;
      res.end(JSON.stringify({ error: `Upload payload exceeds ${MAX_BYTES} bytes.` }));
      return;
    }
    if (bytesReceived === 0) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Upload payload is empty.' }));
      return;
    }
    const durationMs = Math.max(1, Date.now() - startedAt);
    const bps = (bytesReceived * 8) / (durationMs / 1000);
    res.statusCode = 200;
    res.end(JSON.stringify({ bytesReceived, durationMs, bps }));
  });
  req.on('error', () => {
    if (!res.headersSent) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Unable to read upload payload.' }));
    }
  });
}
