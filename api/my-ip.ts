import type { ApiRequest, ApiResponse } from '../server/apiHelpers';
import { clientIp, methodNotAllowed, setNoStore } from '../server/apiHelpers';

export default function handler(req: ApiRequest, res: ApiResponse): void {
  setNoStore(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    methodNotAllowed(res, 'GET');
    return;
  }
  const ip = clientIp(req);
  if (!ip) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'Client IP is unavailable' }));
    return;
  }
  res.statusCode = 200;
  res.end(JSON.stringify({ ip, source: 'request' }));
}
