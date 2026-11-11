import type { Provider } from '../../types';
import { ALL_PROVIDERS, PROVIDER_LABELS } from '../../services/providers';
import styles from './ProviderSelector.module.css';

interface ProviderSelectorProps {
  selected: Provider;
  onSelect: (provider: Provider) => void;
}

export function ProviderSelector({ selected, onSelect }: ProviderSelectorProps) {
  return (
    <div className={styles.grid}>
      {ALL_PROVIDERS.map(provider => {
        const { name, description } = PROVIDER_LABELS[provider];
        return (
          <button
            key={provider}
            type="button"
            className={[
              styles.card,
              selected === provider ? styles.cardActive : '',
            ].join(' ')}
            onClick={() => onSelect(provider)}
            aria-pressed={selected === provider}
          >
            <span className={styles.name}>{name}</span>
            <span className={styles.desc}>{description}</span>
          </button>
        );
      })}
    </div>
  );
}
