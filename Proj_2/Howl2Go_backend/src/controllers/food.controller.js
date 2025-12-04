import FastFoodItem from "../models/FastFoodItem.js";

/**
 * Calculate price based on calories
 * Formula: ~$0.01 per calorie, min $2.00, max $15.00
 *
 * @param {number} calories - Calorie count
 * @returns {number} - Calculated price
 */
const calculatePrice = (calories) => {
    if (!calories || calories <= 0) return 2.0;
    const basePrice = calories * 0.01;
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

        // Add calculated price to each recommendation
        let recommendationsWithPrice = recommendations.map(item => ({
            ...item,
            price: calculatePrice(item.calories)
        }));

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