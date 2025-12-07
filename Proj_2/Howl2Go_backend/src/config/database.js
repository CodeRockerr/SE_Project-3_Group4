import mongoose from 'mongoose';
import config from './env.js';

let inMemoryServer;

const seedDatabase = async () => {
  try {
    const FastFoodItem = (await import('../models/FastFoodItem.js')).default;
    
    const count = await FastFoodItem.countDocuments();
    if (count > 0) {
      console.log(`Database already seeded with ${count} items.`);
      return;
    }

    console.log('Seeding database with sample food items...');
    
    // Sample data
    const sampleFoodItems = [
      {
        company: "McDonald's",
        item: "Big Mac",
        calories: 540,
        caloriesFromFat: 250,
        totalFat: 28,
        saturatedFat: 10,
        transFat: 1,
        cholesterol: 80,
        sodium: 1040,
        carbs: 46,
        fiber: 3,
        sugars: 9,
        protein: 25,
        weightWatchersPoints: 490
      },
      {
        company: "McDonald's",
        item: "Quarter Pounder with Cheese",
        calories: 520,
        caloriesFromFat: 230,
        totalFat: 26,
        saturatedFat: 12,
        transFat: 1.5,
        cholesterol: 75,
        sodium: 1100,
        carbs: 42,
        fiber: 3,
        sugars: 10,
        protein: 24,
        weightWatchersPoints: 470
      },
      {
        company: "McDonald's",
        item: "Chicken McNuggets (6 piece)",
        calories: 280,
        caloriesFromFat: 150,
        totalFat: 17,
        saturatedFat: 3,
        transFat: 0,
        cholesterol: 40,
        sodium: 560,
        carbs: 15,
        fiber: 0,
        sugars: 0,
        protein: 18,
        weightWatchersPoints: 230
      },
      {
        company: "Burger King",
        item: "Whopper",
        calories: 660,
        caloriesFromFat: 390,
        totalFat: 43,
        saturatedFat: 13,
        transFat: 1.5,
        cholesterol: 90,
        sodium: 1080,
        carbs: 49,
        fiber: 3,
        sugars: 11,
        protein: 30,
        weightWatchersPoints: 600
      },
      {
        company: "Taco Bell",
        item: "Crunchwrap Supreme",
        calories: 540,
        caloriesFromFat: 280,
        totalFat: 31,
        saturatedFat: 11,
        transFat: 0,
        cholesterol: 45,
        sodium: 1160,
        carbs: 47,
        fiber: 3,
        sugars: 3,
        protein: 16,
        weightWatchersPoints: 490
      },
      {
        company: "KFC",
        item: "Crispy Chicken Breast",
        calories: 320,
        caloriesFromFat: 150,
        totalFat: 17,
        saturatedFat: 4,
        transFat: 0,
        cholesterol: 85,
        sodium: 750,
        carbs: 10,
        fiber: 0,
        sugars: 0,
        protein: 33,
        weightWatchersPoints: 280
      },
      {
        company: "Wendy's",
        item: "Dave's Single",
        calories: 570,
        caloriesFromFat: 300,
        totalFat: 33,
        saturatedFat: 14,
        transFat: 1.5,
        cholesterol: 75,
        sodium: 1200,
        carbs: 41,
        fiber: 3,
        sugars: 8,
        protein: 30,
        weightWatchersPoints: 510
      },
      {
        company: "Pizza Hut",
        item: "Personal Pan Pizza - Pepperoni",
        calories: 620,
        caloriesFromFat: 270,
        totalFat: 30,
        saturatedFat: 13,
        transFat: 0,
        cholesterol: 35,
        sodium: 1440,
        carbs: 66,
        fiber: 3,
        sugars: 8,
        protein: 22,
        weightWatchersPoints: 560
      }
    ];

    await FastFoodItem.insertMany(sampleFoodItems);
    console.log(`✅ Successfully seeded ${sampleFoodItems.length} food items`);
  } catch (error) {
    console.error('Error seeding database:', error.message);
  }
};

const connectDB = async () => {
  try {
    let uri = config.mongodbUri;
    const isInMemory = process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === 'true';

    // Use in-memory MongoDB when running tests or when explicitly requested
    if (isInMemory) {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      inMemoryServer = await MongoMemoryServer.create();
      uri = inMemoryServer.getUri();
      console.log('Using in-memory MongoDB for tests.');
    }

    const conn = await mongoose.connect(uri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Seed database if using in-memory DB
    if (isInMemory) {
      await seedDatabase();
    }
    
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
