export function tenantContext(req, res, next) {
  // Phase 1 only establishes the request contract. Authentication will populate
  // these values in Phase 2; tenant IDs must never come from request input.
  req.auth = req.auth || null;
  req.tenantId = req.auth?.tenantId || null;
  next();
}
