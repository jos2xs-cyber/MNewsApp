import { Router } from 'express';
import { z } from 'zod';
import { queries } from '../db/queries';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const page = z.coerce.number().int().min(1).default(1).parse(req.query.page ?? 1);
    const pageSize = z.coerce.number().int().min(1).max(50).default(10).parse(req.query.pageSize ?? 10);
    const [items, total] = await Promise.all([queries.listHistory(page, pageSize), queries.countHistory()]);
    res.json({ items, total, page, pageSize });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = z.coerce.number().int().parse(req.params.id);
    const item = await queries.getHistoryById(id);
    if (!item) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = z.coerce.number().int().parse(req.params.id);
    const deleted = await queries.deleteHistory(id);
    res.json({ deleted });
  } catch (error) {
    next(error);
  }
});

export default router;