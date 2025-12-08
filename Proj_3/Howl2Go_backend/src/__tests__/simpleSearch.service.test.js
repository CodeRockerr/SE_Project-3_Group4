import { describe, it, expect, afterEach, jest } from '@jest/globals';
import { simpleSearchService } from '../services/simpleSearch.service.js';
import FastFoodItem from '../models/FastFoodItem.js';

describe('simpleSearchService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses simple queries into Mongo conditions', () => {
    const query = simpleSearchService.parseSimpleQuery('chicken burger');
    expect(query.$and).toBeDefined();
    expect(query.$and.length).toBe(2);
  });

  it('returns empty query for invalid input', () => {
    expect(simpleSearchService.parseSimpleQuery('')).toEqual({});
    expect(simpleSearchService.parseSimpleQuery(null)).toEqual({});
  });

  it('searches using parsed query and returns results', async () => {
    const limitMock = jest.fn().mockReturnThis();
    const leanMock = jest.fn().mockResolvedValue([{ item: 'Burger' }]);
    jest.spyOn(FastFoodItem, 'find').mockReturnValue({ limit: limitMock, lean: leanMock });

    const results = await simpleSearchService.search('burger', 5);

    expect(FastFoodItem.find).toHaveBeenCalled();
    expect(limitMock).toHaveBeenCalledWith(5);
    expect(results).toEqual([{ item: 'Burger' }]);
  });

  it('returns empty array when search throws', async () => {
    const limitMock = jest.fn().mockReturnThis();
    const leanMock = jest.fn().mockRejectedValue(new Error('db fail'));
    jest.spyOn(FastFoodItem, 'find').mockReturnValue({ limit: limitMock, lean: leanMock });

    const results = await simpleSearchService.search('burger', 5);
    expect(results).toEqual([]);
  });
});
