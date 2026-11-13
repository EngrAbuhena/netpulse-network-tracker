import { randomBytes } from 'node:crypto';
import type { ApiRequest, ApiResponse } from '../../server/apiHelpers';
import { methodNotAllowed, queryValue, setNoStore } from '../../server/apiHelpers';

const MAX_BYTES = 1024 * 1024;

export default function handler(req: ApiRequest, res: ApiResponse): void {
  setNoStore(res);
  if (req.method !== 'GET') {
    methodNotAllowed(res, 'GET');
    return;
  }
  const rawBytes = queryValue(req, 'bytes') || String(MAX_BYTES);
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
