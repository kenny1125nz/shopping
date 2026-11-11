import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { PROVIDER_URLS, MODEL_CONTEXT_WINDOWS } from '../../services/providers';
import { getSettings } from '../../utils/storage';

/**
 * Models that cannot be used with the multi-turn agentic tool loop.
 * Two categories:
 *  - Reasoning/thinking models: return a `reasoning_content` field that must be
 *    echoed back in every subsequent turn. The AI SDK's OpenAI-compatible path
 *    strips this field, so the second call (after tool results) always fails.
 *  - Pure reasoning models: don't support tool calling at all.
 * For these models the agent falls back to a single-shot text generation using
 * training knowledge (same as when no Tavily key is configured).
 */
const NO_TOOL_MODELS = new Set([
  // DeepSeek thinking/reasoning models — require reasoning_content passthrough
  'deepseek-v4-pro',
  'deepseek-v4-flash',
  'deepseek-reasoner',
  // OpenAI reasoning models — no tool calling support
  'o1-mini',
  'o1-preview',
]);

/**
 * Returns false if the user's selected model is known to not support tool calling.
 * When false, the agent should skip tool use and rely on training knowledge.
 */
export function modelSupportsTools(): boolean {
  const settings = getSettings();
  if (!settings) return true;
  return !NO_TOOL_MODELS.has(settings.model);
}

/**
 * Returns true only if the current provider is OpenAI's own API.
 *
 * The AI SDK uses `response_format: { type: "json_schema" }` for generateObject.
 * This strict structured-output format is only reliably supported by OpenAI itself.
 * Other OpenAI-compatible endpoints (DeepSeek, Groq, OpenRouter, custom) typically
 * only support `json_object` mode or no response_format at all, and will return a
 * 400 "invalid_request_error" if json_schema is sent.
 *
 * When this returns false, callers should skip generateObject and go straight to
 * the generateText + JSON-parse fallback.
 */
export function modelSupportsStructuredOutput(): boolean {
  const settings = getSettings();
  if (!settings) return true;
  return (settings.provider ?? 'openai') === 'openai';
}

/**
 * Returns the context window size (in tokens) for the user's currently selected model.
 * Falls back to 128,000 for unknown or custom models.
 */
export function getModelContextWindow(): number {
  const settings = getSettings();
  if (!settings) return 128_000;
  return MODEL_CONTEXT_WINDOWS[settings.model] ?? 128_000;
}

/**
 * Construct an AI SDK LanguageModel from the user's stored provider/model settings.
 * @ai-sdk/openai is used for all providers via its configurable baseURL — this covers
 * OpenAI, OpenRouter (Claude, Llama, etc.), Groq, and any custom OpenAI-compatible endpoint.
 */
export function createAIModel(apiKey: string): LanguageModel {
  const settings = getSettings();
  if (!settings) throw new Error('Settings not found.');

  const provider  = settings.provider ?? 'openai';
  const modelName = settings.model    ?? 'gpt-4o';
  const baseURL   = provider === 'custom'
    ? (settings.customUrl ?? '').replace(/\/$/, '')
    : PROVIDER_URLS[provider as keyof typeof PROVIDER_URLS];

  const extraHeaders: Record<string, string> = provider === 'openrouter'
    ? { 'HTTP-Referer': window.location.href, 'X-Title': 'SmartShop NZ' }
    : {};

  const openaiProvider = createOpenAI({ apiKey, baseURL, headers: extraHeaders });
  return openaiProvider.chat(modelName);
}
