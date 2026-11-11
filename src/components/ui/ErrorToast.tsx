import { useState } from 'react';
import type { ApiError } from '../../utils/errors';
import styles from './ErrorToast.module.css';

interface ErrorToastProps {
  error: ApiError;
  onDismiss: () => void;
}

export function ErrorToast({ error, onDismiss }: ErrorToastProps) {
  const [expanded, setExpanded] = useState(false);

  const time = new Date(error.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className={styles.toast} role="alert" aria-live="assertive">
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.icon}>✕</span>
          <span className={styles.title}>{error.title}</span>
          {error.code && <span className={styles.code}>{error.code}</span>}
        </div>
        <button className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss error">
          ✕
        </button>
      </div>

      <p className={styles.hint}>{error.hint}</p>

      <button
        className={styles.toggle}
        onClick={() => setExpanded(v => !v)}
      >
        {expanded ? '▴ Hide details' : '▾ Show details'}
      </button>

      {expanded && (
        <div className={styles.details}>
          <div className={styles.detailsRow}>
            <span className={styles.detailsLabel}>Time</span>
            <span className={styles.detailsValue}>{time}</span>
          </div>
          <div className={styles.detailsRow}>
            <span className={styles.detailsLabel}>Error</span>
            <pre className={styles.rawError}>{error.raw}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
