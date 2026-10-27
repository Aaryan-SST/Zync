export function notFound(req, res, next) {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode ?? (res.statusCode !== 200 ? res.statusCode : 500);
  let message    = err.message ?? "Internal Server Error";
  let errors;

  // Mongoose schema ValidationError → 400 with per-field detail
  if (err.name === "ValidationError") {
    statusCode = 400;
    message    = "Validation failed";
    errors = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
  }

  // Mongoose CastError (e.g. bad ObjectId in a query param) → 400
  if (err.name === "CastError") {
    statusCode = 400;
    message    = `Invalid value for field '${err.path}': ${err.value}`;
  }

  // MongoDB duplicate-key race condition (e.g. concurrent registrations) → 400
  if (err.code === 11000) {
    statusCode = 400;
    message    = "Email already in use";
  }

  // JWT errors that escape the try/catch in protectRoute → 401
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    message    = "Not authenticated";
  }

  res.status(statusCode).json({
    message,
    ...(errors && { errors }),
    // Never expose stack traces in production
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}
