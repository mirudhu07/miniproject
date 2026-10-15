import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ENV } from '../config/env';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
    return;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    res.status(409).json({
      success: false,
      error: `Conflict: An entry with this ${field} already exists.`,
    });
    return;
  }

  // Generic errors
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  console.error(`[Error] [${req.method} ${req.url}]:`, err.message);

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(ENV.NODE_ENV === 'development' && statusCode === 500 ? { devHint: err.message } : {}),
  });
}
