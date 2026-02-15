import { Router } from 'express';
import { z } from 'zod';
import { queries } from '../db/queries';
import { allowedDomainCreateSchema, normalizeDomain, toggleSchema } from '../utils/validation';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    res.json(await queries.listAllowedDomains());
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = allowedDomainCreateSchema.parse(req.body);
    const id = await queries.createAllowedDomain(normalizeDomain(payload.domain));
    res.status(201).json({ id });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = z.coerce.number().int().parse(req.params.id);
    const payload = toggleSchema.parse(req.body);
    const updated = await queries.updateAllowedDomainActive(id, payload.is_active);
    res.json({ updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = z.coerce.number().int().parse(req.params.id);
    const deleted = await queries.deleteAllowedDomain(id);
    res.json({ deleted });
  } catch (error) {
    next(error);
  }
});

export default router;