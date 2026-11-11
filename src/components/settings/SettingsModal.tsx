import { useCallback, useEffect, useState } from 'react';
import type { Provider } from '../../types';
import { useApp } from '../../context/AppContext';
import { nukeAndLock } from '../../context/AppContext';
import { PROVIDER_MODELS } from '../../services/providers';
import { getApiKey, getTavilyKey, saveApiKey, saveTavilyKey } from '../../services/agent';
import { getSettings, saveSettings } from '../../utils/storage';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Input, PasswordInput, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { ProviderSelector } from './ProviderSelector';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { lock } = useApp();

  const [provider, setProvider]     = useState<Provider>('openai');
  const [model, setModel]           = useState('gpt-4o');
  const [customUrl, setCustomUrl]   = useState('');
  const [apiKey, setApiKey]         = useState('');
  const [tavilyKey, setTavilyKey]   = useState('');
  const [saving, setSaving]         = useState(false);
  const [alertMsg, setAlertMsg]     = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadSettings = useCallback(async () => {
    const settings = getSettings();
    const savedProvider = settings?.provider ?? 'openai';
    setProvider(savedProvider);
    setModel(settings?.model ?? PROVIDER_MODELS[savedProvider][0].value);
    setCustomUrl(settings?.customUrl ?? '');

    const [decryptedKey, decryptedTavily] = await Promise.all([
      getApiKey(),
      getTavilyKey(),
    ]);
    setApiKey(decryptedKey ?? '');
    setTavilyKey(decryptedTavily ?? '');
  }, []);

  useEffect(() => {
    if (open) {
      setAlertMsg(null);
      loadSettings();
    }
  }, [open, loadSettings]);

  function handleProviderChange(p: Provider) {
    setProvider(p);
    setModel(PROVIDER_MODELS[p][0].value);
  }

  async function handleSave() {
    const existingTavily = await getTavilyKey();
    if (!tavilyKey.trim() && !existingTavily) {
      setAlertMsg({ text: 'A Tavily Search API key is required for live price searches.', type: 'error' });
      return;
    }

    setSaving(true);
    setAlertMsg(null);
    try {
      saveSettings({
        provider,
        model,
        customUrl: customUrl.trim().replace(/\/$/, ''),
      });
      if (apiKey.trim()) await saveApiKey(apiKey.trim());
      if (tavilyKey.trim()) await saveTavilyKey(tavilyKey.trim());
      setAlertMsg({ text: 'Settings saved!', type: 'success' });
      setTimeout(onClose, 900);
    } catch (err) {
      setAlertMsg({
        text: err instanceof Error ? err.message : 'Save failed.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  function handleLock() {
    lock();
    onClose();
  }

  function handleClearAll() {
    if (!confirm('Delete all data including your API keys and history? This cannot be undone.')) return;
    nukeAndLock();
    window.location.reload();
  }

  return (
    <Modal open={open} onClose={onClose} title="⚙️ Settings">
      <div className={styles.content}>
        {alertMsg && (
          <Alert type={alertMsg.type}>{alertMsg.text}</Alert>
        )}

        <section className={styles.section}>
          <h4 className={styles.sectionHead}>LLM Provider</h4>
          <ProviderSelector selected={provider} onSelect={handleProviderChange} />
          {provider === 'custom' && (
            <div className={styles.mt}>
              <Input
                label="Base URL"
                type="url"
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="http://localhost:11434/v1"
                hint="Any OpenAI-compatible endpoint"
              />
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionHead}>Model</h4>
          {provider === 'custom' ? (
            <Input
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="e.g. llama3, mistral, gpt-4o"
              hint="Enter the model name accepted by your endpoint"
              aria-label="Model name"
            />
          ) : (
            <Select
              value={model}
              onChange={e => setModel(e.target.value)}
              aria-label="Select model"
            >
              {PROVIDER_MODELS[provider].map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
          )}
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionHead}>
            LLM API Key{' '}
            <span className={styles.sectionNote}>(AES-256 encrypted, stored locally)</span>
          </h4>
          <PasswordInput
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-…"
            autoComplete="off"
            hint="Encrypted with your password. Only sent to your chosen LLM provider."
          />
        </section>

        <section className={styles.section}>
          <h4 className={styles.sectionHead}>
            Tavily Search API Key{' '}
            <span className={styles.sectionRequired}>required</span>
          </h4>
          <PasswordInput
            value={tavilyKey}
            onChange={e => setTavilyKey(e.target.value)}
            placeholder="tvly-…"
            autoComplete="off"
            hint="Powers real-time NZ retail, overseas, and review searches."
          />
          <a
            href="https://app.tavily.com/home"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.getKeyLink}
          >
            Get a free API key at tavily.com →
          </a>
        </section>

        <div className={styles.mt}>
          <Button onClick={handleSave} loading={saving}>
            Save Settings
          </Button>
        </div>

        <section className={styles.section}>
          <h4 className={styles.sectionHead}>Session</h4>
          <Button variant="outline" size="sm" onClick={handleLock}>
            🔒 Lock App
          </Button>
          <p className={styles.dangerNote}>
            Clears your password from memory and cookie. You'll need to re-enter it to unlock.
          </p>
        </section>

        <section className={[styles.section, styles.dangerZone].join(' ')}>
          <h4 className={styles.sectionHead}>Danger Zone</h4>
          <Button variant="danger" size="sm" onClick={handleClearAll}>
            🗑️ Delete All Data
          </Button>
          <p className={styles.dangerNote}>
            Removes your password, API keys, and search history.
          </p>
        </section>
      </div>
    </Modal>
  );
}
