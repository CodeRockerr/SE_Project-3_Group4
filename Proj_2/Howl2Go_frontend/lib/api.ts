/**
 * API fetch utility that handles proxy routing and token refresh
 * This is a wrapper around fetch that routes requests through the Next.js API proxy
 */

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, {
    credentials: 'include',
    ...options
  });

  if (res.status === 401) {
    await fetch("/api/auth/refresh", { method: "POST" });
    return apiFetch(path, options);
  }

  return res;
}

/**
 * Get ingredient-based recommendations
 * @param include - Array of ingredients to include
 * @param exclude - Array of ingredients to exclude
 * @param page - Page number for pagination
 * @param limit - Items per page
 * @returns Promise with recommendation results
 */
export async function getIngredientRecommendations({
  include = [],
  exclude = [],
  page = 1,
  limit = 20,
}: {
  include?: string[];
  exclude?: string[];
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (include.length) params.set('include', include.join(','));
  if (exclude.length) params.set('exclude', exclude.join(','));
  params.set('page', page.toString());
  params.set('limit', limit.toString());

  const res = await apiFetch(`/api/recommendations/ingredients?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to fetch ingredient recommendations');
  }
  return res.json();
}

