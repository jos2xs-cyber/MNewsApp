import { Router } from 'express';
import { z } from 'zod';
import { queries } from '../db/queries';
import { toggleSchema, topicCreateSchema } from '../utils/validation';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    res.json(await queries.listTopics());
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = topicCreateSchema.parse(req.body);
    const id = await queries.createTopic(payload.category, payload.topic);
    res.status(201).json({ id });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = z.coerce.number().int().parse(req.params.id);
    const payload = toggleSchema.parse(req.body);
    const updated = await queries.updateTopicActive(id, payload.is_active);
    res.json({ updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = z.coerce.number().int().parse(req.params.id);
    const deleted = await queries.deleteTopic(id);
    res.json({ deleted });
  } catch (error) {
    next(error);
  }
});

export default router;