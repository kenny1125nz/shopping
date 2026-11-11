import { decryptData, encryptData } from '../utils/crypto';
import { getPassword } from '../utils/inMemoryPassword';
import { getAuthData, getEncryptedKeys, saveEncryptedKeys } from '../utils/storage';

// ── LLM API key helpers ────────────────────────────────────────────────

export async function getApiKey(): Promise<string | null> {
  const password = getPassword();
  const auth = getAuthData();
  if (!password || !auth) return null;
  const { encKey, encIv } = getEncryptedKeys();
  if (!encKey || !encIv) return null;
  try {
    return await decryptData(encKey, encIv, password, auth.encSalt);
  } catch {
    return null;
  }
}

export async function saveApiKey(apiKey: string): Promise<void> {
  const password = getPassword();
  const auth = getAuthData();
  if (!password || !auth) throw new Error('App is locked — cannot save key.');
  const { enc, iv } = await encryptData(apiKey, password, auth.encSalt);
  saveEncryptedKeys({ encKey: enc, encIv: iv });
}

/** Synchronous presence check — does not decrypt. */
export function hasApiKey(): boolean {
  return !!getEncryptedKeys().encKey;
}

// ── Tavily Search API key helpers ──────────────────────────────────────

export async function getTavilyKey(): Promise<string | null> {
  const password = getPassword();
  const auth = getAuthData();
  if (!password || !auth) return null;
  const { encTavilyKey, encTavilyIv } = getEncryptedKeys();
  if (!encTavilyKey || !encTavilyIv) return null;
  try {
    return await decryptData(encTavilyKey, encTavilyIv, password, auth.encSalt);
  } catch {
    return null;
  }
}

export async function saveTavilyKey(tavilyKey: string): Promise<void> {
  const password = getPassword();
  const auth = getAuthData();
  if (!password || !auth) throw new Error('App is locked — cannot save key.');
  const { enc, iv } = await encryptData(tavilyKey, password, auth.encSalt);
  saveEncryptedKeys({ encTavilyKey: enc, encTavilyIv: iv });
}

/** Synchronous presence check — does not decrypt. */
export function hasTavilyKey(): boolean {
  return !!getEncryptedKeys().encTavilyKey;
}
