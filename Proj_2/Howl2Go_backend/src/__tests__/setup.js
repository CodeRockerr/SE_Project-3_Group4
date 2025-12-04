/**
 * Global setup for Jest tests
 * This file runs once before all test suites
 */

export default async function globalSetup() {
  // Set test environment variables if needed
  process.env.NODE_ENV = 'test';
  
  // Use a local test MongoDB URI if not already set
  // This allows tests to run without requiring a live database
  if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-howl2go';
  }
  
  // Use test session secret if not set
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'test-secret-key-for-jest';
  }

  // Use a test/dummy Groq API key if not set
  // Tests won't actually call the API due to mocking
  if (!process.env.GROQ_API_KEY) {
    process.env.GROQ_API_KEY = 'gsk_test_dummy_key_for_testing';
  }

  console.log('Global test setup complete');
}
