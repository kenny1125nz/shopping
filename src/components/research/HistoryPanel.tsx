import type { HistoryItem } from '../../types';
import { relativeTime } from '../../utils/time';
import styles from './HistoryPanel.module.css';

interface HistoryPanelProps {
  items: HistoryItem[];
  onSelect: (query: string) => void;
}

export function HistoryPanel({ items, onSelect }: HistoryPanelProps) {
  if (!items.length) return null;

  return (
    <aside className={styles.panel}>
      <h3 className={styles.heading}>Recent Searches</h3>
      <ul className={styles.list} role="list">
        {items.map(item => (
          <li key={`${item.query}-${item.timestamp}`} className={styles.item}>
            <button
              className={styles.itemBtn}
              onClick={() => onSelect(item.query)}
              title={`Search again: ${item.query}`}
            >
              <span className={styles.query}>{item.query}</span>
              <span className={styles.time}>{relativeTime(item.timestamp)}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
