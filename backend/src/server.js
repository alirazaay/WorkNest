import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { sequelize } from './config/database.js';

const app = createApp();
const server = createServer(app);

server.listen(env.PORT, env.HOST, () => {
  logger.info({ host: env.HOST, port: env.PORT, environment: env.NODE_ENV }, 'WorkNest API listening');
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

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});
