// src/routes/checkoutRoutes.ts
import { Router } from 'express';
import { CheckoutController } from '../controllers/CheckoutController.js';

const router = Router();

router.post('/hold', CheckoutController.holdSeats);

export const checkoutRoutes = router;