import { Router } from 'express';
import { generateDigestNow, getDigestStatus, sendDigestNow } from '../services/digestRunner';

const router = Router();

router.post('/generate', async (_req, res, next) => {
  try {
    const result = await generateDigestNow();
    if (result.queued) {
      if (!result.success) {
        res.status(409).json({ success: false, queued: true, error: 'Digest already has a queued run' });
        return;
      }
      res.status(202).json({ success: true, queued: true });
      return;
    }
    if (!result.success) {
      res.status(500).json({ success: false, error: 'Digest generation failed. Check server logs.' });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/send', async (_req, res, next) => {
  try {
    const result = await sendDigestNow();
    if (result.queued) {
      if (!result.success) {
        res.status(409).json({ success: false, queued: true, error: 'Digest already has a queued run' });
        return;
      }
      res.status(202).json({ success: true, queued: true });
      return;
    }
    if (!result.success) {
      res.status(500).json({ success: false, error: 'Digest send failed. Check server logs.' });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/status', (_req, res) => {
  res.json(getDigestStatus());
});

export default router;
