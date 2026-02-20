export type Category = 'business' | 'tech' | 'finance' | 'ai' | 'lifestyle' | 'local' | 'food' | 'world' | 'politics';

export interface Source {
  id: number;
  category: Category;
  url: string;
  name: string;
  is_active: number;
  created_at: string;
}

export interface Topic {
  id: number;
  category: Category;
  topic: string;
  is_active: number;
  created_at: string;
}

export interface Settings {
  id: 1;
  email: string;
  schedule_time: string;
  top_stories_count: number;
  stories_per_category: number;
  max_article_age_hours: number;
  skip_paywalls: number;
  recipients: string;
  topic_free_categories: string;
  updated_at: string;
}

export interface AllowedDomain {
  id: number;
  domain: string;
  is_active: number;
}

export interface DigestHistory {
  id: number;
  generated_at: string;
  articles_count: number;
  categories_json: string;
  articles_json: string;
  sent_successfully: number;
  run_type: string | null;
  error_message: string | null;
}

export interface ArticleCandidate {
  title: string;
  url: string;
  source: string;
  category: Category;
  snippet: string;
  publishedAt?: string;
  matchedTopics: string[];
}

export interface RankedArticle extends ArticleCandidate {
  score: number;
  summary: string;
  keyPoints: string[];
}

export interface DigestStatus {
  isRunning: boolean;
  queued: boolean;
  schedulerRunning: boolean;
  nextRunAt: string | null;
  todayOpenAICalls: number;
  limit: number;
  lastError: string | null;
}

export interface WeatherDaily {
  date: string;
  weekday: string;
  description: string;
  icon: string;
  maxTempF: number;
  minTempF: number;
  avgTempF: number;
  chanceOfRain: number;
}

export interface WeatherForecast {
  location: string;
  updated: string;
  forecast: WeatherDaily[];
}
