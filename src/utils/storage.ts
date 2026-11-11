import type { HistoryItem, SavedResearch, UserSettings } from '../types';

const LS_KEY = 'smartshop_nz_v1';

interface StorageShape {
  /** PBKDF2-derived auth hash — used to verify the password on unlock. */
  authHash?: string;
  authSalt?: string;
  /** Salt used for deriving the API-key encryption key. */
  encSalt?: string;
  /** AES-256-GCM encrypted LLM API key. */
  encKey?: string | null;
  encIv?: string | null;
  /** AES-256-GCM encrypted Tavily Search API key. */
  encTavilyKey?: string | null;
  encTavilyIv?: string | null;
  /** Non-sensitive provider / model settings. */
  settings?: UserSettings;
  history: HistoryItem[];
  saves?: SavedResearch[];
}

function read(): StorageShape {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as StorageShape;
  } catch {
    return { history: [] };
  }
}

function write(data: StorageShape): void {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

// ── Auth ──────────────────────────────────────────────────────────────

export interface AuthData {
  authHash: string;
  authSalt: string;
  encSalt: string;
}

export function getAuthData(): AuthData | null {
  const d = read();
  if (!d.authHash || !d.authSalt || !d.encSalt) return null;
  return { authHash: d.authHash, authSalt: d.authSalt, encSalt: d.encSalt };
}

export function saveAuthData(auth: AuthData): void {
  const d = read();
  d.authHash = auth.authHash;
  d.authSalt = auth.authSalt;
  d.encSalt  = auth.encSalt;
  write(d);
}

// ── Encrypted keys ────────────────────────────────────────────────────

export interface EncryptedKeys {
  encKey:       string | null | undefined;
  encIv:        string | null | undefined;
  encTavilyKey: string | null | undefined;
  encTavilyIv:  string | null | undefined;
}

export function getEncryptedKeys(): EncryptedKeys {
  const d = read();
  return {
    encKey:       d.encKey,
    encIv:        d.encIv,
    encTavilyKey: d.encTavilyKey,
    encTavilyIv:  d.encTavilyIv,
  };
}

export function saveEncryptedKeys(patch: Partial<EncryptedKeys>): void {
  const d = read();
  if ('encKey'       in patch) d.encKey       = patch.encKey;
  if ('encIv'        in patch) d.encIv        = patch.encIv;
  if ('encTavilyKey' in patch) d.encTavilyKey = patch.encTavilyKey;
  if ('encTavilyIv'  in patch) d.encTavilyIv  = patch.encTavilyIv;
  write(d);
}

// ── Settings (non-sensitive) ──────────────────────────────────────────

export function getSettings(): UserSettings | null {
  return read().settings ?? null;
}

export function saveSettings(settings: UserSettings): void {
  const d = read();
  d.settings = settings;
  write(d);
}

// ── History ───────────────────────────────────────────────────────────

export function getHistory(): HistoryItem[] {
  return read().history ?? [];
}

/** Prepend query to history, deduplicate, cap at 15. Returns updated list. */
export function addHistory(query: string): HistoryItem[] {
  const data = read();
  const prev = (data.history ?? []).filter(h => h.query !== query);
  const next = [{ query, timestamp: Date.now() }, ...prev].slice(0, 15);
  data.history = next;
  write(data);
  return next;
}

// ── Saved researches ──────────────────────────────────────────────────

export function getSavedResearches(): SavedResearch[] {
  return read().saves ?? [];
}

export function addSavedResearch(item: Omit<SavedResearch, 'id'>): SavedResearch {
  const data = read();
  const saved: SavedResearch = { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  data.saves = [saved, ...(data.saves ?? [])];
  write(data);
  return saved;
}

export function updateSavedResearch(id: string, patch: Partial<SavedResearch>): SavedResearch[] {
  const data = read();
  data.saves = (data.saves ?? []).map(r => r.id === id ? { ...r, ...patch } : r);
  write(data);
  return data.saves;
}

export function deleteSavedResearch(id: string): SavedResearch[] {
  const data = read();
  data.saves = (data.saves ?? []).filter(r => r.id !== id);
  write(data);
  return data.saves;
}

// ── Nuke ──────────────────────────────────────────────────────────────

export function clearAll(): void {
  localStorage.removeItem(LS_KEY);
}
