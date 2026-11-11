export interface ApiError {
  title: string;
  hint: string;
  code: string | null;
  raw: string;
  timestamp: number;
}

export function classifyApiError(err: unknown): ApiError {
  const raw = err instanceof Error ? err.message : String(err);
  const timestamp = Date.now();

  if (/no api key|not configured|add your/i.test(raw)) {
    return { title: 'Not Configured', code: null, hint: 'Add your LLM API key in Settings to start researching.', raw, timestamp };
  }

  if (/401|unauthorized|invalid.api.key|incorrect.api|invalid_api_key/i.test(raw)) {
    return { title: 'Authentication Failed', code: '401', hint: 'Your API key is invalid or expired — update it in Settings.', raw, timestamp };
  }

  if (/403|forbidden|permission/i.test(raw)) {
    return { title: 'Access Denied', code: '403', hint: 'Your API key does not have permission for this operation.', raw, timestamp };
  }

  if (/429|rate.limit|quota.exceeded|too.many.request/i.test(raw)) {
    return { title: 'Rate Limited', code: '429', hint: 'Too many requests — wait a moment, then try again.', raw, timestamp };
  }

  if (/insufficient.quota|billing|payment|credits/i.test(raw)) {
    return { title: 'Quota Exceeded', code: '402', hint: 'Your API account has run out of credits. Top up your balance.', raw, timestamp };
  }

  if (/502|503|504|bad.gateway|service.unavailable|gateway.timeout/i.test(raw)) {
    return { title: 'Provider Unavailable', code: '5xx', hint: 'The AI provider is temporarily down. Try again in a minute.', raw, timestamp };
  }

  if (/500|internal.server.error/i.test(raw)) {
    return { title: 'Provider Error', code: '500', hint: 'The AI provider returned a server error. Try a different model or provider in Settings.', raw, timestamp };
  }

  if (/cors|failed to fetch|networkerror|net::|ssl|certificate|unable to connect/i.test(raw)) {
    return { title: 'Network / CORS Error', code: null, hint: 'This provider may not support direct browser requests. Switch to OpenRouter in Settings.', raw, timestamp };
  }

  if (/context.length|context.window|maximum.context|tokens/i.test(raw)) {
    return { title: 'Context Too Long', code: null, hint: 'The response exceeded the model\'s context limit. Try a model with a larger context window.', raw, timestamp };
  }

  return { title: 'Research Failed', code: null, hint: 'An unexpected error occurred.', raw, timestamp };
}
