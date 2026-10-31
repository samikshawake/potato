/**
 * PII & Credential Redacting Logger ("Keep sensitive data out of logs").
 * Automatically strips passwords, JWTs, Bearer tokens, bank account numbers,
 * card numbers, UTR references, and raw statement rows before recording events.
 */

export interface SafeAuditEvent {
  id: string;
  timestamp: string;
  category: 'AUTH' | 'SECURITY' | 'INGESTION' | 'PRIVACY';
  action: string;
  redactedSummary: string;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'salt',
  'jwt',
  'token',
  'secret',
  'authorization',
  'cookie',
  'csvtext',
  'rawstatement',
  'accountnumber',
  'cardnumber',
  'pan',
]);

export function redactSensitiveString(input: string): string {
  return (
    input
      // Redact JWT strings (eyJ...)
      .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]')
      // Redact Bearer tokens
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]')
      // Redact 10-19 digit account/card numbers
      .replace(/\b\d{10,19}\b/g, '[REDACTED_ACCT_NUM]')
      // Redact UTR / bank ref identifiers
      .replace(/\b(?:UTR|REF)[A-Z0-9]{5,20}\b/gi, '[REDACTED_REF]')
      // Partially mask email addresses (s***@domain.com)
      .replace(/\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, '$1***@$2')
  );
}

export function sanitizeObjectForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      clean[key] = redactSensitiveString(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value;
    } else if (Array.isArray(value)) {
      clean[key] = `[Array(${value.length})]`;
    } else if (value && typeof value === 'object') {
      clean[key] = sanitizeObjectForLog(value as Record<string, unknown>);
    }
  }
  return clean;
}

class SafeSecurityLogger {
  private events: SafeAuditEvent[] = [];

  public record(
    category: SafeAuditEvent['category'],
    action: string,
    metadata: Record<string, unknown> = {}
  ): SafeAuditEvent {
    const sanitized = sanitizeObjectForLog(metadata);
    const summaryPairs = Object.entries(sanitized).map(([k, v]) => `${k}=${String(v)}`);
    const entry: SafeAuditEvent = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      category,
      action: redactSensitiveString(action),
      redactedSummary: summaryPairs.length > 0 ? summaryPairs.join(' · ') : 'No PII fields logged',
    };
    this.events = [entry, ...this.events].slice(0, 40);
    return entry;
  }

  public getEvents(): SafeAuditEvent[] {
    return this.events;
  }

  public clear(): void {
    this.events = [];
  }
}

export const safeLogger = new SafeSecurityLogger();
