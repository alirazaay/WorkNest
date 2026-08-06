import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DataTypes, QueryTypes, Sequelize } from 'sequelize';
import { sequelize } from '../src/config/database.js';

const migrationsPath = path.resolve('src/database/migrations');
const queryInterface = sequelize.getQueryInterface();

async function ensureMetaTable() {
  const [tables] = await sequelize.query("SHOW TABLES LIKE 'SequelizeMeta'");
  if (!tables.length) await queryInterface.createTable('SequelizeMeta', { name: { type: DataTypes.STRING(255), allowNull: false, primaryKey: true } });
}
async function migrationFiles() { return (await fs.readdir(migrationsPath)).filter((file) => file.endsWith('.js')).sort(); }
async function executed() { return (await sequelize.query('SELECT name FROM SequelizeMeta ORDER BY name', { type: QueryTypes.SELECT })).map((row) => row.name); }
async function loadMigration(file) { return import(pathToFileURL(path.join(migrationsPath, file)).href); }

async function up() {
  await ensureMetaTable(); const done = new Set(await executed());
  for (const file of await migrationFiles()) { if (done.has(file)) continue; console.log(`Applying ${file}`); const migration = await loadMigration(file); await migration.up(queryInterface, Sequelize); await sequelize.query('INSERT INTO SequelizeMeta (name) VALUES (?)', { replacements: [file] }); }
  console.log('Database migrations are up to date.');
}

async function down() {
  await ensureMetaTable(); const names = await executed(); const file = names.at(-1); if (!file) { console.log('No migrations to roll back.'); return; } console.log(`Rolling back ${file}`); const migration = await loadMigration(file); await migration.down(queryInterface, Sequelize); await sequelize.query('DELETE FROM SequelizeMeta WHERE name = ?', { replacements: [file] });
}

async function fresh() {
  if (process.env.ALLOW_FRESH_DB !== 'true') throw new Error('Refusing fresh database reset. Set ALLOW_FRESH_DB=true explicitly.');
  const [rows] = await sequelize.query("SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema = DATABASE()"); const tables = rows.map((row) => row.name).filter((name) => name !== 'SequelizeMeta');
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0'); for (const table of tables) await sequelize.query(`DROP TABLE IF EXISTS \`${table.replace(/`/g, '')}\``); await sequelize.query('SET FOREIGN_KEY_CHECKS = 1'); await up();
}

const action = process.argv[2] || 'up';
try { await sequelize.authenticate(); if (action === 'up') await up(); else if (action === 'down') await down(); else if (action === 'fresh') await fresh(); else throw new Error(`Unknown migration action: ${action}`); } finally { await sequelize.close(); }
