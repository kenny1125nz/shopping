export type Provider = 'openai' | 'openrouter' | 'groq' | 'deepseek' | 'custom';

/** Non-sensitive provider / model settings stored as plaintext. */
export interface UserSettings {
  provider: Provider;
  model: string;
  customUrl: string;
}

export interface HistoryItem {
  query: string;
  timestamp: number;
}

export interface SavedResearch {
  id: string;
  query: string;
  priorities: string[];
  content: string;
  savedAt: number;
  refreshedAt?: number;
}

export interface ModelOption {
  value: string;
  label: string;
}

export type ResearchPhase = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

export interface AgentStats {
  searchCount: number;
  inputTokens: number;
  outputTokens: number;
  contextWindow: number;
}

export interface ResearchState {
  phase: ResearchPhase;
  query: string;
  content: string;
  error: string | null;
  /** Live progress steps from the research agent. */
  steps: AgentStepDisplay[];
  /** Final statistics emitted after the agent loop completes. */
  stats: AgentStats | null;
}

/** Snapshot of one tool invocation shown in the progress timeline (mirrors agent/types). */
export interface AgentStepDisplay {
  id: string;
  toolName: string;
  label: string;
  icon: string;
  status: 'running' | 'done' | 'error';
  resultCount: number;
  summary: string;
}
