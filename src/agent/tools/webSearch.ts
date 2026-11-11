import type { SearchResponse } from '../types';
import { tavilySearch, noSearchResult } from './tavily';

/**
 * General-purpose web search. Available as an optional extra search
 * that the orchestrator can call for additional context if needed.
 */
export async function searchWeb(query: string, tavilyKey: string | null): Promise<SearchResponse> {
  if (!tavilyKey) return noSearchResult('General web search is unavailable.');
  return tavilySearch(query, tavilyKey, { maxResults: 5, searchDepth: 'basic' });
}
