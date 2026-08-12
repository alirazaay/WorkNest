export const TEST_TENANT = { slug: 'worknest-test-corporation', companyName: 'WorkNest Test Corporation', industry: 'Technology', plan: 'enterprise', employeeLimit: 10000 };
export const TEST_PASSWORD = 'WorkNestTestOnly123!';
export const SOURCE_FILE = new URL('../../data/kaggle/Employee_Performance_Dataset.csv', import.meta.url);
export const CRITERIA = [
  { name: 'Goal Achievement', category: 'Execution', weight: 25, description: 'Achievement of assigned measurable objectives.' },
  { name: 'KPI Achievement', category: 'Quality', weight: 25, description: 'Delivery against key performance indicators.' },
  { name: 'Attendance Reliability', category: 'Reliability', weight: 10, description: 'Reliable attendance and availability.' },
  { name: 'Collaboration', category: 'Collaboration', weight: 15, description: 'Peer collaboration and teamwork.' },
  { name: 'Learning & Growth', category: 'Learning', weight: 10, description: 'Training and continuous development.' },
  { name: 'Manager Assessment', category: 'Leadership', weight: 15, description: 'Manager assessment based on documented feedback.' }
];
export const BANDS = [
  { name: 'Exceptional', minScore: 90, maxScore: 100, sortOrder: 1 },
  { name: 'Exceeds Expectations', minScore: 80, maxScore: 89.999, sortOrder: 2 },
  { name: 'Meets Expectations', minScore: 70, maxScore: 79.999, sortOrder: 3 },
  { name: 'Developing', minScore: 60, maxScore: 69.999, sortOrder: 4 },
  { name: 'Needs Improvement', minScore: 0, maxScore: 59.999, sortOrder: 5 }
];
