import { Router } from 'express';
import { checkDatabaseConnection } from '../config/database.js';

const router = Router();

router.get('/live', (req, res) => {
  res.json({ success: true, data: { status: 'ok', service: 'worknest-api', version: process.env.APP_VERSION || '0.1.0', timestamp: new Date().toISOString() } });
});

router.get('/ready', async (req, res, next) => {
  try {
    await checkDatabaseConnection();
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'worknest-api',
        version: process.env.APP_VERSION || '0.1.0',
        database: 'connected',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    error.statusCode = 503;
    error.code = 'DATABASE_UNAVAILABLE';
    next(error);
  }
});

router.get('/', (req, res) => res.redirect(302, `${req.baseUrl}/ready`));

export default router;
