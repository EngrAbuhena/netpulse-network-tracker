import type { ApiRequest, ApiResponse } from '../../server/apiHelpers';
import { allowRequest, clientIp, methodNotAllowed, setNoStore } from '../../server/apiHelpers';

const MAX_BYTES = 256 * 1024;
const REQUESTS_PER_MINUTE = 30;

export const config = { api: { bodyParser: false } };

export default function handler(req: ApiRequest, res: ApiResponse): void {
  setNoStore(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    methodNotAllowed(res, 'POST');
    return;
  }

  const ip = clientIp(req) || 'unknown';
  if (!allowRequest(ip, REQUESTS_PER_MINUTE, 60_000)) {
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
