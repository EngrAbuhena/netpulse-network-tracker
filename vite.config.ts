import { randomBytes } from 'node:crypto';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

const uploadRateLimits = new Map<string, { start: number; count: number }>();

function speedTestApiPlugin(): Plugin {
  return {
    name: 'speed-test-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        
        // Accurate zero-delay ping endpoint
        if (url.pathname === '/api/ping' && (req.method === 'GET' || req.method === 'HEAD')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.statusCode = 200;
          res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ timestamp: Date.now(), status: 'ok' }));
          return;
        }

        // Client IP inspection from headers
        if (url.pathname === '/api/my-ip' && req.method === 'GET') {
          const realIp = req.headers['x-real-ip'];
          const forwarded = req.headers['x-forwarded-for'];
          const ip = typeof realIp === 'string' ? realIp.trim() : typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || 'unknown';
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify({ ip: ip.replace(/^::ffff:/, ''), source: 'request' }));
          return;
        }

        // Bounded download endpoint for measured throughput tests.
        if (url.pathname === '/api/speedtest/download' && req.method === 'GET') {
          const requestedBytes = Number(url.searchParams.get('bytes') || '1048576');
          if (!Number.isInteger(requestedBytes) || requestedBytes < 1024 || requestedBytes > 1024 * 1024) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'bytes must be an integer from 1024 to 1048576' }));
            return;
          }
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Content-Length', requestedBytes.toString());
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          
          const chunkSize = 65536;
          let sent = 0;
          const chunk = randomBytes(chunkSize);
          
          function sendChunk() {
            while (sent < requestedBytes) {
              const remaining = requestedBytes - sent;
              const currentChunk = remaining < chunkSize ? chunk.subarray(0, remaining) : chunk;
              const canContinue = res.write(currentChunk);
              sent += currentChunk.length;
              if (!canContinue) {
                res.once('drain', sendChunk);
                return;
              }
            }
            res.end();
          }
          sendChunk();
          return;
        }

        // Upload benchmark sink
        if (url.pathname === '/api/speedtest/upload' && req.method === 'POST') {
          const maxUploadBytes = 256 * 1024;
          const forwardedForRateLimit = req.headers['x-forwarded-for'];
          const rateKey = typeof forwardedForRateLimit === 'string' ? forwardedForRateLimit.split(',')[0].trim() : req.socket.remoteAddress || 'unknown';
          const now = Date.now();
          const rateWindow = uploadRateLimits.get(rateKey);
          if (rateWindow && now - rateWindow.start < 60_000 && rateWindow.count >= 30) {
            res.statusCode = 429;
            res.setHeader('Retry-After', '60');
            res.end(JSON.stringify({ error: 'Upload test rate limit reached; retry in one minute.' }));
            req.resume();
            return;
          }
          if (!rateWindow || now - rateWindow.start >= 60_000) uploadRateLimits.set(rateKey, { start: now, count: 1 });
          else rateWindow.count++;
          if (Number(req.headers['content-length'] || 0) > maxUploadBytes) {
            res.statusCode = 413;
            res.end(JSON.stringify({ error: `Upload payload exceeds ${maxUploadBytes} bytes.` }));
            req.resume();
            return;
          }
          let tooLarge = false;
          let bytesReceived = 0;
          const startTime = Date.now();
          req.on('data', (chunk) => {
            bytesReceived += chunk.length;
            if (bytesReceived > maxUploadBytes) tooLarge = true;
          });
          req.on('end', () => {
            if (tooLarge) {
              res.statusCode = 413;
              res.end(JSON.stringify({ error: `Upload payload exceeds ${maxUploadBytes} bytes.` }));
              return;
            }
            if (bytesReceived === 0) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Upload payload is empty.' }));
              return;
            }
            const durationMs = Math.max(Date.now() - startTime, 1);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.end(JSON.stringify({
              bytesReceived,
              durationMs,
              bps: (bytesReceived * 8) / (durationMs / 1000)
            }));
          });
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), speedTestApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      allowedHosts: ['.e2b.app'],
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

