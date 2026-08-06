import { Router } from 'express';
import { checkDatabaseConnection } from '../config/database.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    await checkDatabaseConnection();
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'worknest-api',
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

export default router;
