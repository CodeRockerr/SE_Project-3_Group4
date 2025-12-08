import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('paymentService data access helpers', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('fetches payment by id with populations', async () => {
    const populateMock = jest.fn().mockReturnThis();
    const findByIdMock = jest.fn().mockReturnValue({ populate: populateMock });

    jest.unstable_mockModule('../models/Payment.js', () => ({ default: { findById: findByIdMock } }));
    jest.unstable_mockModule('../models/Order.js', () => ({ default: {} }));
    jest.unstable_mockModule('../models/User.js', () => ({ default: {} }));

    const paymentService = await import('../services/paymentService.js');
    await paymentService.getPaymentById('pay_1');

    expect(findByIdMock).toHaveBeenCalledWith('pay_1');
    expect(populateMock).toHaveBeenCalledTimes(2);
  });

  it('fetches payments by order id', async () => {
    const sortMock = jest.fn().mockResolvedValue(['p1', 'p2']);
    const findMock = jest.fn().mockReturnValue({ sort: sortMock });

    jest.unstable_mockModule('../models/Payment.js', () => ({ default: { find: findMock } }));
    jest.unstable_mockModule('../models/Order.js', () => ({ default: {} }));
    jest.unstable_mockModule('../models/User.js', () => ({ default: {} }));

    const paymentService = await import('../services/paymentService.js');
    const result = await paymentService.getPaymentsByOrderId('order1');

    expect(findMock).toHaveBeenCalledWith({ orderId: 'order1' });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result).toEqual(['p1', 'p2']);
  });

  it('fetches payments by user id with options', async () => {
    const populateMock = jest.fn().mockResolvedValue(['p1']);
    const skipMock = jest.fn().mockReturnValue({ populate: populateMock });
    const limitMock = jest.fn().mockReturnValue({ skip: skipMock });
    const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
    const findMock = jest.fn().mockReturnValue({ sort: sortMock });

    jest.unstable_mockModule('../models/Payment.js', () => ({ default: { find: findMock } }));
    jest.unstable_mockModule('../models/Order.js', () => ({ default: {} }));
    jest.unstable_mockModule('../models/User.js', () => ({ default: {} }));

    const paymentService = await import('../services/paymentService.js');
    const result = await paymentService.getPaymentsByUserId('user1', { limit: 5, skip: 2, status: 'succeeded' });

    expect(findMock).toHaveBeenCalledWith({ userId: 'user1', status: 'succeeded' });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(limitMock).toHaveBeenCalledWith(5);
    expect(skipMock).toHaveBeenCalledWith(2);
    expect(populateMock).toHaveBeenCalledWith('orderId');
    expect(result).toEqual(['p1']);
  });

  it('handles webhook events and routes to handlers', async () => {
    const findOneMock = jest.fn().mockResolvedValue({
      status: 'processing',
      transactionId: null,
      paymentMethod: null,
      save: jest.fn(),
      paymentIntentId: 'pi_webhook',
      orderId: 'order123',
      _id: 'payment123'
    });
    const findByIdAndUpdateMock = jest.fn().mockResolvedValue({});

    const findOneAndUpdateMock = jest.fn().mockResolvedValue({ paymentIntentId: 'pi_webhook', status: 'processing', save: jest.fn(), orderId: 'order123' });
    jest.unstable_mockModule('../models/Payment.js', () => ({ default: { findOne: findOneMock, findOneAndUpdate: findOneAndUpdateMock } }));
    jest.unstable_mockModule('../models/Order.js', () => ({ default: { findByIdAndUpdate: findByIdAndUpdateMock } }));
    jest.unstable_mockModule('../models/User.js', () => ({ default: {} }));

    const paymentService = await import('../services/paymentService.js');

    await paymentService.handleWebhookEvent({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_webhook', metadata: {} } } });
    await paymentService.handleWebhookEvent({ type: 'payment_intent.payment_failed', data: { object: { id: 'pi_webhook' } } });
    await paymentService.handleWebhookEvent({ type: 'payment_intent.canceled', data: { object: { id: 'pi_webhook' } } });
    await paymentService.handleWebhookEvent({ type: 'payment_intent.created', data: { object: { id: 'pi_webhook' } } });
    await paymentService.handleWebhookEvent({ type: 'charge.succeeded', data: { object: { id: 'ch_123' } } });
    await paymentService.handleWebhookEvent({ type: 'charge.refunded', data: { object: { id: 'ch_123' } } });
    await paymentService.handleWebhookEvent({ type: 'unknown.event', data: { object: {} } });

    expect(findOneMock).toHaveBeenCalled();
    expect(findOneAndUpdateMock).toHaveBeenCalled();
    expect(findByIdAndUpdateMock).toHaveBeenCalled();
  });
});
