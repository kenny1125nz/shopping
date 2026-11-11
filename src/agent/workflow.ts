import type { SearchResponse } from './types';

/**
 * The six required research searches — always executed by the orchestrator.
 * China market is a 3-step sequential pipeline: brands → reputation → prices.
 */
export const WORKFLOW_STEPS = [
  { id: 'searchNZRetailers',       label: 'NZ retailers',       icon: '🇳🇿', description: 'Find current local pricing and availability' },
  { id: 'searchOverseasMarkets',   label: 'Overseas markets',    icon: '🌏', description: 'Find AliExpress, Amazon AU, and brand-direct alternatives' },
  { id: 'searchChineseBrands',     label: 'Chinese brands',      icon: '🇨🇳', description: 'Identify legitimate Chinese brands and models' },
  { id: 'searchChineseReputation', label: 'Brand reputation',    icon: '🔎', description: 'Assess brand reputation and consumer sentiment' },
  { id: 'searchChinesePrices',     label: 'Chinese prices',      icon: '💴', description: 'Get current CNY prices on Taobao, JD and Tmall' },
  { id: 'searchProductReviews',    label: 'Product reviews',     icon: '⭐', description: 'Gather quality, reliability, and consumer sentiment data' },
] as const;

export type WorkflowStepId = typeof WORKFLOW_STEPS[number]['id'];

/**
 * Three-step Chinese market research results.
 * brands: brand/model identification; reputation: consumer sentiment; prices: CNY listings.
 */
export interface ChinaResearchResults {
  brands:     SearchResponse;
  reputation: SearchResponse;
  prices:     SearchResponse;
}

/** Structured search results from the orchestrated search phase. */
export interface SearchPhaseResults {
  nz:       SearchResponse;
  overseas: SearchResponse;
  china:    ChinaResearchResults;
  reviews:  SearchResponse;
}

/** Structured search results from the price-refresh phase. */
export interface PriceRefreshResults {
  nz:       SearchResponse;
  overseas: SearchResponse;
  china:    ChinaResearchResults;
}

// ── Context formatters ────────────────────────────────────────────────

function formatResults(response: SearchResponse, label: string, headingLevel: 3 | 4 = 3): string {
  const h = '#'.repeat(headingLevel);
  const lines: string[] = [`${h} ${label}`];
  if (response.note) {
    lines.push(`*${response.note}*`);
    return lines.join('\n');
  }
  if (response.answer) {
    lines.push(`**Summary:** ${response.answer}`);
  }
  if (response.results.length === 0) {
    lines.push('*(No results found)*');
  } else {
    for (const r of response.results) {
      lines.push(`- **${r.title}**\n  ${r.snippet}\n  URL: ${r.url}`);
    }
  }
  return lines.join('\n\n');
}

/**
 * Formats the three-step Chinese market research into a structured context section.
 * Falls back gracefully if search was unavailable.
 */
function formatChinaResults(china: ChinaResearchResults): string {
  // If search was completely unavailable, brands.note carries the message
  if (china.brands.note && china.brands.results.length === 0) {
    return `### 🇨🇳 Chinese Market Research\n\n*${china.brands.note}*`;
  }

  return [
    '### 🇨🇳 Chinese Market Research',
    '',
    formatResults(china.brands,     '🔍 Step 1 — Brand & Model Identification', 4),
    '',
    formatResults(china.reputation, '⭐ Step 2 — Brand Reputation & Consumer Sentiment', 4),
    '',
    formatResults(china.prices,     '💴 Step 3 — Current CNY Prices (Taobao / JD / Tmall)', 4),
  ].join('\n');
}

/**
 * Build the user-turn message for the synthesis phase.
 * The LLM receives fully-gathered search results and only needs to write the report.
 *
 * @param userQuery   - Original text the user typed (shown for context)
 * @param productName - Resolved product name from query analysis (used as the research subject)
 * @param priorities  - Buyer priorities
 * @param results     - Gathered search results
 * @param hasSearch   - Whether live search was available
 */
export function buildSynthesisContext(
  userQuery: string,
  productName: string,
  priorities: string[],
  results: SearchPhaseResults,
  hasSearch: boolean,
): string {
  const priorityLine = priorities.length ? priorities.join(', ') : 'Best overall value';

  // Show both resolved name and original query so the LLM understands
  // the user's intent even if the product name was normalised
  const productLine = productName.toLowerCase() === userQuery.toLowerCase()
    ? `**Product:** ${productName}`
    : `**Product:** ${productName}\n**User request:** "${userQuery}"`;

  const searchSection = hasSearch
    ? [
        '## Search Results',
        '',
        formatResults(results.nz,      '🇳🇿 NZ Retailer Results'),
        '',
        formatResults(results.overseas, '🌏 Overseas Market Results'),
        '',
        formatChinaResults(results.china),
        '',
        formatResults(results.reviews, '⭐ Product Review Results'),
      ].join('\n')
    : '## Search Results\n*Live search is not configured. Use your training knowledge and note that prices may be outdated.*';

  return [
    `Research the following product for a New Zealand buyer and write the complete report.`,
    ``,
    productLine,
    `**Buyer priorities:** ${priorityLine}`,
    ``,
    searchSection,
    ``,
    `---`,
    ``,
    `Write the complete research report now using the search results above.`,
    `Only use URLs that appear in the search results — never fabricate links.`,
  ].join('\n');
}

/**
 * Build the user-turn message for the price-refresh synthesis phase.
 */
export function buildPriceRefreshContext(
  query: string,
  existingReport: string,
  results: PriceRefreshResults,
  hasSearch: boolean,
): string {
  const today = new Date().toLocaleDateString('en-NZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const searchSection = hasSearch
    ? [
        '## Fresh Price Data',
        '',
        formatResults(results.nz,      '🇳🇿 NZ Retailer Results'),
        '',
        formatResults(results.overseas, '🌏 Overseas Market Results'),
        '',
        formatChinaResults(results.china),
      ].join('\n')
    : '## Fresh Price Data\n*Live search is not configured. Use training knowledge — note prices may be outdated.*';

  return [
    `Refresh the prices in this research report for a New Zealand buyer.`,
    ``,
    `**Product:** ${query}`,
    `**Today's date:** ${today}`,
    ``,
    searchSection,
    ``,
    `---`,
    ``,
    `## Existing Report to Update`,
    ``,
    existingReport,
    ``,
    `---`,
    ``,
    `Update the pricing sections with the fresh data above. Keep all non-price content unchanged.`,
    `Only use URLs from the search results — never fabricate links.`,
  ].join('\n');
}
