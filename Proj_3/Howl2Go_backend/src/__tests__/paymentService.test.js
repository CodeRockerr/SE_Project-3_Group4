import { describe, it, expect } from '@jest/globals';
import {
  ensureStripeCustomerForUser,
  getSavedPaymentMethodsForUser,
  createPaymentIntent,
  confirmPayment
} from '../services/paymentService.js';

// These tests exercise the graceful failure paths when Stripe is not configured
// (STRIPE_SECRET_KEY absent in test environment).

describe('paymentService without Stripe configuration', () => {
  it('throws when ensuring Stripe customer without Stripe', async () => {
    await expect(ensureStripeCustomerForUser('some-user-id')).rejects.toThrow('Stripe is not configured');
  });

  it('returns empty payment methods when Stripe is not configured', async () => {
    const methods = await getSavedPaymentMethodsForUser('user-id');
    expect(methods).toEqual([]);
  });

  it('throws when creating payment intent without Stripe', async () => {
    await expect(createPaymentIntent('order-id', 'user-id')).rejects.toThrow('Payment processing is not available');
  });

  it('throws when confirming payment without Stripe', async () => {
    await expect(confirmPayment('pi_test_123')).rejects.toThrow('Stripe is not configured');
  });
});
