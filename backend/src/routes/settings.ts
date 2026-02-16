import { Router } from 'express';
import { queries } from '../db/queries';
import { parseRecipientList, settingsUpdateSchema, validateRecipientList } from '../utils/validation';
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
      email: payload.email,
      recipients: parseRecipientList(payload.recipients).join('\n'),
      topic_free_categories: payload.topic_free_categories,
      schedule_time: payload.schedule_time,
      top_stories_count: payload.top_stories_count,
      stories_per_category: payload.stories_per_category,
      max_article_age_hours: payload.max_article_age_hours,
      skip_paywalls: payload.skip_paywalls ? 1 : 0
    });
    await reloadScheduler();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
