import { resolve } from 'node:path';

export const TEST_TENANT = { companyName: 'WorkNest Historical HR Test Corp', slug: 'worknest-historical-test', industry: 'Historical HR fixture', plan: 'starter', employeeLimit: 5000, isActive: true };
export const TEST_PASSWORD = 'WorkNestHistorical123!';
export const SOURCE_DIR = resolve(process.env.CONTINUITY_DATA_DIR || resolve(process.cwd(), 'data', 'historical-hr'));
export const FALLBACK_SOURCE_DIR = resolve(process.cwd(), 'data', 'kaggle');
export const SOURCE = 'historical_hr_fixture';
