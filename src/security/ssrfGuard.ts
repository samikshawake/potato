/**
 * SSRF (Server-Side Request Forgery) Prevention & Outbound URL Validator.
 *
 * CashCompass operates 100% offline by default. If any external release artifact URL
 * or webhook endpoint is ever checked, this guard strictly rejects:
 * - Non-HTTPS protocols (`http:`, `file:`, `ftp:`, `gopher:`, `data:`, `javascript:`)
 * - Loopback & localhost (`localhost`, `127.0.0.0/8`, `0.0.0.0`, `::1`)
 * - Private RFC1918 networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
 * - Cloud Instance Metadata endpoints (`169.254.169.254`, `metadata.google.internal`, `fd00:ec2::254`)
 * - Embedded URL credentials (`https://user:pass@host`)
 */

export interface SsrfValidationResult {
  allowed: boolean;
  normalizedOrigin?: string;
  reason: string;
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '169.254.169.254',
  'metadata.google.internal',
  'metadata',
  'instance-data',
  '[::1]',
  '[::]',
]);

function isPrivateOrReservedIPv4(hostname: string): string | null {
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) return null;

  const octets = ipv4Match.slice(1).map(Number);
  if (octets.some((o) => o < 0 || o > 255)) {
    return 'Malformed IPv4 address';
  }

  const [a, b] = octets;
  if (a === 0) return 'Blocked 0.0.0.0/8 reserved network';
  if (a === 10) return 'Blocked RFC1918 private network (10.0.0.0/8)';
  if (a === 100 && b >= 64 && b <= 127) return 'Blocked Carrier-Grade NAT (100.64.0.0/10)';
  if (a === 127) return 'Blocked loopback range (127.0.0.0/8)';
  if (a === 169 && b === 254) return 'Blocked link-local / Cloud Metadata endpoint (169.254.0.0/16)';
  if (a === 172 && b >= 16 && b <= 31) return 'Blocked RFC1918 private network (172.16.0.0/12)';
  if (a === 192 && b === 168) return 'Blocked RFC1918 private network (192.168.0.0/16)';
  if (a >= 224) return 'Blocked multicast / reserved IPv4 range';

  return null;
}

function isPrivateOrReservedIPv6(hostname: string): string | null {
  const clean = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!clean.includes(':')) return null;

  if (clean === '::1' || clean === '::') return 'Blocked IPv6 loopback/unspecified address';
  if (clean.startsWith('fe80:')) return 'Blocked IPv6 link-local range (fe80::/10)';
  if (clean.startsWith('fc') || clean.startsWith('fd')) {
    return 'Blocked IPv6 Unique Local Address / metadata range (fc00::/7)';
  }
  if (clean.startsWith('::ffff:')) {
    return 'Blocked IPv4-mapped IPv6 address';
  }
  return null;
}

const ALLOWED_EXTERNAL_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
]);

export function validateUrlAgainstSSRF(
  rawUrl: string,
  enforceReleaseAllowlist = true
): SsrfValidationResult {
  if (!rawUrl || !rawUrl.trim()) {
    return { allowed: false, reason: 'Empty URL rejected' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { allowed: false, reason: 'Malformed URL syntax' };
  }

  if (parsed.protocol !== 'https:') {
    return {
      allowed: false,
      reason: `Blocked insecure or local protocol "${parsed.protocol}" — only strict https: is permitted`,
    };
  }

  if (parsed.username || parsed.password) {
    return {
      allowed: false,
      reason: 'Blocked embedded credentials in URL authority',
    };
  }

  const host = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.internal') || host.endsWith('.local')) {
    return {
      allowed: false,
      reason: `Blocked internal / metadata hostname "${host}"`,
    };
  }

  const ipv4Issue = isPrivateOrReservedIPv4(host);
  if (ipv4Issue) {
    return { allowed: false, reason: ipv4Issue };
  }

  const ipv6Issue = isPrivateOrReservedIPv6(host);
  if (ipv6Issue) {
    return { allowed: false, reason: ipv6Issue };
  }

  if (enforceReleaseAllowlist && !ALLOWED_EXTERNAL_HOSTS.has(host)) {
    return {
      allowed: false,
      reason: `Host "${host}" is not on the CashCompass strict release allowlist (github.com only)`,
    };
  }

  return {
    allowed: true,
    normalizedOrigin: parsed.origin,
    reason: 'Passed HTTPS, private-IP CIDR, metadata, and domain allowlist checks',
  };
}
