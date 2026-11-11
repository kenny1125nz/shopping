import type { AgentStats, AgentStepDisplay } from '../../types';
import { TOOL_META } from '../../agent/tools';
import styles from './AgentProgress.module.css';

interface AgentProgressProps {
  steps: AgentStepDisplay[];
  stats: AgentStats | null;
  isStreaming: boolean;
}

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function AgentProgress({ steps, stats, isStreaming }: AgentProgressProps) {
  if (steps.length === 0) return null;

  const contextPct = stats
    ? Math.min(100, Math.round((stats.inputTokens / stats.contextWindow) * 100))
    : 0;

  const contextWarn = contextPct >= 80;

  return (
    <div className={styles.timeline}>
      {steps.map(step => {
        const meta = TOOL_META[step.toolName];
        const icon = meta?.icon ?? '🔧';
        const label = meta?.label ?? step.toolName;

        return (
          <div key={step.id} className={`${styles.step} ${styles[step.status]}`}>
            <span className={styles.icon}>{icon}</span>
            <div className={styles.body}>
              <span className={styles.label}>{label}</span>
              {step.status === 'running' && (
                <span className={styles.dots}>
                  <span /><span /><span />
                </span>
              )}
              {step.status === 'done' && step.resultCount > 0 && (
                <span className={styles.count}>{step.resultCount} results</span>
              )}
              {step.status === 'error' && (
                <span className={styles.errorBadge}>failed</span>
              )}
              {step.summary && step.status === 'done' && (
                <p className={styles.summary}>{step.summary}</p>
              )}
            </div>
            <span className={styles.statusIcon}>
              {step.status === 'running' ? '⏳' : step.status === 'done' ? '✓' : '✗'}
            </span>
          </div>
        );
      })}

      {stats && (
        <div className={styles.statsBar}>
          <span className={styles.statItem}>
            🔍 {stats.searchCount} {stats.searchCount === 1 ? 'search' : 'searches'}
          </span>
          <span className={styles.statDivider}>·</span>
          <span className={styles.statItem}>
            Context: {formatTokens(stats.inputTokens)} / {formatTokens(stats.contextWindow)} tokens
            <span className={`${styles.statPct} ${contextWarn ? styles.statPctWarn : ''}`}>
              {' '}({contextPct}%)
            </span>
          </span>
          {stats.outputTokens > 0 && (
            <>
              <span className={styles.statDivider}>·</span>
              <span className={styles.statItem}>
                Generated: {formatTokens(stats.outputTokens)} tokens
              </span>
            </>
          )}
          {isStreaming && (
            <span className={styles.livePulse} aria-label="Live">
              <span className={styles.liveDot} />
              live
            </span>
          )}
          <div
            className={styles.contextBar}
            role="meter"
            aria-valuenow={contextPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Context window: ${contextPct}% used`}
          >
            <div
              className={`${styles.contextFill} ${contextWarn ? styles.contextFillWarn : ''}`}
              style={{ width: `${contextPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
