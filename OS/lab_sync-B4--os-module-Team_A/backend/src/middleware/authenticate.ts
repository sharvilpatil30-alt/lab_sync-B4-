import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../modules/auth/user.model.js';
import { AppError } from '../utils/AppError.js';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export async function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required. Missing Bearer token.', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; role: string };

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('User session expired or user no longer exists.', 401));
    }

    req.user = user;
    next();
  } catch (err: any) {
    return next(new AppError('Invalid or expired authentication token.', 401));
  }
}
