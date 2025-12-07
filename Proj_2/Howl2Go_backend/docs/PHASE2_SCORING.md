# Phase 2 Scoring Design

## Goal

Improve combo suggestion relevance by combining popularity with nutritional compatibility and user preferences. Provide optional short explanations (LLM-driven) for suggestions.

## Score composition (default)

- final_score = w_pop*popularity_norm + w_nut*nutrition_score + w_pref*preference_score + w_div*diversity_bonus
- Default weights (tunable):
  - w_pop = 0.45
  - w_nut = 0.35
  - w_pref = 0.15
  - w_div = 0.05

## Signals

- popularity_norm: normalized popularity from `MealCombination.popularity`.
- nutrition_score: heuristic [0..1] computed from nutritional fields (calories, protein, carbs, fat, sugar, sodium). Higher means more complementary / desirable for general case or tuned to user preference.
- preference_score: match to user-specified preferences (low_sugar, high_protein, vegetarian, etc.). Range [0..1].
- diversity_bonus: a small boost for items that increase variety in the cart.

## LLM

- Optional: ask an LLM to score and explain pair compatibility. LLM output should be cached and used only for `explain=true` or as an auxiliary signal.
- Keep prompts item-focused; never include PII.

## Acceptance criteria

- Endpoints accept `preferences` and `explain` params.
- `nutrition_score` function implemented and unit-tested.
- UI can show `score` and `explanation` when requested.
- No regression in default latency when `explain=false`.

## Next steps

1. Implement `nutritionUtils` (normalize + compatibility heuristic).
2. Add unit tests covering edge cases.
3. Integrate heuristic into `comboService` and expose new params; keep LLM integration optional and async.
