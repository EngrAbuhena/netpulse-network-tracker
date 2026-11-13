import { NetworkInterface } from '../types/network';

// Database of major IEEE OUI (Organizationally Unique Identifier) vendor prefixes
const OUI_DATABASE: Record<string, string> = {
  // Google / Pixel
  '3C:5A:37': 'Google LLC (Pixel Device)',
  'D8:3A:DD': 'Google LLC (Pixel Device)',
  'F4:F5:DB': 'Google LLC (Pixel/Nest)',
  '00:1A:11': 'Google LLC',
  'AC:37:43': 'Google LLC (Chromecast/Pixel)',
  '48:D6:D5': 'Google LLC',
  '54:60:09': 'Google LLC',

  // Samsung Electronics
  '00:12:47': 'Samsung Electronics',
  '18:3A:2D': 'Samsung Electronics (Galaxy)',
  '24:4B:FE': 'Samsung Electronics (Galaxy)',
  '50:01:D9': 'Samsung Electronics',
  '84:25:19': 'Samsung Electronics',
  'B0:C4:E7': 'Samsung Electronics (Galaxy)',
  'D0:B3:3F': 'Samsung Electronics',
  'F8:04:2E': 'Samsung Electronics',
  '38:F9:D3': 'Samsung Electronics (Exynos/Galaxy)',
  '44:91:60': 'Samsung Electronics',
  '78:47:1D': 'Samsung Electronics',
  '90:F1:AA': 'Samsung Electronics',

  // Apple Inc.
  '00:1C:B3': 'Apple, Inc.',
  '3C:06:30': 'Apple, Inc. (iPhone/iPad)',
  '68:5B:35': 'Apple, Inc.',
  'AC:BC:32': 'Apple, Inc.',
  'F0:18:98': 'Apple, Inc.',
  'BC:54:36': 'Apple, Inc.',
  'A4:83:E7': 'Apple, Inc.',
  'DC:A9:04': 'Apple, Inc.',

  // OnePlus / Oppo / Realme (BBK Electronics)
  '98:09:CF': 'OnePlus Technology',
  'C4:B3:01': 'OnePlus Technology',
  'E8:8D:28': 'OnePlus Technology',
  '54:14:73': 'Oppo Electronics Corp',
  'A0:93:47': 'Oppo Electronics Corp',

  // Xiaomi Communications
  '64:09:80': 'Xiaomi Communications',
  '78:11:DC': 'Xiaomi Communications',
  'AC:C1:EE': 'Xiaomi Communications',
  'B0:D5:9D': 'Xiaomi Communications',
  '50:64:2B': 'Xiaomi Communications',

  // Motorola / Lenovo
  '00:23:68': 'Motorola Mobility LLC',
  '40:88:05': 'Motorola Mobility LLC',
  '80:6C:1B': 'Motorola Mobility LLC',
  'E0:9D:31': 'Motorola Mobility LLC',
  '00:18:DE': 'Lenovo Mobile',

  // Network Equipment & Routers (Access Points / BSSID)
  '50:C7:BF': 'TP-Link Corporation',
  '60:32:B1': 'TP-Link Corporation',
  'C0:06:C3': 'TP-Link Corporation',
  'EC:08:6B': 'TP-Link Corporation',
  '14:CC:20': 'TP-Link Technologies',
  '00:00:0C': 'Cisco Systems',
  '00:01:42': 'Cisco Systems',
  '00:1D:A1': 'Cisco Systems',
  '0C:D0:F8': 'Cisco Meraki',
  '28:52:61': 'Netgear Inc.',
  'B0:7F:B9': 'Netgear Inc.',
  '24:A4:3C': 'Ubiquiti Networks Inc.',
  '74:83:C2': 'Ubiquiti Networks Inc.',
  '78:8A:20': 'Ubiquiti Networks Inc.',
  'DC:39:6F': 'ASUSTeK Computer Inc.',
  '04:D9:F5': 'ASUSTeK Computer Inc.',
  'F4:8C:50': 'AVM Audiovisuelles (Fritz!Box)',
  '34:31:C4': 'AVM Audiovisuelles (Fritz!Box)',
  '00:1F:33': 'Netgear Inc.',

  // Chipsets & Wi-Fi Modems (Broadcom, Intel, Qualcomm, Realtek, MediaTek)
  '00:1B:21': 'Intel Corporate',
  '34:13:E8': 'Intel Corporate (Wi-Fi 6 AX200)',
  '68:05:CA': 'Intel Corporate',
  'A0:36:BC': 'Intel Corporate',
  '00:03:7F': 'Qualcomm Atheros',
  '00:0A:F5': 'Qualcomm Inc.',
  '80:4E:81': 'Qualcomm Inc. (Snapdragon Wi-Fi)',
  '00:10:18': 'Broadcom Corporation',
  'B8:27:EB': 'Raspberry Pi Foundation',
  'DC:A6:32': 'Raspberry Pi Trading Ltd',
  'E4:5F:01': 'Raspberry Pi Trading Ltd',
  '00:E0:4C': 'Realtek Semiconductor',
  '54:EE:75': 'Realtek Semiconductor',
  '00:0C:E7': 'MediaTek Inc.',
  'E8:9F:80': 'MediaTek Inc.',
  'FC:EC:DA': 'Ubiquiti Networks',
  '00:26:55': 'Huawei Technologies',
  '70:72:3C': 'Huawei Technologies',
  '00:0E:08': 'Sony Mobile Communications',
  '24:21:AB': 'Sony Corporation',
  '00:1F:E2': 'LG Electronics',
};

/**
 * Checks if a MAC address has the IEEE 802 Locally Administered Address (LAA) bit set.
 * In IEEE 802, the second-least-significant bit of the first byte indicates:
 * 0 = Globally Unique / Universal (Burned-in Factory OUI)
 * 1 = Locally Administered (Randomized MAC used by Android 10+ and iOS)
 * This corresponds to the 2nd hex digit being 2, 6, A, or E.
 */
export function isLocallyAdministered(mac: string): boolean {
  const clean = mac.replace(/[^a-fA-F0-9]/g, '');
  if (clean.length < 2) return false;
  const firstByte = parseInt(clean.substring(0, 2), 16);
  // Bit 1 (value 2) = Locally Administered
  return (firstByte & 0x02) !== 0;
}

/**
 * Checks if a MAC is a Multicast address (least significant bit of first octet is 1)
 */
export function isMulticast(mac: string): boolean {
  const clean = mac.replace(/[^a-fA-F0-9]/g, '');
  if (clean.length < 2) return false;
  const firstByte = parseInt(clean.substring(0, 2), 16);
  return (firstByte & 0x01) !== 0;
}

/**
 * Cleans and formats a MAC address into specified separator
 */
export function formatMac(mac: string, separator: ':' | '-' | '.' | 'none' = ':'): string {
  const clean = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (clean.length !== 12) return mac;

  if (separator === 'none') return clean;
  if (separator === '.') {
    return `${clean.substring(0, 4)}.${clean.substring(4, 8)}.${clean.substring(8, 12)}`;
  }
  return clean.match(/.{1,2}/g)?.join(separator) || clean;
}

/**
 * Looks up vendor by OUI or determines if randomized
 */
export function lookupMacDetails(mac: string): {
  vendor: string;
  isRandomized: boolean;
  isMulticast: boolean;
  ouiPrefix: string;
  isValid: boolean;
} {
  const clean = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (clean.length < 6) {
    return {
      vendor: 'Unknown / Incomplete MAC',
      isRandomized: false,
      isMulticast: false,
      ouiPrefix: '',
      isValid: false,
    };
  }

  const ouiPrefix = `${clean.substring(0, 2)}:${clean.substring(2, 4)}:${clean.substring(4, 6)}`;
  const randomized = isLocallyAdministered(clean);
  const multicast = isMulticast(clean);

  if (randomized) {
    return {
      vendor: 'Android Randomized MAC (Private Wi-Fi)',
      isRandomized: true,
      isMulticast: multicast,
      ouiPrefix,
      isValid: clean.length === 12,
    };
  }

  const matchedVendor = OUI_DATABASE[ouiPrefix];
  return {
    vendor: matchedVendor || 'Unregistered / Private Hardware Vendor',
    isRandomized: false,
    isMulticast: multicast,
    ouiPrefix,
    isValid: clean.length === 12,
  };
}

/** Generates a locally administered unicast sample MAC. Does not change device hardware. */
export function generateRandomizedMac(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  bytes[0] = (bytes[0] & 0xfe) | 0x02;
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0').toUpperCase()).join(':');
}

/**
 * Sample Android interface profile for UI preview only; not read from the host device.
 */
export function getDefaultAndroidInterfaces(): NetworkInterface[] {
  // Typical Google Pixel or Samsung Galaxy device hardware
  const randomizedWlanMac = 'DA:A1:19:7E:42:B8';
  const hardwarePhoneMac = '38:F9:D3:84:C1:20'; // Samsung / Pixel OUI
  const routerBssid = '50:C7:BF:33:9A:14'; // TP-Link Access Point BSSID

  return [
    {
      name: 'wlan0',
      displayName: 'Wi-Fi 6 (802.11ax)',
      type: 'wifi',
      activeMac: randomizedWlanMac,
      hardwareMac: hardwarePhoneMac,
      isRandomized: true,
      vendor: 'Qualcomm FastConnect 7800 / Android OS',
      status: 'connected',
      bssid: routerBssid,
      ssid: 'Pixel_Mesh_5GHz',
      frequency: '5.240 GHz (Ch 48)',
      channel: 48,
      signalDbm: -48,
      linkSpeedMbps: 866,
      ipv4: '192.168.1.142',
      ipv6: 'fe80::d8a1:19ff:fe7e:42b8',
      mtu: 1500,
      txBytes: 14829000,
      rxBytes: 89410000,
    },
    {
      name: 'rmnet_data0',
      displayName: 'Cellular 5G Sub-6',
      type: 'cellular',
      activeMac: '80:4E:81:4A:2B:6F',
      hardwareMac: '80:4E:81:4A:2B:6F',
      isRandomized: false,
      vendor: 'Qualcomm Snapdragon X75 5G Modem',
      status: 'idle',
      signalDbm: -78,
      linkSpeedMbps: 350,
      ipv4: '10.145.88.23',
      ipv6: '2607:fb90:e200::1',
      mtu: 1420,
      txBytes: 2410000,
      rxBytes: 5120000,
    },
    {
      name: 'tun0',
      displayName: 'Secure VPN Tunnel',
      type: 'vpn',
      activeMac: '02:00:54:75:6E:30',
      hardwareMac: '02:00:54:75:6E:30',
      isRandomized: true,
      vendor: 'WireGuard / Android VpnService',
      status: 'disconnected',
      linkSpeedMbps: 1000,
      ipv4: '10.8.0.2',
      mtu: 1420,
      txBytes: 0,
      rxBytes: 0,
    },
    {
      name: 'p2p0',
      displayName: 'Wi-Fi Direct (Quick Share)',
      type: 'p2p',
      activeMac: '3A:F9:D3:84:C1:21',
      hardwareMac: '3A:F9:D3:84:C1:21',
      isRandomized: true,
      vendor: 'Android P2P / Nearby Share',
      status: 'idle',
      linkSpeedMbps: 300,
      mtu: 1500,
      txBytes: 0,
      rxBytes: 0,
    },
  ];
}
