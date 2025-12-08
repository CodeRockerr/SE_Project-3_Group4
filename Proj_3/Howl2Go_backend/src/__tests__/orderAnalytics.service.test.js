import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Order from '../models/Order.js';
import {
  analyzeNutritionPatterns,
  trackDietaryTrends,
  generatePersonalizedRecommendations
} from '../services/orderAnalytics.js';

let userId;

beforeAll(async () => {
  await connectDB();

  const dbName = mongoose.connection.name;
  if (!dbName || (!dbName.includes('test') && process.env.NODE_ENV !== 'test')) {
    throw new Error(
      `DANGER: Tests are trying to run against non-test database: "${dbName}". ` +
        `Database name must include "test" or NODE_ENV must be "test". ` +
        `Current NODE_ENV: "${process.env.NODE_ENV}"`
    );
  }

  await Order.deleteMany({});
  userId = new mongoose.Types.ObjectId();

  const now = new Date();

  await Order.create({
    userId,
    orderNumber: `ORD-${Date.now()}-1`,
    items: [
      {
        foodItem: new mongoose.Types.ObjectId(),
        restaurant: 'Fresh Grill',
        item: 'Mega Protein Bowl',
        quantity: 1,
        price: 15.99
      }
    ],
    nutrition: {
      totalCalories: 1700,
      totalProtein: 20,
      totalFat: 60,
      totalCarbohydrates: 180
    },
    status: 'completed',
    createdAt: now
  });

  await Order.create({
    userId,
    orderNumber: `ORD-${Date.now()}-2`,
    items: [
      {
        foodItem: new mongoose.Types.ObjectId(),
        restaurant: 'Fresh Grill',
        item: 'Steak Plate',
        quantity: 1,
        price: 14.5
      }
    ],
    nutrition: {
      totalCalories: 1500,
      totalProtein: 18,
      totalFat: 55,
      totalCarbohydrates: 160
    },
    status: 'completed',
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  });

  await Order.create({
    userId,
    orderNumber: `ORD-${Date.now()}-3`,
    items: [
      {
        foodItem: new mongoose.Types.ObjectId(),
        restaurant: 'Lean Kitchen',
        item: 'Light Bowl',
        quantity: 1,
        price: 11.0
      }
    ],
    nutrition: {
      totalCalories: 1300,
      totalProtein: 15,
      totalFat: 30,
      totalCarbohydrates: 140
    },
    status: 'completed',
    createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
  });

  // Pending order should be ignored
  await Order.create({
    userId,
    orderNumber: `ORD-${Date.now()}-4`,
    items: [
      {
        foodItem: new mongoose.Types.ObjectId(),
        restaurant: 'Fresh Grill',
        item: 'Pending Dish',
        quantity: 1,
        price: 9.0
      }
    ],
    nutrition: {
      totalCalories: 900,
      totalProtein: 25,
      totalFat: 20,
      totalCarbohydrates: 90
    },
    status: 'pending',
    createdAt: now
  });
});

afterAll(async () => {
  await Order.deleteMany({});
});

describe('orderAnalytics service', () => {
  it('rejects invalid user id for analysis', async () => {
    await expect(analyzeNutritionPatterns('not-an-id')).rejects.toThrow('Invalid user ID');
  });

  it('computes nutrition patterns with averages and top entities', async () => {
    const result = await analyzeNutritionPatterns(userId.toString(), 'all');

    expect(result.totalOrders).toBeGreaterThanOrEqual(0);
    expect(result.averageCalories).toBeGreaterThanOrEqual(0);
    expect(result.averageProtein).toBeGreaterThanOrEqual(0);
    expect(result.mostOrderedRestaurants[0].name).toBeDefined();
    expect(result.mostOrderedRestaurants[0].count).toBeGreaterThan(0);
    expect(result.mostOrderedItems[0].name).toBeDefined();
    expect(result.nutritionDistribution.calories).toBeDefined();
  });

  it('applies timeRange filtering for recent orders', async () => {
    const result = await analyzeNutritionPatterns(userId.toString(), 'week');
    expect(result.totalOrders).toBeGreaterThanOrEqual(0);
    expect(result.averageCalories).toBeGreaterThanOrEqual(0);
  });

  it('tracks dietary trends over the period and sorts chronologically', async () => {
    const trends = await trackDietaryTrends(userId.toString(), 'month');
    expect(trends.period).toBe('month');
    expect(Array.isArray(trends.trends)).toBe(true);
    expect(trends.trends.length).toBeGreaterThanOrEqual(2);
    // Ensure sorted by date ascending
    const dates = trends.trends.map(t => t.date);
    expect(dates).toEqual([...dates].sort());
  });

  it('rejects invalid user id for trends', async () => {
    await expect(trackDietaryTrends('bad-id', 'month')).rejects.toThrow('Invalid user ID');
  });

  it('generates personalized recommendations based on patterns and trends', async () => {
    const recs = await generatePersonalizedRecommendations(userId.toString());
    const types = recs.map(r => r.type);
    expect(types).toContain('protein_increase');
    expect(types).toContain('diversity');
    expect(types.some(t => t === 'calorie_reduction' || t === 'calorie_increase')).toBe(true);
  });
});
