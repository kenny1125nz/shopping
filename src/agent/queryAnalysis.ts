import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import type { LanguageModel } from 'ai';
import { modelSupportsStructuredOutput } from './providers';

/**
 * Per-tool search queries derived from the user's raw input.
 * Each field is optimised for the characteristics of its target search channel.
 */
export const QueryPlanSchema = z.object({
  /**
   * The resolved, specific product name/category.
   * If the user wrote "something to cool my room", this would be
   * "Portable Air Conditioner / Evaporative Cooler".
   */
  productName: z.string().describe(
    'Specific product name or category resolved from the user\'s description',
  ),

  queries: z.object({
    /**
     * English search terms for NZ retail sites (PBTech, Harvey Norman, etc.).
     * Should include specific product names, model numbers if known, and NZD context.
     */
    nzRetailers: z.string().describe(
      'Search query for NZ retail sites — specific product name, common model variants',
    ),

    /**
     * English search terms for overseas e-commerce (AliExpress, Amazon AU/US).
     */
    overseas: z.string().describe(
      'Search query for overseas marketplaces — product name, specs, shipping to NZ',
    ),

    /**
     * MUST include Chinese keywords + English.
     * Chinese characters are critical for finding Taobao/JD/Tmall pages.
     * e.g. "移动空调 便携式空调 portable air conditioner"
     */
    chinaMarket: z.string().describe(
      'Search query for Chinese marketplaces — MUST include Chinese characters for the product and key specs, plus English',
    ),

    /**
     * English search terms for review sites (RTINGS, Reddit, Wirecutter, etc.).
     */
    reviews: z.string().describe(
      'Search query for reviews and reliability reports',
    ),
  }),
});

export type QueryPlan = z.infer<typeof QueryPlanSchema>;

const SYSTEM_PROMPT = `\
You are a search query optimiser for a New Zealand shopping research tool.
Given a user's product request (which may be vague or in non-technical language),
output optimised search queries for four different search channels.

Rules:
- For "chinaMarket": ALWAYS include Chinese characters for the product. This is critical —
  Taobao/JD/Tmall pages are in Chinese and Tavily needs Chinese keywords to find them.
  Include both Chinese AND English terms, e.g. "移动空调 便携式空调 portable air conditioner".
- For "nzRetailers": use specific product names and common model variants, not descriptive phrases.
- If the user's input is already specific (e.g. "Bosch GSB 18V-55"), keep the model number.
- If vague (e.g. "something to cool my room"), resolve to the most likely product category.`;

/**
 * Derive per-tool optimised search queries from the user's raw input.
 *
 * Uses generateObject for structured output. Falls back first to manual JSON parsing
 * from generateText (for models without structured output support), then to a simple
 * derived plan if all LLM attempts fail.
 */
export async function analyzeQuery(
  userInput: string,
  priorities: string[],
  model: LanguageModel,
): Promise<QueryPlan> {
  const priorityLine = priorities.length ? priorities.join(', ') : 'best overall value';
  const userPrompt   = `User request: "${userInput}"\nBuyer priorities: ${priorityLine}`;

  // Attempt 1: generateObject — only for providers that support json_schema response_format.
  // Other OpenAI-compatible endpoints (DeepSeek, Groq, OpenRouter, custom) reject this
  // with a 400, so skip it entirely for those providers.
  if (modelSupportsStructuredOutput()) {
    try {
      const { object } = await generateObject({
        model,
        schema: QueryPlanSchema,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
      });
      return object;
    } catch {
      // Structured output not supported by this specific model — try text-based fallback
    }
  }

  // Attempt 2: generateText with explicit JSON instructions (works with most local models)
  try {
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: [
        userPrompt,
        '',
        'Output ONLY a valid JSON object — no explanation, no markdown fences:',
        '{',
        '  "productName": "...",',
        '  "queries": {',
        '    "nzRetailers": "...",',
        '    "overseas": "...",',
        '    "chinaMarket": "... (MUST include Chinese characters) ...",',
        '    "reviews": "..."',
        '  }',
        '}',
      ].join('\n'),
    });

    // Strip markdown code fences if present
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return QueryPlanSchema.parse(parsed);
    }
  } catch {
    // Both LLM attempts failed — use the derived fallback below
  }

  // Attempt 3: Deterministic fallback — no LLM needed, always succeeds
  return buildFallbackPlan(userInput);
}

/**
 * Deterministic fallback when the LLM cannot produce structured output.
 * Appends basic Chinese shopping keywords so the China market search remains
 * somewhat useful even without a proper translation.
 */
function buildFallbackPlan(userInput: string): QueryPlan {
  return {
    productName: userInput,
    queries: {
      nzRetailers: userInput,
      overseas:    userInput,
      // Include generic Chinese shopping terms alongside the English query
      // so Tavily can still find relevant Chinese pages
      chinaMarket: `${userInput} 品牌 正品`,
      reviews:     `${userInput} review reliability problems`,
    },
  };
}
