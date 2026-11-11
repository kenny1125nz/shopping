/**
 * Cryptographic utilities — all operations use the Web Crypto API.
 *
 * Security model:
 *  - Password is never stored in localStorage. Only a PBKDF2-derived auth hash is persisted.
 *  - The raw password is kept in a SameSite=Strict cookie for auto-unlock across sessions.
 *  - API keys are encrypted with AES-256-GCM using a second PBKDF2-derived key.
 *  - The encryption key lives in memory only for the duration of the unlocked session.
 */

const ITERATIONS = 120_000;
const AUTH_PLAINTEXT = 'smartshop-nz-auth-v1';

// ── Encoding helpers ──────────────────────────────────────────────────

export function toHex(buffer: ArrayBuffer | Uint8Array<ArrayBuffer>): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

export function generateSaltHex(byteLength = 16): string {
  const buf = new ArrayBuffer(byteLength);
  crypto.getRandomValues(new Uint8Array(buf));
  return toHex(buf);
}

// ── Key derivation ────────────────────────────────────────────────────

async function importKeyMaterial(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
}

async function deriveAesKey(
  password: string,
  saltHex: string,
  usage: KeyUsage[],
): Promise<CryptoKey> {
  const material = await importKeyMaterial(password);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    usage,
  );
}

// ── Public API ────────────────────────────────────────────────────────

/** Produce a deterministic auth hash for a given password + salt pair. */
export async function generateAuthHash(password: string, authSaltHex: string): Promise<string> {
  const key = await deriveAesKey(password, authSaltHex, ['encrypt']);
  const iv = new Uint8Array(new ArrayBuffer(12)); // zero IV → deterministic
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(AUTH_PLAINTEXT),
  );
  return toHex(enc);
}

/** Encrypt plaintext with a random IV. Returns hex-encoded ciphertext + IV. */
export async function encryptData(
  plaintext: string,
  password: string,
  encSaltHex: string,
): Promise<{ enc: string; iv: string }> {
  const key = await deriveAesKey(password, encSaltHex, ['encrypt', 'decrypt']);
  const ivBuf = new ArrayBuffer(12);
  const iv = new Uint8Array(ivBuf);
  crypto.getRandomValues(iv);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return { enc: toHex(encrypted), iv: toHex(ivBuf) };
}

/** Decrypt ciphertext produced by `encryptData`. */
export async function decryptData(
  encHex: string,
  ivHex: string,
  password: string,
  encSaltHex: string,
): Promise<string> {
  const key = await deriveAesKey(password, encSaltHex, ['encrypt', 'decrypt']);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromHex(ivHex) },
    key,
    fromHex(encHex),
  );
  return new TextDecoder().decode(decrypted);
}
