import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// These tests isolate paymentService with a mocked Stripe client to exercise happy paths
// without hitting external APIs or the real database.

describe('paymentService with mocked Stripe', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('creates a payment intent and payment record for a valid order', async () => {
    const mockUser = { _id: 'user1', email: 'user@test.com', name: 'User', stripeCustomerId: null, save: jest.fn() };
    const mockOrder = { _id: 'order1', total: 12.34, userId: 'user1' };
    const mockPaymentIntent = { id: 'pi_123', client_secret: 'secret', status: 'requires_payment_method', charges: { data: [] } };
    const mockPaymentRecord = { id: 'pay_1', status: 'pending' };

    jest.unstable_mockModule('../config/env.js', () => ({ default: { stripe: { secretKey: 'sk_test_key' } } }));

    const mockStripeInstance = {
      customers: {
        create: jest.fn().mockResolvedValue({ id: 'cus_123' })
      },
      paymentMethods: {
        list: jest.fn().mockResolvedValue({ data: [] })
      },
      paymentIntents: {
        create: jest.fn().mockResolvedValue(mockPaymentIntent),
      }
    };

    jest.unstable_mockModule('stripe', () => ({ default: jest.fn().mockImplementation(() => mockStripeInstance) }));
    jest.unstable_mockModule('../models/User.js', () => ({ default: { findById: jest.fn().mockResolvedValue(mockUser) } }));
    jest.unstable_mockModule('../models/Order.js', () => ({ default: { findById: jest.fn().mockResolvedValue(mockOrder), findByIdAndUpdate: jest.fn().mockResolvedValue({}) } }));
    const paymentFindOne = jest.fn().mockResolvedValue(null);
    const paymentCreate = jest.fn().mockResolvedValue(mockPaymentRecord);
    jest.unstable_mockModule('../models/Payment.js', () => ({ default: { findOne: paymentFindOne, create: paymentCreate } }));

    const paymentService = await import('../services/paymentService.js');
    const result = await paymentService.createPaymentIntent('order1', 'user1');

    expect(mockStripeInstance.customers.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'user@test.com' }));
    expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalled();
    expect(paymentCreate).toHaveBeenCalled();
    expect(result.paymentIntentId).toBe('pi_123');
  });

  it('confirms a payment and maps Stripe status to internal status', async () => {
    const mockUser = { _id: 'user1', email: 'user@test.com', name: 'User', stripeCustomerId: 'cus_123', save: jest.fn() };
    const mockOrder = { _id: 'order1', total: 20, userId: 'user1' };
    const mockPaymentIntent = {
      id: 'pi_confirm',
      status: 'succeeded',
      charges: {
        data: [
          {
            payment_method_details: {
              card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 }
            }
          }
        ]
      }
    };

    jest.unstable_mockModule('../config/env.js', () => ({ default: { stripe: { secretKey: 'sk_test_key' } } }));
    const mockStripeInstance = {
      customers: {
        create: jest.fn().mockResolvedValue({ id: 'cus_123' })
      },
      paymentMethods: {
        list: jest.fn().mockResolvedValue({ data: [] })
      },
      paymentIntents: {
        retrieve: jest.fn().mockResolvedValue(mockPaymentIntent)
      }
    };

    jest.unstable_mockModule('stripe', () => ({ default: jest.fn().mockImplementation(() => mockStripeInstance) }));
    jest.unstable_mockModule('../models/User.js', () => ({ default: { findById: jest.fn().mockResolvedValue(mockUser) } }));
    jest.unstable_mockModule('../models/Order.js', () => ({ default: { findById: jest.fn().mockResolvedValue(mockOrder), findByIdAndUpdate: jest.fn().mockResolvedValue({}) } }));

    const paymentSave = jest.fn();
    const paymentDoc = { status: 'pending', transactionId: null, paymentMethod: null, paymentMethodDetails: null, save: paymentSave };
    jest.unstable_mockModule('../models/Payment.js', () => ({ default: { findOne: jest.fn().mockResolvedValue(paymentDoc) } }));

    const paymentService = await import('../services/paymentService.js');
    const updated = await paymentService.confirmPayment('pi_confirm');

    expect(mockStripeInstance.paymentIntents.retrieve).toHaveBeenCalledWith('pi_confirm');
    expect(updated.status).toBe('succeeded');
    expect(updated.paymentMethodDetails.last4).toBe('4242');
    expect(paymentSave).toHaveBeenCalled();
  });
});
