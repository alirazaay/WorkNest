import { AppError } from '../../middleware/error.js';

export const releasedCycleStatuses = ['completed', 'archived'];

export function assertEmployeeRelease(auth, cycle) {
  if (auth.role === 'employee' && !releasedCycleStatuses.includes(cycle?.status)) throw new AppError('This performance result has not been released yet', 403, 'PERFORMANCE_RESULT_NOT_RELEASED');
}
