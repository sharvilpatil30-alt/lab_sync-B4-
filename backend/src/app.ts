import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();

// Security and middleware setup
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
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

// Placeholder mount points for domain routers (to be added in future modules)
// app.use('/api/v1/auth', authRouter);
// app.use('/api/v1/users', userRouter);
// app.use('/api/v1/labs', labRouter);
// app.use('/api/v1/resources', resourceRouter);
// app.use('/api/v1/bookings', bookingRouter);
// app.use('/api/v1/routes', routingRouter);
// app.use('/api/v1/maintenance', maintenanceRouter);
// app.use('/api/v1/monitoring', monitoringRouter);
// app.use('/api/v1/reports', reportsRouter);

export default app;
