import { Router } from 'express';
import { fetchBedfordForecast } from '../services/weather';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const forecast = await fetchBedfordForecast();
    res.json(forecast);
  } catch (error) {
    next(error);
  }
});

export default router;
