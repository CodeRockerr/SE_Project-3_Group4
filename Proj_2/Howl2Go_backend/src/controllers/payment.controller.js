import Stripe from "stripe";
import env from "../config/env.js";
import * as paymentService from "../services/paymentService.js";

const stripe = new Stripe(env.stripe.secretKey);

/**
 * Create payment intent for an order
 * POST /api/payments/create-intent
 */
export const createPaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const result = await paymentService.createPaymentIntent(orderId, userId);

    res.status(200).json({
      success: true,
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      payment: {
        id: result.payment._id,
        amount: result.payment.amount,
        status: result.payment.status,
      },
    });
  } catch (error) {
    console.error("Error in createPaymentIntent controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment intent",
    });
  }
};

/**
 * Confirm payment after client-side confirmation
 * POST /api/payments/confirm
 */
export const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment intent ID is required",
      });
    }

    const payment = await paymentService.confirmPayment(paymentIntentId);

    res.status(200).json({
      success: true,
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        orderId: payment.orderId,
        transactionId: payment.transactionId,
      },
    });
  } catch (error) {
    console.error("Error in confirmPayment controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to confirm payment",
    });
  }
};

/**
 * Get payment by ID
 * GET /api/payments/:id
 */
export const getPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await paymentService.getPaymentById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Verify user owns this payment
    if (payment.userId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to payment",
      });
    }

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Error in getPayment controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
    });
  }
};

/**
 * Get payments for current user
 * GET /api/payments
 */
export const getUserPayments = async (req, res) => {
  try {
    const userId = req.user.id;

    const { limit, skip, status } = req.query;

    const payments = await paymentService.getPaymentsByUserId(userId, {
      limit: parseInt(limit) || 20,
      skip: parseInt(skip) || 0,
      status,
    });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Error in getUserPayments controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    });
  }
};

/**
 * Get saved payment methods (cards) for current user
 * GET /api/payments/methods
 */
export const getSavedPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.id;
    const methods = await paymentService.getSavedPaymentMethodsForUser(userId);

    // Simplify method data for client
    const simplified = methods.map((m) => ({
      id: m.id,
      brand: m.card?.brand,
      last4: m.card?.last4,
      exp_month: m.card?.exp_month,
      exp_year: m.card?.exp_year,
    }));

    res.status(200).json({ success: true, methods: simplified });
  } catch (error) {
    console.error("Error fetching saved payment methods:", error);
    res.status(500).json({ success: false, methods: [] });
  }
};

/**
 * Get payments for a specific order
 * GET /api/payments/order/:orderId
 */
export const getOrderPayments = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const payments = await paymentService.getPaymentsByOrderId(orderId);

    // Verify user owns at least one payment (and thus the order)
    if (payments.length > 0 && payments[0].userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to order payments",
      });
    }

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Error in getOrderPayments controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order payments",
    });
  }
};

/**
 * Handle Stripe webhook events
 * POST /api/payments/webhook
 */
export const handleWebhook = async (req, res) => {
  try {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = env.stripe.webhookSecret;

    if (!webhookSecret) {
      console.error("Webhook secret not configured");
      return res.status(500).send("Webhook secret not configured");
    }

    let event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    await paymentService.handleWebhookEvent(event);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error in webhook handler:", error);
    res.status(500).json({
      success: false,
      message: "Webhook handler error",
    });
  }
};

/**
 * Refund a payment (admin only)
 * POST /api/payments/:id/refund
 */
export const refundPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Note: Add admin auth middleware to this route
    const payment = await paymentService.refundPayment(id, reason);

    res.status(200).json({
      success: true,
      message: "Payment refunded successfully",
      payment: {
        id: payment._id,
        status: payment.status,
        refundReason: payment.refundReason,
      },
    });
  } catch (error) {
    console.error("Error in refundPayment controller:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to refund payment",
    });
  }
};

export default {
  createPaymentIntent,
  confirmPayment,
  getPayment,
  getUserPayments,
  getOrderPayments,
  handleWebhook,
  getSavedPaymentMethods,
  refundPayment,
};
