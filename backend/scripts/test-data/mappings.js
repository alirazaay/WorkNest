export const number = (value, fallback = null) => {
  const parsed = Number(String(value ?? '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const percentage = (value) => Math.max(0, Math.min(100, number(value, 0)));
export const peerToScore = (value) => Math.round((Math.max(0, Math.min(5, number(value, 0))) / 5) * 100000) / 1000;
export const trainingToScore = (value) => Math.round((Math.max(0, Math.min(30, number(value, 0))) / 30) * 100000) / 1000;
export const managerFeedbackToScore = peerToScore;

export function mapCriterionScores(row, override = null) {
  if (override) return override;
  return {
    'Goal Achievement': percentage(row['Task Completion (%)']),
    'KPI Achievement': percentage(row['KPI Score']),
    'Attendance Reliability': percentage(row['Attendance (%)']),
    Collaboration: peerToScore(row['Peer Rating']),
    'Learning & Growth': trainingToScore(row['Training Hours']),
    'Manager Assessment': managerFeedbackToScore(row['Manager Feedback'])
  };
}

export function validateRow(row, index) {
  const errors = [];
  if (!String(row['Employee ID'] || '').trim()) errors.push('missing employee ID');
  if (!String(row.Name || '').trim()) errors.push('blank name');
  if (!String(row.Department || '').trim()) errors.push('missing department');
  for (const field of ['KPI Score', 'Attendance (%)', 'Task Completion (%)']) if (number(row[field]) == null || number(row[field]) < 0 || number(row[field]) > 100) errors.push(`invalid ${field}`);
  if (number(row['Peer Rating']) == null || number(row['Peer Rating']) < 1 || number(row['Peer Rating']) > 5) errors.push('invalid Peer Rating');
  if (number(row['Training Hours']) == null || number(row['Training Hours']) < 0) errors.push('invalid Training Hours');
  return errors.length ? { index: index + 2, errors } : null;
}
