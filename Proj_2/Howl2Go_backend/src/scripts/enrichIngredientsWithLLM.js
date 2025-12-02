import Groq from "groq-sdk/index.mjs";
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import FastFoodItem from '../models/FastFoodItem.js';
import connectDB from '../config/database.js';
import { config } from '../config/env.js';

dotenv.config();

const groq = new Groq({ apiKey: config.groq.apiKey });

/**
 * Extract ingredients from food item name using Groq LLM
 */
async function extractIngredients(itemName, company) {
  const prompt = `You are a food ingredient expert. Based on the food item name and restaurant, list the actual ingredients that would be used to make this item.

Item: "${itemName}"
Restaurant: "${company}"

Return ONLY a JSON array of actual ingredient names (lowercase). List the real food components like proteins, vegetables, dairy, condiments, bread, spices, etc. Think about what's actually IN the food, not what the name says.

Examples:
- "10 Piece Chicken Nuggets" → ["chicken", "flour", "breadcrumbs", "salt", "pepper", "vegetable oil"]
- "Big Mac" → ["beef patty", "lettuce", "american cheese", "pickle", "onion", "sesame seed bun", "special sauce", "mayo", "mustard"]
- "French Fries" → ["potato", "vegetable oil", "salt"]
- "Caesar Salad" → ["romaine lettuce", "parmesan cheese", "crouton", "caesar dressing", "anchovy", "garlic", "lemon juice"]
- "Cheeseburger" → ["beef patty", "american cheese", "bun", "ketchup", "mustard", "pickle", "onion"]
- "Grilled Chicken Sandwich" → ["grilled chicken breast", "bun", "lettuce", "tomato", "mayo"]
- "Vanilla Milkshake" → ["milk", "vanilla ice cream", "sugar", "vanilla extract"]

Focus on common fast food ingredients. Return only the JSON array, no other text.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are a food ingredient extraction expert. Always return valid JSON arrays only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const content = response.choices[0].message.content.trim();
    
    // Try to extract JSON array from response
    const jsonMatch = content.match(/\[.*\]/s);
    if (jsonMatch) {
      const ingredients = JSON.parse(jsonMatch[0]);
      return Array.isArray(ingredients) ? ingredients : [];
    }
    
    return [];
  } catch (error) {
    console.error(`Error extracting ingredients for "${itemName}":`, error.message);
    return [];
  }
}

/**
 * Process items in batches to avoid rate limits
 */
async function processBatch(items, batchSize = 3) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}...`);
    
    const batchPromises = batch.map(async (item) => {
      const ingredients = await extractIngredients(item.item, item.company);
      return { itemId: item._id, ingredients };
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Display results
    batchResults.forEach(result => {
      const item = items.find(i => i._id.toString() === result.itemId.toString());
      console.log(`  ✓ ${item.company}: ${item.item}`);
      console.log(`    Ingredients: ${result.ingredients.join(', ') || 'None'}`);
    });
    
    // Wait a bit between batches to respect rate limits
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5 seconds between batches
    }
  }
  
  return results;
}

/**
 * Main enrichment function
 */
async function enrichIngredients() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await connectDB();
    
    // Get items that need ingredient enrichment (empty or auto-generated ingredients)
    const items = await FastFoodItem.find({
      $or: [
        { ingredients: { $exists: false } },
        { ingredients: { $size: 0 } },
        { ingredients: { $size: 1 } }, // Single-word auto-generated ones
        { ingredients: { $size: 2 } }, // Two-word auto-generated ones
        { ingredients: { $size: 3 } }  // Three-word auto-generated ones
      ]
    }).limit(50); // Process 50 at a time
    
    if (items.length === 0) {
      console.log('\n✅ All items already have ingredients!');
      await mongoose.connection.close();
      return;
    }
    
    console.log(`\n📋 Found ${items.length} items to enrich with LLM-generated ingredients\n`);
    
    // Process in batches
    const results = await processBatch(items, 5);
    
    // Update database
    console.log('\n💾 Updating database...');
    let updated = 0;
    
    for (const result of results) {
      if (result.ingredients.length > 0) {
        await FastFoodItem.findByIdAndUpdate(result.itemId, {
          ingredients: result.ingredients
        });
        updated++;
      }
    }
    
    console.log(`\n✅ Successfully enriched ${updated}/${items.length} items with ingredients!`);
    
    // Show some examples
    const samples = await FastFoodItem.find({ 
      ingredients: { $exists: true, $ne: [] } 
    }).limit(5);
    
    console.log('\n📊 Sample enriched items:');
    samples.forEach(item => {
      console.log(`\n  ${item.company}: ${item.item}`);
      console.log(`  Ingredients: ${item.ingredients.join(', ')}`);
    });
    
    await mongoose.connection.close();
    console.log('\n🎉 Enrichment completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during enrichment:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  enrichIngredients();
}

export { extractIngredients, enrichIngredients };
