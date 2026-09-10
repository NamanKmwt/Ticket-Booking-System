// src/controllers/CheckoutController.ts
import type{ Request, Response, NextFunction } from 'express';
import { CheckoutService } from '../services/CheckoutService.js';
import { StatusCodes } from 'http-status-codes';

interface HoldSeatsRequestBody {
  eventId: string;
  seatIds: string[];
  userEmail: string;
}

export class CheckoutController {
  static async holdSeats(
    req: Request<{}, {}, HoldSeatsRequestBody>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { eventId, seatIds, userEmail } = req.body;

      if (!eventId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0 || !userEmail) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Invalid payload. Provide eventId, non-empty seatIds array, and userEmail.',
        });
        return;
      }

      const result = await CheckoutService.holdSeats({
        eventId,
        seatIds,
        userEmail,
      });

      if (!result.success) {
        res.status(StatusCodes.CONFLICT).json(result);
        return;
      }

      res.status(StatusCodes.OK).json(result);
    } catch (error: unknown) {
      next(error);
    }
  }
}