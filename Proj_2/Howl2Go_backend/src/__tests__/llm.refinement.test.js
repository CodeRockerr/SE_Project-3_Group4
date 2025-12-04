import { describe, test, expect } from "@jest/globals";
import assert from "node:assert/strict";
import { llmService } from '../services/llm.service.js';

/**
 * Unit tests for conversational refinement in LLM service
 * Tests the ability to merge new prompts with previous criteria
 */

describe('LLM Service - Conversational Refinement', () => {
  describe('buildPrompt with previousCriteria', () => {
    test('should include context prefix when previousCriteria is provided', () => {
      const userPrompt = 'show me cheaper options';
      const previousCriteria = { protein: { min: 30 }, calories: { max: 500 } };

      const prompt = llmService.buildPrompt(userPrompt, previousCriteria);

      assert.ok(prompt.includes('This prompt is a refinement'));
      assert.ok(prompt.includes(JSON.stringify(previousCriteria)));
      assert.ok(prompt.includes('merge the previous criteria'));
    });

    test('should not include context prefix when previousCriteria is null', () => {
      const userPrompt = 'high protein under 500 calories';
      const prompt = llmService.buildPrompt(userPrompt, null);

      assert.ok(!prompt.includes('This prompt is a refinement'));
      assert.ok(!prompt.includes('merge the previous criteria'));
    });

    test('should include instructions for sort override on relative refinements', () => {
      const prompt = llmService.buildPrompt('show me cheaper options', null);

      assert.ok(prompt.includes('sort'));
      assert.ok(prompt.includes('price_asc'));
      assert.ok(prompt.includes('price_desc'));
    });

    test('should preserve original prompt content', () => {
      const userPrompt = 'high protein meal';
      const prompt = llmService.buildPrompt(userPrompt);

      assert.ok(prompt.includes(userPrompt));
    });

    test('should handle undefined previousCriteria same as null', () => {
      const userPrompt = 'test query';
      const prompt1 = llmService.buildPrompt(userPrompt, null);
      const prompt2 = llmService.buildPrompt(userPrompt, undefined);

      // Both should not contain refinement prefix
      assert.ok(!prompt1.includes('This prompt is a refinement'));
      assert.ok(!prompt2.includes('This prompt is a refinement'));
    });
  });

  describe('buildMongoQuery with sort field', () => {
    test('should ignore sort field in query (only used in controller)', () => {
      const criteria = {
        protein: { min: 30 },
        sort: 'price_asc'
      };

      const mongoQuery = llmService.buildMongoQuery(criteria);

      // Sort should not appear in MongoDB query (controller handles it)
      assert.strictEqual(mongoQuery.sort, undefined);
      assert.deepEqual(mongoQuery.protein, { $gte: 30 });
    });

    test('should build correct query with other criteria and sort override', () => {
      const criteria = {
        calories: { max: 500 },
        protein: { min: 25 },
        sort: 'price_asc'
      };

      const mongoQuery = llmService.buildMongoQuery(criteria);

      assert.deepEqual(mongoQuery.calories, { $lte: 500 });
      assert.deepEqual(mongoQuery.protein, { $gte: 25 });
      assert.strictEqual(mongoQuery.sort, undefined);
    });

    test('should preserve item name filter when present', () => {
      const criteria = {
        item: { name: 'burger' },
        sort: 'price_asc'
      };

      const mongoQuery = llmService.buildMongoQuery(criteria);

      assert.ok(mongoQuery.item.$regex === 'burger' || mongoQuery.item.includes('burger'));
      assert.strictEqual(mongoQuery.sort, undefined);
    });

    test('should handle range criteria with sort', () => {
      const criteria = {
        calories: { min: 300, max: 500 },
        protein: { min: 20 },
        sort: 'price_desc'
      };

      const mongoQuery = llmService.buildMongoQuery(criteria);

      assert.deepEqual(mongoQuery.calories, { $gte: 300, $lte: 500 });
      assert.deepEqual(mongoQuery.protein, { $gte: 20 });
      assert.strictEqual(mongoQuery.sort, undefined);
    });
  });

  describe('Refinement workflow scenario tests', () => {
    test('should build prompt with previous criteria for refinement', () => {
      // Scenario: User searched "high protein under 500 calories", now says "cheaper"
      const previousCriteria = {
        protein: { min: 30 },
        calories: { max: 500 }
      };

      const refinementPrompt = llmService.buildPrompt('cheaper', previousCriteria);

      // Should include refinement context
      assert.ok(refinementPrompt.includes('This prompt is a refinement'));
      assert.ok(refinementPrompt.includes(previousCriteria.protein.min));
      assert.ok(refinementPrompt.includes(previousCriteria.calories.max));
      assert.ok(refinementPrompt.includes('cheaper'));
      assert.ok(refinementPrompt.includes('sort'));
    });

    test('should build query from merged criteria', () => {
      // Simulate LLM returning merged criteria with sort override
      const mergedCriteria = {
        protein: { min: 30 }, // carried over from previous
        calories: { max: 500 }, // carried over from previous
        sort: 'price_asc' // added by LLM for "cheaper"
      };

      const mongoQuery = llmService.buildMongoQuery(mergedCriteria);

      // Query should have nutritional filters
      assert.ok(mongoQuery.protein);
      assert.ok(mongoQuery.calories);
      // But NOT the sort (that's handled by controller)
      assert.strictEqual(mongoQuery.sort, undefined);
    });

    test('should handle partial refinement (only update one criterion)', () => {
      const previousCriteria = {
        protein: { min: 30 },
        calories: { max: 500 },
        totalFat: { max: 20 }
      };

      // Refinement: "show me lower fat" -> updates only totalFat
      const refinedCriteria = {
        protein: { min: 30 },
        calories: { max: 500 },
        totalFat: { max: 10 }, // refined from 20 to 10
        sort: 'price_asc'
      };

      const mongoQuery = llmService.buildMongoQuery(refinedCriteria);

      assert.deepEqual(mongoQuery.protein, { $gte: 30 });
      assert.deepEqual(mongoQuery.calories, { $lte: 500 });
      assert.deepEqual(mongoQuery.totalFat, { $lte: 10 });
      assert.strictEqual(mongoQuery.sort, undefined);
    });
  });
});
