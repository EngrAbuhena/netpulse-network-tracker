import type { IncomingMessage, ServerResponse } from 'node:http';

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  res.statusCode = 200;
  res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ timestamp: Date.now(), status: 'ok' }));
}
