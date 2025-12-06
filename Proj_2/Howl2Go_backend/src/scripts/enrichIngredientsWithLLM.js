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

  // Retry logic for rate limits
  for (let attempt = 1; attempt <= 3; attempt++) {
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
      if (error.status === 429 && attempt < 3) {
        // Rate limit hit - wait exponentially longer
        const waitTime = attempt * 30000; // 30s, 60s
        console.log(`⏳ Rate limit hit for "${itemName}", waiting ${waitTime/1000}s (attempt ${attempt}/3)...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error(`❌ Error extracting ingredients for "${itemName}":`, error.message);
        return [];
      }
    }
  }
  
  return [];
}

/**
 * Process items sequentially with delays to avoid rate limits
 */
async function processBatch(items) {
  const results = [];
  const total = items.length;
  
  console.log(`\n📦 Processing ${total} items sequentially (~4s delay between each)...`);
  
  for (let i = 0; i < total; i++) {
    const item = items[i];
    console.log(`\n[${i + 1}/${total}] ${item.company}: ${item.item}`);
    
    const ingredients = await extractIngredients(item.item, item.company);
    results.push({ itemId: item._id, ingredients });
    
    if (ingredients.length > 0) {
      console.log(`  ✓ Found ${ingredients.length} ingredients: ${ingredients.slice(0, 5).join(', ')}${ingredients.length > 5 ? '...' : ''}`);
    } else {
      console.log(`  ⚠️  No ingredients found`);
    }
    
    // Wait ~4 seconds between each item to stay under rate limits
    if (i < total - 1) {
      await new Promise(resolve => setTimeout(resolve, 4000));
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
    
    // Get items that need ingredient enrichment (any with <10 ingredients)
    const items = await FastFoodItem.aggregate([
      {
        $project: {
          item: 1,
          company: 1,
          ingredients: 1,
          ingredientCount: { $size: { $ifNull: ['$ingredients', []] } }
        }
      },
      {
        $match: { ingredientCount: { $lt: 10 } }
      },
      { $limit: 25 } // Process 25 at a time for slightly higher throughput
    ]);
    
    if (items.length === 0) {
      console.log('\n✅ All items already have ingredients!');
      await mongoose.connection.close();
      return;
    }
    
    console.log(`\n📋 Found ${items.length} items to enrich with LLM-generated ingredients\n`);
    
    // Process sequentially with delays
    const results = await processBatch(items);
    
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
