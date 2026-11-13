import { isIP } from 'node:net';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Request = IncomingMessage & { headers: IncomingMessage['headers'] };

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

export default function handler(req: Request, res: ServerResponse): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  const ip = getClientIp(req);
  if (!ip) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'Client IP is unavailable' }));
    return;
  }
  res.statusCode = 200;
  res.end(JSON.stringify({ ip, source: 'request' }));
}
