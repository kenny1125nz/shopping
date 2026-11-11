import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../ui/Button';
import { PasswordInput } from '../ui/Input';
import { Alert } from '../ui/Alert';
import styles from './AuthView.module.css';

export function UnlockView() {
  const { isFirstTime, setup, unlock } = useApp();
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isFirstTime && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isFirstTime) {
        await setup(password);
      } else {
        await unlock(password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <h1 className={styles.logoTitle}>🛒 SmartShop NZ</h1>
          <p className={styles.logoTagline}>AI Shopping Research Agent for New Zealanders</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <Alert type="error">{error}</Alert>}

          <div style={{ marginBottom: 16 }}>
            <PasswordInput
              label={isFirstTime ? 'Create a password' : 'Password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isFirstTime ? 'new-password' : 'current-password'}
              hint={isFirstTime ? 'Minimum 8 characters. Used to encrypt your API keys.' : undefined}
              autoFocus
            />
          </div>

          {isFirstTime && (
            <div style={{ marginBottom: 16 }}>
              <PasswordInput
                label="Confirm password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          )}

          <Button type="submit" loading={loading} style={{ width: '100%' }}>
            {isFirstTime ? 'Set Password & Continue' : 'Unlock'}
          </Button>
        </form>

        <p className={styles.footer}>
          Your data stays on this device. API keys are AES-256 encrypted with your password.
        </p>
      </div>
    </div>
  );
}
