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

  const attempt = async () => {
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
      // Lower max tokens to reduce TPM and 429s
      max_tokens: 140,
    });

    const content = response.choices[0].message.content.trim();
    
    // Try to extract JSON array from response
    const jsonMatch = content.match(/\[.*\]/s);
    if (jsonMatch) {
      const ingredients = JSON.parse(jsonMatch[0]);
      return Array.isArray(ingredients) ? ingredients : [];
    }
    
    return [];
  };

  // Simple retry with exponential backoff for rate limits
  const maxRetries = 4;
  let delayMs = 800;
  for (let attemptNum = 0; attemptNum <= maxRetries; attemptNum++) {
    try {
      return await attempt();
    } catch (error) {
      const msg = (error && error.message) || String(error);
      const is429 = msg.includes('rate limit') || msg.includes('rate_limit_exceeded');
      if (!is429 || attemptNum === maxRetries) {
        console.error(`Error extracting ingredients for "${itemName}":`, msg);
        return [];
      }
      // Backoff and retry
      const jitter = Math.floor(Math.random() * 300);
      await new Promise(r => setTimeout(r, delayMs + jitter));
      delayMs *= 2;
    }
  }
}

/**
 * Process items in batches to avoid rate limits
 */
async function processBatch(items, batchSize = 3) {
  const results = [];
  const sanitize = (arr) => {
    if (!Array.isArray(arr)) return [];
    const flat = arr.flat ? arr.flat(Infinity) : arr; // Node supports flat
    const cleaned = flat
      .filter((x) => typeof x === 'string')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && s !== 'none' && s !== 'n/a');
    return Array.from(new Set(cleaned)).slice(0, 40);
  };
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}...`);
    
    const batchResults = [];
    for (const item of batch) {
      const ingredients = await extractIngredients(item.item, item.company);
      batchResults.push({ itemId: item._id, ingredients: sanitize(ingredients) });
      // small per-item delay to smooth token usage
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    results.push(...batchResults);
    
    // Display results
    batchResults.forEach(result => {
      const item = items.find(i => i._id.toString() === result.itemId.toString());
      console.log(`  ✓ ${item.company}: ${item.item}`);
      console.log(`    Ingredients: ${result.ingredients.length ? result.ingredients.join(', ') : 'None'}`);
    });
    
    // Wait a bit between batches to respect rate limits
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 4000)); // 4 seconds between batches
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
    // Reduce batch size to lower concurrency and 429s
    const results = await processBatch(items, 3);
    
    // Update database
    console.log('\n💾 Updating database...');
    let updated = 0;
    
    for (const result of results) {
      const safeIngredients = Array.isArray(result.ingredients)
        ? result.ingredients.filter((s) => typeof s === 'string').map((s) => s.trim()).filter((s) => s.length > 0)
        : [];
      if (safeIngredients.length > 0) {
        await FastFoodItem.findByIdAndUpdate(result.itemId, {
          ingredients: safeIngredients
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
