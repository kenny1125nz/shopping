import type { SearchResponse } from '../types';
import { tavilySearch, noSearchResult } from './tavily';

const REVIEW_DOMAINS = [
  'rtings.com',
  'wirecutter.com',
  'techradar.com',
  'expertreviews.co.uk',
  'which.co.uk',
  'pcmag.com',
  'cnet.com',
  'reddit.com',
  'productreview.com.au',
  'trustpilot.com',
  'consumerreports.org',
];

/**
 * Searches specialist review sites, consumer forums, and product databases for
 * quality assessments, reliability data, and real-world user feedback.
 */
export async function searchProductReviews(query: string, tavilyKey: string | null): Promise<SearchResponse> {
  if (!tavilyKey) {
    return noSearchResult('Review search is unavailable.');
  }
  return tavilySearch(
    `${query} review rating reliability problems`,
    tavilyKey,
    { includeDomains: REVIEW_DOMAINS, maxResults: 5, searchDepth: 'basic' },
  );
}
