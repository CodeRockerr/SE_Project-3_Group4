import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
} from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import FastFoodItem from "../models/FastFoodItem.js";
import MealCombination from "../models/MealCombination.js";
import connectDB from "../config/database.js";

let testItem1, testItem2, testItem3;

// Setup before tests
beforeAll(async () => {
  await connectDB();

  // SAFETY CHECK: Prevent running tests against production database
  const dbName = mongoose.connection.name;
  if (
    !dbName ||
    (!dbName.includes("test") && process.env.NODE_ENV !== "test")
  ) {
    throw new Error(
      `DANGER: Tests are trying to run against non-test database: "${dbName}". ` +
        `Database name must include "test" or NODE_ENV must be "test". ` +
        `Current NODE_ENV: "${process.env.NODE_ENV}"`
    );
  }

  console.log(`Running combo tests against database: ${dbName}`);

  // Clean up
  await FastFoodItem.deleteMany({});
  await MealCombination.deleteMany({});

  // Create test food items
  testItem1 = await FastFoodItem.create({
    restaurant: "McDonald's",
    item: "Big Mac",
    calories: 563,
    totalFat: 33,
    protein: 25,
    carbs: 45,
    sugar: 9,
    sodium: 1010,
    price: 5.99,
  });

  testItem2 = await FastFoodItem.create({
    restaurant: "McDonald's",
    item: "Medium Fries",
    calories: 340,
    totalFat: 16,
    protein: 4,
    carbs: 44,
    sugar: 0,
    sodium: 260,
    price: 2.49,
  });

  testItem3 = await FastFoodItem.create({
    restaurant: "McDonald's",
    item: "Coca-Cola",
    calories: 210,
    totalFat: 0,
    protein: 0,
    carbs: 58,
    sugar: 58,
    sodium: 70,
    price: 1.99,
  });

  // Create meal combinations
  await MealCombination.create({
    mainItemId: testItem1._id,
    complementaryItemId: testItem2._id,
    frequency: 25,
  });

  await MealCombination.create({
    mainItemId: testItem1._id,
    complementaryItemId: testItem3._id,
    frequency: 20,
  });
});

// Cleanup after tests
afterAll(async () => {
  await FastFoodItem.deleteMany({});
  await MealCombination.deleteMany({});
  await mongoose.connection.close();
});

describe("Combo Controller API Tests", () => {
  describe("GET /api/food/combo-suggestions - Get Combo Suggestions", () => {
    test("should return 400 if mainItemId is missing", async () => {
      const response = await request(app).get("/api/food/combo-suggestions");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("mainItemId is required");
    });

    test("should successfully return combo suggestions with default limit", async () => {
      const response = await request(app)
        .get("/api/food/combo-suggestions")
        .query({ mainItemId: testItem1._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty("count");
      expect(response.body).toHaveProperty("suggestions");
      expect(Array.isArray(response.body.suggestions)).toBe(true);
    });

    test("should use custom limit when provided", async () => {
      const response = await request(app)
        .get("/api/food/combo-suggestions")
        .query({
          mainItemId: testItem1._id.toString(),
          limit: "2",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.suggestions.length).toBeLessThanOrEqual(2);
    });

    test("should handle invalid mainItemId gracefully", async () => {
      const response = await request(app)
        .get("/api/food/combo-suggestions")
        .query({ mainItemId: "invalid-id-123" });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test("should return suggestions with correct structure", async () => {
      const response = await request(app)
        .get("/api/food/combo-suggestions")
        .query({ mainItemId: testItem1._id.toString() });

      expect(response.status).toBe(200);
      if (response.body.suggestions.length > 0) {
        const suggestion = response.body.suggestions[0];
        expect(suggestion).toHaveProperty("item");
        expect(suggestion).toHaveProperty("reason");
        expect(suggestion).toHaveProperty("frequency");
        expect(suggestion).toHaveProperty("popularity");
        expect(suggestion).toHaveProperty("popularityScore");
        expect(suggestion).toHaveProperty("nutritionalScore");
      }
    });

    test("should handle low_sugar nutritional focus", async () => {
      const response = await request(app)
        .get("/api/food/combo-suggestions")
        .query({
          mainItemId: testItem1._id.toString(),
          nutritional_focus: "low_sugar",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("should handle low_sodium nutritional focus", async () => {
      const response = await request(app)
        .get("/api/food/combo-suggestions")
        .query({
          mainItemId: testItem1._id.toString(),
          nutritional_focus: "low_sodium",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("should handle preferences as JSON string", async () => {
      const preferences = JSON.stringify({ lowSugar: true, lowSodium: false });
      const response = await request(app)
        .get("/api/food/combo-suggestions")
        .query({
          mainItemId: testItem1._id.toString(),
          preferences: preferences,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("should handle invalid JSON in preferences gracefully", async () => {
      const response = await request(app)
        .get("/api/food/combo-suggestions")
        .query({
          mainItemId: testItem1._id.toString(),
          preferences: "invalid-json{",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("should return empty suggestions for non-existent item", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get("/api/food/combo-suggestions")
        .query({ mainItemId: fakeId.toString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
      expect(response.body.suggestions).toEqual([]);
    });
  });
});
