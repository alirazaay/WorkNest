import { Sequelize } from 'sequelize';
import { env } from './env.js';

export const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'mysql',
  logging: env.DB_LOG_SQL ? (sql) => console.debug(sql) : false,
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  pool: {
    max: env.DB_POOL_MAX,
    min: env.DB_POOL_MIN,
    acquire: 30_000,
    idle: 10_000
  },
  dialectOptions: {
    timezone: 'Z'
  }
});

export async function checkDatabaseConnection() {
  await sequelize.authenticate();
  return { connected: true };
}
