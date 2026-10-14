import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { pool } from '../config/postgres.js';
import { config } from '../config/env.js';
import { campusDb } from '../modules/persistence/database.js';
import { AppError } from '../utils/AppError.js';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
  : null;

export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer /i, '').trim();

    if (!token) {
      return next(new AppError('Authentication required', 401));
    }

    // 1. Local signed transport credentials are accepted only in explicit test mode.
    if (process.env.NODE_ENV === 'test') {
      try {
        const decoded: any = jwt.verify(token, config.jwtSecret);
        if (decoded && (decoded.id || decoded.userId || decoded.sub)) {
          const userId = decoded.id || decoded.userId || decoded.sub;
          let profile = campusDb.profiles.get(userId);
          const effectiveRole = decoded.role || profile?.role || 'student';
          const normalizedRole = effectiveRole === 'lab_admin' ? 'admin' : effectiveRole;

          if (!profile) {
            profile = {
              id: userId,
              full_name: decoded.name || 'Campus User',
              role: normalizedRole,
              created_at: new Date().toISOString(),
            };
            campusDb.profiles.set(userId, profile);
          }

          req.user = {
            id: profile.id,
            _id: profile.id,
            name: decoded.name || profile.full_name,
            email: decoded.email || `${normalizedRole}@campus.edu`,
            role: normalizedRole,
            department: 'Computer Science & Engineering',
          };
          return next();
        }
      } catch {
        // Not a local backend JWT; proceed to Supabase verification below
      }
    }

    if (!supabase) {
      return next(new AppError('Invalid or expired session', 401));
    }

    const { data, error: authError } = await supabase.auth.getUser(token);

    if (authError || !data.user) {
      return next(new AppError('Invalid or expired session', 401));
    }

    const authUser = data.user;

    if (!authUser.email || !authUser.email_confirmed_at) {
      return next(new AppError('Please verify your email first', 403));
    }

    const email = authUser.email.trim().toLowerCase();

    let result = await pool.query(
      'SELECT id, full_name, role FROM public.profiles WHERE id = $1',
      [authUser.id]
    );

    if (!result.rows.length) {
      // Only institutional emails are eligible for automatic provisioning.
      if (!email.endsWith('@ritindia.edu')) {
        return next(new AppError('Use your verified institutional email', 403));
      }

      const isFacultyCandidate = /^[a-z]/i.test(email);

      let role = 'student';

      if (isFacultyCandidate) {
        const faculty = await pool.query(
          `SELECT name FROM public.faculty
           WHERE LOWER(TRIM(email)) = $1
             AND currently_associated IS TRUE
           LIMIT 1`,
          [email]
        );

        if (!faculty.rows.length) {
          return next(new AppError('Email not found in approved faculty records', 403));
        }

        role = 'faculty';
      } else if (!/^[0-9]+@ritindia\.edu$/.test(email)) {
        return next(new AppError('Invalid student email format', 403));
      }

      const name = role === 'faculty'
        ? (await pool.query(
            'SELECT name FROM public.faculty WHERE LOWER(TRIM(email)) = $1 LIMIT 1',
            [email]
          )).rows[0]?.name
        : authUser.user_metadata?.full_name || email.split('@')[0];

      result = await pool.query(
        `INSERT INTO public.profiles (id, full_name, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING
         RETURNING id, full_name, role`,
        [authUser.id, name || 'Campus User', role]
      );

      if (!result.rows.length) {
        result = await pool.query(
          'SELECT id, full_name, role FROM public.profiles WHERE id = $1',
          [authUser.id]
        );
      }
    }

    const profile = result.rows[0];
    if (!profile || !['student','faculty','admin','lab_admin'].includes(profile.role)) return next(new AppError('Account role is not supported',403));

    const metadata = (await pool.query("SELECT after FROM audit_log WHERE actor_id=$1 AND action='PROFILE_UPDATED' ORDER BY created_at DESC LIMIT 1", [authUser.id])).rows[0]?.after;
    req.user = {
      id: authUser.id,
      _id: authUser.id,
      name: profile.full_name,
      email,
      role: profile.role === 'lab_admin' ? 'admin' : profile.role,
      department: metadata?.department || 'Computer Science & Engineering',
      profile: { phone: metadata?.profile?.phone || '' },
    };

    next();
  } catch (err) {
    console.error('[Auth]', err);
    next(new AppError('Authentication service unavailable', 503));
  }
}
