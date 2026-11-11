import type { SearchResponse } from '../types';
import { tavilySearch, noSearchResult } from './tavily';

const OVERSEAS_DOMAINS = [
  'aliexpress.com',
  'amazon.com.au',
  'amazon.com',
  'amazon.co.uk',
  'ebay.com.au',
  'banggood.com',
  'gearbest.com',
];

/**
 * Searches international e-commerce platforms for alternatives that can be shipped to NZ.
 * Useful for finding budget options or products not available locally.
 */
export async function searchOverseasMarkets(query: string, tavilyKey: string | null): Promise<SearchResponse> {
  if (!tavilyKey) {
    return noSearchResult('Overseas market search is unavailable.');
  }
  return tavilySearch(
    `${query} buy ship Australia New Zealand price USD AUD`,
    tavilyKey,
    { includeDomains: OVERSEAS_DOMAINS, maxResults: 5, searchDepth: 'basic' },
  );
}
