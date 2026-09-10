// src/routes/checkoutRoutes.ts (Update this file)
import { Router,type Request,type Response,type NextFunction } from 'express';
import { CheckoutController } from '../controllers/CheckoutController.js';
import { SeatCacheService } from '../services/SeatCacheService.js';
import { StatusCodes } from 'http-status-codes';

const router = Router();

router.post('/hold', CheckoutController.holdSeats);

// Add GET endpoint to fetch the live seat grid from Redis
router.get('/seats/:eventId', async (req: Request<{ eventId: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { eventId } = req.params;
    const seats = await SeatCacheService.getGridCache(eventId);
    
    res.status(StatusCodes.OK).json({
      success: true,
      seats,
    });
  } catch (error) {
    next(error);
  }
});

export const checkoutRoutes = router;