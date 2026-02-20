import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { ArticleCandidate } from '../types';

const MAX_AI_CALLS_PER_RUN = 50;
const summaryCache = new Map<string, { summary: string; keyPoints: string[] }>();

let runCallCount = 0;

let openAiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

type Provider = 'openai' | 'anthropic';
const OVERLOAD_RETRY_ATTEMPTS = 3;
const OVERLOAD_RETRY_BASE_DELAY_MS = 1000;

export function resetRunOpenAiCounter(): void {
  runCallCount = 0;
}

export function getRunOpenAiCounter(): number {
  return runCallCount;
}

function ensureBudget(): void {
  if (runCallCount >= MAX_AI_CALLS_PER_RUN) {
    throw new Error('AI call limit reached for this run');
  }
}

function getOpenAiClient(): OpenAI {
  if (openAiClient) {
    return openAiClient;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing');
  }
  openAiClient = new OpenAI({ apiKey });
  return openAiClient;
}

function getAnthropicClient(): Anthropic {
  if (anthropicClient) {
    return anthropicClient;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is missing');
  }
  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

function parseOutput(text: string, fallbackSummary: string, fallbackPoints: string[]): { summary: string; keyPoints: string[] } {
  let summary = fallbackSummary;
  let keyPoints = fallbackPoints;

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.summary === 'string' && parsed.summary.trim().length > 0) {
      summary = parsed.summary.trim();
    }
    if (Array.isArray(parsed.keyPoints)) {
      keyPoints = parsed.keyPoints.filter((p: unknown) => typeof p === 'string').slice(0, 3);
    }
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (typeof parsed.summary === 'string' && parsed.summary.trim().length > 0) {
          summary = parsed.summary.trim();
        }
        if (Array.isArray(parsed.keyPoints)) {
          keyPoints = parsed.keyPoints.filter((p: unknown) => typeof p === 'string').slice(0, 3);
        }
      } catch {
        summary = text.slice(0, 500) || fallbackSummary;
      }
    } else {
      summary = text.slice(0, 500) || fallbackSummary;
    }
  }

  if (keyPoints.length === 0) {
    keyPoints = fallbackPoints;
  }

  return { summary, keyPoints };
}

function getProviderOrder(): Provider[] {
  const configured = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();
  if (configured === 'anthropic') {
    return ['anthropic'];
  }
  if (configured === 'auto') {
    const order: Provider[] = [];
    if (process.env.OPENAI_API_KEY) {
      order.push('openai');
    }
    if (process.env.ANTHROPIC_API_KEY) {
      order.push('anthropic');
    }
    if (order.length === 0) {
      throw new Error('AI_PROVIDER=auto requires OPENAI_API_KEY or ANTHROPIC_API_KEY');
    }
    return order;
  }
  return ['openai'];
}

function shouldFallback(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const withMeta = error as Error & { status?: number; code?: string };
  const lower = error.message.toLowerCase();

  return (
    withMeta.status === 429 ||
    withMeta.code === 'insufficient_quota' ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('429')
  );
}

function isOverloadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const withMeta = error as Error & { status?: number; code?: string };
  const lower = error.message.toLowerCase();
  return (
    withMeta.status === 529 ||
    withMeta.status === 503 ||
    withMeta.code === 'overloaded_error' ||
    lower.includes('overloaded') ||
    lower.includes('529') ||
    lower.includes('503')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withOverloadRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= OVERLOAD_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      const wrapped = error instanceof Error ? error : new Error('Unknown AI provider error');
      lastError = wrapped;
      const shouldRetry = attempt < OVERLOAD_RETRY_ATTEMPTS && isOverloadError(wrapped);
      if (!shouldRetry) {
        throw wrapped;
      }
      await sleep(OVERLOAD_RETRY_BASE_DELAY_MS * attempt);
    }
  }
  throw lastError ?? new Error('Unknown AI provider error');
}

async function summarizeWithOpenAI(prompt: string): Promise<string> {
  const model = process.env.OPENAI_MODEL ?? 'gpt-5.2';
  const response = await withOverloadRetry(() =>
    getOpenAiClient().responses.create({
      model,
      input: prompt,
      max_output_tokens: 220
    })
  );
  return response.output_text || '';
}

async function summarizeWithAnthropic(prompt: string): Promise<string> {
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest';
  const response = await withOverloadRetry(() =>
    getAnthropicClient().messages.create({
      model,
      max_tokens: 220,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    })
  );

  const texts: string[] = [];
  for (const block of response.content) {
    if (block.type === 'text' && typeof block.text === 'string') {
      texts.push(block.text);
    }
  }
  return texts.join('\n');
}

export async function summarizeArticle(article: ArticleCandidate): Promise<{ summary: string; keyPoints: string[] }> {
  const cacheKey = `${article.url}|${article.title}`;
  const existing = summaryCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  ensureBudget();
  runCallCount += 1;

  const prompt = `Summarize this news item in 2-3 sentences and return JSON only with keys summary and keyPoints (array of 3 short bullet strings).\nTitle: ${article.title}\nSnippet: ${article.snippet}\nURL: ${article.url}`;

  const providers = getProviderOrder();
  let lastError: Error | null = null;
  let outputText = '';

  for (let i = 0; i < providers.length; i += 1) {
    const provider = providers[i];
    try {
      outputText = provider === 'openai' ? await summarizeWithOpenAI(prompt) : await summarizeWithAnthropic(prompt);
      lastError = null;
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown AI provider error');
      const canFallback = i < providers.length - 1 && shouldFallback(error);
      if (!canFallback) {
        throw lastError;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  const normalized = parseOutput(outputText, article.snippet, article.matchedTopics.slice(0, 3));
  summaryCache.set(cacheKey, normalized);
  return normalized;
}

export const OPENAI_LIMIT_PER_RUN = MAX_AI_CALLS_PER_RUN;
