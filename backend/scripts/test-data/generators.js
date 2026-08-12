import bcrypt from 'bcryptjs';
import { User } from '../../src/database/models/index.js';
import { TEST_PASSWORD } from './constants.js';

export async function passwordHash() { return bcrypt.hash(TEST_PASSWORD, 10); }
export function emailFor(code) {
  const normalized = String(code).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `emp-${normalized}@test.worknest.local`;
}
export function eventDate(year = 2025) { return `${year}-06-15`; }
export function employeeCodeFor(row) { return `KAG-${String(row['Employee ID']).trim()}`.slice(0, 30); }
export async function buildUsers(rows, tenantId, hash) {
  return User.bulkCreate(rows.map(row => ({ tenantId, name: row.Name.trim(), email: emailFor(row['Employee ID']), passwordHash: hash, role: 'employee', status: 'active', emailVerifiedAt: new Date() })));
}
