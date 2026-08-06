export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', fields = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.originalUrl}` }
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const statusCode = error.statusCode || (String(error.code || '').startsWith('LIMIT_') ? 413 : 500);
  const code = String(error.code || '').startsWith('LIMIT_') ? 'UPLOAD_LIMIT_EXCEEDED' : (error.code || 'INTERNAL_ERROR');
  const payload = {
    success: false,
    error: { code, message: statusCode >= 500 ? 'Internal server error' : error.message }
  };

  if (error.fields) payload.error.fields = error.fields;
  req.log?.error({ err: error }, error.message);
  res.status(statusCode).json(payload);
}
