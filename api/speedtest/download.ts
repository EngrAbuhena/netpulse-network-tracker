import { randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const MAX_BYTES = 1024 * 1024;

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  const url = new URL(req.url || '/', 'https://netpulse.invalid');
  const rawBytes = url.searchParams.get('bytes') || String(MAX_BYTES);
  const parsedBytes = Number(rawBytes);
  if (!Number.isInteger(parsedBytes) || parsedBytes < 1024 || parsedBytes > MAX_BYTES) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: `bytes must be an integer from 1024 to ${MAX_BYTES}` }));
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', String(parsedBytes));
  res.setHeader('Content-Encoding', 'identity');
  res.flushHeaders?.();
  let remaining = parsedBytes;
  const chunkSize = 64 * 1024;
  const sendChunk = () => {
    while (remaining > 0) {
      const size = Math.min(remaining, chunkSize);
      remaining -= size;
      if (!res.write(randomBytes(size))) {
        res.once('drain', sendChunk);
        return;
      }
    }
    res.end();
  };
  sendChunk();
}
