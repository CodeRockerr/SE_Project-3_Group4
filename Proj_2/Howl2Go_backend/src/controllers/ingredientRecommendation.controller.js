import { getIngredientRecommendations } from '../services/ingredientRecommendation.service.js';

export async function recommendByIngredients(req, res) {
  try {
    const includeParam = req.query.include || '';
    const excludeParam = req.query.exclude || '';
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const include = includeParam
      .toString()
      .split(/[,\s]+/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    const exclude = excludeParam
      .toString()
      .split(/[,\s]+/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    // Merge user preferences if authenticated (assuming req.user populated elsewhere)
    if (req.user?.preferences) {
      if (Array.isArray(req.user.preferences.ingredientsInclude)) {
        include.push(...req.user.preferences.ingredientsInclude.map(i => i.toLowerCase()));
      }
      if (Array.isArray(req.user.preferences.ingredientsExclude)) {
        exclude.push(...req.user.preferences.ingredientsExclude.map(i => i.toLowerCase()));
      }
    }

    // Deduplicate
    const dedupe = arr => [...new Set(arr)];
    const finalInclude = dedupe(include);
    const finalExclude = dedupe(exclude).filter(i => !finalInclude.includes(i));

    const { items, total } = await getIngredientRecommendations({ include: finalInclude, exclude: finalExclude, page, limit });

    return res.json({
      success: true,
      criteria: { include: finalInclude, exclude: finalExclude },
      items,
      count: items.length,
      total,
      page,
      limit
    });
  } catch (err) {
    console.error('Ingredient recommendation error:', err);
    return res.status(500).json({ success: false, error: 'Failed to get ingredient recommendations', message: err.message });
  }
}
