import { useEffect, useState } from 'react';
import { AppProvider, resolveAutoUnlock, useApp } from './context/AppContext';
import { UnlockView } from './components/auth/UnlockView';
import { AppShell } from './components/AppShell';

function AppRouter() {
  const { isUnlocked } = useApp();
  return isUnlocked ? <AppShell /> : <UnlockView />;
}

export default function App() {
  // undefined = still resolving; null = no auto-unlock; string = password found in cookie
  const [autoUnlockPassword, setAutoUnlockPassword] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    resolveAutoUnlock().then(pw => setAutoUnlockPassword(pw ?? null));
  }, []);

  // Wait for the async cookie-check before mounting — avoids a flash of the unlock screen.
  if (autoUnlockPassword === undefined) return null;

  return (
    <AppProvider autoUnlockPassword={autoUnlockPassword}>
      <AppRouter />
    </AppProvider>
  );
}
