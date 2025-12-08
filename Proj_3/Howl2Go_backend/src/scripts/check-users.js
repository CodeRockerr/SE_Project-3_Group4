import mongoose from 'mongoose';
import User from '../models/User.js';
import config from '../config/env.js';

async function checkUsers() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Connected to MongoDB');

    const users = await User.find({}).select('email name role isActive');
    console.log('\nUsers in database:');
    if (users.length === 0) {
      console.log('No users found!');
    } else {
      users.forEach(user => {
        console.log(`- ${user.email} (${user.name}) - Role: ${user.role}, Active: ${user.isActive}`);
      });
    }

    // Check if a specific user has a password hash
    const testUser = await User.findOne({ email: 'test@test.com' }).select('+password');
    if (testUser) {
      console.log('\nTest user found:');
      console.log(`- Email: ${testUser.email}`);
      console.log(`- Has password hash: ${!!testUser.password}`);
      console.log(`- Password hash length: ${testUser.password?.length || 0}`);
    } else {
      console.log('\ntest@test.com not found in database');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();
