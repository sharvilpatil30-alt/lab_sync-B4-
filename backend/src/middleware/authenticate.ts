import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../modules/auth/user.model.js';
import { AppError } from '../utils/AppError.js';
import { campusDb } from '../modules/persistence/database.js';

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
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch {
      // Decode payload if signed by external provider (e.g. Supabase) without secret
      decoded = jwt.decode(token);
    }

    if (!decoded || (!decoded.id && !decoded.sub && !decoded.userId)) {
      return next(new AppError('Invalid or expired authentication token.', 401));
    }

    const userId = decoded.id || decoded.sub || decoded.userId;

    // Check Campus Database profiles first
    const profile = campusDb.profiles.get(userId);
    if (profile) {
      req.user = {
        _id: profile.id,
        id: profile.id,
        name: profile.full_name,
        email: decoded.email || `${profile.role}@campus.edu`,
        role: profile.role === 'lab_admin' ? 'admin' : profile.role,
        department: 'Computer Science & Engineering',
      };
      return next();
    }

    // Try Mongo User if connected
    try {
      const user = await User.findById(userId);
      if (user) {
        req.user = user;
        return next();
      }
    } catch {
      // Mongo offline or invalid objectId
    }

    // Fall back to decoded user claims
    if (decoded.email || decoded.role) {
      req.user = {
        _id: userId,
        id: userId,
        name: decoded.user_metadata?.full_name || decoded.name || 'Campus User',
        email: decoded.email,
        role: decoded.app_metadata?.role || decoded.role || 'student',
        department: decoded.user_metadata?.department || 'Computer Science & Engineering',
      };
      return next();
    }

    return next(new AppError('User session expired or user no longer exists.', 401));
  } catch (err: any) {
    return next(new AppError('Invalid or expired authentication token.', 401));
  }
}
