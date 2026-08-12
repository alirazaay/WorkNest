import { parseSourceDate } from './employee-mapping.js';

export function normalizeRating(value) { return Number(value) * 20; }

export function mapPerformance(row, index, employeeIds) {
  const errors = []; const empId = String(row.EmpID ?? '').trim(); const rating = Number(row.Rating); const date = parseSourceDate(row.PerfDate);
  if (!employeeIds.has(empId)) errors.push('unknown EmpID');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.push('Rating must be an integer from 1 to 5');
  if (!date) errors.push('invalid PerfDate');
  return errors.length ? { row: index + 2, performanceId: row.PerfID, errors } : { ...row, EmpID: empId, rating, normalizedScore: normalizeRating(rating), performanceDate: date, year: Number(date.slice(0, 4)) };
}
