import { Router } from 'express';
import { queries } from '../db/queries';
import { settingsUpdateSchema } from '../utils/validation';
import { reloadScheduler } from '../scheduler';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    res.json(await queries.getSettings());
  } catch (error) {
    next(error);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const payload = settingsUpdateSchema.parse(req.body);
    await queries.updateSettings({
      ...payload,
      skip_paywalls: payload.skip_paywalls ? 1 : 0
    });
    await reloadScheduler();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
