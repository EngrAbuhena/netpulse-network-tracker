import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateSubnet, getFlagEmoji, isIpAddress } from '../src/utils/ipUtils';

afterEach(() => vi.restoreAllMocks());

describe('IP and subnet helpers', () => {
  it('validates IPv4/IPv6 without accepting malformed addresses', () => {
    expect(isIpAddress('192.0.2.14')).toBe(true);
    expect(isIpAddress('2001:db8::1')).toBe(true);
    expect(isIpAddress('999.1.1.1')).toBe(false);
    expect(isIpAddress('01.2.3.4')).toBe(false);
    expect(isIpAddress('::::')).toBe(false);
  });

  it('calculates a /24 network correctly', () => {
    const result = calculateSubnet('192.168.10.22', 24);
    expect(result.mask).toBe('255.255.255.0');
    expect(result.networkAddress).toBe('192.168.10.0');
    expect(result.broadcastAddress).toBe('192.168.10.255');
    expect(result.firstUsableIp).toBe('192.168.10.1');
    expect(result.lastUsableIp).toBe('192.168.10.254');
    expect(result.usableHosts).toBe(254);
  });

  it('handles /31, /32 and /0 boundary prefixes', () => {
    expect(calculateSubnet('192.0.2.4', 31).usableHosts).toBe(2);
    expect(calculateSubnet('192.0.2.4', 32).usableHosts).toBe(1);
    expect(calculateSubnet('10.0.0.1', 0).networkAddress).toBe('0.0.0.0');
  });

  it('rejects invalid IP and CIDR input rather than substituting a sample address', () => {
    expect(() => calculateSubnet('not-an-ip', 24)).toThrow(/valid IPv4/);
    expect(() => calculateSubnet('192.168.0.1', 33)).toThrow(/CIDR/);
    expect(() => calculateSubnet('192.168.0.1', 24.5)).toThrow(/CIDR/);
  });

  it('only creates flag emojis from two-letter country codes', () => {
    expect(getFlagEmoji('bd')).toBe('🇧🇩');
    expect(getFlagEmoji('x')).toBe('🌐');
  });
});
