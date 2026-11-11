import { useEffect, useState } from 'react';
import styles from './LoadingState.module.css';

const MESSAGES = [
  'Analysing product category…',
  'Searching NZ retailers…',
  'Finding overseas alternatives…',
  'Generating recommendations…',
];

export function LoadingState() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.card}>
      <div className={styles.dots} aria-hidden="true">
        <span /><span /><span />
      </div>
      <p className={styles.message} role="status" aria-live="polite">
        {MESSAGES[msgIndex]}
      </p>
    </div>
  );
}
