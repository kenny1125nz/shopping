import type { SavedResearch } from '../../types';
import { relativeTime } from '../../utils/time';
import styles from './SavedPanel.module.css';

interface SavedPanelProps {
  items: SavedResearch[];
  onView: (item: SavedResearch) => void;
  onDelete: (id: string) => void;
}

export function SavedPanel({ items, onView, onDelete }: SavedPanelProps) {
  if (items.length === 0) return null;

  return (
    <section className={styles.panel}>
      <h2 className={styles.heading}>Saved Researches</h2>
      <ul className={styles.list}>
        {items.map(item => (
          <li key={item.id} className={styles.item}>
            <button className={styles.viewBtn} onClick={() => onView(item)}>
              <span className={styles.query}>{item.query}</span>
              <span className={styles.meta}>
                Saved {relativeTime(item.savedAt)}
                {item.refreshedAt && ` · refreshed ${relativeTime(item.refreshedAt)}`}
              </span>
            </button>
            <button
              className={styles.deleteBtn}
              onClick={() => onDelete(item.id)}
              aria-label={`Delete saved research for ${item.query}`}
              title="Delete"
            >
              🗑
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
