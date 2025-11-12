import { Request, Response, NextFunction } from 'express';
import { ApiError, ErrorCode } from '../types';

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    const response: ApiError = {
      code: err.code,
      message: err.message,
      details: err.details,
      timestamp: Date.now(),
    };
    return res.status(err.statusCode).json(response);
  }

  // Default error
  const response: ApiError = {
    code: ErrorCode.INTERNAL_ERROR,
    message: 'Internal server error',
    timestamp: Date.now(),
  };
  res.status(500).json(response);
}
