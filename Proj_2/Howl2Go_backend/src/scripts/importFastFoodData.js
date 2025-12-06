import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import FastFoodItem from '../models/FastFoodItem.js';
import connectDB from '../config/database.js';
import config from '../config/env.js';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Sample data if CSV is not found
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
    weightWatchersPoints: 490,
    price: 5.40
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
    weightWatchersPoints: 470,
    price: 5.20
  },
  {
    company: "McDonald's",
    item: "McChicken",
    calories: 400,
    caloriesFromFat: 180,
    totalFat: 20,
    saturatedFat: 4,
    transFat: 0,
    cholesterol: 45,
    sodium: 750,
    carbs: 39,
    fiber: 2,
    sugars: 4,
    protein: 14,
    weightWatchersPoints: 360,
    price: 4.00
  },
  {
    company: "Burger King",
    item: "Whopper",
    calories: 660,
    caloriesFromFat: 360,
    totalFat: 40,
    saturatedFat: 12,
    transFat: 1.5,
    cholesterol: 90,
    sodium: 980,
    carbs: 49,
    fiber: 2,
    sugars: 11,
    protein: 28,
    weightWatchersPoints: 640,
    price: 6.60
  },
  {
    company: "Burger King",
    item: "Chicken Fries",
    calories: 280,
    caloriesFromFat: 140,
    totalFat: 16,
    saturatedFat: 3,
    transFat: 0,
    cholesterol: 30,
    sodium: 780,
    carbs: 26,
    fiber: 1,
    sugars: 0,
    protein: 12,
    weightWatchersPoints: 250,
    price: 2.80
  },
  {
    company: "Wendy's",
    item: "Classic Single",
    calories: 470,
    caloriesFromFat: 220,
    totalFat: 24,
    saturatedFat: 9,
    transFat: 1,
    cholesterol: 70,
    sodium: 1020,
    carbs: 38,
    fiber: 2,
    sugars: 7,
    protein: 23,
    weightWatchersPoints: 430,
    price: 4.70
  },
  {
    company: "Wendy's",
    item: "Spicy Chicken Sandwich",
    calories: 450,
    caloriesFromFat: 180,
    totalFat: 20,
    saturatedFat: 4,
    transFat: 0,
    cholesterol: 50,
    sodium: 1380,
    carbs: 45,
    fiber: 2,
    sugars: 6,
    protein: 21,
    weightWatchersPoints: 410,
    price: 4.50
  },
  {
    company: "KFC",
    item: "Original Recipe Chicken Breast",
    calories: 320,
    caloriesFromFat: 180,
    totalFat: 20,
    saturatedFat: 5,
    transFat: 0,
    cholesterol: 85,
    sodium: 1110,
    carbs: 11,
    fiber: 0,
    sugars: 0,
    protein: 27,
    weightWatchersPoints: 290,
    price: 3.20
  },
  {
    company: "KFC",
    item: "Extra Crispy Tender",
    calories: 280,
    caloriesFromFat: 140,
    totalFat: 16,
    saturatedFat: 3.5,
    transFat: 0,
    cholesterol: 50,
    sodium: 800,
    carbs: 15,
    fiber: 0,
    sugars: 0,
    protein: 19,
    weightWatchersPoints: 250,
    price: 2.80
  },
  {
    company: "Taco Bell",
    item: "Crunchy Taco",
    calories: 170,
    caloriesFromFat: 90,
    totalFat: 10,
    saturatedFat: 3.5,
    transFat: 0,
    cholesterol: 25,
    sodium: 310,
    carbs: 13,
    fiber: 3,
    sugars: 1,
    protein: 8,
    weightWatchersPoints: 150,
    price: 1.70
  },
  {
    company: "Taco Bell",
    item: "Bean Burrito",
    calories: 380,
    caloriesFromFat: 130,
    totalFat: 14,
    saturatedFat: 6,
    transFat: 0,
    cholesterol: 25,
    sodium: 1080,
    carbs: 55,
    fiber: 12,
    sugars: 3,
    protein: 14,
    weightWatchersPoints: 340,
    price: 3.80
  },
  {
    company: "Taco Bell",
    item: "Chicken Quesadilla",
    calories: 510,
    caloriesFromFat: 250,
    totalFat: 28,
    saturatedFat: 12,
    transFat: 0,
    cholesterol: 75,
    sodium: 1320,
    carbs: 38,
    fiber: 2,
    sugars: 3,
    protein: 26,
    weightWatchersPoints: 460,
    price: 5.10
  }
];

// Basic tokenizer for deriving ingredient-like tokens from item names
function deriveIngredients(name) {
  if (!name) return [];
  const stopWords = new Set(['with','and','&','the','a','an','of','on','in','for']);
  return ([...new Set(
    name
      .toLowerCase()
      .replace(/®|™/g,'')
      .replace(/[^a-z0-9\s]/g,' ') // remove punctuation
      .split(/\s+/)
      .filter(t => t.length > 1 && !stopWords.has(t))
  )]).slice(0,15); // cap length
}

async function importFromCSV(csvPath) {
  return new Promise((resolve, reject) => {
    const items = [];
    
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        // Map CSV columns to schema fields
        const item = {
          company: row.Company?.trim() || row.company?.trim(),
          item: row.Item?.trim() || row.item?.trim(),
          ingredients: [],
          calories: parseFloat(row.Calories) || parseFloat(row.calories) || null,
          caloriesFromFat: parseFloat(row['Calories from Fat']) || parseFloat(row['Calories from Fat']) || parseFloat(row.caloriesFromFat) || null,
          totalFat: parseFloat(row['Total Fat (g)']) || parseFloat(row['Total Fat']) || parseFloat(row.totalFat) || null,
          saturatedFat: parseFloat(row['Saturated Fat (g)']) || parseFloat(row['Saturated Fat']) || parseFloat(row.saturatedFat) || null,
          transFat: parseFloat(row['Trans Fat (g)']) || parseFloat(row['Trans Fat']) || parseFloat(row.transFat) || null,
          cholesterol: parseFloat(row['Cholesterol (mg)']) || parseFloat(row.Cholesterol) || parseFloat(row.cholesterol) || null,
          sodium: parseFloat(row['Sodium (mg)']) || parseFloat(row.Sodium) || parseFloat(row.sodium) || null,
          carbs: parseFloat(row['Carbs (g)']) || parseFloat(row.Carbs) || parseFloat(row.carbs) || parseFloat(row['Total Carbohydrates (g)']) || null,
          fiber: parseFloat(row['Fiber (g)']) || parseFloat(row.Fiber) || parseFloat(row.fiber) || null,
          sugars: parseFloat(row['Sugars (g)']) || parseFloat(row.Sugars) || parseFloat(row.sugars) || null,
          protein: parseFloat(row['Protein (g)']) || parseFloat(row.Protein) || parseFloat(row.protein) || null,
          weightWatchersPoints: parseFloat(row['Weight Watchers Pnts']) || parseFloat(row['Weight Watchers Points']) || parseFloat(row.weightWatchersPoints) || null,
          price: null // Will be calculated based on calories
        };

        // Derive ingredients from item name (heuristic)
        if (item.item) {
          item.ingredients = deriveIngredients(item.item);
        }

        // Calculate price based on calories (if calories exist)
        if (item.calories && item.calories > 0) {
          item.price = Math.min(Math.max(item.calories * 0.01, 2), 15);
        } else {
          item.price = 2; // Default price
        }

        // Only add if company and item name exist
        if (item.company && item.item) {
          items.push(item);
        }
      })
      .on('end', () => {
        resolve(items);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

async function importData() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    console.log('Clearing existing fast food items...');
    await FastFoodItem.deleteMany({});

    let itemsToImport = [];
    const csvPath = path.join(__dirname, '../../data/fast-food/FastFoodNutritionMenuV3.csv');
    const csvPathAlt = path.join(process.cwd(), 'data/fast-food/FastFoodNutritionMenuV3.csv');
    const csvPathAlt2 = path.join(__dirname, '../../../data/fast-food/FastFoodNutritionMenuV3.csv');

    // Try to find CSV file
    let foundCsvPath = null;
    if (fs.existsSync(csvPath)) {
      foundCsvPath = csvPath;
    } else if (fs.existsSync(csvPathAlt)) {
      foundCsvPath = csvPathAlt;
    } else if (fs.existsSync(csvPathAlt2)) {
      foundCsvPath = csvPathAlt2;
    }

    if (foundCsvPath) {
      console.log(`Found CSV file at: ${foundCsvPath}`);
      console.log('Importing from CSV...');
      itemsToImport = await importFromCSV(foundCsvPath);
      console.log(`Parsed ${itemsToImport.length} items from CSV`);
    } else {
      console.log('CSV file not found. Using sample data instead.');
      console.log('Note: To import full dataset, place FastFoodNutritionMenuV3.csv in data/fast-food/ directory');
      itemsToImport = sampleFoodItems;
    }

    if (itemsToImport.length === 0) {
      console.log('No items to import.');
      await mongoose.connection.close();
      return;
    }

    console.log(`Importing ${itemsToImport.length} items...`);
    const result = await FastFoodItem.insertMany(itemsToImport, { ordered: false });

    console.log(`✅ Successfully imported ${result.length} fast food items`);

    // Get statistics
    const companies = await FastFoodItem.distinct('company');
    console.log(`\nCompanies in database: ${companies.length}`);
    companies.forEach(company => {
      console.log(`  - ${company}`);
    });

    // Show sample items
    const sampleItems = await FastFoodItem.find().limit(5);
    console.log('\nSample items:');
    sampleItems.forEach(item => {
      console.log(`  - ${item.company}: ${item.item}`);
      console.log(`    Ingredients: ${(item.ingredients || []).join(', ') || 'N/A'}`);
      console.log(`    Calories: ${item.calories || 'N/A'}, Protein: ${item.protein || 'N/A'}g, Carbs: ${item.carbs || 'N/A'}g`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing data:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the import
importData();

