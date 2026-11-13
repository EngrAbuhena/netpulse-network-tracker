import { EventEmitter } from 'node:events';
import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import pingHandler from '../api/ping';
import myIpHandler from '../api/my-ip';
import downloadHandler from '../api/speedtest/download';
import uploadHandler from '../api/speedtest/upload';
import { allowRequest } from '../server/apiHelpers';

class MockResponse extends EventEmitter {
  statusCode = 200;
  headers = new Map<string, string>();
  chunks: Buffer[] = [];
  ended = false;
  setHeader(name: string, value: string | number) { this.headers.set(name.toLowerCase(), String(value)); return this; }
  write(value: Buffer | string) { this.chunks.push(Buffer.isBuffer(value) ? value : Buffer.from(value)); return true; }
  end(value?: Buffer | string) {
    if (value) this.write(value);
    this.ended = true;
    this.emit('finish');
    return this;
  }
  flushHeaders() { return this; }
  get body() { return Buffer.concat(this.chunks).toString(); }
}

function makeRequest(method: string, url: string, headers: Record<string, string> = {}) {
  const req = new EventEmitter() as EventEmitter & Partial<IncomingMessage> & Record<string, unknown>;
  req.method = method;
  req.url = url;
  req.headers = headers;
  req.socket = { remoteAddress: '203.0.113.55' } as IncomingMessage['socket'];
  req.resume = (() => undefined) as unknown as IncomingMessage['resume'];
  return req;
}

describe('Vercel API function handlers', () => {
  it('answers ping GET and HEAD without caching', () => {
    const req = makeRequest('GET', '/api/ping');
    const res = new MockResponse();
    pingHandler(req as IncomingMessage, res as never);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('ok');
    expect(res.headers.get('cache-control')).toContain('no-store');

    const headRes = new MockResponse();
    pingHandler(makeRequest('HEAD', '/api/ping') as IncomingMessage, headRes as never);
    expect(headRes.statusCode).toBe(200);
    expect(headRes.body).toBe('');
  });

  it('returns a valid observed request IP', () => {
    const res = new MockResponse();
    myIpHandler(makeRequest('GET', '/api/my-ip', { 'x-real-ip': '198.51.100.7' }) as IncomingMessage, res as never);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).ip).toBe('198.51.100.7');
  });

  it('streams exactly the requested bounded download payload', () => {
    const res = new MockResponse();
    downloadHandler(makeRequest('GET', '/api/speedtest/download?bytes=1024') as IncomingMessage, res as never);
    expect(res.statusCode).toBe(200);
    expect(res.chunks.reduce((total, chunk) => total + chunk.length, 0)).toBe(1024);
    expect(res.headers.get('content-length')).toBe('1024');
  });

  it('enforces the per-instance upload rate guard', () => {
    const uniqueKey = `test-${Date.now()}`;
    for (let i = 0; i < 3; i++) expect(allowRequest(uniqueKey, 3, 60_000)).toBe(true);
    expect(allowRequest(uniqueKey, 3, 60_000)).toBe(false);
  });

  it('counts and discards upload bytes, and rejects oversized upload requests', () => {
    const req = makeRequest('POST', '/api/speedtest/upload', { 'content-length': '9', 'x-real-ip': '198.51.100.88' });
    const res = new MockResponse();
    uploadHandler(req as IncomingMessage, res as never);
    req.emit('data', Buffer.from('testbytes'));
    req.emit('end');
    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.bytesReceived).toBe(9);

    const tooLargeReq = makeRequest('POST', '/api/speedtest/upload', { 'content-length': String(300 * 1024), 'x-real-ip': '198.51.100.89' });
    const tooLargeRes = new MockResponse();
    uploadHandler(tooLargeReq as IncomingMessage, tooLargeRes as never);
    expect(tooLargeRes.statusCode).toBe(413);
  });
});
