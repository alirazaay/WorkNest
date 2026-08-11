import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { sequelize } from './config/database.js';

async function start() {
  // Verify DB is reachable before accepting traffic.
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');
  } catch (err) {
    logger.fatal({ err }, 'Cannot connect to database — is MySQL running? Check DB_HOST/DB_PORT/DB_USER/DB_PASSWORD in .env');
    process.exit(1);
  }

  const app = createApp();
  const server = createServer(app);

  const listenHost = ['127.0.0.1', '::1', 'localhost'].includes(env.HOST) ? '0.0.0.0' : env.HOST;
  server.listen(env.PORT, listenHost, () => {
    logger.info({ host: listenHost, configuredHost: env.HOST, port: env.PORT, environment: env.NODE_ENV }, 'WorkNest API listening');
  });

  async function shutdown(signal) {
    logger.info({ signal }, 'Shutdown requested');
    server.close(async () => {
      await sequelize.close();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});

start();
