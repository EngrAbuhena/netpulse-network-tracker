import type { ApiRequest, ApiResponse } from '../server/apiHelpers';
import { methodNotAllowed, setNoStore } from '../server/apiHelpers';

export default function handler(req: ApiRequest, res: ApiResponse): void {
  setNoStore(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    methodNotAllowed(res, 'GET, HEAD');
    return;
  }
  res.statusCode = 200;
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(JSON.stringify({ timestamp: Date.now(), status: 'ok' }));
}
