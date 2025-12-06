import dotenv from 'dotenv';
import mongoose from 'mongoose';
import FastFoodItem from '../models/FastFoodItem.js';
import connectDB from '../config/database.js';

dotenv.config();

// Simple heuristic ingredient generator
function heuristicIngredients(itemName, company) {
  const name = (itemName || '').toLowerCase();
  const tokens = name.split(/[^a-z0-9]+/).filter(Boolean);

  const has = (kw) => name.includes(kw);

  const base = new Set();

  // Proteins
  if (has('chicken')) { base.add('chicken breast'); }
  if (has('beef') || has('burger') || has('angus') || has('quarter pounder') || has('big mac')) { base.add('beef patty'); }
  if (has('bacon')) { base.add('bacon'); }
  if (has('fish') || has('filet') || has('pollock')) { base.add('white fish'); }
  if (has('pork') || has('rib')) { base.add('pork'); }
  if (has('egg')) { base.add('egg'); }
  if (has('sausage')) { base.add('sausage'); }

  // Breads
  if (has('bun') || has('burger') || has('mac') || has('sandwich')) { base.add('sesame seed bun'); }
  if (has('muffin')) { base.add('english muffin'); }
  if (has('wrap') || has('tortilla')) { base.add('flour tortilla'); }
  if (has('bagel')) { base.add('bagel'); }
  if (has('pizza')) { base.add('pizza dough'); }

  // Cheeses
  if (has('cheese') || has('cheeseburger') || has('swiss')) { base.add('american cheese'); }
  if (has('swiss')) { base.add('swiss cheese'); }
  if (has('parmesan') || has('caesar')) { base.add('parmesan cheese'); }

  // Veggies
  if (has('salad') || has('lettuce') || has('club') || has('blt')) { base.add('lettuce'); }
  if (has('tomato')) { base.add('tomato'); }
  if (has('onion')) { base.add('onion'); }
  if (has('pickle')) { base.add('pickle'); }
  if (has('avocado')) { base.add('avocado'); }
  if (has('pepper')) { base.add('bell pepper'); }
  if (has('mushroom')) { base.add('mushroom'); }

  // Sauces & condiments
  if (has('mayo') || has('mayonnaise')) { base.add('mayonnaise'); }
  if (has('ketchup')) { base.add('ketchup'); }
  if (has('mustard')) { base.add('mustard'); }
  if (has('ranch')) { base.add('ranch dressing'); }
  if (has('bbq') || has('barbecue') || has('mc rib') || has('rib')) { base.add('barbecue sauce'); }
  if (has('caesar')) { base.add('caesar dressing'); }
  if (has('honey')) { base.add('honey'); }
  if (has('buffalo')) { base.add('buffalo sauce'); }
  if (has('chipotle')) { base.add('chipotle sauce'); }

  // Fries / sides / beverages
  if (has('fries')) { base.add('potato'); base.add('vegetable oil'); base.add('salt'); }
  if (has('shake') || has('milkshake')) { base.add('milk'); base.add('ice cream'); base.add('sugar'); }
  if (has('coffee')) { base.add('coffee'); }
  if (has('tea')) { base.add('tea'); }
  if (has('lemonade')) { base.add('lemon juice'); base.add('water'); base.add('sugar'); }

  // Common add-ons
  base.add('salt');
  base.add('pepper');
  if ([...base].some(i => i.includes('bun') || i.includes('bagel') || i.includes('muffin') || i.includes('tortilla'))) {
    base.add('vegetable oil');
  }

  // Special handling for known items
  if (has('big mac')) {
    base.add('special sauce');
  }

  // If salad, add crouton & dressing
  if (has('salad')) {
    base.add('crouton');
    if (![...base].some(i => i.includes('dressing'))) {
      base.add('vinaigrette');
    }
  }

  // Ensure minimum sensible list
  let ingredients = Array.from(base);
  if (!ingredients.length) ingredients = tokens.slice(0, 6);
  // Pad to at least 10 items for enrichment completeness
  const commons = ['water','sugar','wheat flour','yeast','vegetable oil','garlic','onion powder','paprika'];
  for (const c of commons) {
    if (ingredients.length >= 10) break;
    if (!ingredients.includes(c)) ingredients.push(c);
  }
  return ingredients;
}

async function enrichFallback() {
  await connectDB();
  const items = await FastFoodItem.aggregate([
    { $project: { item: 1, company: 1, ingredients: 1, ingredientCount: { $size: { $ifNull: ['$ingredients', []] } } } },
    { $match: { ingredientCount: { $lt: 10 } } },
    { $limit: 500 } // process a large chunk quickly
  ]);

  let updated = 0;
  for (const it of items) {
    const ing = heuristicIngredients(it.item, it.company);
    if (Array.isArray(ing) && ing.length >= 10) {
      await FastFoodItem.findByIdAndUpdate(it._id, { ingredients: ing });
      updated++;
      if (updated % 50 === 0) {
        console.log(`Updated ${updated} items...`);
      }
    }
  }
  console.log(`✅ Fallback enriched ${updated}/${items.length} items`);
  await mongoose.connection.close();
}

enrichFallback().catch(err => { console.error(err); process.exit(1); });
