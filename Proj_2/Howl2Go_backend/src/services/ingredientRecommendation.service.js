import FastFoodItem from '../models/FastFoodItem.js';

/**
 * Build a MongoDB query for ingredient include/exclude logic.
 * @param {string[]} include - Ingredients that must all be present.
 * @param {string[]} exclude - Ingredients that must not be present.
 * @returns {object} MongoDB query
 */
export function buildIngredientQuery(include = [], exclude = []) {
  const clauses = [];
  
  if (include.length) {
    // Use case-insensitive partial matching for each included ingredient
    const includeRegexes = include.map(ing => new RegExp(ing, 'i'));
    clauses.push({
      $and: includeRegexes.map(regex => ({ ingredients: regex }))
    });
  }
  
  if (exclude.length) {
    // Use case-insensitive partial matching for excluded ingredients
    const excludeRegexes = exclude.map(ing => new RegExp(ing, 'i'));
    clauses.push({
      $and: excludeRegexes.map(regex => ({ ingredients: { $not: regex } }))
    });
  }
  
  if (!clauses.length) return {}; // no filtering
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

/**
 * Rank items by number of matched include ingredients (descending).
 * @param {Array} items - FastFoodItem docs
 * @param {string[]} include - Include list
 * @returns {Array} ranked items with score
 */
export function rankItems(items, include = []) {
  return items.map(doc => {
    const ing = (doc.ingredients || []).map(i => i.toLowerCase());
    const includeLower = include.map(i => i.toLowerCase());
    const score = includeLower.filter(i => ing.includes(i)).length;
    const itemObj = doc.toObject ? doc.toObject() : doc;
    return { 
      ...itemObj, 
      restaurant: itemObj.company || itemObj.restaurant, // Map company to restaurant
      matchScore: score 
    };
  }).sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    // Secondary: lower calories first if available
    return (a.calories || Infinity) - (b.calories || Infinity);
  });
}

/**
 * Fetch and rank ingredient recommendations.
 * @param {string[]} include
 * @param {string[]} exclude
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<{items:Array, total:number, page:number, limit:number}>}
 */
export async function getIngredientRecommendations({ include = [], exclude = [], page = 1, limit = 20 }) {
  const query = buildIngredientQuery(include, exclude);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    FastFoodItem.find(query).skip(skip).limit(limit),
    FastFoodItem.countDocuments(query)
  ]);
  const ranked = rankItems(items, include);
  return { items: ranked, total, page, limit };
}
