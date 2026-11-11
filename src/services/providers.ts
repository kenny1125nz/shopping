import type { ModelOption, Provider } from '../types';

export const PROVIDER_URLS: Record<Exclude<Provider, 'custom'>, string> = {
  openai:     'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  groq:       'https://api.groq.com/openai/v1',
  deepseek:   'https://api.deepseek.com/v1',
};

export const PROVIDER_LABELS: Record<Provider, { name: string; description: string }> = {
  openai:     { name: 'OpenAI',     description: 'GPT-4o, GPT-4o-mini' },
  openrouter: { name: 'OpenRouter', description: 'Claude, GPT, Llama & more' },
  groq:       { name: 'Groq',       description: 'Fast inference, free tier' },
  deepseek:   { name: 'DeepSeek',   description: 'deepseek-chat, deepseek-reasoner' },
  custom:     { name: 'Custom',     description: 'Any OpenAI-compatible URL' },
};

export const PROVIDER_MODELS: Record<Provider, ModelOption[]> = {
  openai: [
    { value: 'gpt-4o',        label: 'GPT-4o (Recommended)' },
    { value: 'gpt-4o-mini',   label: 'GPT-4o Mini (Fast & Cheap)' },
    { value: 'gpt-4-turbo',   label: 'GPT-4 Turbo' },
  ],
  openrouter: [
    { value: 'anthropic/claude-opus-4-5',         label: 'Claude Opus 4.5' },
    { value: 'anthropic/claude-sonnet-4-5',       label: 'Claude Sonnet 4.5' },
    { value: 'openai/gpt-4o',                     label: 'GPT-4o via OpenRouter' },
    { value: 'openai/gpt-4o-mini',                label: 'GPT-4o Mini via OpenRouter' },
    { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
    { value: 'google/gemini-flash-1.5',           label: 'Gemini Flash 1.5' },
  ],
  groq: [
    { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B (Fast)' },
    { value: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B (Fastest)' },
    { value: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B' },
    { value: 'gemma2-9b-it',            label: 'Gemma 2 9B' },
  ],
  deepseek: [
    { value: 'deepseek-chat',     label: 'DeepSeek V3 (Recommended — supports live search)' },
    { value: 'deepseek-v4-pro',   label: 'DeepSeek V4 Pro (no live search — thinking mode)' },
    { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash (no live search — thinking mode)' },
    { value: 'deepseek-reasoner', label: 'DeepSeek R1 (no live search — reasoning only)' },
  ],
  custom: [
    { value: 'gpt-4o',      label: 'gpt-4o' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
    { value: 'llama3',      label: 'llama3' },
    { value: 'mistral',     label: 'mistral' },
  ],
};

export const ALL_PROVIDERS: Provider[] = ['openai', 'openrouter', 'groq', 'deepseek', 'custom'];

/**
 * Known context window sizes (in tokens) keyed by model ID.
 * Used to display the context usage ratio in the agent stats bar.
 * Falls back to 128_000 for unknown/custom models.
 */
export const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  // OpenAI
  'gpt-4o':        128_000,
  'gpt-4o-mini':   128_000,
  'gpt-4-turbo':   128_000,
  // OpenRouter — Claude
  'anthropic/claude-opus-4-5':   200_000,
  'anthropic/claude-sonnet-4-5': 200_000,
  // OpenRouter — OpenAI passthrough
  'openai/gpt-4o':       128_000,
  'openai/gpt-4o-mini':  128_000,
  // OpenRouter — Meta Llama
  'meta-llama/llama-3.1-70b-instruct': 131_072,
  // OpenRouter — Google
  'google/gemini-flash-1.5': 1_000_000,
  // Groq
  'llama-3.1-70b-versatile': 131_072,
  'llama-3.1-8b-instant':    131_072,
  'mixtral-8x7b-32768':       32_768,
  'gemma2-9b-it':              8_192,
  // DeepSeek
  'deepseek-chat':     64_000,
  'deepseek-v4-pro':  128_000,
  'deepseek-v4-flash': 128_000,
  'deepseek-reasoner': 64_000,
};
