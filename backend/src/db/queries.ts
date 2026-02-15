import { getDb } from './schema';
import { AllowedDomain, DigestHistory, Settings, Source, Topic } from '../types';
import { normalizeDomain } from '../utils/validation';

function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows as T[]);
    });
  });
}

function get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const db = getDb();
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

function run(sql: string, params: unknown[] = []): Promise<{ id?: number; changes: number }> {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

export const queries = {
  listSources(): Promise<Source[]> {
    return all<Source>('SELECT * FROM sources ORDER BY category, name');
  },
  createSource(category: string, url: string, name: string): Promise<number | undefined> {
    return run('INSERT INTO sources (category, url, name, is_active) VALUES (?, ?, ?, 1)', [category, url, name]).then((r) => r.id);
  },
  updateSourceActive(id: number, isActive: boolean): Promise<number> {
    return run('UPDATE sources SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]).then((r) => r.changes);
  },
  deleteSource(id: number): Promise<number> {
    return run('DELETE FROM sources WHERE id = ?', [id]).then((r) => r.changes);
  },

  listTopics(): Promise<Topic[]> {
    return all<Topic>('SELECT * FROM topics ORDER BY category, topic');
  },
  createTopic(category: string, topic: string): Promise<number | undefined> {
    return run('INSERT INTO topics (category, topic, is_active) VALUES (?, ?, 1)', [category, topic]).then((r) => r.id);
  },
  updateTopicActive(id: number, isActive: boolean): Promise<number> {
    return run('UPDATE topics SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]).then((r) => r.changes);
  },
  deleteTopic(id: number): Promise<number> {
    return run('DELETE FROM topics WHERE id = ?', [id]).then((r) => r.changes);
  },

  getSettings(): Promise<Settings | undefined> {
    return get<Settings>('SELECT * FROM settings WHERE id = 1');
  },
  updateSettings(payload: {
    email: string;
    schedule_time: string;
    top_stories_count: number;
    stories_per_category: number;
    max_article_age_hours: number;
    skip_paywalls: number;
    recipients: string;
  }): Promise<number> {
    return run(
      `UPDATE settings
       SET email = ?, schedule_time = ?, top_stories_count = ?, stories_per_category = ?, max_article_age_hours = ?, skip_paywalls = ?, recipients = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [
        payload.email,
        payload.schedule_time,
        payload.top_stories_count,
        payload.stories_per_category,
        payload.max_article_age_hours,
        payload.skip_paywalls,
        payload.recipients
      ]
    ).then((r) => r.changes);
  },

  listAllowedDomains(): Promise<AllowedDomain[]> {
    return all<AllowedDomain>('SELECT * FROM allowed_domains ORDER BY domain');
  },
  listActiveAllowedDomains(): Promise<string[]> {
    return all<{ domain: string }>('SELECT domain FROM allowed_domains WHERE is_active = 1').then((rows) => rows.map((r) => normalizeDomain(r.domain)));
  },
  createAllowedDomain(domain: string): Promise<number | undefined> {
    return run('INSERT INTO allowed_domains (domain, is_active) VALUES (?, 1)', [normalizeDomain(domain)]).then((r) => r.id);
  },
  async upsertAllowedDomainActive(domain: string): Promise<void> {
    const normalized = normalizeDomain(domain);
    await run('INSERT OR IGNORE INTO allowed_domains (domain, is_active) VALUES (?, 1)', [normalized]);
    await run('UPDATE allowed_domains SET is_active = 1 WHERE domain = ?', [normalized]);
  },
  updateAllowedDomainActive(id: number, isActive: boolean): Promise<number> {
    return run('UPDATE allowed_domains SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]).then((r) => r.changes);
  },
  deleteAllowedDomain(id: number): Promise<number> {
    return run('DELETE FROM allowed_domains WHERE id = ?', [id]).then((r) => r.changes);
  },

  listHistory(page: number, pageSize: number): Promise<DigestHistory[]> {
    const offset = (page - 1) * pageSize;
    return all<DigestHistory>('SELECT * FROM digest_history ORDER BY generated_at DESC LIMIT ? OFFSET ?', [pageSize, offset]);
  },
  countHistory(): Promise<number> {
    return get<{ count: number }>('SELECT COUNT(*) as count FROM digest_history').then((r) => r?.count ?? 0);
  },
  getHistoryById(id: number): Promise<DigestHistory | undefined> {
    return get<DigestHistory>('SELECT * FROM digest_history WHERE id = ?', [id]);
  },
  deleteHistory(id: number): Promise<number> {
    return run('DELETE FROM digest_history WHERE id = ?', [id]).then((r) => r.changes);
  },
  createHistory(articlesCount: number, categoriesJson: string, articlesJson: string, sentSuccessfully: boolean, errorMessage?: string): Promise<number | undefined> {
    return run(
      'INSERT INTO digest_history (articles_count, categories_json, articles_json, sent_successfully, error_message) VALUES (?, ?, ?, ?, ?)',
      [articlesCount, categoriesJson, articlesJson, sentSuccessfully ? 1 : 0, errorMessage ?? null]
    ).then((r) => r.id);
  }
};
