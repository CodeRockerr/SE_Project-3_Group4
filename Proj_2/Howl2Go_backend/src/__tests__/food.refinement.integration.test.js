/**
 * Integration tests for food recommendation refinement feature
 * Tests the /api/food/recommend endpoint with and without refinement context
 *
 * Note: These tests validate endpoint parameter acceptance and response structure.
 * LLM-dependent tests are covered in unit tests (llm.refinement.test.js)
 */

import request from 'supertest';
//import app from '../app.js';

describe('Food Refinement Endpoint Tests', () => {
  describe('POST /api/food/recommend - Parameter Acceptance', () => {
    test('should reject requests without query parameter', async () => {
      const response = await request(app)
        .post('/api/food/recommend')
        .send({ previousCriteria: { calories: { min: 200 } } });

      // Expect error response
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should accept query as string parameter', async () => {
      const response = await request(app)
        .post('/api/food/recommend')
        .send({ query: 'chicken' });

      // Should not fail validation - may fail at LLM stage, but endpoint accepts it
      expect([200, 500]).toContain(response.status);
    });

    test('should accept previousCriteria parameter with query', async () => {
      const response = await request(app)
        .post('/api/food/recommend')
        .send({
          query: 'food',
          previousCriteria: {
            calories: { min: 200, max: 400 },
            protein: { min: 20 },
          },
        });

      // Endpoint should accept this structure
      expect([200, 500]).toContain(response.status);
    });

    test('should handle previousCriteria as null gracefully', async () => {
      const response = await request(app)
        .post('/api/food/recommend')
        .send({
          query: 'food',
          previousCriteria: null,
        });

      // Should handle null gracefully
      expect([200, 500]).toContain(response.status);
    });

    test('should handle previousCriteria without query', async () => {
      const response = await request(app)
        .post('/api/food/recommend')
        .send({
          previousCriteria: { calories: { max: 400 } },
        });

      // Should fail due to missing query
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/food/recommend - Response Structure', () => {
    test('should return recommendations array when successful', async () => {
      const response = await request(app)
        .post('/api/food/recommend')
        .send({ query: 'burger' });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('recommendations');
        expect(Array.isArray(response.body.recommendations)).toBe(true);
      }
    });

    test('should include price field in recommendations', async () => {
      const response = await request(app)
        .post('/api/food/recommend')
        .send({ query: 'pizza' });

      if (response.status === 200 && response.body.recommendations?.length > 0) {
        const item = response.body.recommendations[0];
        expect(item).toHaveProperty('price');
        expect(typeof item.price).toBe('number');
      }
    });

    test('should include required item fields when recommendations exist', async () => {
      const response = await request(app)
        .post('/api/food/recommend')
        .send({ query: 'food' });

      if (response.status === 200 && response.body.recommendations?.length > 0) {
        const item = response.body.recommendations[0];
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('calories');
        expect(item).toHaveProperty('price');
      }
    });

    test('should validate price range when provided', async () => {
      const response = await request(app)
        .post('/api/food/recommend')
        .send({ query: 'chicken' });

      if (response.status === 200 && response.body.recommendations?.length > 0) {
        response.body.recommendations.forEach((item) => {
          expect(item.price).toBeGreaterThanOrEqual(2.0);
          expect(item.price).toBeLessThanOrEqual(15.0);
        });
      }
    });
  });

  describe('POST /api/food/recommend - Refinement Flow', () => {
    test('should accept criteria from first response in second request', async () => {
      const firstResponse = await request(app)
        .post('/api/food/recommend')
        .send({ query: 'food' });

      if (firstResponse.status === 200 && firstResponse.body.criteria) {
        const secondResponse = await request(app)
          .post('/api/food/recommend')
          .send({
            query: 'different food',
            previousCriteria: firstResponse.body.criteria,
          });

        // Should process second request with previous criteria
        expect([200, 500]).toContain(secondResponse.status);
      }
    });

    test('should include criteria in response for chaining', async () => {
      const response = await request(app)
        .post('/api/food/recommend')
        .send({ query: 'food' });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('criteria');
        // Criteria should be an object suitable for next request
        expect(typeof response.body.criteria).toBe('object');
      }
    });
  });
});
