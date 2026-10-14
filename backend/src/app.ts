import { monitoringRouter } from './modules/monitoring/routes.js';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import { dfdRouter } from './modules/dfd/routes.js';
import routingRouter from './modules/routing/routes.js';
import { inventoryRouter } from './modules/inventory/routes.js';
import { authRouter } from './modules/auth/routes.js';
import { labRouter } from './modules/labs/routes.js';
import { resourceRouter } from './modules/resources/routes.js';
import { bookingRouter } from './modules/bookings/routes.js';
import { notificationRouter } from './modules/notifications/routes.js';

dotenv.config();

const app: Express = express();

// Security and middleware setup
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        origin === 'http://localhost:5173' ||
        origin === 'http://127.0.0.1:5173' ||
        origin === process.env.CLIENT_URL ||
        /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
      if (isAllowed) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req: Request, _res: Response, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Smart Campus Lab & Resource Optimizer API is healthy',
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

// DFD Constraints & Architecture Pipeline
// The legacy DFD verifier mutates seeded memory; never expose it as a live API.
if (process.env.NODE_ENV === 'test') app.use('/api/v1/dfd', dfdRouter);

// Real-Time Computer Batches & Normalized Equipment Models
app.use('/api/v1/inventory', inventoryRouter);

// Domain routers
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/labs', labRouter);
app.use('/api/v1/resources', resourceRouter);
app.use('/api/v1/bookings', bookingRouter);
app.use('/api/v1/routes', routingRouter);
app.use('/api/v1/notifications', notificationRouter);
// app.use('/api/v1/maintenance', maintenanceRouter);
app.use('/api/v1/monitoring', monitoringRouter);
// app.use('/api/v1/reports', reportsRouter);

app.use((_req, res) => { res.status(404).json({ success: false, message: 'Endpoint not found' }); });
app.use(errorHandler);

export default app;
