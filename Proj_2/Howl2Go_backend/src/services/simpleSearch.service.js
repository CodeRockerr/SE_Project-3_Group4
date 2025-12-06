import FastFoodItem from '../models/FastFoodItem.js';

/**
 * Simple keyword-based search service (fallback when LLM is rate-limited)
 */
class SimpleSearchService {
  /**
   * Parse simple keywords from query without LLM
   * @param {string} query - Simple text query like "burger", "chicken salad"
   * @returns {Object} - MongoDB query
   */
  parseSimpleQuery(query) {
    if (!query || typeof query !== 'string') {
      return {};
    }

    // Extract keywords
    const keywords = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    
    // Build a MongoDB query that searches for items matching keywords
    const conditions = [];
    
    for (const keyword of keywords) {
      // Search in item name, company, and ingredients
      conditions.push({
        $or: [
          { item: { $regex: keyword, $options: 'i' } },
          { company: { $regex: keyword, $options: 'i' } },
          { ingredients: { $regex: keyword, $options: 'i' } }
        ]
      });
    }

    // If we have conditions, use AND to require all keywords match
    if (conditions.length > 1) {
      return { $and: conditions };
    } else if (conditions.length === 1) {
      return conditions[0];
    }

    return {};
  }

  /**
   * Search for food items using simple keyword matching
   * @param {string} query - Search query
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Matching food items
   */
  async search(query, limit = 20) {
    try {
      const mongoQuery = this.parseSimpleQuery(query);
      
      const items = await FastFoodItem.find(mongoQuery)
        .limit(limit)
        .lean();

      return items;
    } catch (error) {
      console.error('Simple search error:', error);
      return [];
    }
  }
}

export const simpleSearchService = new SimpleSearchService();
