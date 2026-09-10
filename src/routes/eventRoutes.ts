// src/routes/eventRoutes.ts
import { Router, type Request, type Response, type NextFunction } from 'express';
import { Event } from '../models/Event.js';
import { StatusCodes } from 'http-status-codes';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Fetch all events and populate venue details
    const events = await Event.find({})

    res.status(StatusCodes.OK).json({
      success: true,
      events,
    });
  } catch (error) {
    next(error);
  }
});

export const eventRoutes = router;