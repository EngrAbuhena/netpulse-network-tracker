export interface PublicIpInfo {
  ip: string;
  type: 'IPv4' | 'IPv6';
  isp?: string;
  org?: string;
  asn?: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  flag?: string;
  latitude?: number;
  longitude?: number;
  postal?: string;
  timezone?: string;
  currency?: string;
  lastUpdated: number;
}

export interface LocalIpInfo {
  ip: string;
  type: 'IPv4' | 'IPv6';
  subnetMask?: string;
  gateway?: string;
  broadcast?: string;
  cidr?: number;
  usableHosts?: number;
  ipRange?: string;
  natType?: string;
  isWebrtcExposed: boolean;
}

export interface NetworkInterface {
  name: string;
  displayName: string;
  type: 'wifi' | 'cellular' | 'vpn' | 'ethernet' | 'p2p';
  activeMac: string;
  hardwareMac: string;
  isRandomized: boolean;
  vendor: string;
  status: 'connected' | 'disconnected' | 'idle';
  bssid?: string; // Wi-Fi router AP MAC
  ssid?: string;
  frequency?: string;
  channel?: number;
  signalDbm?: number;
  linkSpeedMbps?: number;
  ipv4?: string;
  ipv6?: string;
  mtu?: number;
  txBytes?: number;
  rxBytes?: number;
}

export interface LiveSpeedMetrics {
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs: number;
  packetLossPercent: number;
  peakDownloadMbps: number;
  minPingMs: number;
  maxPingMs: number;
  bytesDownloaded: number;
  bytesUploaded: number;
  progressPercent: number;
  stage: 'idle' | 'ping' | 'download' | 'upload' | 'complete' | 'error';
  errorMessage?: string;
}

export interface RollingTelemetryPoint {
  timestamp: number;
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
}

export interface ConnectionApiDetails {
  effectiveType?: '5g' | '4g' | '3g' | '2g' | 'slow-2g';
  type?: 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'other' | 'none' | 'unknown';
  downlink?: number; // Mbps
  rtt?: number; // ms
  saveData?: boolean;
  online: boolean;
}

export interface SpeedTestRecord {
  id: string;
  timestamp: number;
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs: number;
  packetLossPercent?: number;
  connectionType: string;
  serverLocation: string;
  publicIp: string;
}

export interface IpChangeEvent {
  id: string;
  timestamp: number;
  oldIp: string;
  newIp: string;
  networkType: string;
  reason: string;
}

export interface HostPingResult {
  host: string;
  ip?: string;
  pings: number[];
  avgMs: number;
  minMs: number;
  maxMs: number;
  jitterMs: number;
  lossPercent: number;
  status: 'idle' | 'running' | 'success' | 'failed';
}

export interface SubnetCalcResult {
  cidr: number;
  mask: string;
  networkAddress: string;
  broadcastAddress: string;
  firstUsableIp: string;
  lastUsableIp: string;
  totalHosts: number;
  usableHosts: number;
  wildcardMask: string;
  ipBinary: string;
  maskBinary: string;
  ipClass: 'A' | 'B' | 'C' | 'D' | 'E';
}
