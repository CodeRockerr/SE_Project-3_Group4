import comboService from "../services/comboService.js";

/**
 * GET /api/food/combo-suggestions?mainItemId=...&limit=5
 */
export const recommendCombos = async (req, res) => {
  try {
    const {
      mainItemId,
      limit,
      preferences: prefStr,
      nutritional_focus,
    } = req.query;

    if (!mainItemId) {
      return res
        .status(400)
        .json({ success: false, message: "mainItemId is required" });
    }

    // parse lightweight preferences from query (JSON string expected) or single focus
    let preferences = null;
    try {
      if (prefStr) preferences = JSON.parse(prefStr);
    } catch (e) {
      // ignore parse errors; preferences stay null
    }
    if (nutritional_focus && !preferences) {
      preferences = {};
      if (nutritional_focus === "low_sugar") preferences.lowSugar = true;
      if (nutritional_focus === "low_sodium") preferences.lowSodium = true;
    }

    const suggestions = await comboService.getComboSuggestions(mainItemId, {
      limit: parseInt(limit, 10) || 5,
      preferences,
    });

    res.status(200).json({
      success: true,
      count: suggestions.length,
      suggestions: suggestions.map((s) => ({
        item: s.item,
        reason: s.reason,
        frequency: s.frequency || 0,
        popularity: s.popularity || 0,
        popularityScore: s.popularityScore || 0,
        nutritionalScore: s.nutritionalScore || 0,
      })),
    });
  } catch (error) {
    console.error("Error getting combo suggestions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get combo suggestions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export default { recommendCombos };
