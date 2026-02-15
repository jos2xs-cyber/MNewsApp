import path from 'node:path';
import sqlite3 from 'sqlite3';
import { logger } from '../utils/logger';

const backendRoot = path.resolve(__dirname, '..', '..');
const repoRoot = path.resolve(backendRoot, '..');

function resolveDbPath(): string {
  const configured = process.env.DB_PATH?.trim();
  if (!configured) {
    return path.resolve(backendRoot, 'database.sqlite');
  }
  if (path.isAbsolute(configured)) {
    return configured;
  }

  // Support both "database.sqlite" (relative to backend/) and
  // "backend/database.sqlite" (relative to repo root) consistently.
  const normalized = configured.replace(/\\/g, '/');
  if (normalized.startsWith('backend/')) {
    return path.resolve(repoRoot, configured);
  }
  return path.resolve(backendRoot, configured);
}

const DB_PATH = resolveDbPath();

let db: sqlite3.Database;

function run(sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row as T | undefined);
    });
  });
}

export function getDb(): sqlite3.Database {
  if (!db) {
    throw new Error('Database has not been initialized');
  }
  return db;
}

async function seedDefaults(): Promise<void> {
  await run(
    `INSERT OR IGNORE INTO settings (id, email, schedule_time, top_stories_count, stories_per_category, max_article_age_hours, skip_paywalls, updated_at)
     VALUES (1, '', '0 7 * * *', 10, 5, 24, 1, CURRENT_TIMESTAMP)`
  );

  const domains = ['bloomberg.com', 'wsj.com', 'ft.com', 'techcrunch.com', 'theverge.com', 'reuters.com', 'cnbc.com'];
  for (const domain of domains) {
    await run('INSERT OR IGNORE INTO allowed_domains (domain, is_active) VALUES (?, 1)', [domain]);
  }

  const sourceCount = await get<{ count: number }>('SELECT COUNT(*) as count FROM sources');
  if ((sourceCount?.count ?? 0) === 0) {
    const seeds: Array<[string, string, string]> = [
      ['business', 'https://www.bloomberg.com', 'Bloomberg'],
      ['business', 'https://www.wsj.com', 'WSJ'],
      ['finance', 'https://www.ft.com', 'Financial Times'],
      ['tech', 'https://techcrunch.com', 'TechCrunch'],
      ['tech', 'https://www.theverge.com', 'The Verge']
    ];
    for (const [category, url, name] of seeds) {
      await run('INSERT INTO sources (category, url, name, is_active) VALUES (?, ?, ?, 1)', [category, url, name]);
    }
  }

  const topicCount = await get<{ count: number }>('SELECT COUNT(*) as count FROM topics');
  if ((topicCount?.count ?? 0) === 0) {
    const seeds: Array<[string, string]> = [
      ['business', 'Corporate earnings'],
      ['business', 'Market movers'],
      ['finance', 'Interest rates'],
      ['tech', 'AI product launches'],
      ['tech', 'Developer tools']
    ];
    for (const [category, topic] of seeds) {
      await run('INSERT INTO topics (category, topic, is_active) VALUES (?, ?, 1)', [category, topic]);
    }
  }
}

export async function initDatabase(): Promise<void> {
  db = new sqlite3.Database(DB_PATH);
  logger.info(`Using SQLite database at ${DB_PATH}`);

  await run('PRAGMA foreign_keys = ON');

  await run(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY,
      category TEXT NOT NULL CHECK(category IN ('business','tech','finance')),
      url TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY,
      category TEXT NOT NULL CHECK(category IN ('business','tech','finance')),
      topic TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      email TEXT NOT NULL,
      schedule_time TEXT NOT NULL,
      top_stories_count INTEGER DEFAULT 10,
      stories_per_category INTEGER DEFAULT 5,
      max_article_age_hours INTEGER DEFAULT 24,
      skip_paywalls BOOLEAN DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS digest_history (
      id INTEGER PRIMARY KEY,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      articles_count INTEGER NOT NULL,
      categories_json TEXT NOT NULL,
      articles_json TEXT NOT NULL,
      sent_successfully BOOLEAN NOT NULL,
      error_message TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS allowed_domains (
      id INTEGER PRIMARY KEY,
      domain TEXT UNIQUE NOT NULL,
      is_active BOOLEAN DEFAULT 1
    )
  `);

  await run('CREATE INDEX IF NOT EXISTS idx_sources_category_active ON sources(category, is_active)');
  await run('CREATE INDEX IF NOT EXISTS idx_topics_category_active ON topics(category, is_active)');
  await run('CREATE INDEX IF NOT EXISTS idx_history_generated_at ON digest_history(generated_at DESC)');
  await run('CREATE INDEX IF NOT EXISTS idx_domains_active ON allowed_domains(domain, is_active)');

  await seedDefaults();
  logger.info('Database initialized');
}
