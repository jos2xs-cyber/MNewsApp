import { z } from 'zod';

export const categorySchema = z.enum(['business', 'tech', 'finance', 'ai', 'lifestyle', 'local', 'food', 'world']);

export const sourceCreateSchema = z.object({
  category: categorySchema,
  url: z.string().url().min(8).max(1024),
  name: z.string().trim().min(2).max(120)
});

export const topicCreateSchema = z.object({
  category: categorySchema,
  topic: z.string().trim().min(2).max(120)
});

export const toggleSchema = z.object({
  is_active: z.boolean()
});

export const settingsUpdateSchema = z.object({
  email: z.string().email().max(255),
  schedule_time: z.string().regex(/^([0-5]?\d)\s+([01]?\d|2[0-3])\s+([*]|[1-2]?\d|3[0-1])\s+([*]|[1-9]|1[0-2])\s+([*]|[0-6])$/),
  top_stories_count: z.number().int().min(1).max(50),
  stories_per_category: z.number().int().min(1).max(20),
  max_article_age_hours: z.number().int().min(1).max(168),
  skip_paywalls: z.boolean(),
  recipients: z.string().max(1024),
  topic_free_categories: z.string().max(256)
});

export const allowedDomainCreateSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
});

export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '').trim();
}

export function validateHttpsUrl(url: string): URL {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed');
  }
  return parsed;
}

export function isDomainAllowed(hostname: string, allowedDomains: string[]): boolean {
  const normalizedHost = normalizeDomain(hostname);
  return allowedDomains.some((domain) => {
    const normalized = normalizeDomain(domain);
    return normalizedHost === normalized || normalizedHost.endsWith(`.${normalized}`);
  });
}

const RECIPIENT_SPLIT = /[,\n;]+/;
const emailSchema = z.string().email();

export function parseRecipientList(raw: string): string[] {
  return raw
    .split(RECIPIENT_SPLIT)
    .map((entry) => entry.trim())
    .filter((entry): entry is string => entry.length > 0);
}

export function validateRecipientList(list: string[], limit = 3): string[] {
  if (list.length === 0) {
    throw new Error('Provide at least one recipient email');
  }
  const normalized = Array.from(new Set(list)).map((entry) => emailSchema.parse(entry));
  if (normalized.length > limit) {
    throw new Error(`At most ${limit} recipients allowed`);
  }
  return normalized;
}

const CATEGORY_SPLIT = /[,\n;]+/;

export function parseCategoryList(raw: string): string[] {
  return raw
    .split(CATEGORY_SPLIT)
    .map((entry) => entry.trim())
    .filter((entry): entry is string => entry.length > 0);
}
