import { llmService } from '../services/llm.service.js';
import { simpleSearchService } from '../services/simpleSearch.service.js';

/**
 * Middleware to parse natural language queries using LLM
 * Falls back to simple keyword search if LLM fails (e.g., rate limited)
 * Supports conversational refinement with optional `previousCriteria` parameter
 * Attaches parsed criteria to `req.parsedCriteria` and `req.mongoQuery`
 *
 * @param {Object} req - Express request object
 * @param {string} req.body.query - Natural language food query (required)
 * @param {Object} req.body.previousCriteria - Previous search criteria for refinement (optional)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const parseLLMQuery = async (req, res, next) => {
  try {
    const { query, previousCriteria } = req.body;

    // Validate query parameter
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required and must be a string',
        message: 'Please provide a natural language food query in the request body',
      });
    }

    let result;
    let usedFallback = false;

    // Try to parse with LLM first. Pass previousCriteria when available so the LLM can refine.
    try {
      result = await llmService.parseQuery(query, previousCriteria);
    } catch (llmError) {
      console.warn('LLM parsing failed, falling back to simple search:', llmError?.message || llmError);
      usedFallback = true;
      const mongoQuery = simpleSearchService.parseSimpleQuery(query);
      result = {
        criteria: {},
        mongoQuery,
        rawResponse: null,
        fallback: true,
      };
    }

    // Attach parsed criteria and mongoQuery (if any) to request object for downstream middleware/controllers
    req.parsedCriteria = result.criteria || {};
    req.mongoQuery = result.mongoQuery || {};
    req.llmRawResponse = result.rawResponse;
    req.usedFallback = usedFallback;

    // Debug log
    console.debug('Query Parsing Result:', {
      original: query,
      criteria: req.parsedCriteria,
      usedFallback,
      mongoQuery: req.mongoQuery,
    });

    next();
  } catch (error) {
    console.error('LLM Middleware Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to parse query',
      message: error.message,
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
        message: 'parseLLMQuery middleware must be run first',
      });
    }

    // If we already have a mongoQuery from fallback, skip building
    if (req.usedFallback && req.mongoQuery) {
      return next();
    }

    // Build MongoDB query from criteria
    const mongoQuery = llmService.buildMongoQuery(req.parsedCriteria);
    req.mongoQuery = mongoQuery;

    next();
  } catch (error) {
    console.error('Build Mongo Query Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to build database query',
      message: error.message,
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
      message: 'Your query does not contain recognizable food or nutritional requirements. Please try again with a food-related query.',
    });
  }
  next();
};
