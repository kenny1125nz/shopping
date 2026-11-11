import type { SearchResponse } from '../types';
import { tavilySearch, noSearchResult } from './tavily';

const NZ_RETAIL_DOMAINS = [
  'pbtech.co.nz',
  'noelleeming.co.nz',
  'harveynorman.co.nz',
  'thewarehouse.co.nz',
  'mightyape.co.nz',
  'trademe.co.nz',
  'bunnings.co.nz',
  'mitre10.co.nz',
  'farmlands.co.nz',
  'farmers.co.nz',
  'briscoes.co.nz',
  'countdown.co.nz',
  'jaycar.co.nz',
];

/**
 * Searches specifically within NZ retailer domains for current pricing and stock.
 * Covers the major NZ electronics, hardware, and general merchandise retailers.
 */
export async function searchNZRetailers(query: string, tavilyKey: string | null): Promise<SearchResponse> {
  if (!tavilyKey) {
    return noSearchResult('NZ retailer search is unavailable.');
  }
  return tavilySearch(`${query} NZD price buy new used condition`, tavilyKey, {
    includeDomains: NZ_RETAIL_DOMAINS,
    maxResults: 5,
    searchDepth: 'basic',
  });
}
