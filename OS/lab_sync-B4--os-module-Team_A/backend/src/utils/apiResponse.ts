import { Response } from 'express';

export function success<T>(res: Response, data: T, message: string = 'Operation successful', statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function error(res: Response, message: string = 'An error occurred', errors: string[] = [], statusCode: number = 400) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

export function paginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number; pages: number },
  message: string = 'Data retrieved'
) {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination,
  });
}
