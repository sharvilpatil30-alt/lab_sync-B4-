import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from './user.model.js';
import { config } from '../../config/env.js';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js';
import { success, error } from '../../utils/apiResponse.js';

export const authRouter = Router();

import mongoose from 'mongoose';
import { campusDb } from '../persistence/database.js';

// Pre-seeded campus administrative & student accounts
const seedAccounts: Record<string, { id: string; name: string; role: string; email: string }> = {
  'admin@ritindia.edu': { id: 'usr-admin-01', name: 'Dr. Vikramaditya (Lab Head)', role: 'admin', email: 'admin@ritindia.edu' },
  'student@ritindia.edu': { id: 'usr-student-01', name: 'Anya Bandgar', role: 'student', email: 'student@ritindia.edu' },
  'faculty@ritindia.edu': { id: 'usr-faculty-01', name: 'Prof. Rajesh Kulkarni', role: 'faculty', email: 'faculty@ritindia.edu' },
};

// POST /api/v1/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return error(res, 'Email and password are required', ['MISSING_CREDENTIALS'], 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check MongoDB if active connection exists
    let user: any = null;
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ email: normalizedEmail });
      } catch {
        // Mongo query error
      }
    }

    if (user) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return error(res, 'Invalid email or password', ['INVALID_CREDENTIALS'], 401);
      }

      const token = jwt.sign(
        { id: user._id.toString(), role: user.role, email: user.email, name: user.name },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      return success(res, { token, user: user.toJSON() }, 'Signed in successfully');
    }

    // 2. Check seed accounts for local development / testing
    const seedUser = seedAccounts[normalizedEmail];
    if (seedUser && password.length >= 6) {
      const token = jwt.sign(
        { id: seedUser.id, role: seedUser.role, email: seedUser.email, name: seedUser.name },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      return success(
        res,
        {
          token,
          user: {
            id: seedUser.id,
            userId: seedUser.id,
            name: seedUser.name,
            email: seedUser.email,
            role: seedUser.role,
            department: 'Computer Science & Engineering',
          },
        },
        'Signed in successfully'
      );
    }

    return error(res, 'Invalid email or password', ['INVALID_CREDENTIALS'], 401);
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    return error(res, 'Authentication failed', [err.message], 500);
  }
});

// POST /api/v1/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role = 'student', department } = req.body;
    if (!name || !email || !password) {
      return error(res, 'Name, email, and password are required', ['VALIDATION_ERROR'], 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check MongoDB if active
    if (mongoose.connection.readyState === 1) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return error(res, 'An account with this email address already exists', ['EMAIL_TAKEN'], 409);
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: role.toLowerCase(),
        department: department || 'General Academic',
      });

      const token = jwt.sign(
        { id: user._id.toString(), role: user.role, email: user.email, name: user.name },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      return success(res, { token, user: user.toJSON() }, 'Account created successfully', 201);
    }

    // 2. In-memory profile registration for local testing
    const newId = `usr-${Date.now().toString(36)}`;
    campusDb.profiles.set(newId, {
      id: newId,
      full_name: name.trim(),
      role: role.toLowerCase(),
      created_at: new Date().toISOString(),
    });

    const token = jwt.sign(
      { id: newId, role: role.toLowerCase(), email: normalizedEmail, name: name.trim() },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return success(
      res,
      {
        token,
        user: {
          id: newId,
          userId: newId,
          name: name.trim(),
          email: normalizedEmail,
          role: role.toLowerCase(),
          department: department || 'General Academic',
        },
      },
      'Account created successfully',
      201
    );
  } catch (err: any) {
    console.error('[Auth] Register error:', err);
    return error(res, 'Registration failed', [err.message], 500);
  }
});

// GET /api/v1/auth/me
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  return success(res, req.user?.toJSON(), 'Current session active');
});

// POST /api/v1/auth/logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  return success(res, null, 'Logged out successfully');
});
