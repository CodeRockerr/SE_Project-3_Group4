import { Router } from "express";
import {
  createPaymentIntent,
  confirmPayment,
  getPayment,
  getUserPayments,
  getOrderPayments,
  getSavedPaymentMethods,
  handleWebhook,
  refundPayment,
} from "../controllers/payment.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// Webhook route is registered in app.js to ensure raw body is available before JSON parsing

/**
 * Create payment intent for an order
 * POST /api/payments/create-intent
 * @body { orderId: string }
 * @access Private (authenticated users)
 */
router.post("/create-intent", authenticate, createPaymentIntent);

/**
 * Confirm payment after client processing
 * POST /api/payments/confirm
 * @body { paymentIntentId: string }
 * @access Private (authenticated users)
 */
router.post("/confirm", authenticate, confirmPayment);

/**
 * Get payment by ID
 * GET /api/payments/:id
 * @access Private (payment owner only)
 */
router.get("/:id", authenticate, getPayment);

/**
 * Get all payments for current user
 * GET /api/payments
 * @query { limit?: number, skip?: number, status?: string }
 * @access Private (authenticated users)
 */
router.get("/", authenticate, getUserPayments);

/**
 * Get payments for a specific order
 * GET /api/payments/order/:orderId
 * @access Private (order owner only)
 */
router.get("/order/:orderId", authenticate, getOrderPayments);

/**
 * Get saved payment methods for current user
 * GET /api/payments/methods
 */
router.get("/methods", authenticate, getSavedPaymentMethods);

/**
 * Refund a payment
 * POST /api/payments/:id/refund
 * @body { reason?: string }
 * @access Private (admin only)
 */
router.post("/:id/refund", authenticate, authorize("admin"), refundPayment);

export default router;
