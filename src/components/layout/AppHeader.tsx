import { useApp } from '../../context/AppContext';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  onSettingsClick: () => void;
}

export function AppHeader({ onSettingsClick }: AppHeaderProps) {
  const { lock } = useApp();

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span>🛒 SmartShop NZ</span>
        <span className={styles.badge}>NZ</span>
      </div>

      <div className={styles.right}>
        <button
          className={styles.iconBtn}
          onClick={onSettingsClick}
          aria-label="Open settings"
          title="Settings"
        >
          ⚙️
        </button>
        <button
          className={styles.iconBtn}
          onClick={lock}
          aria-label="Lock app"
          title="Lock"
        >
          🔒
        </button>
      </div>
    </header>
  );
}
