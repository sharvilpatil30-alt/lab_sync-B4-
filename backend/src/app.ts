import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { authRouter } from './modules/auth/auth.routes.js';
import { inventoryRouter } from './modules/inventory/routes.js';
import { dfdRouter } from './modules/dfd/routes.js';
import { labRouter } from './modules/labs/lab.routes.js';
import { resourceRouter } from './modules/resources/resource.routes.js';
import { bookingRouter } from './modules/bookings/booking.routes.js';
import { routingRouter } from './modules/routing/routes.js';
import { maintenanceRouter } from './modules/maintenance/maintenance.routes.js';
import { monitoringRouter } from './modules/monitoring/monitoring.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';

dotenv.config();

const app: Express = express();

// Security and middleware setup
app.use(helmet());
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
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

// Mount domain routers per canonical shared contract
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/dfd', dfdRouter);
app.use('/api/v1/labs', labRouter);
app.use('/api/v1/resources', resourceRouter);
app.use('/api/v1/bookings', bookingRouter);
app.use('/api/v1/routes', routingRouter);
app.use('/api/v1/maintenance', maintenanceRouter);
app.use('/api/v1/monitoring', monitoringRouter);
app.use('/api/v1/reports', reportsRouter);

// Global 404 handler for API routes
app.use('/api/v1/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `API endpoint '${req.method} ${req.originalUrl}' does not exist.`,
    },
  });
});

export default app;
