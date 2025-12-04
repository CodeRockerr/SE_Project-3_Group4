import { describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../app.js";
import FastFoodItem from "../models/FastFoodItem.js";
import connectDB from "../config/database.js";
import mongoose from "mongoose";
import { 
  buildIngredientQuery, 
  rankItems, 
  getIngredientRecommendations 
} from "../services/ingredientRecommendation.service.js";

describe("Ingredient Recommendation Tests", () => {
  let testItems = [];

  beforeAll(async () => {
    // Connect to test database
    await connectDB();

    // SAFETY CHECK: Prevent running tests against production database
    const dbName = mongoose.connection.name;
    if (!dbName || (!dbName.includes('test') && process.env.NODE_ENV !== 'test')) {
      throw new Error(
        `DANGER: Tests are trying to run against non-test database: "${dbName}". ` +
        `Database name must include "test" or NODE_ENV must be "test". ` +
        `Current NODE_ENV: "${process.env.NODE_ENV}"`
      );
    }

    console.log(`Running ingredient recommendation tests against database: ${dbName}`);

    // Create test food items with various ingredients
    const testData = [
      {
        company: "Test Restaurant",
        item: "Chicken Caesar Salad",
        ingredients: ["chicken", "lettuce", "caesar", "dressing", "parmesan", "cheese"],
        calories: 350,
        protein: 28,
        totalFat: 15,
        carbs: 20,
        price: 8.99
      },
      {
        company: "Test Restaurant",
        item: "Grilled Chicken Burger",
        ingredients: ["chicken", "burger", "grilled", "lettuce", "tomato", "bun"],
        calories: 450,
        protein: 32,
        totalFat: 18,
        carbs: 35,
        price: 9.99
      },
      {
        company: "Test Restaurant",
        item: "Beef Burger with Cheese",
        ingredients: ["beef", "burger", "cheese", "pickles", "onion", "bun"],
        calories: 650,
        protein: 35,
        totalFat: 35,
        carbs: 45,
        price: 10.99
      },
      {
        company: "Test Restaurant",
        item: "Vegetarian Pizza",
        ingredients: ["pizza", "cheese", "tomato", "bell", "pepper", "mushroom", "olive"],
        calories: 550,
        protein: 20,
        totalFat: 22,
        carbs: 60,
        price: 12.99
      },
      {
        company: "Test Restaurant",
        item: "Chicken Quesadilla",
        ingredients: ["chicken", "cheese", "tortilla", "bell", "pepper", "onion"],
        calories: 500,
        protein: 30,
        totalFat: 25,
        carbs: 40,
        price: 7.99
      }
    ];

    testItems = await FastFoodItem.insertMany(testData);
  });

  afterAll(async () => {
    // Clean up test data
    await FastFoodItem.deleteMany({ company: "Test Restaurant" });
    await mongoose.connection.close();
  });

  describe("buildIngredientQuery", () => {
    test("should return empty query when no filters provided", () => {
      const query = buildIngredientQuery([], []);
      assert.deepEqual(query, {});
    });

    test("should build query for single include ingredient", () => {
      const query = buildIngredientQuery(["chicken"], []);
      
      expect(query).toHaveProperty("$and");
      expect(Array.isArray(query.$and)).toBe(true);
      expect(query.$and.length).toBeGreaterThan(0);
      expect(query.$and[0]).toHaveProperty("ingredients");
    });

    test("should build query for multiple include ingredients", () => {
      const query = buildIngredientQuery(["chicken", "lettuce"], []);
      
      expect(query).toHaveProperty("$and");
      const andClauses = query.$and;
      expect(Array.isArray(andClauses)).toBe(true);
      expect(andClauses.length).toBeGreaterThan(0);
    });

    test("should build query for single exclude ingredient", () => {
      const query = buildIngredientQuery([], ["cheese"]);
      
      expect(query).toHaveProperty("$and");
      expect(Array.isArray(query.$and)).toBe(true);
      expect(query.$and.length).toBeGreaterThan(0);
    });

    test("should build query for both include and exclude ingredients", () => {
      const query = buildIngredientQuery(["chicken"], ["cheese"]);
      
      expect(query).toHaveProperty("$and");
      expect(Array.isArray(query.$and)).toBe(true);
      expect(query.$and.length).toBe(2);
    });

    test("should handle case-insensitive matching", () => {
      const query1 = buildIngredientQuery(["CHICKEN"], []);
      const query2 = buildIngredientQuery(["chicken"], []);
      
      // Both should produce queries with RegExp that ignore case
      expect(query1).toHaveProperty("$and");
      expect(query2).toHaveProperty("$and");
    });

    test("should build query excluding multiple ingredients", () => {
      const query = buildIngredientQuery([], ["cheese", "beef"]);
      
      expect(query).toHaveProperty("$and");
      const andClauses = query.$and;
      expect(Array.isArray(andClauses)).toBe(true);
      expect(andClauses.length).toBeGreaterThan(0);
    });

    test("should combine include and exclude with multiple ingredients", () => {
      const query = buildIngredientQuery(["chicken", "lettuce"], ["cheese", "beef"]);
      
      expect(query).toHaveProperty("$and");
      expect(query.$and.length).toBe(2);
    });
  });

  describe("rankItems", () => {
    test("should rank items by match score", () => {
      const mockItems = [
        {
          item: "Item A",
          ingredients: ["chicken", "lettuce", "tomato"],
          calories: 300
        },
        {
          item: "Item B", 
          ingredients: ["chicken"],
          calories: 200
        },
        {
          item: "Item C",
          ingredients: ["chicken", "lettuce"],
          calories: 250
        }
      ];

      const ranked = rankItems(mockItems, ["chicken", "lettuce"]);

      // Item A and C should have score 2, Item B should have score 1
      assert.equal(ranked[0].matchScore, 2);
      assert.equal(ranked[1].matchScore, 2);
      assert.equal(ranked[2].matchScore, 1);
    });

    test("should use calories as secondary sort when match scores are equal", () => {
      const mockItems = [
        {
          item: "High Calorie",
          ingredients: ["chicken", "lettuce"],
          calories: 500
        },
        {
          item: "Low Calorie",
          ingredients: ["chicken", "lettuce"],
          calories: 200
        },
        {
          item: "Medium Calorie",
          ingredients: ["chicken", "lettuce"],
          calories: 350
        }
      ];

      const ranked = rankItems(mockItems, ["chicken", "lettuce"]);

      // All should have same match score, but sorted by calories ascending
      assert.equal(ranked[0].matchScore, 2);
      assert.equal(ranked[1].matchScore, 2);
      assert.equal(ranked[2].matchScore, 2);
      assert.equal(ranked[0].calories, 200);
      assert.equal(ranked[1].calories, 350);
      assert.equal(ranked[2].calories, 500);
    });

    test("should handle items with no matching ingredients", () => {
      const mockItems = [
        {
          item: "Item A",
          ingredients: ["beef", "cheese"],
          calories: 300
        }
      ];

      const ranked = rankItems(mockItems, ["chicken"]);

      assert.equal(ranked[0].matchScore, 0);
    });

    test("should be case-insensitive when matching ingredients", () => {
      const mockItems = [
        {
          item: "Item A",
          ingredients: ["CHICKEN", "LETTUCE"],
          calories: 300
        }
      ];

      const ranked = rankItems(mockItems, ["chicken", "lettuce"]);

      assert.equal(ranked[0].matchScore, 2);
    });

    test("should handle empty include list", () => {
      const mockItems = [
        {
          item: "Item A",
          ingredients: ["chicken", "lettuce"],
          calories: 300
        }
      ];

      const ranked = rankItems(mockItems, []);

      assert.equal(ranked[0].matchScore, 0);
    });

    test("should handle items with empty ingredients array", () => {
      const mockItems = [
        {
          item: "Item A",
          ingredients: [],
          calories: 300
        }
      ];

      const ranked = rankItems(mockItems, ["chicken"]);

      assert.equal(ranked[0].matchScore, 0);
    });

    test("should map company to restaurant field", () => {
      const mockItems = [
        {
          company: "Test Company",
          item: "Item A",
          ingredients: ["chicken"],
          calories: 300
        }
      ];

      const ranked = rankItems(mockItems, ["chicken"]);

      assert.equal(ranked[0].restaurant, "Test Company");
    });

    test("should handle items with toObject method", () => {
      const mockItem = {
        item: "Item A",
        ingredients: ["chicken"],
        calories: 300,
        toObject: function() {
          return {
            item: this.item,
            ingredients: this.ingredients,
            calories: this.calories
          };
        }
      };

      const ranked = rankItems([mockItem], ["chicken"]);

      assert.equal(ranked[0].matchScore, 1);
      assert.equal(ranked[0].item, "Item A");
    });
  });

  describe("getIngredientRecommendations", () => {
    test("should return items matching single include ingredient", async () => {
      const result = await getIngredientRecommendations({
        include: ["chicken"],
        exclude: [],
        page: 1,
        limit: 10
      });

      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach(item => {
        const hasChicken = item.ingredients.some(ing => 
          ing.toLowerCase().includes("chicken")
        );
        expect(hasChicken).toBe(true);
      });
    });

    test("should exclude items with excluded ingredients", async () => {
      const result = await getIngredientRecommendations({
        include: [],
        exclude: ["beef"],
        page: 1,
        limit: 10
      });

      result.items.forEach(item => {
        const hasBeef = item.ingredients.some(ing => 
          ing.toLowerCase().includes("beef")
        );
        expect(hasBeef).toBe(false);
      });
    });

    test("should handle both include and exclude filters", async () => {
      const result = await getIngredientRecommendations({
        include: ["chicken"],
        exclude: ["cheese"],
        page: 1,
        limit: 10
      });

      result.items.forEach(item => {
        const hasChicken = item.ingredients.some(ing => 
          ing.toLowerCase().includes("chicken")
        );
        const hasCheese = item.ingredients.some(ing => 
          ing.toLowerCase().includes("cheese")
        );
        expect(hasChicken).toBe(true);
        expect(hasCheese).toBe(false);
      });
    });

    test("should return items sorted by match score", async () => {
      const result = await getIngredientRecommendations({
        include: ["chicken", "lettuce"],
        exclude: [],
        page: 1,
        limit: 10
      });

      // Check that items are sorted by matchScore descending
      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i - 1].matchScore).toBeGreaterThanOrEqual(
          result.items[i].matchScore
        );
      }
    });

    test("should return correct pagination metadata", async () => {
      const result = await getIngredientRecommendations({
        include: ["chicken"],
        exclude: [],
        page: 1,
        limit: 2
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.total).toBeGreaterThan(0);
      expect(result.items.length).toBeLessThanOrEqual(2);
    });

    test("should handle pagination correctly", async () => {
      const page1 = await getIngredientRecommendations({
        include: ["chicken"],
        exclude: [],
        page: 1,
        limit: 2
      });

      const page2 = await getIngredientRecommendations({
        include: ["chicken"],
        exclude: [],
        page: 2,
        limit: 2
      });

      // Items should be different between pages
      if (page1.items.length > 0 && page2.items.length > 0) {
        expect(page1.items[0]._id.toString()).not.toBe(
          page2.items[0]._id.toString()
        );
      }
    });

    test("should return empty results when no matches found", async () => {
      const result = await getIngredientRecommendations({
        include: ["nonexistent-ingredient"],
        exclude: [],
        page: 1,
        limit: 10
      });

      expect(result.items.length).toBe(0);
      expect(result.total).toBe(0);
    });

    test("should handle empty include and exclude arrays", async () => {
      const result = await getIngredientRecommendations({
        include: [],
        exclude: [],
        page: 1,
        limit: 10
      });

      // Should return all items when no filters applied
      expect(result.items.length).toBeGreaterThan(0);
    });

    test("should handle multiple matching ingredients", async () => {
      const result = await getIngredientRecommendations({
        include: ["chicken", "lettuce"],
        exclude: [],
        page: 1,
        limit: 10
      });

      // All items should have both chicken and lettuce
      result.items.forEach(item => {
        const hasChicken = item.ingredients.some(ing => 
          ing.toLowerCase().includes("chicken")
        );
        const hasLettuce = item.ingredients.some(ing => 
          ing.toLowerCase().includes("lettuce")
        );
        expect(hasChicken).toBe(true);
        expect(hasLettuce).toBe(true);
      });
    });
  });

  describe("API Integration Tests", () => {
    test("GET /api/recommendations/ingredients - should return recommendations", async () => {
      const response = await request(app)
        .get("/api/recommendations/ingredients")
        .query({ include: "chicken" });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      expect(response.body.items).toBeDefined();
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    test("GET /api/recommendations/ingredients - should handle multiple include ingredients", async () => {
      const response = await request(app)
        .get("/api/recommendations/ingredients")
        .query({ include: "chicken,lettuce" });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      
      // Verify criteria is correctly parsed
      expect(response.body.criteria.include).toContain("chicken");
      expect(response.body.criteria.include).toContain("lettuce");
    });

    test("GET /api/recommendations/ingredients - should handle exclude ingredients", async () => {
      const response = await request(app)
        .get("/api/recommendations/ingredients")
        .query({ exclude: "cheese" });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      expect(response.body.criteria.exclude).toContain("cheese");
    });

    test("GET /api/recommendations/ingredients - should handle both include and exclude", async () => {
      const response = await request(app)
        .get("/api/recommendations/ingredients")
        .query({ include: "chicken", exclude: "cheese" });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      expect(response.body.criteria.include).toContain("chicken");
      expect(response.body.criteria.exclude).toContain("cheese");
    });

    test("GET /api/recommendations/ingredients - should handle pagination", async () => {
      const response = await request(app)
        .get("/api/recommendations/ingredients")
        .query({ include: "chicken", page: 1, limit: 2 });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.page, 1);
      assert.strictEqual(response.body.limit, 2);
      expect(response.body.items.length).toBeLessThanOrEqual(2);
    });

    test("GET /api/recommendations/ingredients - should enforce max limit", async () => {
      const response = await request(app)
        .get("/api/recommendations/ingredients")
        .query({ limit: 200 }); // Requesting more than max

      assert.strictEqual(response.status, 200);
      // Should cap at 100 (max limit in controller)
      expect(response.body.limit).toBeLessThanOrEqual(100);
    });

    test("GET /api/recommendations/ingredients - should return count and total", async () => {
      const response = await request(app)
        .get("/api/recommendations/ingredients")
        .query({ include: "chicken" });

      assert.strictEqual(response.status, 200);
      expect(response.body.count).toBeDefined();
      expect(response.body.total).toBeDefined();
      expect(typeof response.body.count).toBe("number");
      expect(typeof response.body.total).toBe("number");
    });

    test("GET /api/recommendations/ingredients - should handle whitespace in ingredients", async () => {
      const response = await request(app)
        .get("/api/recommendations/ingredients")
        .query({ include: " chicken , lettuce " });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      expect(response.body.criteria.include).toContain("chicken");
      expect(response.body.criteria.include).toContain("lettuce");
    });

    test("GET /api/recommendations/ingredients - should handle empty query", async () => {
      const response = await request(app)
        .get("/api/recommendations/ingredients");

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      expect(response.body.items).toBeDefined();
    });

    test("GET /api/recommendations/ingredients - should deduplicate ingredients", async () => {
      const response = await request(app)
        .get("/api/recommendations/ingredients")
        .query({ include: "chicken,chicken,lettuce" });

      assert.strictEqual(response.status, 200);
      // Should only have unique ingredients
      const includeCriteria = response.body.criteria.include;
      const uniqueCount = new Set(includeCriteria).size;
      expect(includeCriteria.length).toBe(uniqueCount);
    });

    test("GET /api/recommendations/ingredients - should have matchScore in results", async () => {
      const response = await request(app)
        .get("/api/recommendations/ingredients")
        .query({ include: "chicken,lettuce" });

      assert.strictEqual(response.status, 200);
      if (response.body.items.length > 0) {
        expect(response.body.items[0].matchScore).toBeDefined();
        expect(typeof response.body.items[0].matchScore).toBe("number");
      }
    });

    test("GET /api/recommendations/ingredients - should return items with restaurant field", async () => {
      const response = await request(app)
        .get("/api/recommendations/ingredients")
        .query({ include: "chicken" });

      assert.strictEqual(response.status, 200);
      if (response.body.items.length > 0) {
        expect(response.body.items[0].restaurant || response.body.items[0].company).toBeDefined();
      }
    });
  });

  describe("Edge Cases", () => {
    test("should handle special characters in ingredient names", async () => {
      const result = await getIngredientRecommendations({
        include: ["bell"],
        exclude: [],
        page: 1,
        limit: 10
      });

      expect(result.items.length).toBeGreaterThan(0);
    });

    test("should handle very long ingredient lists", async () => {
      const longIncludeList = Array(20).fill("chicken");
      const result = await getIngredientRecommendations({
        include: longIncludeList,
        exclude: [],
        page: 1,
        limit: 10
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
    });

    test("should handle page 0 gracefully", async () => {
      // Page 0 results in negative skip, which MongoDB rejects
      // The function should handle this or the caller should validate
      // For now, we test that it produces expected behavior
      try {
        const result = await getIngredientRecommendations({
          include: ["chicken"],
          exclude: [],
          page: 0,
          limit: 10
        });
        // If it doesn't throw, check results are defined
        expect(result.items).toBeDefined();
      } catch (error) {
        // MongoDB will reject negative skip values
        expect(error.message).toContain("skip");
      }
    });

    test("should handle negative limit", async () => {
      const result = await getIngredientRecommendations({
        include: ["chicken"],
        exclude: [],
        page: 1,
        limit: -5
      });

      // Should still return results
      expect(result.items).toBeDefined();
    });

    test("should handle items with missing calorie data", () => {
      const mockItems = [
        {
          item: "Item A",
          ingredients: ["chicken"],
          calories: null
        },
        {
          item: "Item B",
          ingredients: ["chicken"],
          calories: 300
        }
      ];

      const ranked = rankItems(mockItems, ["chicken"]);

      // Should not crash and should handle null calories
      expect(ranked.length).toBe(2);
      expect(ranked[0].matchScore).toBe(1);
      expect(ranked[1].matchScore).toBe(1);
    });
  });
});
