import axios from 'axios';
import * as cheerio from 'cheerio';
import { queries } from '../db/queries';
import { ArticleCandidate, Category, Topic } from '../types';
import { isDomainAllowed, validateHttpsUrl } from '../utils/validation';

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_LINKS_PER_SOURCE = 220;
const MAX_RESULTS_PER_SOURCE = 40;

function topicMatchScore(title: string, snippet: string, topics: Topic[]): string[] {
  const haystack = `${title} ${snippet}`.toLowerCase();
  return topics
    .map((t) => t.topic)
    .filter((topic) => {
      const normalized = topic.toLowerCase();
      if (haystack.includes(normalized)) {
        return true;
      }
      // Also allow partial token matches so topic matching is not overly strict.
      const tokens = normalized.split(/\s+/).filter((token) => token.length >= 4);
      return tokens.some((token) => haystack.includes(token));
    });
}

function isLikelyPaywalled(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('/subscribe') || lower.includes('/paywall') || lower.includes('/premium');
}

function normalizeLink(baseUrl: string, href: string): string | null {
  try {
    const resolved = new URL(href, baseUrl);
    if (resolved.protocol !== 'https:') {
      return null;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

function normalizeTitle(rawTitle: string): string {
  return rawTitle.replace(/\s+/g, ' ').trim();
}

function isLikelyArticleUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (
    lower.includes('/live/') ||
    lower.includes('/video/') ||
    lower.includes('/newsletter') ||
    lower.includes('/podcast')
  ) {
    return false;
  }
  return true;
}

export async function scrapeArticles(): Promise<ArticleCandidate[]> {
  const [sources, topics, settings, allowedDomains] = await Promise.all([
    queries.listSources(),
    queries.listTopics(),
    queries.getSettings(),
    queries.listActiveAllowedDomains()
  ]);

  if (!settings) {
    throw new Error('Settings missing');
  }

  const activeSources = sources.filter((s) => s.is_active === 1);
  const activeTopics = topics.filter((t) => t.is_active === 1);

  const results: ArticleCandidate[] = [];
  const seenUrls = new Set<string>();

  for (const source of activeSources) {
    const parsedSource = validateHttpsUrl(source.url);
    if (!isDomainAllowed(parsedSource.hostname, allowedDomains)) {
      continue;
    }

    try {
      const response = await axios.get(source.url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'User-Agent': 'NewsDigestBot/1.0 (+local dashboard)'
        }
      });

      const $ = cheerio.load(response.data);
      const links = $('article a[href], h2 a[href], h3 a[href], a[href]')
        .toArray()
        .slice(0, MAX_LINKS_PER_SOURCE);
      let sourceResultCount = 0;
      const sourceTopics = activeTopics.filter((t) => t.category === source.category);

      for (const link of links) {
        const href = $(link).attr('href');
        const title = normalizeTitle(
          $(link).text().trim() || $(link).attr('title') || $(link).attr('aria-label') || ''
        );
        if (!href || title.length < 12) {
          continue;
        }

        const articleUrl = normalizeLink(source.url, href);
        if (!articleUrl || seenUrls.has(articleUrl)) {
          continue;
        }
        if (!isLikelyArticleUrl(articleUrl)) {
          continue;
        }

        const parsedArticle = validateHttpsUrl(articleUrl);
        if (!isDomainAllowed(parsedArticle.hostname, allowedDomains)) {
          continue;
        }

        if (settings.skip_paywalls === 1 && isLikelyPaywalled(articleUrl)) {
          continue;
        }

        const snippet = title.slice(0, 280);
        const matchedTopics = topicMatchScore(title, snippet, sourceTopics);
        // Keep strong topic matches first, but don't drop all headlines when matches are sparse.
        const finalTopics = matchedTopics.length > 0 ? matchedTopics : ['top story'];

        seenUrls.add(articleUrl);
        results.push({
          title,
          url: articleUrl,
          source: source.name,
          category: source.category as Category,
          snippet,
          matchedTopics: finalTopics
        });

        sourceResultCount += 1;
        if (sourceResultCount >= MAX_RESULTS_PER_SOURCE) {
          break;
        }
      }
    } catch {
      // fail-soft per source
      continue;
    }
  }

  return results;
}
