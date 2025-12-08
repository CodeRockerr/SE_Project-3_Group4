// Shared types for food items and API responses

export interface mockSearchResults {
  [key: string]: string;
}
export interface FoodItem {
  _id?: string; // MongoDB ObjectId (optional for backward compatibility)
  restaurant: string;
  item: string;
  calories: number;
  matchScore?: number; // number of included ingredients matched (optional)
  caloriesFromFat?: number | null;
  totalFat?: number | null;
  saturatedFat?: number | null;
  transFat?: number | null;
  cholesterol?: number | null;
  sodium?: number | null;
  carbs?: number | null;
  fiber?: number | null;
  sugars?: number | null;
  protein?: number | null;
    potassium?: number | null;
    vitaminA?: number | null;
    vitaminC?: number | null;
    calcium?: number | null;
    iron?: number | null;
  weightWatchersPoints?: number | null;
  price?: number;
  ingredients?: string[];
}



export interface APIResponse {
  results?: FoodItem[];
  error?: string;
  message?: string;
}

export interface APIError {
  message: string;
  statusCode?: number;
}
