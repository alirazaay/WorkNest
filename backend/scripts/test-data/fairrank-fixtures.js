export function edgeRows() {
  return [
    { 'Employee ID': 'EDGE-A', Name: 'FairRank Edge A', Department: 'IT', 'Job Role': 'Software Engineer', 'Performance Score': '94.7', 'KPI Score': '94.7', 'Attendance (%)': '94.7', 'Peer Rating': '4.735', 'Task Completion (%)': '94.7', 'Work Hours Logged': '45', 'Manager Feedback': '4.735', 'Training Hours': '28.41', 'Promotion Eligibility': 'Yes', __edge: 'A' },
    { 'Employee ID': 'EDGE-B', Name: 'FairRank Edge B', Department: 'IT', 'Job Role': 'Software Engineer', 'Performance Score': '94.5', 'KPI Score': '94.5', 'Attendance (%)': '94.5', 'Peer Rating': '4.725', 'Task Completion (%)': '94.5', 'Work Hours Logged': '44', 'Manager Feedback': '4.725', 'Training Hours': '28.35', 'Promotion Eligibility': 'Yes', __edge: 'B' },
    { 'Employee ID': 'EDGE-C', Name: 'FairRank Edge C', Department: 'IT', 'Job Role': 'Software Engineer', 'Performance Score': '94.3', 'KPI Score': '94.3', 'Attendance (%)': '94.3', 'Peer Rating': '4.715', 'Task Completion (%)': '94.3', 'Work Hours Logged': '43', 'Manager Feedback': '4.715', 'Training Hours': '28.29', 'Promotion Eligibility': 'No', __edge: 'C' },
    { 'Employee ID': 'EDGE-D', Name: 'FairRank Edge D', Department: 'IT', 'Job Role': 'Software Engineer', 'Performance Score': '91.0', 'KPI Score': '91', 'Attendance (%)': '91', 'Peer Rating': '4.55', 'Task Completion (%)': '91', 'Work Hours Logged': '42', 'Manager Feedback': '4.55', 'Training Hours': '27.3', 'Promotion Eligibility': 'No', __edge: 'D' }
  ];
}

export function readinessScores(edge) {
  const base = { Leadership: 80, Communication: 80, 'Decision Making': 80, 'Technical Expertise': 80 };
  return { ...base, ...(edge === 'B' ? { Leadership: 100, Communication: 95, 'Decision Making': 95, 'Technical Expertise': 95 } : edge === 'C' ? { Leadership: 85, Communication: 85, 'Decision Making': 85, 'Technical Expertise': 90 } : edge === 'A' ? { Leadership: 80, Communication: 85, 'Decision Making': 85, 'Technical Expertise': 85 } : {}) };
}

export function edgeCriterionScores(edge) {
  if (edge === 'A') return { 'Goal Achievement': 100, 'KPI Achievement': 89.4, 'Attendance Reliability': 94.7, Collaboration: 94.7, 'Learning & Growth': 94.7, 'Manager Assessment': 94.7 };
  if (edge === 'B') return { 'Goal Achievement': 92.142857, 'KPI Achievement': 92.142857, 'Attendance Reliability': 92.142857, Collaboration: 100, 'Learning & Growth': 92.142857, 'Manager Assessment': 100 };
  if (edge === 'C') return { 'Goal Achievement': 91.230769, 'KPI Achievement': 100, 'Attendance Reliability': 91.230769, Collaboration: 91.230769, 'Learning & Growth': 100, 'Manager Assessment': 91.230769 };
  return { 'Goal Achievement': 91, 'KPI Achievement': 91, 'Attendance Reliability': 91, Collaboration: 91, 'Learning & Growth': 91, 'Manager Assessment': 91 };
}
