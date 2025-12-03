import { apiFetch } from "../api";

export interface ComboSuggestion {
  item: {
    _id: string;
    company?: string;
    item?: string;
    price?: number;
    calories?: number;
    protein?: number;
    [key: string]: any;
  };
  reason?: string;
  frequency?: number;
  popularity?: number;
  nutritionalScore?: number;
}

export async function getComboSuggestions(
  mainItemId: string,
  limit: number = 5
) {
  const path = `/api/food/combo-suggestions?mainItemId=${encodeURIComponent(
    mainItemId
  )}&limit=${limit}`;

  const res = await apiFetch(path, { method: "GET", credentials: "include" });
  if (!res.ok)
    throw new Error(`Failed to fetch combo suggestions: ${res.status}`);

  const data = await res.json();
  if (!data.success) return [];

  return data.suggestions as ComboSuggestion[];
}
