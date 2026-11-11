import { streamText, generateObject, generateText } from 'ai';
import { z } from 'zod';
import type { LanguageModel } from 'ai';
import type { AgentEvent, SearchResponse } from './types';
import { createAIModel, getModelContextWindow, modelSupportsStructuredOutput } from './providers';
import {
  searchNZRetailers,
  searchOverseasMarkets,
  searchChineseBrands,
  searchChineseReputation,
  searchChinesePrices,
  searchProductReviews,
} from './tools';
import { RESEARCH_SYSTEM_PROMPT, PRICE_REFRESH_SYSTEM_PROMPT } from './prompts/system';
import {
  buildSynthesisContext,
  buildPriceRefreshContext,
  type SearchPhaseResults,
  type PriceRefreshResults,
  type ChinaResearchResults,
} from './workflow';
import { analyzeQuery, type QueryPlan } from './queryAnalysis';
import { getApiKey, getTavilyKey } from '../services/agent';

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Run a single search, emitting its own tool-call and tool-result events.
 * Errors are caught and returned as a failed SearchResponse so one bad search
 * never blocks the others.
 */
async function runSingleSearch(
  id: string,
  toolName: string,
  query: string,
  fn: () => Promise<SearchResponse>,
  onEvent: (event: AgentEvent) => void,
): Promise<SearchResponse> {
  onEvent({ type: 'tool-call', id, toolName, args: { query } });
  try {
    const result = await fn();
    onEvent({
      type: 'tool-result',
      id,
      toolName,
      resultCount: result.results.length,
      summary: result.note ?? result.answer ?? result.results[0]?.snippet?.slice(0, 120) ?? '',
    });
    return result;
  } catch (e) {
    const note = `Search failed: ${e instanceof Error ? e.message : 'unknown error'}`;
    onEvent({ type: 'tool-result', id, toolName, resultCount: 0, summary: note });
    return { results: [], note };
  }
}

const BRAND_EXTRACTION_PROMPT = (query: string, snippets: string) => [
  `Product: "${query}"`,
  ``,
  `Extract up to 5 legitimate Chinese brand/manufacturer names from these search results.`,
  `Include only established brands with traceable company history — skip generic or anonymous sellers.`,
  `Include both the English and Chinese name where both appear (e.g. "Midea 美的").`,
  ``,
  snippets,
].join('\n');

/**
 * Extract brand names from Chinese brand search results using the LLM.
 * Returns a space-separated string of up to 5 brand names, or '' on failure.
 * These names are injected into the reputation and price queries so subsequent
 * searches target the specific brands discovered in step 1.
 *
 * Uses generateObject for OpenAI (json_schema supported), falls back to
 * generateText + JSON parsing for all other providers that reject json_schema.
 */
async function extractBrandNames(
  brandResults: SearchResponse,
  query: string,
  model: LanguageModel,
): Promise<string> {
  if (brandResults.results.length === 0) return '';

  const snippets = brandResults.results
    .slice(0, 4)
    .map(r => `${r.title}: ${r.snippet}`)
    .join('\n\n');

  const prompt = BRAND_EXTRACTION_PROMPT(query, snippets);

  // Attempt 1: structured output (OpenAI only — other providers reject json_schema)
  if (modelSupportsStructuredOutput()) {
    try {
      const { object } = await generateObject({
        model,
        schema: z.object({
          brands: z.array(z.string()).describe(
            'Legitimate Chinese brand or manufacturer names. ' +
            'Include both English and Chinese name where both appear (e.g. "Midea 美的"). Max 5.',
          ),
        }),
        prompt,
      });
      return object.brands.slice(0, 5).join(' ');
    } catch {
      // Fall through to text-based extraction
    }
  }

  // Attempt 2: generateText + JSON array parsing (works with all providers)
  try {
    const { text } = await generateText({
      model,
      prompt: [
        prompt,
        ``,
        `Output ONLY a JSON array of brand name strings, e.g. ["Midea 美的", "Haier 海尔"]. No explanation.`,
      ].join('\n'),
    });
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) {
      const brands = JSON.parse(match[0]) as unknown;
      if (Array.isArray(brands)) {
        return (brands as string[]).slice(0, 5).join(' ');
      }
    }
  } catch {
    // Both attempts failed — proceed without brand targeting
  }

  return '';
}

// ── China market pipeline ────────────────────────────────────────────────────

/**
 * Sequential three-step Chinese market research pipeline:
 *
 * Step 1 — Brand identification: broad search to surface brands and models.
 * Step 2 — Reputation assessment: targeted review-community search using discovered brands.
 * Step 3 — Price lookup: marketplace search (Taobao / JD / Tmall) using discovered brands.
 *
 * Each step emits its own tool-call / tool-result events. Steps 2 and 3 inject
 * the brand names found in step 1 to keep subsequent queries focused.
 */
async function runChinaResearchPhase(
  chinaMarketQuery: string,
  tavilyKey: string | null,
  model: LanguageModel,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<ChinaResearchResults> {
  // Step 1: Brand identification
  const brands = await runSingleSearch(
    'china-brands',
    'searchChineseBrands',
    chinaMarketQuery,
    () => searchChineseBrands(chinaMarketQuery, tavilyKey),
    onEvent,
  );
  if (signal?.aborted) throw new Error('AbortError');

  // Extract brand names to target subsequent searches
  const brandNames = await extractBrandNames(brands, chinaMarketQuery, model);
  if (signal?.aborted) throw new Error('AbortError');

  // Step 2: Reputation assessment (uses discovered brand names)
  const reputation = await runSingleSearch(
    'china-reputation',
    'searchChineseReputation',
    brandNames ? `${brandNames} ${chinaMarketQuery}` : chinaMarketQuery,
    () => searchChineseReputation(chinaMarketQuery, brandNames, tavilyKey),
    onEvent,
  );
  if (signal?.aborted) throw new Error('AbortError');

  // Step 3: Price lookup (uses discovered brand names)
  const prices = await runSingleSearch(
    'china-prices',
    'searchChinesePrices',
    brandNames ? `${brandNames} ${chinaMarketQuery}` : chinaMarketQuery,
    () => searchChinesePrices(chinaMarketQuery, brandNames, tavilyKey),
    onEvent,
  );

  return { brands, reputation, prices };
}

// ── Search phase ────────────────────────────────────────────────────────────

/**
 * Application-orchestrated search phase.
 *
 * NZ retailers, overseas markets, and product reviews run in parallel.
 * The China market pipeline runs concurrently but internally sequential
 * (brands → reputation → prices), with brand names from step 1 used to
 * sharpen steps 2 and 3.
 *
 * Each search emits its own tool-call / tool-result events as it starts and
 * completes. The LLM is never involved in the search phase.
 */
async function runSearchPhase(
  queries: QueryPlan['queries'],
  tavilyKey: string | null,
  model: LanguageModel,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<SearchPhaseResults> {
  const [nz, overseas, reviews, china] = await Promise.all([
    runSingleSearch(
      'search-nz', 'searchNZRetailers', queries.nzRetailers,
      () => searchNZRetailers(queries.nzRetailers, tavilyKey),
      onEvent,
    ),
    runSingleSearch(
      'search-overseas', 'searchOverseasMarkets', queries.overseas,
      () => searchOverseasMarkets(queries.overseas, tavilyKey),
      onEvent,
    ),
    runSingleSearch(
      'search-reviews', 'searchProductReviews', queries.reviews,
      () => searchProductReviews(queries.reviews, tavilyKey),
      onEvent,
    ),
    runChinaResearchPhase(queries.chinaMarket, tavilyKey, model, onEvent, signal),
  ]);

  if (signal?.aborted) throw new Error('AbortError');

  return { nz, overseas, china, reviews };
}

/**
 * Price-refresh search phase — NZ, overseas, and the full China pipeline (no reviews).
 */
async function runPriceRefreshSearchPhase(
  queries: Pick<QueryPlan['queries'], 'nzRetailers' | 'overseas' | 'chinaMarket'>,
  tavilyKey: string | null,
  model: LanguageModel,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<PriceRefreshResults> {
  const [nz, overseas, china] = await Promise.all([
    runSingleSearch(
      'refresh-nz', 'searchNZRetailers', queries.nzRetailers,
      () => searchNZRetailers(queries.nzRetailers, tavilyKey),
      onEvent,
    ),
    runSingleSearch(
      'refresh-overseas', 'searchOverseasMarkets', queries.overseas,
      () => searchOverseasMarkets(queries.overseas, tavilyKey),
      onEvent,
    ),
    runChinaResearchPhase(queries.chinaMarket, tavilyKey, model, onEvent, signal),
  ]);

  if (signal?.aborted) throw new Error('AbortError');

  return { nz, overseas, china };
}

// ── Synthesis phase ─────────────────────────────────────────────────────────

/**
 * Stream the LLM synthesis from pre-gathered search results.
 * Returns the final accumulated text.
 */
async function runSynthesis(
  systemPrompt: string,
  userContext: string,
  searchCount: number,
  apiKey: string,
  contextWindow: number,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<string> {
  const model = createAIModel(apiKey);

  const result = streamText({
    model,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContext }],
    abortSignal: signal,
  });

  let accumulated          = '';
  let latestInputTokens    = 0;
  let cumulativeOutputTokens = 0;

  for await (const part of result.fullStream) {
    if (signal?.aborted) break;

    switch (part.type) {
      case 'text-delta':
        accumulated += part.text;
        onEvent({ type: 'text-chunk', chunk: part.text, accumulated });
        break;

      case 'finish-step':
        latestInputTokens      = part.usage.inputTokens     ?? latestInputTokens;
        cumulativeOutputTokens += part.usage.outputTokens   ?? 0;
        onEvent({
          type: 'step-stats',
          searchCount,
          inputTokens:  latestInputTokens,
          outputTokens: cumulativeOutputTokens,
          contextWindow,
        });
        break;

      case 'finish':
        onEvent({
          type: 'stats',
          searchCount,
          inputTokens:  latestInputTokens,
          outputTokens: part.totalUsage.outputTokens ?? cumulativeOutputTokens,
          contextWindow,
        });
        break;

      default:
        break;
    }
  }

  return accumulated;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Run the SmartShop NZ full research workflow.
 *
 * Phase 0 — Query analysis: resolve vague input to specific product terms and
 *   generate per-channel optimised queries (including Chinese keywords).
 *
 * Phase 1 — Application-orchestrated searches (6 total, guaranteed):
 *   NZ retailers, overseas markets, and product reviews run in parallel.
 *   China market runs as a sequential 3-step pipeline (brands → reputation → prices)
 *   concurrently with the other three.
 *
 * Phase 2 — LLM synthesis (single streamText call, no tool loop):
 *   The model receives all search results as context and writes the report.
 */
export async function runResearchAgent(
  query: string,
  priorities: string[],
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('No API key configured. Please add your key in Settings.');

  const tavilyKey     = await getTavilyKey();
  const contextWindow = getModelContextWindow();
  const hasSearch     = tavilyKey !== null;
  const model         = createAIModel(apiKey);

  // Phase 0: Query analysis
  onEvent({ type: 'tool-call', id: 'query-analysis', toolName: 'analyzeQuery', args: { query } });
  const queryPlan = await analyzeQuery(query, priorities, model);
  if (signal?.aborted) return '';
  onEvent({
    type: 'tool-result',
    id: 'query-analysis',
    toolName: 'analyzeQuery',
    resultCount: 0,
    summary: queryPlan.productName !== query ? `Identified: ${queryPlan.productName}` : 'Queries optimised',
  });

  // Phase 1: Parallel searches (NZ / overseas / reviews) + sequential China pipeline
  const searchResults = await runSearchPhase(queryPlan.queries, tavilyKey, model, onEvent, signal);
  if (signal?.aborted) return '';

  // Phase 2: LLM synthesises from all gathered results
  const context = buildSynthesisContext(query, queryPlan.productName, priorities, searchResults, hasSearch);
  const content = await runSynthesis(
    RESEARCH_SYSTEM_PROMPT,
    context,
    6, // 3 parallel + 3 China pipeline steps
    apiKey,
    contextWindow,
    onEvent,
    signal,
  );

  onEvent({ type: 'done' });
  return content;
}

/**
 * Refresh prices in an existing research report.
 *
 * Phase 1 — NZ and overseas searches run in parallel; China pipeline runs
 *   concurrently (brands → reputation → prices) to surface current CNY prices.
 * Phase 2 — LLM updates only the pricing sections, preserving everything else.
 */
export async function refreshResearchPrices(
  query: string,
  existingContent: string,
  onEvent: (event: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('No API key configured. Please add your key in Settings.');

  const tavilyKey     = await getTavilyKey();
  const contextWindow = getModelContextWindow();
  const hasSearch     = tavilyKey !== null;
  const model         = createAIModel(apiKey);

  // Phase 0: Re-analyse the query to get optimised price-search terms
  onEvent({ type: 'tool-call', id: 'query-analysis', toolName: 'analyzeQuery', args: { query } });
  const queryPlan = await analyzeQuery(query, [], model);
  if (signal?.aborted) return '';
  onEvent({
    type: 'tool-result',
    id: 'query-analysis',
    toolName: 'analyzeQuery',
    resultCount: 0,
    summary: 'Queries optimised for price refresh',
  });

  // Phase 1: Fresh price searches
  const priceResults = await runPriceRefreshSearchPhase(queryPlan.queries, tavilyKey, model, onEvent, signal);
  if (signal?.aborted) return '';

  // Phase 2: LLM updates the report
  const context = buildPriceRefreshContext(query, existingContent, priceResults, hasSearch);
  const content = await runSynthesis(
    PRICE_REFRESH_SYSTEM_PROMPT,
    context,
    5, // 2 parallel + 3 China pipeline steps
    apiKey,
    contextWindow,
    onEvent,
    signal,
  );

  onEvent({ type: 'done' });
  return content;
}
