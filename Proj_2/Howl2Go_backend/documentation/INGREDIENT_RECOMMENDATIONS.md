# Ingredient-Based Recommendations API

## Overview
The ingredient recommendation feature allows users to search for food items based on specific ingredients they want to include or exclude from their meals.

## Endpoint

### GET `/api/recommendations/ingredients`

Returns food items filtered by ingredient preferences, ranked by relevance.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include` | string | No | Comma-separated list of ingredients that must be present |
| `exclude` | string | No | Comma-separated list of ingredients to exclude |
| `page` | number | No | Page number for pagination (default: 1) |
| `limit` | number | No | Items per page, max 100 (default: 20) |

#### Example Requests

```bash
# Find items with chicken
GET /api/recommendations/ingredients?include=chicken

# Find items with chicken and tomato, but no cheese
GET /api/recommendations/ingredients?include=chicken,tomato&exclude=cheese

# Paginated results
GET /api/recommendations/ingredients?include=burger&page=2&limit=10
```

#### Response Format

```json
{
  "success": true,
  "criteria": {
    "include": ["chicken", "tomato"],
    "exclude": ["cheese"]
  },
  "items": [
    {
      "_id": "...",
      "company": "McDonald's",
      "item": "Grilled Chicken Sandwich",
      "ingredients": ["grilled", "chicken", "sandwich", "tomato", "lettuce"],
      "calories": 350,
      "protein": 28,
      "price": 5.99,
      "matchScore": 2
    }
  ],
  "count": 15,
  "total": 45,
  "page": 1,
  "limit": 20
}
```

#### Response Fields

- `success`: Boolean indicating if the request was successful
- `criteria`: The parsed ingredient filters applied
- `items`: Array of food items matching the criteria
  - `matchScore`: Number of included ingredients matched (higher is better)
- `count`: Number of items in current response
- `total`: Total number of items matching criteria
- `page`: Current page number
- `limit`: Items per page

## Data Model

### FastFoodItem Schema

```javascript
{
  company: String,
  item: String,
  ingredients: [String],  // Array of ingredient tokens
  calories: Number,
  protein: Number,
  // ... other nutrition fields
  price: Number
}
```

### User Preferences

Users can store default ingredient preferences in their profile:

```javascript
{
  preferences: {
    ingredientsInclude: [String],
    ingredientsExclude: [String]
  }
}
```

When authenticated, these preferences are automatically merged with query parameters.

## Ingredient Extraction

Ingredients are automatically derived from item names during data import:
- Lowercased and normalized
- Common stop words removed ("with", "and", "the", etc.)
- Punctuation stripped
- Deduplicated

Example: "Quarter Pounder® with Cheese" → `["quarter", "pounder", "cheese"]`

## Ranking Algorithm

Results are ranked by:
1. **Match Score** (primary): Number of included ingredients present
2. **Calories** (secondary): Lower calories preferred when match scores are equal

## Query Logic

- **Include**: ALL specified ingredients must be present (`$all` operator)
- **Exclude**: NONE of the excluded ingredients can be present (`$nin` operator)
- Both filters can be combined for precise control

## Frontend Integration

### TypeScript API Function

```typescript
import { getIngredientRecommendations } from '@/lib/api';

const results = await getIngredientRecommendations({
  include: ['chicken', 'lettuce'],
  exclude: ['cheese'],
  page: 1,
  limit: 20
});
```

### UI Display

Ingredients are shown in `ItemCard` component:
- First 5 ingredients displayed as tags
- "+N more" indicator for additional ingredients
- Full list visible in expanded nutrition details

## Performance Considerations

- MongoDB index on `ingredients` field for fast queries
- Pagination prevents large result sets
- Match scoring done in-memory on limited result set

## Future Enhancements

- LLM-powered ingredient extraction for higher accuracy
- Weighted ingredient preferences (e.g., "must have" vs "nice to have")
- Fuzzy matching for ingredient variations
- Nutritional scoring combined with ingredient matching
