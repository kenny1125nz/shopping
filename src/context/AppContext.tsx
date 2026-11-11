import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { generateAuthHash, generateSaltHex } from '../utils/crypto';
import { clearPasswordCookie, loadPasswordCookie, savePasswordCookie } from '../utils/cookie';
import { setPassword } from '../utils/inMemoryPassword';
import { clearAll, getAuthData, saveAuthData } from '../utils/storage';

interface AppContextValue {
  /** True once the password has been verified and the app is unlocked. */
  isUnlocked: boolean;
  /** True when no password has ever been set (first-time setup). */
  isFirstTime: boolean;
  /** Create a password on first use. Unlocks the app on success. */
  setup: (password: string) => Promise<void>;
  /** Verify password against stored hash. Unlocks the app on success. */
  unlock: (password: string) => Promise<void>;
  /** Lock the app: clear in-memory password and cookie. */
  lock: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Try to auto-unlock from the saved cookie on app load. Returns the password if successful. */
async function tryAutoUnlock(): Promise<string | null> {
  const auth = getAuthData();
  if (!auth) return null; // first time — no hash to verify against

  const cookiePw = loadPasswordCookie();
  if (!cookiePw) return null; // cookie expired or was cleared

  const hash = await generateAuthHash(cookiePw, auth.authSalt);
  if (hash !== auth.authHash) {
    clearPasswordCookie(); // stale / wrong cookie
    return null;
  }
  return cookiePw;
}

export function AppProvider({ children, autoUnlockPassword }: { children: ReactNode; autoUnlockPassword: string | null }) {
  const isFirstTime = !getAuthData();
  const [isUnlocked, setIsUnlocked] = useState(() => autoUnlockPassword !== null);

  // If we auto-unlocked, prime the in-memory store now (useState initializer runs once).
  if (autoUnlockPassword !== null) {
    setPassword(autoUnlockPassword);
  }

  const setup = useCallback(async (password: string): Promise<void> => {
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');

    const authSalt = generateSaltHex();
    const encSalt  = generateSaltHex();
    const authHash = await generateAuthHash(password, authSalt);

    saveAuthData({ authHash, authSalt, encSalt });
    savePasswordCookie(password);
    setPassword(password);
    setIsUnlocked(true);
  }, []);

  const unlock = useCallback(async (password: string): Promise<void> => {
    const auth = getAuthData();
    if (!auth) throw new Error('No password set. Please refresh the page.');

    const hash = await generateAuthHash(password, auth.authSalt);
    if (hash !== auth.authHash) throw new Error('Incorrect password.');

    savePasswordCookie(password);
    setPassword(password);
    setIsUnlocked(true);
  }, []);

  const lock = useCallback(() => {
    clearPasswordCookie();
    setPassword(null);
    setIsUnlocked(false);
  }, []);

  return (
    <AppContext.Provider value={{ isUnlocked, isFirstTime, setup, unlock, lock }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

/**
 * Bootstrap helper — call this once before rendering <AppProvider>.
 * Runs the async auto-unlock check so the provider can initialise synchronously.
 */
export async function resolveAutoUnlock(): Promise<string | null> {
  return tryAutoUnlock();
}

/** Nuke all data and lock (for "Delete All Data" action). */
export function nukeAndLock(): void {
  clearAll();
  clearPasswordCookie();
  setPassword(null);
}
