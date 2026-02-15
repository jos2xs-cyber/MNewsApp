import axios from 'axios';

export type Category = 'business' | 'tech' | 'finance' | 'ai' | 'lifestyle' | 'local' | 'food';

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

export interface AllowedDomain {
  id: number;
  domain: string;
  is_active: number;
}

export interface Settings {
  id: number;
  email: string;
  schedule_time: string;
  top_stories_count: number;
  stories_per_category: number;
  max_article_age_hours: number;
  skip_paywalls: number;
  recipients: string;
  updated_at: string;
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

export interface DigestHistory {
  id: number;
  generated_at: string;
  articles_count: number;
  categories_json: string;
  articles_json: string;
  sent_successfully: number;
  error_message: string | null;
}

const apiToken = import.meta.env.VITE_API_TOKEN as string | undefined;
const inferredBaseUrl = `${window.location.protocol}//${window.location.hostname}:3001/api`;

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!configured) {
    return inferredBaseUrl;
  }

  try {
    const parsed = new URL(configured);
    const pageHost = window.location.hostname;
    // If configured to localhost but page is opened from LAN host, remap to the LAN host.
    if ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') && pageHost !== 'localhost' && pageHost !== '127.0.0.1') {
      parsed.hostname = pageHost;
      return parsed.toString();
    }
    return configured;
  } catch {
    return inferredBaseUrl;
  }
}

export const client = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: apiToken ? { 'x-api-token': apiToken } : undefined
});
