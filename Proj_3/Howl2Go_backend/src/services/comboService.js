import MealCombination from "../models/MealCombination.js";
import FastFoodItem from "../models/FastFoodItem.js";
import { nutritionCompatibility } from "../utils/nutritionUtils.js";

/**
 * Get combo suggestions for a given main item.
 * Strategy (MVP):
 *  - Return top complementary items from MealCombination sorted by popularity
 *  - If none found, fallback to returning up to `limit` items from same company
 */
export const getComboSuggestions = async (
  mainItemId,
  { limit = 5, preferences = null } = {}
) => {
  // 1. try to find precomputed combos
  const combos = await MealCombination.find({ mainItemId })
    .sort({ popularity: -1 })
    .limit(limit)
    .populate("complementaryItemId")
    .lean();

  // parse simple preferences into options for the heuristic
  const options = {
    lowSugar: !!(preferences && preferences.lowSugar),
    lowSodium: !!(preferences && preferences.lowSodium),
  };
  // load main item once (used for nutrition comparisons)
  const mainItem = await FastFoodItem.findById(mainItemId).lean();

  if (combos && combos.length > 0) {
    // compute nutritionalScore for each and add a normalized popularity score
    return combos.map((c) => {
      const item = c.complementaryItemId;
      const nutritionalScore = nutritionCompatibility(
        mainItem || {},
        item,
        options
      );
      const popularity = toPopularityNorm(c.popularity);
      return {
        item,
        reason: "popular_together",
        frequency: c.frequency,
        popularity: c.popularity,
        popularityScore: popularity,
        nutritionalScore,
      };
    });
  }

  // 2. fallback: find items from same company as main item
  if (!mainItem) return [];
  const fallback = await FastFoodItem.find({
    company: mainItem.company,
    _id: { $ne: mainItem._id },
  })
    .limit(limit)
    .lean();

  return fallback.map((item) => ({
    item,
    reason: "same_company_fallback",
    nutritionalScore: nutritionCompatibility(mainItem, item, options),
    popularityScore: 0,
  }));
};

export default { getComboSuggestions };

function toPopularityNorm(pop) {
  if (!pop) return 0;
  // simple normalization heuristic: scale down large counts
  const n = Number(pop) || 0;
  return Math.min(1, n / 1000);
}
