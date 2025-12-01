/**
 * Script to create an admin user or update existing user to admin
 * 
 * Usage:
 *   node src/scripts/createAdmin.js <email> [password]
 * 
 * Examples:
 *   node src/scripts/createAdmin.js admin@example.com
 *   node src/scripts/createAdmin.js admin@example.com mypassword123
 * 
 * If user exists, it will update their role to admin
 * If user doesn't exist, it will create a new admin user
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ Error: MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get email from command line arguments
    const email = process.argv[2];
    if (!email) {
      console.error('❌ Error: Email is required');
      console.log('\nUsage: node src/scripts/createAdmin.js <email> [password]');
      console.log('Example: node src/scripts/createAdmin.js admin@example.com');
      process.exit(1);
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      // User exists - update to admin
      if (existingUser.role === 'admin') {
        console.log(`✅ User ${email} is already an admin`);
        await mongoose.disconnect();
        process.exit(0);
      }

      existingUser.role = 'admin';
      await existingUser.save();
      console.log(`✅ Updated user ${email} to admin role`);
    } else {
      // User doesn't exist - create new admin
      let password = process.argv[3];
      
      if (!password) {
        // Prompt for password if not provided
        password = await question('Enter password for new admin user (min 8 characters): ');
        
        if (password.length < 8) {
          console.error('❌ Error: Password must be at least 8 characters long');
          await mongoose.disconnect();
          process.exit(1);
        }
      }

      const name = await question('Enter name for admin user: ') || 'Admin User';

      const newAdmin = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        role: 'admin'
      });

      console.log(`✅ Created new admin user:`);
      console.log(`   Email: ${newAdmin.email}`);
      console.log(`   Name: ${newAdmin.name}`);
      console.log(`   Role: ${newAdmin.role}`);
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('   User with this email already exists');
    }
    await mongoose.disconnect().catch(() => {});
    rl.close();
    process.exit(1);
  }
}

createAdmin();

