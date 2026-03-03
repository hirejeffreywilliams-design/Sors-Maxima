import OpenAI from "openai";

function getOpenAIKey(): string | undefined {
  return process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
}

function getOpenAIBaseURL(): string | undefined {
  if (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    return process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  }
  return undefined;
}

export function createOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: getOpenAIKey(),
    baseURL: getOpenAIBaseURL(),
  });
}

export function isOpenAIAvailable(): boolean {
  return !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
}

export const openai = createOpenAIClient();
