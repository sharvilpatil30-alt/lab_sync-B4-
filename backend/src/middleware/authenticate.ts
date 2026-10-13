import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { pool } from '../config/postgres.js';
import { AppError } from '../utils/AppError.js';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

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

    req.user = {
      id: authUser.id,
      _id: authUser.id,
      name: profile.full_name,
      email,
      role: profile.role,
      department: 'Computer Science & Engineering',
    };

    next();
  } catch (err) {
    console.error('[Auth]', err);
    next(new AppError('Authentication service unavailable', 503));
  }
}
