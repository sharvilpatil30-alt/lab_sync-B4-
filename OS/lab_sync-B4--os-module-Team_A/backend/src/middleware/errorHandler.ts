import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { error as sendError } from '../utils/apiResponse.js';
import { config } from '../config/env.js';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Mongoose CastError / ValidationError
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field: ${err.path}`;
    errors = [message];
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors || {}).map((e: any) => e.message);
  } else if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate key error: value already exists.';
    errors = [message];
  }

  // Hide internal stack details outside development
  if (statusCode === 500 && config.nodeEnv !== 'development') {
    message = 'Internal Server Error';
  }

  console.error(`[Error Handler] [${statusCode}] ${message}`, err.stack ? err.stack.split('\n')[1] : '');

  return sendError(res, message, errors, statusCode);
}
