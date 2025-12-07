/**
 * Nutrition utilities for Phase 2 scoring.
 * Exports:
 *  - normalizeNutrition(foodItem)
 *  - nutritionCompatibility(mainItem, candidateItem, options)
 *
 * The compatibility function is a lightweight heuristic that returns a score in [0,1].
 */

function toNumber(v) {
  if (v === undefined || v === null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeNutrition(item = {}) {
  // Accept different shapes: item.nutrition or item fields directly.
  const n = item.nutrition || item;
  return {
    calories: toNumber(n.calories || n.cal || n.energy),
    protein_g: toNumber(n.protein_g || n.protein || n.prot_g),
    fat_g: toNumber(n.fat_g || n.fat || n.lipids),
    carbs_g: toNumber(n.carbs_g || n.carbs || n.carbohydrates),
    sugar_g: toNumber(n.sugar_g || n.sugars || n.sugar),
    sodium_mg: toNumber(n.sodium_mg || n.sodium || n.salt_mg),
  };
}

function clamp01(x) {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * Compute a heuristic compatibility score in [0,1] for two food items.
 *
 * Basic rules implemented here:
 * - Penalize sugar-heavy combinations (both high sugar).
 * - Reward protein complementing a carb-heavy main.
 * - Favor calorie-balance (not too far apart) for typical combos.
 * - Allow options to tune sensitivity, e.g., { lowSugar:true }
 */
export function nutritionCompatibility(
  mainItem = {},
  candidateItem = {},
  options = {}
) {
  const main = normalizeNutrition(mainItem);
  const cand = normalizeNutrition(candidateItem);

  // sugar penalty: if both are high-sugar (>15g), penalize
  const HIGH_SUGAR = 15;
  const bothHighSugar = main.sugar_g > HIGH_SUGAR && cand.sugar_g > HIGH_SUGAR;
  const sugarPenalty = bothHighSugar ? 0.5 : 1.0;

  // protein complement: if candidate has meaningful protein relative to main's carbs
  const protRatio =
    main.carbs_g > 0 ? cand.protein_g / main.carbs_g : cand.protein_g / 10;
  // scale to [0,1] with diminishing returns
  const proteinScore = clamp01(protRatio * 2); // e.g., if protRatio=0.25 -> 0.5

  // calorie balance: prefer items not hugely different in energy (but complements like small side acceptable)
  const maxCal = Math.max(1, main.calories);
  const calDiff = Math.abs(main.calories - cand.calories) / maxCal; // 0..inf
  const calBalance = clamp01(1 - calDiff); // 1 when equal, smaller as difference grows

  // sodium sensitivity: optional preference
  let sodiumPenalty = 1.0;
  if (options.lowSodium) {
    const SODIUM_THRESHOLD = 700; // mg
    if (cand.sodium_mg > SODIUM_THRESHOLD) sodiumPenalty = 0.6;
  }

  // combine signals
  const scoreRaw = 0.45 * calBalance + 0.4 * proteinScore + 0.15 * sugarPenalty;
  const score = clamp01(scoreRaw * sodiumPenalty);

  // If user explicitly requests low sugar, downweight sugar-containing candidates
  if (options.lowSugar) {
    const sugarFactor = cand.sugar_g > 8 ? 0.7 : 1.0;
    return clamp01(score * sugarFactor);
  }

  return score;
}

// Named ESM exports are provided above via `export` declarations.
