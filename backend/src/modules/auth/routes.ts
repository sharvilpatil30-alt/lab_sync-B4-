import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../../config/env.js';
import { campusDb } from '../persistence/database.js';
import { User } from './user.model.js';
import { success, error } from '../../utils/apiResponse.js';
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js';

export const authRouter = Router();

// POST /api/v1/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return error(res, 'Email and password are required', [], 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check pre-seeded / known campus profiles
    let matchingProfile = Array.from(campusDb.profiles.values()).find(
      (p) => `${p.role}@campus.edu` === normalizedEmail || p.id.toLowerCase() === normalizedEmail
    );

    // Also check demo accounts: student@campus.edu, faculty@campus.edu, admin@campus.edu
    if (!matchingProfile) {
      if (normalizedEmail.startsWith('student')) {
        matchingProfile = campusDb.profiles.get('usr_student_01') || campusDb.profiles.get('usr-student-01');
      } else if (normalizedEmail.startsWith('faculty')) {
        matchingProfile = campusDb.profiles.get('usr_faculty_01') || campusDb.profiles.get('usr-faculty-01');
      } else if (normalizedEmail.startsWith('admin')) {
        matchingProfile = campusDb.profiles.get('usr_admin_01') || campusDb.profiles.get('usr-admin-01');
      }
    }

    if (matchingProfile) {
      const canonicalRole = matchingProfile.role === 'lab_admin' ? 'admin' : matchingProfile.role;
      const token = jwt.sign(
        {
          id: matchingProfile.id,
          email: normalizedEmail,
          role: canonicalRole,
          name: matchingProfile.full_name,
        },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      return success(
        res,
        {
          token,
          user: {
            id: matchingProfile.id,
            name: matchingProfile.full_name,
            email: normalizedEmail,
            role: canonicalRole,
            department: 'Computer Science & Engineering',
          },
        },
        'Logged in successfully'
      );
    }

    // Try MongoDB User model if connected
    try {
      const user = await User.findOne({ email: normalizedEmail });
      if (user) {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (isMatch) {
          const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role, name: user.name },
            config.jwtSecret,
            { expiresIn: '7d' }
          );
          return success(
            res,
            {
              token,
              user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
              },
            },
            'Logged in successfully'
          );
        }
      }
    } catch {
      // MongoDB not connected
    }

    return error(res, 'Invalid email or password', [], 401);
  } catch (err: any) {
    return error(res, err.message || 'Authentication error', [], 500);
  }
});

// POST /api/v1/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return error(res, 'Name, email, and password are required', [], 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    // Security: user registration is restricted to 'student' role
    campusDb.profiles.set(userId, {
      id: userId,
      full_name: name.trim(),
      role: 'student',
      created_at: new Date().toISOString(),
    });

    const token = jwt.sign(
      { id: userId, email: normalizedEmail, role: 'student', name: name.trim() },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return success(
      res,
      {
        token,
        user: {
          id: userId,
          name: name.trim(),
          email: normalizedEmail,
          role: 'student',
          department: 'Computer Science & Engineering',
        },
      },
      'User registered successfully',
      201
    );
  } catch (err: any) {
    return error(res, err.message || 'Registration error', [], 500);
  }
});

// GET /api/v1/auth/me
authRouter.get('/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  return success(res, req.user, 'Current user profile');
});

// POST /api/v1/auth/logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  return success(res, { loggedOut: true }, 'Logged out successfully');
});

