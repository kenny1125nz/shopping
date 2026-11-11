import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentStepDisplay, HistoryItem, ResearchState, SavedResearch } from '../types';
import type { ApiError } from '../utils/errors';
import { classifyApiError } from '../utils/errors';
import { hasApiKey, hasTavilyKey } from '../services/agent';
import { runResearchAgent, refreshResearchPrices } from '../agent';
import type { AgentEvent } from '../agent/types';
import { TOOL_META } from '../agent/tools';
import {
  addHistory,
  getHistory,
  getSavedResearches,
  addSavedResearch,
  updateSavedResearch,
  deleteSavedResearch,
} from '../utils/storage';
import { AppHeader } from './layout/AppHeader';
import { HistoryPanel } from './research/HistoryPanel';
import { LoadingState } from './research/LoadingState';
import { ResearchReport } from './research/ResearchReport';
import { SavedPanel } from './research/SavedPanel';
import { SearchPanel } from './research/SearchPanel';
import { SettingsModal } from './settings/SettingsModal';
import { ErrorToast } from './ui/ErrorToast';
import styles from './AppShell.module.css';

const EMPTY_RESEARCH: ResearchState = {
  phase: 'idle',
  query: '',
  content: '',
  error: null,
  steps: [],
  stats: null,
};

/** Normalise a query for duplicate detection: lowercase + collapse whitespace. */
function normaliseQuery(q: string) {
  return q.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function AppShell() {
  // ── UI state ─────────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [missingKeys, setMissingKeys] = useState<{ llm: boolean; tavily: boolean }>({ llm: false, tavily: false });

  // ── Search query (lifted so history can pre-fill it) ─────────────────
  const [currentQuery, setCurrentQuery] = useState('');

  // ── Research state ────────────────────────────────────────────────────
  const [research, setResearch] = useState<ResearchState>(EMPTY_RESEARCH);

  // ── History ────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // ── Saved researches ──────────────────────────────────────────────────
  const [saved, setSaved] = useState<SavedResearch[]>([]);
  /** ID of the saved research currently being viewed (null = fresh result). */
  const [viewingId, setViewingId] = useState<string | null>(null);
  /** Pending duplicate: user submitted a query that matches a saved result. */
  const [dupePrompt, setDupePrompt] = useState<{
    query: string;
    priorities: string[];
    match: SavedResearch;
  } | null>(null);
  /** Whether a price-refresh agent run is in progress. */
  const [isRefreshing, setIsRefreshing] = useState(false);
  /** Classified API error shown in the corner toast (null = no error). */
  const [toastError, setToastError] = useState<ApiError | null>(null);

  // ── Abort controllers ─────────────────────────────────────────────────
  const abortRef = useRef<AbortController | null>(null);

  // ── Effects ───────────────────────────────────────────────────────────

  const checkApiKey = useCallback(() => {
    setMissingKeys({ llm: !hasApiKey(), tavily: !hasTavilyKey() });
  }, []);

  useEffect(() => {
    checkApiKey();
    setHistory(getHistory());
    setSaved(getSavedResearches());
  }, [checkApiKey]);

  // ── Agent event → step display mapper ─────────────────────────────────

  function applyEvent(prev: ResearchState, event: AgentEvent): ResearchState {
    switch (event.type) {
      case 'tool-call': {
        const meta = TOOL_META[event.toolName];
        const newStep: AgentStepDisplay = {
          id: event.id,
          toolName: event.toolName,
          label: meta?.label ?? event.toolName,
          icon: meta?.icon ?? '🔧',
          status: 'running',
          resultCount: 0,
          summary: '',
        };
        return { ...prev, phase: 'streaming', steps: [...prev.steps, newStep] };
      }
      case 'tool-result':
        return {
          ...prev,
          steps: prev.steps.map(s =>
            s.id === event.id
              ? { ...s, status: 'done', resultCount: event.resultCount, summary: event.summary }
              : s,
          ),
        };
      case 'text-chunk':
        return { ...prev, phase: 'streaming', content: event.accumulated };
      case 'step-stats':
      case 'stats':
        return {
          ...prev,
          stats: {
            searchCount:  event.searchCount,
            inputTokens:  event.inputTokens,
            outputTokens: event.outputTokens,
            contextWindow: event.contextWindow,
          },
        };
      case 'done':
        return { ...prev, phase: 'done' };
      case 'error': {
        const classified = classifyApiError(event.message);
        setToastError(classified);
        return { ...prev, phase: 'error', error: event.message };
      }
      default:
        return prev;
    }
  }

  // ── Core research runner ───────────────────────────────────────────────

  const runResearch = useCallback(
    async (query: string, priorities: string[]) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setViewingId(null);
      setResearch({ phase: 'loading', query, content: '', error: null, steps: [], stats: null });

      try {
        const content = await runResearchAgent(
          query,
          priorities,
          (event: AgentEvent) => setResearch(prev => applyEvent(prev, event)),
          abortRef.current.signal,
        );
        setResearch(prev => ({ ...prev, phase: 'done' }));
        addHistory(query);
        setHistory(getHistory());

        // Auto-save every completed research
        const savedItem = addSavedResearch({ query, priorities, content, savedAt: Date.now() });
        setSaved(getSavedResearches());
        setViewingId(savedItem.id);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        const classified = classifyApiError(err);
        setToastError(classified);
        setResearch(prev => ({ ...prev, phase: 'error', error: classified.raw }));
      }
    },
    [],
  );

  // ── Handlers ──────────────────────────────────────────────────────────

  /** Called by SearchPanel — checks for duplicates before running. */
  const handleResearch = useCallback(
    (query: string, priorities: string[]) => {
      const norm = normaliseQuery(query);
      const match = saved.find(r => normaliseQuery(r.query) === norm);
      if (match) {
        setDupePrompt({ query, priorities, match });
        return;
      }
      runResearch(query, priorities);
    },
    [saved, runResearch],
  );

  /** User chose to view their saved result instead of re-researching. */
  const handleUseSaved = useCallback(() => {
    if (!dupePrompt) return;
    const { match } = dupePrompt;
    setDupePrompt(null);
    setViewingId(match.id);
    setResearch({ phase: 'done', query: match.query, content: match.content, error: null, steps: [], stats: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [dupePrompt]);

  /** User chose to ignore the saved result and run a fresh research. */
  const handleResearchFresh = useCallback(() => {
    if (!dupePrompt) return;
    const { query, priorities } = dupePrompt;
    setDupePrompt(null);
    runResearch(query, priorities);
  }, [dupePrompt, runResearch]);

  const handleNewSearch = useCallback(() => {
    abortRef.current?.abort();
    setResearch(EMPTY_RESEARCH);
    setCurrentQuery('');
    setViewingId(null);
    setDupePrompt(null);
    setToastError(null);
  }, []);

  const handleHistorySelect = useCallback((query: string) => {
    setCurrentQuery(query);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSettingsClose = useCallback(() => {
    setSettingsOpen(false);
    checkApiKey();
  }, [checkApiKey]);

  /** View a saved research from the SavedPanel. */
  const handleViewSaved = useCallback((item: SavedResearch) => {
    setViewingId(item.id);
    setCurrentQuery(item.query);
    setResearch({ phase: 'done', query: item.query, content: item.content, error: null, steps: [], stats: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /** Delete a saved research. */
  const handleDeleteSaved = useCallback(
    (id: string) => {
      const updated = deleteSavedResearch(id);
      setSaved(updated);
      if (viewingId === id) {
        setViewingId(null);
        setResearch(EMPTY_RESEARCH);
      }
    },
    [viewingId],
  );

  /** Refresh prices for the currently viewed saved research. */
  const handleRefreshPrices = useCallback(async () => {
    if (!viewingId || !research.content) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsRefreshing(true);
    setResearch(prev => ({ ...prev, phase: 'loading', content: '', steps: [], stats: null }));

    try {
      const updated = await refreshResearchPrices(
        research.query,
        saved.find(r => r.id === viewingId)?.content ?? research.content,
        (event: AgentEvent) => setResearch(prev => applyEvent(prev, event)),
        abortRef.current.signal,
      );

      setResearch(prev => ({ ...prev, phase: 'done', content: updated }));

      const updatedList = updateSavedResearch(viewingId, {
        content: updated,
        refreshedAt: Date.now(),
      });
      setSaved(updatedList);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const classified = classifyApiError(err);
      setToastError(classified);
      setResearch(prev => ({ ...prev, phase: 'error', error: classified.raw }));
    } finally {
      setIsRefreshing(false);
    }
  }, [viewingId, research.query, research.content, saved]);

  // ── Derived ────────────────────────────────────────────────────────────
  const isLoading   = research.phase === 'loading';
  const isStreaming  = research.phase === 'streaming';
  const showResults  = research.phase !== 'idle';
  const viewedSaved  = viewingId ? saved.find(r => r.id === viewingId) : null;
  const reportError: ApiError | null = research.phase === 'error' ? toastError : null;

  return (
    <div className={styles.shell}>
      <AppHeader onSettingsClick={() => setSettingsOpen(true)} />

      <main className={styles.main}>
        {(missingKeys.llm || missingKeys.tavily) && (
          <div className={styles.noKeyBanner} role="alert">
            ⚠️{' '}
            {missingKeys.llm && missingKeys.tavily ? (
              <>
                <strong>LLM API key and Tavily Search API key are required.</strong>{' '}
              </>
            ) : missingKeys.llm ? (
              <>
                <strong>No LLM API key configured.</strong>{' '}
              </>
            ) : (
              <>
                <strong>Tavily Search API key is required for live price searches.</strong>{' '}
              </>
            )}
            <button className={styles.noKeyLink} onClick={() => setSettingsOpen(true)}>
              Open Settings
            </button>{' '}
            to add{missingKeys.llm && missingKeys.tavily ? ' both keys' : missingKeys.llm ? ' your LLM key' : ' your Tavily key'}.
          </div>
        )}

        <SearchPanel
          query={currentQuery}
          onQueryChange={setCurrentQuery}
          onResearch={handleResearch}
          isLoading={isLoading || isStreaming}
        />

        {/* Duplicate saved result prompt */}
        {dupePrompt && (
          <div className={styles.dupePrompt}>
            <div className={styles.dupeIcon}>💾</div>
            <div className={styles.dupeBody}>
              <p className={styles.dupeTitle}>Saved result found</p>
              <p className={styles.dupeText}>
                You have a saved research for <strong>"{dupePrompt.match.query}"</strong>.
                View it to avoid spending tokens, or run a fresh search for up-to-date results.
              </p>
            </div>
            <div className={styles.dupeActions}>
              <button className={styles.dupeAccept} onClick={handleUseSaved}>
                View Saved
              </button>
              <button className={styles.dupeDecline} onClick={handleResearchFresh}>
                Research Fresh
              </button>
            </div>
          </div>
        )}

        {isLoading && <LoadingState />}

        {(isStreaming || research.phase === 'done' || research.phase === 'error') && showResults && (
          <ResearchReport
            query={research.query}
            content={research.content}
            isStreaming={isStreaming}
            apiError={reportError}
            steps={research.steps}
            stats={research.stats}
            onNewSearch={handleNewSearch}
            isSaved={!!viewedSaved}
            savedAt={viewedSaved?.savedAt}
            refreshedAt={viewedSaved?.refreshedAt}
            isRefreshing={isRefreshing}
            onRefreshPrices={viewedSaved ? handleRefreshPrices : undefined}
            onDeleteSaved={viewedSaved ? () => handleDeleteSaved(viewingId!) : undefined}
          />
        )}

        <SavedPanel items={saved} onView={handleViewSaved} onDelete={handleDeleteSaved} />

        <HistoryPanel items={history} onSelect={handleHistorySelect} />
      </main>

      <SettingsModal open={settingsOpen} onClose={handleSettingsClose} />

      {toastError && (
        <ErrorToast error={toastError} onDismiss={() => setToastError(null)} />
      )}
    </div>
  );
}
