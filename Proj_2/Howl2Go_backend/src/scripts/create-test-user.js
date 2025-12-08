import mongoose from 'mongoose';
import User from '../models/User.js';
import config from '../config/env.js';

async function createTestUser() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'test@test.com' });
    if (existingUser) {
      console.log('User test@test.com already exists!');
      process.exit(0);
    }

    // Create new user
    const newUser = await User.create({
      name: 'Test User',
      email: 'test@test.com',
      password: 'test1234',
      role: 'user'
    });

    console.log('✅ Test user created successfully!');
    console.log('Email: test@test.com');
    console.log('Password: test1234');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestUser();
