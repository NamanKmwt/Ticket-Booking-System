// src/app.ts
import express, {type Application,type Request,type Response,type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { StatusCodes } from 'http-status-codes';
import { checkoutRoutes } from './routes/checkoutRoutes.js';

const app: Application = express();

// Security and utility middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/v1/checkout', checkoutRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Global Typed Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Unhandled Application Error:', err);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;