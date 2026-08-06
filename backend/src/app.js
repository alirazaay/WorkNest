import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { tenantContext } from './middleware/tenant-context.js';
import { apiRateLimit, authRateLimit } from './middleware/rate-limit.js';
import { requestId } from './middleware/request-id.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import routes from './routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: (origin, callback) => { if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true); return callback(new Error('CORS origin not allowed')); }, credentials: true }));
  app.use(compression());
  app.use(requestId);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));
  app.use(apiRateLimit);
  app.use(tenantContext);

  app.get('/', (req, res) => {
    res.json({ success: true, data: { service: 'worknest-api', version: '0.1.0' } });
  });
  app.use(`${env.API_PREFIX}/auth`, authRateLimit);
  app.use(env.API_PREFIX, routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
