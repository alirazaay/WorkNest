import { parseSourceDate } from './employee-mapping.js';

export function mapAction(row, index, employeeIds) {
  const errors = []; const empId = String(row.EmpID ?? '').trim(); const date = parseSourceDate(row.EffectiveDt);
  if (!employeeIds.has(empId)) errors.push('unknown EmpID');
  if (!date) errors.push('invalid EffectiveDt');
  if (!String(row.ActionID ?? '').trim()) errors.push('missing ActionID');
  return errors.length ? { row: index + 2, actionId: row.ActID, errors } : { ...row, EmpID: empId, effectiveDate: date, actionType: null };
}
