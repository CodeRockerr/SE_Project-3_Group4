import { apiFetch } from "../api";

export interface ComboSuggestion {
  item: {
    _id: string;
    company?: string;
    item?: string;
    price?: number;
    calories?: number;
    protein?: number;
    [key: string]: unknown;
  };
  reason?: string;
  frequency?: number;
  popularity?: number;
  nutritionalScore?: number;
}

export async function getComboSuggestions(
  mainItemId: string,
  limit: number = 5,
  options?: { nutritional_focus?: string; preferences?: Record<string, unknown> }
) {
  const qs = new URLSearchParams();
  qs.set("mainItemId", mainItemId);
  qs.set("limit", String(limit));
  if (options?.nutritional_focus)
    qs.set("nutritional_focus", options.nutritional_focus);
  if (options?.preferences)
    qs.set("preferences", JSON.stringify(options.preferences));

  const path = `/api/food/combo-suggestions?${qs.toString()}`;

  const res = await apiFetch(path, { method: "GET", credentials: "include" });
  if (!res.ok)
    throw new Error(`Failed to fetch combo suggestions: ${res.status}`);

  const data = await res.json();
  if (!data.success) return [];

  return data.suggestions as ComboSuggestion[];
}
