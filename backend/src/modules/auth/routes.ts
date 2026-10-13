import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../../config/env.js';
import { campusDb } from '../persistence/database.js';
import { User } from './user.model.js';
import { success, error } from '../../utils/apiResponse.js';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js';

export const authRouter = Router();

// Legacy login and registration disabled.
// Student and faculty authentication is handled by Supabase Auth.
authRouter.post('/login', (_req: Request, res: Response) =>
  error(res, 'Use Supabase authentication', [], 410)
);

authRouter.post('/register', (_req: Request, res: Response) =>
  error(res, 'Use Supabase authentication', [], 410)
);

// GET /api/v1/auth/me
authRouter.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  return success(res, req.user, 'Current user profile');
});

// POST /api/v1/auth/logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  return success(res, { loggedOut: true }, 'Logged out successfully');
});

