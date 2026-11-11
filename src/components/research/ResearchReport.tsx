import { useCallback } from 'react';
import type { AgentStats, AgentStepDisplay } from '../../types';
import type { ApiError } from '../../utils/errors';
import { relativeTime } from '../../utils/time';
import { renderMarkdown } from '../../utils/markdown';
import { Button } from '../ui/Button';
import { AgentProgress } from './AgentProgress';
import styles from './ResearchReport.module.css';

interface ResearchReportProps {
  query: string;
  content: string;
  isStreaming: boolean;
  apiError: ApiError | null;
  steps: AgentStepDisplay[];
  stats: AgentStats | null;
  onNewSearch: () => void;
  // Saved state
  isSaved?: boolean;
  savedAt?: number;
  refreshedAt?: number;
  isRefreshing?: boolean;
  onRefreshPrices?: () => void;
  onDeleteSaved?: () => void;
}

export function ResearchReport({
  query,
  content,
  isStreaming,
  apiError,
  steps,
  stats,
  onNewSearch,
  isSaved,
  savedAt,
  refreshedAt,
  isRefreshing,
  onRefreshPrices,
  onDeleteSaved,
}: ResearchReportProps) {
  const handleShare = useCallback(async () => {
    if (!content) return;
    const shareData = { title: `Save NZ: ${query}`, text: content };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(content);
      }
    } catch (err) {
      // User cancelled share sheet — not an error
      if (err instanceof Error && err.name !== 'AbortError') {
        await navigator.clipboard.writeText(content).catch(() => {});
      }
    }
  }, [content, query]);

  const isDone = !isStreaming && !apiError;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.meta}>
          <div className={styles.titleRow}>
            <h3 className={styles.reportTitle}>Research Report</h3>
            {isSaved && (
              <span className={styles.savedBadge}>
                💾 Saved
                {savedAt ? ` · ${relativeTime(savedAt)}` : ''}
                {refreshedAt ? ` · refreshed ${relativeTime(refreshedAt)}` : ''}
              </span>
            )}
          </div>
          {query && <p className={styles.query}>"{query}"</p>}
        </div>
        <div className={styles.actions}>
          {isSaved && onRefreshPrices && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshPrices}
              disabled={isRefreshing || isStreaming}
            >
              {isRefreshing ? '⏳ Refreshing…' : '🔄 Refresh Prices'}
            </Button>
          )}
          {isSaved && onDeleteSaved && (
            <Button variant="outline" size="sm" onClick={onDeleteSaved}>
              🗑 Delete
            </Button>
          )}
          {isDone && content && (
            <Button variant="outline" size="sm" onClick={handleShare}>
              📤 Share
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onNewSearch}>
            🔍 New Search
          </Button>
        </div>
      </div>

      {/* Live agent progress timeline */}
      <AgentProgress steps={steps} stats={stats} isStreaming={isStreaming} />

      {apiError ? (
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>✕</span>
          <div>
            <strong>{apiError.title}</strong>
            <p className={styles.errorHint}>{apiError.hint}</p>
          </div>
        </div>
      ) : isStreaming && !content ? (
        <p className={styles.waitingText}>
          {isRefreshing ? 'Fetching latest prices…' : 'Analysing search results…'}
        </p>
      ) : isStreaming ? (
        <pre className={styles.streamingText}>{content}</pre>
      ) : (
        <div
          className={styles.body}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      )}

      {!apiError && !isStreaming && content && (
        <p className={styles.disclaimer}>
          ℹ️ Prices are estimates and may not reflect current market conditions. Always verify
          directly with retailers before purchasing. Imports over NZ$1,000 may incur customs
          duty and GST.
        </p>
      )}
    </div>
  );
}
