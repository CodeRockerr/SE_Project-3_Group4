import Stripe from "stripe";
import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import env from "../config/env.js";

// Initialize Stripe with API key
const stripe = new Stripe(env.stripe.secretKey);

/**
 * Create or retrieve a Stripe customer for a user and persist on user record
 * @param {string} userId
 * @param {Object} [metadata]
 * @returns {Promise<string>} stripeCustomerId
 */
export const ensureStripeCustomerForUser = async (userId, metadata = {}) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (user.stripeCustomerId) {
    console.log(
      `✓ User ${user.email} already has Stripe customer: ${user.stripeCustomerId}`
    );
    return user.stripeCustomerId;
  }

  // Create a new Stripe customer
  console.log(`→ Creating new Stripe customer for user ${user.email}`);
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata,
  });

  console.log(
    `✓ Created Stripe customer ${customer.id} for user ${user.email}`
  );

  user.stripeCustomerId = customer.id;
  await user.save({ validateBeforeSave: false });

  return customer.id;
};

/**
 * List saved payment methods (cards) for a given user
 * @param {string} userId
 * @returns {Promise<Array>} array of payment methods
 */
export const getSavedPaymentMethodsForUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.stripeCustomerId) return [];

  const methods = await stripe.paymentMethods.list({
    customer: user.stripeCustomerId,
    type: "card",
  });

  return methods.data || [];
};

/**
 * Create a payment intent for an order
 * @param {string} orderId - Order ID
 * @param {string} userId - User ID
 * @returns {Promise<{clientSecret: string, paymentIntentId: string, payment: Object}>}
 */
export const createPaymentIntent = async (orderId, userId) => {
  try {
    // Fetch order details
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    // Verify user owns this order - compare as strings
    const orderUserId = order.userId.toString();
    const requestUserId = userId.toString();

    if (orderUserId !== requestUserId) {
      throw new Error("Unauthorized: Order does not belong to this user");
    }

    // Check if order already has a successful payment
    const existingPayment = await Payment.findOne({
      orderId,
      status: "succeeded",
    });

    if (existingPayment) {
      throw new Error("Order has already been paid");
    }

    // Calculate amount in cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(order.total * 100);

    // Always ensure user has a Stripe customer for payment method scoping
    const stripeCustomerId = await ensureStripeCustomerForUser(userId);

    console.log(
      `→ Creating PaymentIntent for order ${orderId} with customer ${stripeCustomerId}`
    );

    const paymentIntentParams = {
      amount: amountInCents,
      currency: "usd",
      customer: stripeCustomerId,
      metadata: {
        orderId: orderId.toString(),
        userId: userId.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    };

    const paymentIntent = await stripe.paymentIntents.create(
      paymentIntentParams
    );

    console.log(
      `✓ Created PaymentIntent ${paymentIntent.id} for customer ${stripeCustomerId}`
    );

    // Create payment record in database
    const payment = await Payment.create({
      orderId,
      userId,
      amount: amountInCents,
      currency: "usd",
      status: "pending",
      paymentIntentId: paymentIntent.id,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      payment,
    };
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw error;
  }
};

/**
 * Confirm payment and update order status
 * @param {string} paymentIntentId - Stripe payment intent ID
 * @returns {Promise<Object>} Updated payment
 */
export const confirmPayment = async (paymentIntentId) => {
  try {
    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Find payment in database
    const payment = await Payment.findOne({ paymentIntentId });

    if (!payment) {
      throw new Error("Payment not found");
    }

    // Update payment status based on Stripe payment intent status
    const statusMap = {
      succeeded: "succeeded",
      processing: "processing",
      requires_payment_method: "failed",
      requires_confirmation: "pending",
      requires_action: "pending",
      canceled: "canceled",
    };

    payment.status = statusMap[paymentIntent.status] || "pending";
    payment.transactionId = paymentIntent.id;

    // Extract payment method details if available
    if (paymentIntent.charges?.data?.[0]?.payment_method_details) {
      const details = paymentIntent.charges.data[0].payment_method_details;
      if (details.card) {
        payment.paymentMethod = "card";
        payment.paymentMethodDetails = {
          brand: details.card.brand,
          last4: details.card.last4,
          expiryMonth: details.card.exp_month,
          expiryYear: details.card.exp_year,
        };
      } else if (details.type) {
        payment.paymentMethod = details.type;
      }
    }

    // If payment failed, capture reason
    if (payment.status === "failed" && paymentIntent.last_payment_error) {
      payment.failureReason = paymentIntent.last_payment_error.message;
    }

    await payment.save();

    // Update order status if payment succeeded
    if (payment.status === "succeeded") {
      await Order.findByIdAndUpdate(payment.orderId, {
        paymentStatus: "paid",
        paymentId: payment._id,
        status: "confirmed",
      });
    }

    return payment;
  } catch (error) {
    console.error("Error confirming payment:", error);
    throw error;
  }
};

/**
 * Get payment by ID
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object>} Payment
 */
export const getPaymentById = async (paymentId) => {
  try {
    const payment = await Payment.findById(paymentId)
      .populate("orderId")
      .populate("userId", "name email");
    return payment;
  } catch (error) {
    console.error("Error fetching payment:", error);
    throw error;
  }
};

/**
 * Get payments by order ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Array>} Payments
 */
export const getPaymentsByOrderId = async (orderId) => {
  try {
    const payments = await Payment.find({ orderId }).sort({ createdAt: -1 });
    return payments;
  } catch (error) {
    console.error("Error fetching payments by order:", error);
    throw error;
  }
};

/**
 * Get payments by user ID
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, skip, status)
 * @returns {Promise<Array>} Payments
 */
export const getPaymentsByUserId = async (userId, options = {}) => {
  try {
    const { limit = 20, skip = 0, status } = options;
    const query = { userId };

    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate("orderId");

    return payments;
  } catch (error) {
    console.error("Error fetching payments by user:", error);
    throw error;
  }
};

/**
 * Refund a payment
 * @param {string} paymentId - Payment ID
 * @param {string} reason - Refund reason
 * @returns {Promise<Object>} Updated payment
 */
export const refundPayment = async (paymentId, reason = "") => {
  try {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status !== "succeeded") {
      throw new Error("Can only refund successful payments");
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.paymentIntentId,
      reason: "requested_by_customer",
    });

    // Update payment status
    payment.status = "refunded";
    payment.refundReason = reason;
    payment.metadata = payment.metadata || new Map();
    payment.metadata.set("refundId", refund.id);

    await payment.save();

    // Update order status
    await Order.findByIdAndUpdate(payment.orderId, {
      paymentStatus: "refunded",
      status: "canceled",
    });

    return payment;
  } catch (error) {
    console.error("Error refunding payment:", error);
    throw error;
  }
};

/**
 * Handle Stripe webhook events
 * @param {Object} event - Stripe webhook event
 * @returns {Promise<void>}
 */
export const handleWebhookEvent = async (event) => {
  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;
      case "payment_intent.canceled":
        await handlePaymentCanceled(event.data.object);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("Error handling webhook event:", error);
    throw error;
  }
};

// Helper functions for webhook handlers
async function handlePaymentSucceeded(paymentIntent) {
  const payment = await Payment.findOne({
    paymentIntentId: paymentIntent.id,
  });
  if (payment && payment.status !== "succeeded") {
    payment.status = "succeeded";
    payment.transactionId = paymentIntent.id;
    await payment.save();

    await Order.findByIdAndUpdate(payment.orderId, {
      paymentStatus: "paid",
      paymentId: payment._id,
      status: "confirmed",
    });
  }
}

async function handlePaymentFailed(paymentIntent) {
  const payment = await Payment.findOne({
    paymentIntentId: paymentIntent.id,
  });
  if (payment) {
    payment.status = "failed";
    payment.failureReason =
      paymentIntent.last_payment_error?.message || "Payment failed";
    await payment.save();
  }
}

async function handlePaymentCanceled(paymentIntent) {
  const payment = await Payment.findOne({
    paymentIntentId: paymentIntent.id,
  });
  if (payment) {
    payment.status = "canceled";
    await payment.save();
  }
}

async function handleChargeRefunded(charge) {
  const payment = await Payment.findOne({
    paymentIntentId: charge.payment_intent,
  });
  if (payment && payment.status !== "refunded") {
    payment.status = "refunded";
    await payment.save();

    await Order.findByIdAndUpdate(payment.orderId, {
      paymentStatus: "refunded",
      status: "canceled",
    });
  }
}

export default {
  createPaymentIntent,
  confirmPayment,
  getPaymentById,
  getPaymentsByOrderId,
  getPaymentsByUserId,
  refundPayment,
  handleWebhookEvent,
};
