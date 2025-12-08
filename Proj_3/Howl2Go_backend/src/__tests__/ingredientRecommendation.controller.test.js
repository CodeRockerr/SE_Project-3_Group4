import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import connectDB from '../config/database.js';
import FastFoodItem from '../models/FastFoodItem.js';
import * as ingredientService from '../services/ingredientRecommendation.service.js';

let itemA;
let itemB;
let itemC;
let itemD;

// Establish DB connection and seed deterministic data
beforeAll(async () => {
  await connectDB();

  // Safety guard to avoid hitting non-test DBs
  const dbName = mongoose.connection.name;
  if (!dbName || (!dbName.includes('test') && process.env.NODE_ENV !== 'test')) {
    throw new Error(
      `DANGER: Tests are trying to run against non-test database: "${dbName}". ` +
        `Database name must include "test" or NODE_ENV must be "test". ` +
        `Current NODE_ENV: "${process.env.NODE_ENV}"`
    );
  }

  await FastFoodItem.deleteMany({});

  itemA = await FastFoodItem.create({
    company: 'Green Eats',
    item: 'Veggie Wrap',
    ingredients: ['lettuce', 'tomato', 'cheese'],
    calories: 350,
    protein: 12,
    price: 6.5
  });

  itemB = await FastFoodItem.create({
    company: 'Fit Bites',
    item: 'Chicken Salad',
    ingredients: ['chicken', 'lettuce', 'tomato'],
    calories: 300,
    protein: 32,
    price: 9.25
  });

  itemC = await FastFoodItem.create({
    company: 'Hearty Grill',
    item: 'Bacon Burger',
    ingredients: ['bacon', 'beef', 'cheese'],
    calories: 850,
    protein: 40,
    price: 11.5
  });

  itemD = await FastFoodItem.create({
    company: 'Protein House',
    item: 'Grilled Chicken Bowl',
    ingredients: ['chicken', 'rice', 'beans'],
    calories: 520,
    protein: 38,
    price: 10.0
  });
});

afterAll(async () => {
  await FastFoodItem.deleteMany({});
});

describe('GET /api/recommendations/ingredients', () => {
  it('returns ranked ingredient recommendations with include/exclude filters', async () => {
    const res = await request(app)
      .get('/api/recommendations/ingredients')
      .query({ include: 'lettuce,tomato', exclude: 'bacon' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.criteria.include).toEqual(['lettuce', 'tomato']);
    expect(res.body.criteria.exclude).toEqual(['bacon']);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    // Highest match should be the chicken salad (matches lettuce+tomato with lower calories)
    expect(res.body.items[0].item).toBe('Chicken Salad');
    // Excluded ingredient should not appear in results
    const items = res.body.items.map(i => i.item);
    expect(items).not.toContain('Bacon Burger');
  });

  it('caps limit at 100 to prevent abuse', async () => {
    const res = await request(app)
      .get('/api/recommendations/ingredients')
      .query({ limit: 500 });

    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100);
    expect(res.body.page).toBe(1);
  });

  it('supports pagination with deterministic ordering by match score and calories', async () => {
    const resPage1 = await request(app)
      .get('/api/recommendations/ingredients')
      .query({ include: 'chicken', limit: 1, page: 1 });

    const resPage2 = await request(app)
      .get('/api/recommendations/ingredients')
      .query({ include: 'chicken', limit: 1, page: 2 });

    expect(resPage1.status).toBe(200);
    expect(resPage2.status).toBe(200);
    expect(resPage1.body.items[0].item).toBe('Chicken Salad');
    expect(resPage2.body.items[0].item).toBe('Grilled Chicken Bowl');
  });

});
