import OpenAI from "openai";

/**
 * Priority rules:
 * 1. Replit AI Integration — when BOTH AI_INTEGRATIONS_OPENAI_API_KEY and
 *    AI_INTEGRATIONS_OPENAI_BASE_URL are set, always use them together.
 *    The integration key ONLY works with the custom base URL; using it against
 *    the standard endpoint fails with auth errors.
 * 2. Direct OPENAI_API_KEY — fallback when no Replit integration is configured.
 */
function getOpenAIConfig(): { apiKey: string | undefined; baseURL: string | undefined } {
  const integrationKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim();
  const integrationUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim();

  if (integrationKey && integrationUrl) {
    return { apiKey: integrationKey, baseURL: integrationUrl };
  }

  return { apiKey: process.env.OPENAI_API_KEY?.trim(), baseURL: undefined };
}

export function createOpenAIClient(): OpenAI {
  const { apiKey, baseURL } = getOpenAIConfig();
  return new OpenAI({ apiKey, baseURL });
}

export function isOpenAIAvailable(): boolean {
  return !!(
    (process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim() && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim()) ||
    process.env.OPENAI_API_KEY?.trim()
  );
}

export const openai = createOpenAIClient();
