import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { ZodError } from 'zod';
import { initDatabase } from './db/schema';
import { logger } from './utils/logger';
import { startScheduler } from './scheduler';
import sourcesRoutes from './routes/sources';
import topicsRoutes from './routes/topics';
import settingsRoutes from './routes/settings';
import digestRoutes from './routes/digest';
import historyRoutes from './routes/history';
import weatherRoutes from './routes/weather';
import allowedDomainsRoutes from './routes/allowedDomains';
import healthRoutes from './routes/health';

const localEnvPath = path.resolve(process.cwd(), '.env');
const rootEnvPath = path.resolve(process.cwd(), '..', '.env');
const envPath = fs.existsSync(localEnvPath) ? localEnvPath : rootEnvPath;
dotenv.config({ path: envPath });

function validateEnvironment(): string[] {
  const missing: string[] = [];
  const provider = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();

  if (!process.env.GMAIL_USER) {
    missing.push('GMAIL_USER');
  }
  if (!process.env.GMAIL_APP_PASSWORD) {
    missing.push('GMAIL_APP_PASSWORD');
  }

  if (provider === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      missing.push('OPENAI_API_KEY');
    }
  } else if (provider === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY) {
      missing.push('ANTHROPIC_API_KEY');
    }
  } else if (provider === 'auto') {
    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      missing.push('OPENAI_API_KEY or ANTHROPIC_API_KEY');
    }
  } else {
    missing.push('AI_PROVIDER must be one of: openai, anthropic, auto');
  }

  return missing;
}

const missing = validateEnvironment();
if (missing.length > 0) {
  logger.error(`Missing/invalid required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();
const port = Number(process.env.PORT ?? 3001);
const apiToken = process.env.API_TOKEN?.trim();
const host = process.env.BACKEND_HOST?.trim() || '127.0.0.1';
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5175,http://127.0.0.1:5175,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

app.use(
  cors({
    origin: allowedOrigins
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  if (!apiToken || req.originalUrl === '/api/health') {
    next();
    return;
  }
  const providedToken = req.header('x-api-token');
  if (!providedToken || providedToken !== apiToken) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});

app.use('/api/sources', sourcesRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/digest', digestRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/allowed-domains', allowedDomainsRoutes);
app.use('/api/health', healthRoutes);

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  logger.error(`HTTP error ${req.method} ${req.originalUrl}: ${message}`);
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request payload' });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
});

async function start(): Promise<void> {
  await initDatabase();
  await startScheduler();
  app.listen(port, host, () => {
    logger.info(`Backend server running at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  });
}

start().catch((err) => {
  const message = err instanceof Error ? err.message : 'Startup failed';
  logger.error(message);
  process.exit(1);
});
