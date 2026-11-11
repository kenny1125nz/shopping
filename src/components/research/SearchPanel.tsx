import React, { useState } from 'react';
import styles from './SearchPanel.module.css';

const PRIORITY_OPTIONS = [
  { label: '💰 Best Value',  value: 'Best overall value' },
  { label: '🇳🇿 NZ Only',    value: 'NZ retailers only' },
  { label: '🌏 Overseas',    value: 'Include overseas purchasing options' },
  { label: '🛡️ Warranty',    value: 'Prioritise NZ warranty and after-sales support' },
  { label: '🏷️ Budget',      value: 'Budget-conscious, lowest price possible' },
];

const EXAMPLE_QUERIES = [
  'Standing desk',
  'Air fryer',
  'Noise cancelling headphones',
  'Robot vacuum',
  'Gaming monitor',
  'Electric bike',
];

interface SearchPanelProps {
  query: string;
  onQueryChange: (q: string) => void;
  onResearch: (query: string, priorities: string[]) => void;
  isLoading: boolean;
}

export function SearchPanel({ query, onQueryChange, onResearch, isLoading }: SearchPanelProps) {
  const [priorities, setPriorities] = useState<string[]>(['Best overall value']);

  function togglePriority(value: string) {
    setPriorities(prev =>
      prev.includes(value) ? prev.filter(p => p !== value) : [...prev, value],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    onResearch(query.trim(), priorities);
  }

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>🔍 Research a Product</h2>
      <p className={styles.subtitle}>
        Compare NZ retailers vs overseas options — find the best value for your money
      </p>

      <form className={styles.searchRow} onSubmit={handleSubmit}>
        <input
          className={styles.searchInput}
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="e.g. Bosch cordless drill, Sony WH-1000XM5, standing desk…"
          aria-label="Product to research"
          disabled={isLoading}
        />
        <button
          type="submit"
          className={styles.searchBtn}
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? <span className={styles.btnSpinner} /> : null}
          Research
        </button>
      </form>

      <div className={styles.chipsRow}>
        <span className={styles.chipsLabel}>Focus:</span>
        {PRIORITY_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={[
              styles.chip,
              priorities.includes(opt.value) ? styles.chipActive : '',
            ].join(' ')}
            onClick={() => togglePriority(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={styles.examplesRow}>
        <span className={styles.chipsLabel}>Try:</span>
        {EXAMPLE_QUERIES.map(q => (
          <button
            key={q}
            type="button"
            className={styles.exampleChip}
            onClick={() => onQueryChange(q)}
          >
            {q}
          </button>
        ))}
      </div>
    </section>
  );
}
