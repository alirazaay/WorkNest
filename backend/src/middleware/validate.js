import { AppError } from './error.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new AppError('Request validation failed', 422, 'VALIDATION_ERROR', result.error.flatten().fieldErrors));
    }
    req.validated = { ...(req.validated || {}), [source]: result.data };
    next();
  };
}
