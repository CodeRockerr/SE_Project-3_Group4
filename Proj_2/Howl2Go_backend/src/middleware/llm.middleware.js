import { llmService } from '../services/llm.service.js';
import { simpleSearchService } from '../services/simpleSearch.service.js';

/**
 * Middleware to parse natural language queries using LLM
 * Falls back to simple keyword search if LLM fails (e.g., rate limited)
 * Attaches parsed criteria to req.parsedCriteria
 *
 * @example
 * // In routes:
 * router.post('/search', parseLLMQuery, searchController);
 *
 * // In controller:
 * const criteria = req.parsedCriteria; // { protein: { min: 30 }, calories: { max: 500 } }
 */
export const parseLLMQuery = async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required and must be a string',
        message: 'Please provide a natural language food query in the request body'
      });
    }

    let result;
    let usedFallback = false;

    // Try to parse with LLM first
    try {
      result = await llmService.parseQuery(query);
    } catch (llmError) {
      console.warn('LLM parsing failed, falling back to simple search:', llmError.message);
      
      // Fallback to simple keyword search
      usedFallback = true;
      const mongoQuery = simpleSearchService.parseSimpleQuery(query);
      result = {
        criteria: {},
        mongoQuery: mongoQuery,
        rawResponse: null,
        fallback: true
      };
    }

    // Attach parsed criteria to request object
    req.parsedCriteria = result.criteria || {};
    req.mongoQuery = result.mongoQuery || {};
    req.llmRawResponse = result.rawResponse;
    req.usedFallback = usedFallback;

    // Log for debugging
    console.log('Query Parsing Result:', {
      original: query,
      criteria: req.parsedCriteria,
      usedFallback: usedFallback
    });

    next();
  } catch (error) {
    console.error('LLM Middleware Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to parse query',
      message: error.message
    });
  }
};

/**
 * Middleware to build MongoDB query from parsed criteria
 * Requires parseLLMQuery to be run first
 * Attaches MongoDB query to req.mongoQuery
 * If fallback was used, mongoQuery is already set
 */
export const buildMongoQuery = (req, res, next) => {
  try {
    if (!req.parsedCriteria) {
      return res.status(400).json({
        success: false,
        error: 'No parsed criteria found',
        message: 'parseLLMQuery middleware must be run first'
      });
    }

    // If we already have a mongoQuery from fallback, skip building
    if (req.usedFallback && req.mongoQuery) {
      return next();
    }

    // Build MongoDB query from criteria
    const mongoQuery = llmService.buildMongoQuery(req.parsedCriteria);
    req.mongoQuery = mongoQuery;

    // console.log('MongoDB Query:', mongoQuery);

    next();
  } catch (error) {
    console.error('Build Mongo Query Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to build database query',
      message: error.message
    });
  }
};

/**
 * Middleware to validate that the query resulted in meaningful criteria
 * Allows both LLM-parsed criteria and fallback search results
 * Returns 400 only if both criteria AND mongoQuery are empty
 */
export const validateCriteria = (req, res, next) => {
  // Allow if we have either parsed criteria OR a mongoQuery from fallback
  const hasCriteria = req.parsedCriteria && Object.keys(req.parsedCriteria).length > 0;
  const hasQuery = req.mongoQuery && Object.keys(req.mongoQuery).length > 0;
  
  if (!hasCriteria && !hasQuery && !req.usedFallback) {
    return res.status(400).json({
      success: false,
      error: 'No nutritional criteria found',
      message: 'Your query does not contain recognizable food or nutritional requirements. Please try again with a food-related query.'
    });
  }
  next();
};
