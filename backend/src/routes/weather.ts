import { Router } from 'express';
import { fetchDallasForecast } from '../services/weather';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const forecast = await fetchDallasForecast();
    res.json(forecast);
  } catch (error) {
    next(error);
  }
});

export default router;
