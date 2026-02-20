import { Router } from 'express';
import { z } from 'zod';
import { queries } from '../db/queries';
import { normalizeDomain, sourceCreateSchema, toggleSchema, validateHttpsUrl } from '../utils/validation';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    res.json(await queries.listSources());
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = sourceCreateSchema.parse(req.body);
    const parsed = validateHttpsUrl(payload.url);
    await queries.upsertAllowedDomainActive(normalizeDomain(parsed.hostname));
    const id = await queries.createSource(payload.category, payload.url, payload.name);
    res.status(201).json({ id, domain_auto_added: true });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('UNIQUE constraint failed: sources.url')
    ) {
      res.status(409).json({
        error: 'Source URL already exists. Use the existing source entry or edit its category/name.'
      });
      return;
    }
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = z.coerce.number().int().parse(req.params.id);
    const payload = toggleSchema.parse(req.body);
    const updated = await queries.updateSourceActive(id, payload.is_active);
    res.json({ updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = z.coerce.number().int().parse(req.params.id);
    const deleted = await queries.deleteSource(id);
    res.json({ deleted });
  } catch (error) {
    next(error);
  }
});

export default router;
