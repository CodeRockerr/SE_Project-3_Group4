import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  it
} from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import FastFoodItem from '../models/FastFoodItem.js';
import connectDB from '../config/database.js';

describe('Admin Controller', () => {
  let adminToken;
  let regularUserToken;
  let adminUser;
  let regularUser;
  let testItem1;
  let testItem2;

  beforeAll(async () => {
    await connectDB();

    // SAFETY CHECK: Prevent running tests against production database
    const dbName = mongoose.connection.name;
    if (
      !dbName ||
      (!dbName.includes('test') && process.env.NODE_ENV !== 'test')
    ) {
      throw new Error(
        `DANGER: Tests are trying to run against non-test database: "${dbName}". ` +
          `Database name must include "test" or NODE_ENV must be "test". ` +
          `Current NODE_ENV: "${process.env.NODE_ENV}"`
      );
    }

    // Clean up
    await User.deleteMany({});
    await Order.deleteMany({});
    await FastFoodItem.deleteMany({});

    // Create test admin user
    const adminRes = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'Admin123!'
      });
    adminUser = adminRes.body.data.user;
    
    // Manually set role to admin
    await User.findByIdAndUpdate(adminUser.id, { role: 'admin' });
    
    // Login as admin
    const adminLoginRes = await request(app)
      .post('/api/users/login')
      .send({
        email: 'admin@test.com',
        password: 'Admin123!'
      });
    adminToken = adminLoginRes.body.data.accessToken;

    // Create regular user
    const userRes = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Regular User',
        email: 'regular@test.com',
        password: 'User123!'
      });
    regularUser = userRes.body.data.user;
    
    const userLoginRes = await request(app)
      .post('/api/users/login')
      .send({
        email: 'regular@test.com',
        password: 'User123!'
      });
    regularUserToken = userLoginRes.body.data.accessToken;

    // Create test food items
    testItem1 = await FastFoodItem.create({
      restaurant: 'Test Restaurant A',
      item: 'Test Burger',
      calories: 500,
      protein: 25,
      totalFat: 20,
      carbohydrates: 40,
      servingSize: '1 burger',
      ingredients: 'bun, beef, lettuce',
      category: 'burger',
      price: 9.99
    });

    testItem2 = await FastFoodItem.create({
      restaurant: 'Test Restaurant B',
      item: 'Test Salad',
      calories: 250,
      protein: 15,
      totalFat: 10,
      carbohydrates: 20,
      servingSize: '1 bowl',
      ingredients: 'lettuce, tomato, chicken',
      category: 'salad',
      price: 7.99
    });

    // Create test orders
    await Order.create({
      userId: regularUser.id,
      orderNumber: `ORD-${Date.now()}-1`,
      items: [
        {
          foodItem: testItem1._id,
          restaurant: 'Test Restaurant A',
          item: 'Test Burger',
          quantity: 2,
          price: 9.99,
          calories: 500,
          protein: 25,
          totalFat: 20,
          carbohydrates: 40
        }
      ],
      total: 19.98,
      status: 'completed',
      createdAt: new Date()
    });

    await Order.create({
      userId: adminUser.id,
      orderNumber: `ORD-${Date.now()}-2`,
      items: [
        {
          foodItem: testItem2._id,
          restaurant: 'Test Restaurant B',
          item: 'Test Salad',
          quantity: 1,
          price: 7.99,
          calories: 250,
          protein: 15,
          totalFat: 10,
          carbohydrates: 20
        }
      ],
      total: 7.99,
      status: 'completed',
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
    });

    await Order.create({
      userId: regularUser.id,
      orderNumber: `ORD-${Date.now()}-3`,
      items: [
        {
          foodItem: testItem1._id,
          restaurant: 'Test Restaurant A',
          item: 'Test Burger',
          quantity: 1,
          price: 9.99,
          calories: 500,
          protein: 25,
          totalFat: 20,
          carbohydrates: 40
        }
      ],
      total: 9.99,
      status: 'pending',
      createdAt: new Date()
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Order.deleteMany({});
    await FastFoodItem.deleteMany({});
  });

  describe('GET /api/admin/analytics/restaurants', () => {
    it('should return 403 if user is not authenticated', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/restaurants');
      
      expect(res.status).toBe(401);
    });

    it('should return 403 if user is not an admin', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/restaurants')
        .set('Authorization', `Bearer ${regularUserToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Admin access required');
    });

    it('should successfully get restaurant analytics for admin', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/restaurants')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.restaurants).toBeDefined();
      expect(Array.isArray(res.body.data.restaurants)).toBe(true);
      expect(res.body.data.timeRange).toBe('all');
    });

    it('should get restaurant analytics with time range filter', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/restaurants?timeRange=week')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.timeRange).toBe('week');
    });
  });

  describe('GET /api/admin/analytics/platform', () => {
    it('should return 403 if user is not authenticated', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/platform');
      
      expect(res.status).toBe(401);
    });

    it('should return 403 if user is not an admin', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/platform')
        .set('Authorization', `Bearer ${regularUserToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Admin access required');
    });

    it('should successfully get platform analytics for admin', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/platform')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.platform).toBeDefined();
    });

    it('should get platform analytics with time range', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/platform?timeRange=month')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.timeRange).toBe('month');
    });
  });

  describe('GET /api/admin/analytics/trends', () => {
    it('should return 403 if user is not authenticated', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/trends');
      
      expect(res.status).toBe(401);
    });

    it('should return 403 if user is not an admin', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/trends')
        .set('Authorization', `Bearer ${regularUserToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Admin access required');
    });

    it('should successfully get order trends for admin', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/trends')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.trends).toBeDefined();
      expect(Array.isArray(res.body.data.trends)).toBe(true);
      expect(res.body.data.timeRange).toBe('month');
      expect(res.body.data.groupBy).toBe('day');
    });

    it('should get trends with custom timeRange and groupBy', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/trends?timeRange=year&groupBy=month')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.timeRange).toBe('year');
      expect(res.body.data.groupBy).toBe('month');
    });
  });

  describe('GET /api/admin/analytics/top-restaurants', () => {
    it('should return 403 if user is not authenticated', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/top-restaurants');
      
      expect(res.status).toBe(401);
    });

    it('should return 403 if user is not an admin', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/top-restaurants')
        .set('Authorization', `Bearer ${regularUserToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Admin access required');
    });

    it('should successfully get top restaurants for admin', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/top-restaurants')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.restaurants).toBeDefined();
      expect(Array.isArray(res.body.data.restaurants)).toBe(true);
      expect(res.body.data.metric).toBe('revenue');
    });

    it('should get top restaurants with custom metric', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/top-restaurants?metric=orders&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metric).toBe('orders');
    });

    it('should respect limit parameter', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/top-restaurants?limit=3')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.restaurants.length).toBeLessThanOrEqual(3);
    });
  });

  describe('GET /api/admin/analytics/dashboard', () => {
    it('should return 403 if user is not authenticated', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/dashboard');
      
      expect(res.status).toBe(401);
    });

    it('should return 403 if user is not an admin', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/dashboard')
        .set('Authorization', `Bearer ${regularUserToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Admin access required');
    });

    it('should successfully get comprehensive dashboard data for admin', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.platform).toBeDefined();
      expect(res.body.data.restaurants).toBeDefined();
      expect(res.body.data.trends).toBeDefined();
      expect(res.body.data.topByRevenue).toBeDefined();
      expect(res.body.data.topByOrders).toBeDefined();
      expect(Array.isArray(res.body.data.topByRevenue)).toBe(true);
      expect(Array.isArray(res.body.data.topByOrders)).toBe(true);
      expect(res.body.data.timeRange).toBe('all');
    });

    it('should get dashboard data with time range filter', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/dashboard?timeRange=week')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.timeRange).toBe('week');
    });

    it('should return all required analytics sections in dashboard', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      const { data } = res.body;
      
      // Verify all required sections are present
      expect(data).toHaveProperty('platform');
      expect(data).toHaveProperty('restaurants');
      expect(data).toHaveProperty('trends');
      expect(data).toHaveProperty('topByRevenue');
      expect(data).toHaveProperty('topByOrders');
      
      // Verify data types
      expect(typeof data.platform).toBe('object');
      expect(Array.isArray(data.restaurants)).toBe(true);
      expect(Array.isArray(data.trends)).toBe(true);
      expect(Array.isArray(data.topByRevenue)).toBe(true);
      expect(Array.isArray(data.topByOrders)).toBe(true);
    });
  });
});
