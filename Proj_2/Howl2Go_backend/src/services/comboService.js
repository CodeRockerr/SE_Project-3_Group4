import MealCombination from "../models/MealCombination.js";
import FastFoodItem from "../models/FastFoodItem.js";

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

  if (combos && combos.length > 0) {
    return combos.map((c) => ({
      item: c.complementaryItemId,
      reason: "popular_together",
      frequency: c.frequency,
      popularity: c.popularity,
      nutritionalScore: c.nutritionalScore,
    }));
  }

  // 2. fallback: find items from same company as main item
  const main = await FastFoodItem.findById(mainItemId).lean();
  if (!main) return [];

  const fallback = await FastFoodItem.find({
    company: main.company,
    _id: { $ne: main._id },
  })
    .limit(limit)
    .lean();

  return fallback.map((item) => ({ item, reason: "same_company_fallback" }));
};

export default { getComboSuggestions };
