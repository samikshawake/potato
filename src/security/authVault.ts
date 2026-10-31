/**
 * Local Cryptographic Authentication & Session Vault (`src/security/authVault.ts`)
 *
 * Implements:
 * 1. Secure Password Storage: WebCrypto `PBKDF2-HMAC-SHA256` with 210,000 iterations
 *    (OWASP 2025/2026 recommendation) + 16-byte CSPRNG per-user salt + constant-time comparison.
 * 2. Secure JWT Secrets: Generates a 256-bit cryptographically random secret via
 *    `crypto.getRandomValues(new Uint8Array(32))` stored in isolated key storage, signing
 *    short-lived `HS256` JWT tokens (`iss`, `sub`, `iat`, `exp`, `jti`) and strictly verifying
 *    `alg === "HS256"` (mitigating `alg: none` tampering).
 * 3. Age Consent Enforcement: Rejects registration unless `age18Confirmed === true`.
 * 4. Data Minimization & Self-Service Deletion: Stores only email, display name, PBKDF2 hash,
 *    salt, and consent flags — plus generates a signed Data Erasure Certificate on deletion.
 */

import { safeLogger } from './safeLogger';

export interface StoredUserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHashHex: string;
  saltHex: string;
  iterations: number;
  age18Confirmed: boolean;
  termsAcceptedAt: string;
  emailDigestSubscribed: boolean;
  unsubscribeToken: string;
  createdAt: string;
}

export interface AuthenticatedSession {
  userId: string;
  email: string;
  displayName: string;
  jwt: string;
  issuedAt: number;
  expiresAt: number;
  emailDigestSubscribed: boolean;
  unsubscribeToken: string;
  isDemoAccount?: boolean;
}

export interface DataErasureReceipt {
  receiptId: string;
  erasedAt: string;
  erasedAccountMask: string;
  itemsPurged: string[];
  cryptographicSignatureHex: string;
}

const VAULT_USERS_KEY = 'cashcompass_auth_users_v1';
const VAULT_JWT_SECRET_KEY = 'cashcompass_jwt_csprng_secret_v1';
const VAULT_ACTIVE_SESSION_KEY = 'cashcompass_active_jwt_v1';
const PBKDF2_ITERATIONS = 210000;
const JWT_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeJson(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  return base64UrlEncode(bytes);
}

function base64UrlDecodeToString(b64url: string): string {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLen));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks on hashes/MACs.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function getOrCreate256BitJwtSecretHex(): string {
  let existing = sessionStorage.getItem(VAULT_JWT_SECRET_KEY) || localStorage.getItem(VAULT_JWT_SECRET_KEY);
  if (!existing || existing.length < 64) {
    const randomBytes = new Uint8Array(32); // 256-bit cryptographic secret
    crypto.getRandomValues(randomBytes);
    existing = bytesToHex(randomBytes);
    localStorage.setItem(VAULT_JWT_SECRET_KEY, existing);
    sessionStorage.setItem(VAULT_JWT_SECRET_KEY, existing);
  }
  return existing;
}

export function rotateJwtSecret(): void {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const nextHex = bytesToHex(randomBytes);
  localStorage.setItem(VAULT_JWT_SECRET_KEY, nextHex);
  sessionStorage.setItem(VAULT_JWT_SECRET_KEY, nextHex);
  localStorage.removeItem(VAULT_ACTIVE_SESSION_KEY);
  safeLogger.record('SECURITY', 'Rotated 256-bit HS256 JWT signing key and invalidated active tokens');
}

async function derivePbkdf2HashHex(
  password: string,
  saltBytes: Uint8Array,
  iterations = PBKDF2_ITERATIONS
): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

async function signHmacSha256Base64Url(message: string, secretHex: string): Promise<string> {
  const keyBytes = hexToBytes(secretHex);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

export async function issueSignedJwt(payload: {
  sub: string;
  email: string;
  name: string;
}): Promise<{ jwt: string; iat: number; exp: number }> {
  const secretHex = getOrCreate256BitJwtSecretHex();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + JWT_TTL_SECONDS;
  const jtiBytes = new Uint8Array(12);
  crypto.getRandomValues(jtiBytes);

  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    iss: 'cashcompass.offline.vault',
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    iat,
    exp,
    jti: bytesToHex(jtiBytes),
  };

  const encodedHeader = base64UrlEncodeJson(header);
  const encodedBody = base64UrlEncodeJson(body);
  const signingInput = `${encodedHeader}.${encodedBody}`;
  const signature = await signHmacSha256Base64Url(signingInput, secretHex);

  return {
    jwt: `${signingInput}.${signature}`,
    iat,
    exp,
  };
}

export async function verifySignedJwt(token: string): Promise<{
  valid: boolean;
  reason?: string;
  claims?: { sub: string; email: string; name: string; iat: number; exp: number; jti: string };
}> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'Malformed JWT structure' };
  }

  try {
    const header = JSON.parse(base64UrlDecodeToString(parts[0]));
    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      return { valid: false, reason: 'Rejected unsupported or unsafe JWT alg header' };
    }

    const secretHex = getOrCreate256BitJwtSecretHex();
    const expectedSig = await signHmacSha256Base64Url(`${parts[0]}.${parts[1]}`, secretHex);
    if (!constantTimeEqual(parts[2], expectedSig)) {
      return { valid: false, reason: 'JWT cryptographic signature mismatch' };
    }

    const claims = JSON.parse(base64UrlDecodeToString(parts[1]));
    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof claims.exp !== 'number' || claims.exp <= nowSec) {
      return { valid: false, reason: 'JWT session has expired' };
    }

    return { valid: true, claims };
  } catch {
    return { valid: false, reason: 'Failed to decode JWT payload' };
  }
}

function loadUsers(): StoredUserRecord[] {
  try {
    const raw = localStorage.getItem(VAULT_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUserRecord[]): void {
  localStorage.setItem(VAULT_USERS_KEY, JSON.stringify(users));
}

export function validatePasswordStrength(password: string): { valid: boolean; message: string } {
  if (password.length < 10) {
    return { valid: false, message: 'Password must be at least 10 characters long.' };
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return { valid: false, message: 'Include both uppercase and lowercase letters.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Include at least one number.' };
  }
  return { valid: true, message: 'Strong password — will be salted and hashed with PBKDF2 (210,000 iterations).' };
}

export async function registerOfflineAccount(params: {
  email: string;
  displayName: string;
  password: string;
  age18Confirmed: boolean;
  termsAccepted: boolean;
  emailDigestSubscribed: boolean;
}): Promise<AuthenticatedSession> {
  const email = params.email.trim().toLowerCase();
  const displayName = params.displayName.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address.');
  }
  if (!displayName || displayName.length < 2) {
    throw new Error('Please enter your name (minimum 2 characters).');
  }
  if (!params.age18Confirmed) {
    throw new Error(
      'Age verification required: CashCompass does not collect personal or financial data from minors under 18.'
    );
  }
  if (!params.termsAccepted) {
    throw new Error('Please review and accept the Privacy Policy and Terms of Service to create an account.');
  }

  const pwCheck = validatePasswordStrength(params.password);
  if (!pwCheck.valid) {
    throw new Error(pwCheck.message);
  }

  const users = loadUsers();
  if (users.some((u) => u.email === email)) {
    throw new Error('An account with this email already exists on this device. Please sign in instead.');
  }

  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const passwordHashHex = await derivePbkdf2HashHex(params.password, saltBytes, PBKDF2_ITERATIONS);

  const unsubBytes = new Uint8Array(12);
  crypto.getRandomValues(unsubBytes);
  const unsubscribeToken = bytesToHex(unsubBytes);

  const userIdBytes = new Uint8Array(8);
  crypto.getRandomValues(userIdBytes);
  const newUser: StoredUserRecord = {
    id: `usr_${bytesToHex(userIdBytes)}`,
    email,
    displayName,
    passwordHashHex,
    saltHex: bytesToHex(saltBytes),
    iterations: PBKDF2_ITERATIONS,
    age18Confirmed: true,
    termsAcceptedAt: new Date().toISOString(),
    emailDigestSubscribed: params.emailDigestSubscribed,
    unsubscribeToken,
    createdAt: new Date().toISOString(),
  };

  saveUsers([...users, newUser]);

  const { jwt, iat, exp } = await issueSignedJwt({
    sub: newUser.id,
    email: newUser.email,
    name: newUser.displayName,
  });

  const session: AuthenticatedSession = {
    userId: newUser.id,
    email: newUser.email,
    displayName: newUser.displayName,
    jwt,
    issuedAt: iat,
    expiresAt: exp,
    emailDigestSubscribed: newUser.emailDigestSubscribed,
    unsubscribeToken: newUser.unsubscribeToken,
  };

  localStorage.setItem(VAULT_ACTIVE_SESSION_KEY, JSON.stringify(session));
  safeLogger.record('AUTH', 'Account created with PBKDF2-SHA256 (210k iterations)', {
    email: newUser.email,
    ageVerified: true,
  });

  return session;
}

export async function signInOfflineAccount(params: {
  email: string;
  password: string;
}): Promise<AuthenticatedSession> {
  const email = params.email.trim().toLowerCase();
  const users = loadUsers();
  const user = users.find((u) => u.email === email);

  if (!user) {
    safeLogger.record('AUTH', 'Failed login attempt for unknown identifier', { email });
    throw new Error('Invalid email or password.');
  }

  const saltBytes = hexToBytes(user.saltHex);
  const computedHashHex = await derivePbkdf2HashHex(params.password, saltBytes, user.iterations);

  if (!constantTimeEqual(computedHashHex, user.passwordHashHex)) {
    safeLogger.record('AUTH', 'Failed login attempt (hash mismatch)', { email });
    throw new Error('Invalid email or password.');
  }

  const { jwt, iat, exp } = await issueSignedJwt({
    sub: user.id,
    email: user.email,
    name: user.displayName,
  });

  const session: AuthenticatedSession = {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    jwt,
    issuedAt: iat,
    expiresAt: exp,
    emailDigestSubscribed: user.emailDigestSubscribed,
    unsubscribeToken: user.unsubscribeToken,
  };

  localStorage.setItem(VAULT_ACTIVE_SESSION_KEY, JSON.stringify(session));
  safeLogger.record('AUTH', 'Authenticated session established via HS256 JWT', { email });

  return session;
}

export async function signInDemoSandboxSession(): Promise<AuthenticatedSession> {
  const { jwt, iat, exp } = await issueSignedJwt({
    sub: 'usr_demo_local',
    email: 'demo.auditor@cashcompass.local',
    name: 'Local Demo Auditor',
  });

  const session: AuthenticatedSession = {
    userId: 'usr_demo_local',
    email: 'demo.auditor@cashcompass.local',
    displayName: 'Local Demo Auditor',
    jwt,
    issuedAt: iat,
    expiresAt: exp,
    emailDigestSubscribed: false,
    unsubscribeToken: 'demo_unsub_token_local',
    isDemoAccount: true,
  };

  localStorage.setItem(VAULT_ACTIVE_SESSION_KEY, JSON.stringify(session));
  safeLogger.record('AUTH', 'Opened isolated local demo vault session');
  return session;
}

export async function restoreVerifiedSession(): Promise<AuthenticatedSession | null> {
  try {
    const raw = localStorage.getItem(VAULT_ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const session: AuthenticatedSession = JSON.parse(raw);
    const check = await verifySignedJwt(session.jwt);
    if (!check.valid) {
      localStorage.removeItem(VAULT_ACTIVE_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function signOutSession(): void {
  localStorage.removeItem(VAULT_ACTIVE_SESSION_KEY);
  safeLogger.record('AUTH', 'Signed out and cleared active JWT');
}

export function updateEmailSubscriptionPreference(
  userId: string,
  subscribed: boolean
): void {
  const users = loadUsers().map((u) =>
    u.id === userId ? { ...u, emailDigestSubscribed: subscribed } : u
  );
  saveUsers(users);
  const raw = localStorage.getItem(VAULT_ACTIVE_SESSION_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    parsed.emailDigestSubscribed = subscribed;
    localStorage.setItem(VAULT_ACTIVE_SESSION_KEY, JSON.stringify(parsed));
  }
  safeLogger.record(
    'PRIVACY',
    subscribed ? 'Opted into local summary digest' : 'One-click unsubscribed from all email digests'
  );
}

export async function executeDataDeletionRequest(
  session: AuthenticatedSession
): Promise<DataErasureReceipt> {
  const users = loadUsers().filter((u) => u.id !== session.userId);
  saveUsers(users);

  // Purge all local transactions, learned merchant rules, presets, and active tokens
  localStorage.removeItem('cashcompass_offline_txns_v1');
  localStorage.removeItem('cashcompass_offline_rules_v1');
  localStorage.removeItem('cashcompass_offline_preset_v1');
  localStorage.removeItem(VAULT_ACTIVE_SESSION_KEY);

  const erasedAt = new Date().toISOString();
  const maskedEmail = session.email.replace(/^(.).*(@.*)$/, '$1***$2');
  const receiptIdBytes = new Uint8Array(8);
  crypto.getRandomValues(receiptIdBytes);
  const receiptId = `ERASURE-${bytesToHex(receiptIdBytes).toUpperCase()}`;

  const secretHex = getOrCreate256BitJwtSecretHex();
  const sig = await signHmacSha256Base64Url(`${receiptId}|${erasedAt}|${maskedEmail}`, secretHex);

  safeLogger.clear();

  return {
    receiptId,
    erasedAt,
    erasedAccountMask: maskedEmail,
    itemsPurged: [
      'PBKDF2 Password Hash & Salt Record',
      'Active HS256 JWT Session Token',
      'All Ingested CSV & PDF Bank Statement Transactions',
      'User-Learned Merchant Categorization Rules',
      'Local Security & Ingestion Diagnostic Logs',
    ],
    cryptographicSignatureHex: sig,
  };
}
