/** Events emitted by runResearchAgent() — consumed by the UI for live progress. */
export type AgentEvent =
  | { type: 'tool-call';   id: string; toolName: string; args: Record<string, unknown> }
  | { type: 'tool-result'; id: string; toolName: string; resultCount: number; summary: string }
  | { type: 'text-chunk';  chunk: string; accumulated: string }
  /**
   * Emitted after every agent step (finish-step) with running totals.
   * inputTokens = latest step's prompt size (grows as context accumulates).
   * outputTokens = cumulative tokens generated across all steps so far.
   */
  | { type: 'step-stats'; searchCount: number; inputTokens: number; outputTokens: number; contextWindow: number }
  /** Final stats emitted once when the full stream ends. */
  | { type: 'stats'; searchCount: number; inputTokens: number; outputTokens: number; contextWindow: number }
  | { type: 'done' }
  | { type: 'error'; message: string };

/** Raw result shape returned by each tool. */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

/** The shape returned by every search tool execute function. */
export interface SearchResponse {
  results: SearchResult[];
  answer?: string;
  /** Set when search is unavailable (no Tavily key). */
  note?: string;
}
