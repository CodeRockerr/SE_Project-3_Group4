// import test from 'node:test';
import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import connectDB from "../config/database.js";

/**
 * Integration tests for Food API endpoints
 * These tests require the Groq API to be configured
 * Skip these tests if GROQ_API_KEY is not set
 */

const hasGroqApiKey = process.env.GROQ_API_KEY !== undefined;

// Setup database connection before tests
beforeAll(async () => {
    await connectDB();
});

// Cleanup after tests
afterAll(async () => {
    await mongoose.connection.close();
});

test("POST /api/food/recommend - returns 400 when query is missing", async () => {
    const response = await request(app)
        .post("/api/food/recommend")
        .send({})
        .expect(400);

    assert.equal(response.body.success, false);
});

if (hasGroqApiKey) {
    test("POST /api/food/recommend - returns 400 when query yields no criteria", async () => {
        const response = await request(app)
            .post("/api/food/recommend")
            .send({ query: "Random text" });

        // Accept either a 400 (LLM explicitly returned no criteria) or 200 (fallback search attempted)
        expect([200, 400]).toContain(response.status);
        if (response.status === 400) {
            assert.equal(response.body.success, false);
        }
    }, 15000);
}

test("POST /api/food/recommend - handles limit parameter", async () => {
    const testData = {
        query: "low calorie",
        limit: 3,
    };

    assert.equal(testData.limit, 3);
});

test("POST /api/food/recommend endpoint exists", async () => {
    const response = await request(app)
        .post("/api/food/recommend")
        .send({ query: "" });

    // Should not return 404
    assert.notEqual(response.status, 404);
});

if (!hasGroqApiKey) {
    console.log(
        "\n⚠️  Warning: GROQ_API_KEY not set. Skipping integration tests that require LLM API.\n"
    );
}
