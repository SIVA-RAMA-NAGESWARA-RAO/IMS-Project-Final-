const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found — ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  const body = { message: err.message || 'Internal server error' };
  if (err.retryAfterSeconds) body.retryAfterSeconds = err.retryAfterSeconds;
  if (process.env.NODE_ENV !== 'production') body.stack = err.stack;
  res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };
