import { LocalIpInfo, PublicIpInfo, SubnetCalcResult } from '../types/network';

export async function detectLocalIpViaWebRTC(): Promise<LocalIpInfo | null> {
  if (typeof RTCPeerConnection === 'undefined') return null;
  return new Promise((resolve) => {
    let settled = false;
    let pc: RTCPeerConnection | null = null;
    const finish = (result: LocalIpInfo | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { pc?.close(); } catch { /* ignore cleanup errors */ }
      resolve(result);
    };
    const timeout = setTimeout(() => finish(null), 2500);
    try {
      // No third-party STUN service: browsers often hide host IPs using mDNS,
      // and detection is intentionally allowed to fail rather than invent data.
      pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('netpulse-local-candidate');
      pc.onicecandidate = (event) => {
        const candidate = event.candidate?.candidate;
        if (!candidate) {
          finish(null);
          return;
        }
        const ipv4 = candidate.match(/(?:^|\s)(\d{1,3}(?:\.\d{1,3}){3})(?:\s|$)/)?.[1];
        if (ipv4) {
          const octets = ipv4.split('.').map(Number);
          const valid = octets.length === 4 && octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);
          const privateAddress = valid && (
            octets[0] === 10 ||
            octets[0] === 192 && octets[1] === 168 ||
            octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31
          );
          if (privateAddress) {
            finish({ ip: ipv4, type: 'IPv4', isWebrtcExposed: true });
            return;
          }
        }
        const ipv6 = candidate.match(/(?:^|\s)([0-9a-f:]{3,})(?:\s|$)/i)?.[1];
        if (ipv6 && (ipv6.toLowerCase().startsWith('fd') || ipv6.toLowerCase().startsWith('fe80:'))) {
          finish({ ip: ipv6, type: 'IPv6', isWebrtcExposed: true });
        }
      };
      pc.createOffer().then((offer) => pc?.setLocalDescription(offer)).catch(() => finish(null));
    } catch {
      finish(null);
    }
  });
}

/** Returns the public-facing IP observed by this app's own Vercel/server endpoint. */
export async function fetchPublicIpDetails(): Promise<PublicIpInfo | null> {
  try {
    const response = await fetch('/api/my-ip', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`IP endpoint returned HTTP ${response.status}`);
    const data = await response.json() as { ip?: string };
    if (!data.ip || !isIpAddress(data.ip)) throw new Error('The IP endpoint returned an invalid address.');
    return {
      ip: data.ip,
      type: data.ip.includes(':') ? 'IPv6' : 'IPv4',
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.warn('Public IP lookup failed:', error);
    return null;
  }
}

export function isIpAddress(value: string): boolean {
  if (value.includes(':')) {
    try { return new URL(`http://[${value}]/`).hostname.length > 0; }
    catch { return false; }
  }
  const parts = value.split('.');
  return parts.length === 4 && parts.every((part) => /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255);
}

export function getFlagEmoji(countryCode: string): string {
  if (!/^[a-z]{2}$/i.test(countryCode)) return '🌐';
  return String.fromCodePoint(...countryCode.toUpperCase().split('').map((char) => 127397 + char.charCodeAt(0)));
}

export function calculateSubnet(ip: string, cidr: number = 24): SubnetCalcResult {
  const parts = ip.split('.');
  const validIp = parts.length === 4 && parts.every((part) => /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255);
  if (!validIp) throw new RangeError('Enter a valid IPv4 address.');
  if (!Number.isInteger(cidr) || cidr < 0 || cidr > 32) throw new RangeError('CIDR prefix must be an integer from 0 to 32.');

  const octets = parts.map(Number);
  const safeCidr = cidr;
  let maskInt = 0;
  for (let i = 0; i < safeCidr; i++) maskInt |= 1 << (31 - i);
  maskInt >>>= 0;
  const maskOctets = [(maskInt >>> 24) & 255, (maskInt >>> 16) & 255, (maskInt >>> 8) & 255, maskInt & 255];
  const ipInt = ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
  const networkInt = (ipInt & maskInt) >>> 0;
  const wildcardInt = (~maskInt) >>> 0;
  const broadcastInt = (networkInt | wildcardInt) >>> 0;
  const intToIp = (num: number) => [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
  const totalHosts = Math.pow(2, 32 - safeCidr);
  const usableHosts = safeCidr >= 31 ? (safeCidr === 31 ? 2 : 1) : totalHosts - 2;
  const firstUsableInt = safeCidr >= 31 ? networkInt : networkInt + 1;
  const lastUsableInt = safeCidr >= 31 ? broadcastInt : broadcastInt - 1;
  const firstOctet = octets[0];
  const ipClass = firstOctet >= 1 && firstOctet <= 126 ? 'A'
    : firstOctet >= 128 && firstOctet <= 191 ? 'B'
    : firstOctet >= 192 && firstOctet <= 223 ? 'C'
    : firstOctet >= 224 && firstOctet <= 239 ? 'D' : 'E';
  const toBinary8 = (num: number) => num.toString(2).padStart(8, '0');

  return {
    cidr: safeCidr,
    mask: maskOctets.join('.'),
    networkAddress: intToIp(networkInt),
    broadcastAddress: intToIp(broadcastInt),
    firstUsableIp: intToIp(firstUsableInt),
    lastUsableIp: intToIp(lastUsableInt),
    totalHosts,
    usableHosts,
    wildcardMask: intToIp(wildcardInt),
    ipBinary: octets.map(toBinary8).join('.'),
    maskBinary: maskOctets.map(toBinary8).join('.'),
    ipClass,
  };
}
