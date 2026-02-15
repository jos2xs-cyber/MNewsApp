import { ArticleCandidate, RankedArticle } from '../types';
import { summarizeArticle } from './summarizer';

function scoreArticle(article: ArticleCandidate): number {
  const topicWeight = article.matchedTopics.length * 10;
  const titleWeight = Math.min(article.title.length / 10, 8);
  const sourceWeight = 5;
  return topicWeight + titleWeight + sourceWeight;
}

export async function rankAndSummarize(
  articles: ArticleCandidate[],
  topStoriesCount: number,
  storiesPerCategory: number
): Promise<RankedArticle[]> {
  const scored = articles
    .map((article) => ({ article, score: scoreArticle(article) }))
    .sort((a, b) => b.score - a.score);

  const byCategoryCount = new Map<string, number>();
  const selected = scored.filter(({ article }) => {
    const count = byCategoryCount.get(article.category) ?? 0;
    if (count >= storiesPerCategory) {
      return false;
    }
    byCategoryCount.set(article.category, count + 1);
    return true;
  });

  const limited = selected.slice(0, topStoriesCount);
  const out: RankedArticle[] = [];

  for (const item of limited) {
    const summarized = await summarizeArticle(item.article);
    out.push({
      ...item.article,
      score: item.score,
      summary: summarized.summary,
      keyPoints: summarized.keyPoints
    });
  }

  return out;
}