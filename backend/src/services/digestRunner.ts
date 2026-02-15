import { queries } from '../db/queries';
import { DigestStatus, RankedArticle, Settings } from '../types';
import { parseRecipientList, validateRecipientList } from '../utils/validation';
import { scrapeArticles } from './scraper';
import { rankAndSummarize } from './ranker';
import { getRunOpenAiCounter, OPENAI_LIMIT_PER_RUN, resetRunOpenAiCounter } from './summarizer';
import { sendDigestEmail } from './emailer';
import { logger } from '../utils/logger';

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
  logger.info(`Scraper completed: candidates=${articles.length}`);
  const ranked = await rankAndSummarize(articles, settings.top_stories_count, settings.stories_per_category);
  logger.info(`Ranking completed: selected=${ranked.length}`);
  todayOpenAICalls += getRunOpenAiCounter();
  logger.info(`OpenAI usage this run=${getRunOpenAiCounter()} totalToday=${todayOpenAICalls}`);

  if (sendEmail) {
    const recipients = resolveRecipients(settings);
    await sendDigestEmail(recipients, ranked);
  }

  await queries.createHistory(ranked.length, categoriesJson(ranked), JSON.stringify(ranked), sendEmail, undefined);
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
    await queries.createHistory(0, '[]', '[]', false, message);
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
