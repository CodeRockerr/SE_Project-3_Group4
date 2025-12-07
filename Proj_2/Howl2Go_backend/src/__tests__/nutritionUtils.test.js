import {
  normalizeNutrition,
  nutritionCompatibility,
} from "../utils/nutritionUtils.js";

describe("nutritionUtils", () => {
  test("normalizeNutrition returns numeric fields and defaults to 0", () => {
    const raw = {
      nutrition: { calories: "250", protein: "12", carbs_g: null },
    };
    const n = normalizeNutrition(raw);
    expect(typeof n.calories).toBe("number");
    expect(n.calories).toBe(250);
    expect(n.carbs_g).toBe(0);
  });

  test("nutritionCompatibility returns value in [0,1] and penalizes high-sugar combos", () => {
    const main = {
      nutrition: { calories: 600, carbs_g: 80, protein_g: 20, sugar_g: 5 },
    };
    const highSugarSide = {
      nutrition: { calories: 300, carbs_g: 40, protein_g: 2, sugar_g: 30 },
    };
    const proteinSide = {
      nutrition: { calories: 200, carbs_g: 20, protein_g: 18, sugar_g: 3 },
    };

    const scoreHighSugar = nutritionCompatibility(main, highSugarSide);
    const scoreProtein = nutritionCompatibility(main, proteinSide);

    expect(scoreHighSugar).toBeGreaterThanOrEqual(0);
    expect(scoreHighSugar).toBeLessThanOrEqual(1);
    expect(scoreProtein).toBeGreaterThanOrEqual(0);
    expect(scoreProtein).toBeLessThanOrEqual(1);

    // protein-side should be scored higher than high-sugar side for a carb-heavy main
    expect(scoreProtein).toBeGreaterThan(scoreHighSugar);
  });
});
