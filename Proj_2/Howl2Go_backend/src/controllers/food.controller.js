import FastFoodItem from "../models/FastFoodItem.js";

/**
 * Calculate estimated price based on calorie content
 * Uses heuristic: ~$0.01 per calorie, with min/max bounds
 * This enables price-based sorting for refinement queries like "cheaper options"
 *
 * @param {number} calories - Calorie count for the food item
 * @returns {number} - Estimated price in dollars (2.00 - 15.00 range)
 */
const toNumber = (value) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const parsed = parseFloat(value.replace(/[^0-9.-]+/g, ""));
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
};

const calculatePrice = (calories) => {
    const caloriesNum = toNumber(calories);
    if (!caloriesNum || caloriesNum <= 0) return 2.0;
    const basePrice = caloriesNum * 0.01;
    return Math.min(Math.max(basePrice, 2.0), 15.0);
};

/**
 * Get food recommendations based on natural language preferences
 * Supports conversational refinement with sorting overrides
 *
 * @route POST /api/food/recommend
 * @body { query: string, previousCriteria?: object, limit?: number } - Natural language food query with optional context
 * @returns { success: boolean, query: string, criteria: object, recommendations: array }
 */
export const recommendFood = async (req, res) => {
    try {
        // const limit = parseInt(req.body.limit) || 5;
        const mongoQuery = req.mongoQuery || {};

        // Get recommendations with intelligent sorting
        // Default sorting based on primary criteria, can be overridden by LLM sort field
        let sortCriteria = {};

        // Check for LLM-provided sort override (e.g., price_asc for "show me cheaper options")
        if (req.parsedCriteria.sort === 'price_asc') {
            sortCriteria = { price: 1 }; // Sort by price ascending (cheaper first)
        } else if (req.parsedCriteria.sort === 'price_desc') {
            sortCriteria = { price: -1 }; // Sort by price descending (expensive first)
        } else if (req.parsedCriteria.protein?.min) {
            sortCriteria.protein = -1; // High protein first
        } else if (req.parsedCriteria.calories?.max) {
            sortCriteria.calories = 1; // Low calories first
        } else if (req.parsedCriteria.totalFat?.max) {
            sortCriteria.totalFat = 1; // Low fat first
        }

        const recommendations = await FastFoodItem.find(mongoQuery)
            .sort(sortCriteria)
            // .limit(limit)
            .lean();

        // Add calculated price and normalize fields for the frontend
        let recommendationsWithPrice = recommendations.map(item => {
            const normalizedPrice = toNumber(item.price);
            return {
                ...item,
                restaurant: item.company || item.restaurant,
                // Prefer stored price; fall back to calorie-based estimate to stay consistent with ingredient page
                price: normalizedPrice ?? calculatePrice(item.calories),
                totalFat: item.totalFat ?? null,
                saturatedFat: item.saturatedFat ?? null,
                transFat: item.transFat ?? null,
                cholesterol: item.cholesterol ?? null,
                sodium: item.sodium ?? null,
                carbs: item.carbs ?? null,
                fiber: item.fiber ?? null,
                sugars: item.sugars ?? null,
                protein: item.protein ?? null,
                ingredients: item.ingredients || [],
            };
        });

        // If LLM requested a sort override (e.g., "cheaper options" -> sort: "price_asc"),
        // apply it on the results after price calculation.
        const sortOverride = req.parsedCriteria?.sort;
        if (sortOverride === 'price_asc') {
            recommendationsWithPrice = recommendationsWithPrice.sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (sortOverride === 'price_desc') {
            recommendationsWithPrice = recommendationsWithPrice.sort((a, b) => (b.price || 0) - (a.price || 0));
        }

        return res.status(200).json({
            success: true,
            query: req.body.query,
            criteria: req.parsedCriteria,
            recommendations: recommendationsWithPrice,
            count: recommendationsWithPrice.length,
            message: `Here are ${recommendationsWithPrice.length} recommendations based on your preferences`,
        });
    } catch (error) {
        console.error("Recommend Food Error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to get recommendations",
            message: error.message,
        });
    }
};