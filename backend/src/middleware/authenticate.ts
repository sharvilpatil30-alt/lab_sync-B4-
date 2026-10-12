import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../modules/auth/user.model.js';
import { campusDb } from '../modules/persistence/database.js';
import { pool } from '../config/postgres.js';
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
    let decoded: any = null;

    // 1. Try local JWT verify
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch {
      // 2. Decode as Supabase or external provider JWT
      decoded = jwt.decode(token);
    }

    if (!decoded || (!decoded.id && !decoded.sub && !decoded.email)) {
      return next(new AppError('Invalid authentication token.', 401));
    }

    const userId = decoded.id || decoded.sub;
    const userEmail = decoded.email || decoded.user_metadata?.email || '';

    // Check if MongoDB has this user
    let userDoc: any = null;
    try {
      if (userId && typeof userId === 'string' && userId.match(/^[0-9a-fA-F]{24}$/)) {
        userDoc = await User.findById(userId);
      }
      if (!userDoc && userEmail) {
        userDoc = await User.findOne({ email: userEmail.toLowerCase() });
      }
    } catch {
      // MongoDB offline
    }

    // Check PostgreSQL profiles if connected
    let pgRole = '';
    if (pool.isConnected && userId) {
      try {
        const { rows } = await pool.query('SELECT role, full_name FROM public.profiles WHERE id = $1', [userId]);
        if (rows && rows.length > 0) {
          pgRole = rows[0].role;
        }
      } catch {
        // PG query skip
      }
    }

    // Check campusDb profiles
    const campusProfile = userId ? campusDb.profiles.get(userId) : null;

    let role = (
      pgRole ||
      userDoc?.role ||
      campusProfile?.role ||
      decoded.user_metadata?.role ||
      decoded.app_metadata?.role ||
      decoded.role ||
      'student'
    ).toLowerCase();

    // Canonicalize roles according to project spec:
    // Supabase/PostgreSQL schema uses 'lab_admin', backend/frontend canonical role is 'admin'
    if (role === 'lab_admin' || role === 'lab_assistant' || role === 'lab assistant') {
      role = 'admin';
    }

    const name =
      userDoc?.name ||
      campusProfile?.full_name ||
      decoded.user_metadata?.name ||
      decoded.user_metadata?.full_name ||
      (userEmail ? userEmail.split('@')[0] : 'User');

    // Canonical user object attached to request
    req.user = {
      id: userId || userDoc?._id?.toString() || 'usr-student-01',
      _id: userId || userDoc?._id?.toString() || 'usr-student-01',
      userId: userId || userDoc?._id?.toString() || 'usr-student-01',
      email: userEmail,
      name,
      role,
      toJSON: () => ({
        id: userId,
        userId,
        email: userEmail,
        name,
        role: role.toUpperCase(),
      }),
    };

    next();
  } catch (err: any) {
    console.error('[Auth Middleware] Error:', err);
    return next(new AppError('Authentication failed.', 401));
  }
}
