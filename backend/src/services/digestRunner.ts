import { queries } from '../db/queries';
import { DigestHistory, DigestStatus, RankedArticle, Settings, WeatherForecast } from '../types';
import { parseRecipientList, validateRecipientList } from '../utils/validation';
import { scrapeArticles } from './scraper';
import { rankAndSummarize } from './ranker';
import { getRunOpenAiCounter, OPENAI_LIMIT_PER_RUN, resetRunOpenAiCounter } from './summarizer';
import { sendDigestEmail } from './emailer';
import { logger } from '../utils/logger';
import { fetchBedfordForecast } from './weather';

interface PendingRequest {
  action: 'generate' | 'send';
}

export interface DigestRunResult {
  success: boolean;
  queued?: boolean;
  articles_count: number;
  articles: RankedArticle[];
  error?: string;
}

let isRunning = false;
let queuedRequest: PendingRequest | null = null;
let lastError: string | null = null;
let schedulerRunning = false;
let nextRunAt: string | null = null;
let todayOpenAICalls = 0;

function categoriesJson(articles: RankedArticle[]): string {
  return JSON.stringify(Array.from(new Set(articles.map((a) => a.category))));
}

const DEDUPE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function extractUrlsFromHistory(history?: DigestHistory): Set<string> {
  if (!history) {
    return new Set();
  }

  try {
    const payload = JSON.parse(history.articles_json) as Array<{ url: string }>;
    return new Set(payload.map((entry) => entry.url));
  } catch (error) {
    logger.warn('Failed to parse previous digest articles for deduplication');
    return new Set();
  }
}

function shouldApplyDedup(history?: DigestHistory): boolean {
  if (!history) {
    return false;
  }
  const diff = Date.now() - new Date(history.generated_at).getTime();
  return diff >= DEDUPE_WINDOW_MS;
}

function consumeQueued(): void {
  if (!queuedRequest) {
    return;
  }
  const queued = queuedRequest;
  queuedRequest = null;
  execute(queued.action).catch(() => undefined);
}

async function runDigest(sendEmail: boolean): Promise<DigestRunResult> {
  logger.info(`Digest run started: mode=${sendEmail ? 'send' : 'generate'}`);
  const settings = await queries.getSettings();
  if (!settings) {
    throw new Error('Settings are missing');
  }

  resetRunOpenAiCounter();
  const articles = await scrapeArticles();
  const lastHistory = await queries.getLastSuccessfulHistory();
  const applyDedup = shouldApplyDedup(lastHistory);
  const previousUrls = extractUrlsFromHistory(lastHistory);
  let candidates = articles;
  if (applyDedup) {
    const filtered = articles.filter((article) => !previousUrls.has(article.url));
    if (filtered.length === 0) {
      logger.info('Deduplication removed all candidates; falling back to full candidate list');
    } else {
      candidates = filtered;
      logger.info(
        `Deduplication removed ${articles.length - filtered.length} articles (threshold ${DEDUPE_WINDOW_MS /
          1000 /
          60} min)`
      );
    }
  }

  logger.info(`Scraper completed: candidates=${articles.length}`);
  const ranked = await rankAndSummarize(candidates, settings.top_stories_count, settings.stories_per_category);
  logger.info(`Ranking completed: selected=${ranked.length}`);
  todayOpenAICalls += getRunOpenAiCounter();
  logger.info(`OpenAI usage this run=${getRunOpenAiCounter()} totalToday=${todayOpenAICalls}`);

  if (sendEmail) {
    const recipients = resolveRecipients(settings);
    let forecast: WeatherForecast | null = null;
    try {
      forecast = await fetchBedfordForecast();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown weather fetch error';
      logger.warn(`Weather fetch failed for email digest. Continuing without weather section. error=${message}`);
    }
    await sendDigestEmail(recipients, ranked, forecast);
  }

  const centralTime = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
  await queries.createHistoryWithTimestamp(centralTime, ranked.length, categoriesJson(ranked), JSON.stringify(ranked), sendEmail, undefined);
  logger.info('Digest history persisted');

  return {
    success: true,
    articles_count: ranked.length,
    articles: ranked
  };
}

async function execute(action: 'generate' | 'send'): Promise<DigestRunResult> {
  if (isRunning) {
    if (queuedRequest) {
      return { success: false, queued: true, articles_count: 0, articles: [], error: 'Digest already has a queued run' };
    }
    queuedRequest = { action };
    return { success: true, queued: true, articles_count: 0, articles: [] };
  }

  isRunning = true;
  lastError = null;
  try {
    return await runDigest(action === 'send');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown digest error';
    lastError = message;
    logger.error(`Digest run failed: action=${action} error=${message}`);
    const centralTime = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
    await queries.createHistoryWithTimestamp(centralTime, 0, '[]', '[]', false, message);
    return { success: false, articles_count: 0, articles: [], error: message };
  } finally {
    isRunning = false;
    consumeQueued();
  }
}

export async function generateDigestNow(): Promise<DigestRunResult> {
  return execute('generate');
}

export async function sendDigestNow(): Promise<DigestRunResult> {
  return execute('send');
}

export function setSchedulerStatus(running: boolean, next: string | null): void {
  schedulerRunning = running;
  nextRunAt = next;
}

export function resetDailyUsage(): void {
  todayOpenAICalls = 0;
}

export function getDigestStatus(): DigestStatus {
  return {
    isRunning,
    queued: Boolean(queuedRequest),
    schedulerRunning,
    nextRunAt,
    todayOpenAICalls,
    limit: OPENAI_LIMIT_PER_RUN,
    lastError
  };
}

function resolveRecipients(settings: Settings): string[] {
  const explicitExtras = parseRecipientList(settings.recipients);
  const combined = [settings.email, ...explicitExtras];
  return validateRecipientList(combined);
}
