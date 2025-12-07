/**
 * Global Jest test setup
 * Executes once before all test suites run
 * Configures environment variables for isolated test execution
 */

export default async function globalSetup() {
  // Set test environment to trigger test-specific behavior in app
  process.env.NODE_ENV = 'test';
  
  // Configure MongoDB URI for test database
  // Tests can use this for integration testing
  if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-howl2go';
  }
  
  // Set session secret for test environment
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'test-secret-key-for-jest';
  }

  // Set dummy Groq API key for test environment
  // Actual API calls are mocked in tests, this just prevents initialization errors
  if (!process.env.GROQ_API_KEY) {
    process.env.GROQ_API_KEY = 'gsk_test_dummy_key_for_testing';
  }

  console.log('Global test setup complete - test environment configured');
}
