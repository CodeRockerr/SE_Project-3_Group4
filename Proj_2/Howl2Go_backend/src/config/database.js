import mongoose from 'mongoose';
import config from './env.js';

let inMemoryServer;

const connectDB = async () => {
  try {
    let uri = config.mongodbUri;

    // Use in-memory MongoDB when running tests or when explicitly requested
    if (process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === 'true') {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      inMemoryServer = await MongoMemoryServer.create();
      uri = inMemoryServer.getUri();
      console.log('Using in-memory MongoDB for tests.');
    }

    const conn = await mongoose.connect(uri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    // During tests, throw to let test harness handle the failure instead of exiting
    if (process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === 'true') {
      throw error;
    }
    process.exit(1);
  }
};

export default connectDB;
