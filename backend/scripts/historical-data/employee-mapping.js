const months = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

export function parseSourceDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  let match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) return `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  match = raw.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/);
  if (match && months[match[2]]) return `${match[3]}-${String(months[match[2]]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  return null;
}

export function emailFor(empId) { return `historical.emp${String(empId).padStart(4, '0')}@test.worknest.local`; }
export function employeeCodeFor(empId) { return `HIST-${String(empId).padStart(6, '0')}`; }
export function departmentName(depId) { return `Department ${String(depId).trim()}`; }

export function validateEmployeeRow(row, index) {
  const errors = []; const id = String(row.EmpID ?? '').trim();
  if (!id) errors.push('missing EmpID');
  if (!String(row.EmpName ?? '').trim()) errors.push('missing EmpName');
  const hire = parseSourceDate(row.EngDt); const term = parseSourceDate(row.TermDt);
  if (!hire && row.EngDt) errors.push('invalid EngDt');
  if (row.TermDt && !term) errors.push('invalid TermDt');
  if (hire && term && term < hire) errors.push('TermDt before EngDt');
  return errors.length ? { row: index + 2, empId: id, errors } : null;
}
