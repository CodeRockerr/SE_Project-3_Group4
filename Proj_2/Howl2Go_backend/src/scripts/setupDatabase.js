import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import FastFoodItem from '../models/FastFoodItem.js';
import MealCombination from '../models/MealCombination.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

/**
 * Comprehensive database setup script
 * 
 * This script orchestrates the complete database initialization:
 * 1. Import fast food nutrition data from CSV
 * 2. Optionally enrich items with LLM-generated ingredients
 * 3. Seed meal combination recommendations
 * 
 * Usage:
 *   npm run setup:database              # Full setup
 *   npm run setup:database -- --skip-enrich  # Skip LLM enrichment
 */

const SKIP_ENRICH = process.argv.includes('--skip-enrich');

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
        const item = {
          company: row.Company?.trim() || row.company?.trim(),
          item: row.Item?.trim() || row.item?.trim(),
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
          price: null
        };

        // Derive ingredients from item name
        if (item.item) {
          item.ingredients = deriveIngredients(item.item);
        } else {
          item.ingredients = [];
        }

        // Calculate price based on calories
        if (item.calories && item.calories > 0) {
          item.price = Math.min(Math.max(item.calories * 0.01, 2), 15);
        } else {
          item.price = 2;
        }

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

async function seedMealCombos() {
  console.log('\n🔗 Seeding meal combinations...');
  const seedPairs = [
    { main: "burger", comp: "fries", freq: 500 },
    { main: "burger", comp: "cola", freq: 420 },
    { main: "burger", comp: "milkshake", freq: 120 },
    { main: "pizza", comp: "cola", freq: 480 },
    { main: "pizza", comp: "bread", freq: 90 },
    { main: "chicken", comp: "fries", freq: 300 },
    { main: "salad", comp: "bread", freq: 70 },
    { main: "taco", comp: "soda", freq: 210 },
  ];

  const findItemByPartial = async (text) => {
    if (!text) return null;
    let item = await FastFoodItem.findOne({ item: new RegExp(`^${text}$`, "i") });
    if (item) return item;
    item = await FastFoodItem.findOne({ item: new RegExp(text, "i") });
    if (item) return item;
    item = await FastFoodItem.findOne({ company: new RegExp(text, "i") });
    return item;
  };

  const upsertCombo = async (mainItemId, complementaryItemId, freq) => {
    if (!mainItemId || !complementaryItemId) return null;
    const update = {
      $inc: { frequency: freq },
      $set: { updatedAt: new Date() },
    };

    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    const doc = await MealCombination.findOneAndUpdate(
      { mainItemId, complementaryItemId },
      update,
      options
    );

    if (doc) {
      doc.popularity = doc.frequency;
      await doc.save();
    }

    return doc;
  };

  for (const pair of seedPairs) {
    const main = await findItemByPartial(pair.main);
    const comp = await findItemByPartial(pair.comp);

    if (!main || !comp) {
      console.warn(`   ⚠️  Could not find match for pair: ${pair.main} -> ${pair.comp}`);
      continue;
    }

    await upsertCombo(main._id, comp._id, pair.freq);
    console.log(`   ✓ Seeded: ${main.item} -> ${comp.item}`);
  }
  console.log('✅ Meal combinations seeded!\n');
}

async function setupDatabase() {
  try {
    console.log('🚀 Starting comprehensive database setup...\n');
    console.log('='.repeat(60));
    
    // Connect to database
    console.log('\n📡 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Import fast food data
    console.log('📊 Step 1: Importing fast food nutrition data...');
    console.log('-'.repeat(60));
    
    console.log('Clearing existing fast food items...');
    await FastFoodItem.deleteMany({});

    let itemsToImport = [];
    const csvPath = path.join(__dirname, '../../data/fast-food/FastFoodNutritionMenuV3.csv');
    const csvPathAlt = path.join(process.cwd(), 'data/fast-food/FastFoodNutritionMenuV3.csv');
    const csvPathAlt2 = path.join(__dirname, '../../../data/fast-food/FastFoodNutritionMenuV3.csv');

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
      console.log('⚠️  CSV file not found. Skipping data import.');
      console.log('Note: To import full dataset, place FastFoodNutritionMenuV3.csv in data/fast-food/ directory');
      console.log('Run "npm run import:fastfood" separately after placing the CSV file.\n');
    }

    if (itemsToImport.length > 0) {
      console.log(`Importing ${itemsToImport.length} items...`);
      const result = await FastFoodItem.insertMany(itemsToImport, { ordered: false });
      console.log(`✅ Successfully imported ${result.length} fast food items`);

      // Get statistics
      const companies = await FastFoodItem.distinct('company');
      console.log(`\n📈 Statistics:`);
      console.log(`   Companies: ${companies.length}`);
      console.log(`   Total items: ${result.length}`);
      companies.forEach(company => {
        console.log(`   - ${company}`);
      });
    }

    // Step 2: Seed meal combinations
    console.log('\n' + '='.repeat(60));
    await seedMealCombos();

    // Step 3: Optional enrichment
    if (!SKIP_ENRICH) {
      console.log('='.repeat(60));
      console.log('\n🧠 Step 3: Ingredient enrichment (optional)');
      console.log('-'.repeat(60));
      console.log('💡 To enrich items with LLM-generated ingredients, run:');
      console.log('   npm run enrich:ingredients');
      console.log('   (Requires GROQ_API_KEY in .env file)\n');
    } else {
      console.log('⏩ Skipping ingredient enrichment (--skip-enrich flag set)');
    }

    console.log('='.repeat(60));
    console.log('\n✅ Database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Create an admin user: npm run create:admin <email>');
    console.log('   2. Start the server: npm run dev');
    console.log('   3. (Optional) Enrich ingredients: npm run enrich:ingredients\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
}

setupDatabase();
