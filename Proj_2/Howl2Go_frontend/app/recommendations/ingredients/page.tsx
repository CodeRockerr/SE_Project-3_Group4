"use client";
import { useState, useEffect, useCallback, ChangeEvent } from "react";
import ItemCard from "@/components/ItemCard";
import IngredientTagInput from "@/components/IngredientTagInput";
import { UtensilsCrossed, SlidersHorizontal } from 'lucide-react';
import { getIngredientRecommendations } from "@/lib/api";
import type { FoodItem } from "@/types/food";

interface RecommendationResponse {
  items?: FoodItem[]; // if service returns items
  results?: FoodItem[]; // fallback if named differently
  total?: number;
  page?: number;
  limit?: number;
}

export default function IngredientRecommendationsPage() {
  const [include, setInclude] = useState<string[]>(["chicken"]);
  const [exclude, setExclude] = useState<string[]>([]);
  const [data, setData] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [limit] = useState(20);
  const [sortMode, setSortMode] = useState<'matches' | 'calories'>('matches');

  // Persist filters
  useEffect(() => {
    const savedInclude = localStorage.getItem('ingredient_include');
    const savedExclude = localStorage.getItem('ingredient_exclude');
    if (savedInclude) setInclude(JSON.parse(savedInclude));
    if (savedExclude) setExclude(JSON.parse(savedExclude));
  }, []);

  useEffect(() => {
    localStorage.setItem('ingredient_include', JSON.stringify(include));
  }, [include]);
  useEffect(() => {
    localStorage.setItem('ingredient_exclude', JSON.stringify(exclude));
  }, [exclude]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: RecommendationResponse = await getIngredientRecommendations({ include, exclude, page, limit });
      const items = res.items || res.results || [];
      setData(items);
      if (typeof res.total === "number") setTotal(res.total);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else if (typeof e === "string") {
        setError(e);
      } else {
        setError("Failed to load recommendations");
      }
    } finally {
      setLoading(false);
    }
  }, [include, exclude, page, limit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = total ? Math.ceil(total / limit) : undefined;

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4 text-[var(--howl-neutral)]">
          Ingredient
          {' '}
          <span className="relative inline-block">
            Matches
            <span className="block h-1.5 bg-[var(--howl-primary)] rounded-full mt-2"/>
          </span>
        </h1>
        <p className="mt-2 text-sm text-[var(--text-subtle)] max-w-2xl mx-auto">
          Find menu items containing all of your include ingredients while excluding any you don&apos;t want. Results are ranked by number of matches.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <IngredientTagInput label="Include Ingredients" value={include} onChange={(tags) => { setInclude(tags); setPage(1); }} />
        <IngredientTagInput label="Exclude Ingredients" value={exclude} onChange={(tags) => { setExclude(tags); setPage(1); }} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 bg-[var(--orange)] text-[var(--text)] text-sm font-semibold px-4 py-2 rounded-full hover:bg-[var(--cream)] hover:text-[var(--bg)] transition-colors"
          disabled={loading}
        >
          <UtensilsCrossed className="h-4 w-4" />
          {loading ? 'Loading...' : 'Get Matches'}
        </button>
        <div className="flex items-center gap-2 ml-auto">
          <SlidersHorizontal className="h-4 w-4 text-[var(--text-subtle)]" />
          <select
            value={sortMode}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSortMode(e.target.value as 'matches' | 'calories')}
            className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--orange)] focus:outline-none"
          >
            <option value="matches">Sort: Matches</option>
            <option value="calories">Sort: Calories</option>
          </select>
        </div>
        {loading && <span className="text-xs text-gray-500">Loading...</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      <div className="mb-6 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-md px-4 py-3">
        <div><span className="font-semibold text-[var(--cream)]">Include:</span> {include.length ? include.join(', ') : '—'}</div>
        <div><span className="font-semibold text-[var(--cream)]">Exclude:</span> {exclude.length ? exclude.join(', ') : '—'}</div>
        {typeof total === 'number' && <div className="ml-auto text-[var(--text-subtle)]">Total matches: {total}</div>}
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {loading && (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="space-y-2 animate-pulse">
              <div className="h-40 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]" />
              <div className="h-4 w-2/3 rounded bg-[var(--border)]" />
              <div className="h-3 w-1/2 rounded bg-[var(--border)]" />
            </div>
          ))
        )}

        {!loading && data
          .slice() // shallow copy for client sorting
          .sort((a, b) => {
            const getMatchScore = (obj: unknown): number => {
              if (typeof obj !== 'object' || obj === null) return 0;
              const v = (obj as Record<string, unknown>).matchScore;
              return typeof v === 'number' ? v : 0;
            };

            if (sortMode === 'calories') {
              return (a.calories || 0) - (b.calories || 0);
            }
            return getMatchScore(b) - getMatchScore(a);
          })
          .map(food => {
          // treat food as a record to safely access optional fields without using `any`
          const f = food as unknown as Record<string, unknown>;
          const { restaurant: _r, company: _c, ...rest } = f;
          const restaurantName = typeof _r === 'string' ? _r : (typeof _c === 'string' ? _c : 'Unknown');
          const key = typeof f._id === 'string' ? String(f._id) : `${restaurantName}-${String(f.item ?? '')}`;
          const itemName = typeof f.item === 'string' ? f.item : String(f.item ?? '');
          const calories = typeof f.calories === 'number' ? f.calories : 0;
          const price = f.price as number | string | undefined;
          // normalize price to a number or undefined (ItemCard expects number | undefined)
          const priceNumber = typeof price === 'string'
            ? (() => {
                const parsed = Number(price);
                return Number.isFinite(parsed) ? parsed : undefined;
              })()
            : price;

          return (
            <div key={key} className="space-y-2">
              <ItemCard
                restaurant={restaurantName}
                item={itemName}
                calories={calories}
                price={priceNumber}
                {...(rest as Record<string, unknown>)}
              />
              {/* Matched ingredients chips */}
              {include.length > 0 && (
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {(food.ingredients || []).filter(ing => include.includes(ing)).map(ing => (
                    <span key={ing} className="px-2 py-1 rounded-full bg-[var(--orange)]/15 border border-[var(--orange)]/30 text-[var(--text)]">{ing}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {!loading && data.length === 0 && (
          <div className="col-span-full text-center py-12 border border-[var(--border)] rounded-lg bg-[var(--bg-card)]">
            <UtensilsCrossed className="mx-auto h-8 w-8 text-[var(--text-subtle)]" />
            <p className="mt-2 text-sm text-[var(--text-subtle)]">No results for current filters.</p>
            <p className="mt-1 text-xs text-[var(--text-subtle)]">Try removing an exclude or adding more include ingredients.</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button
          className="px-3 py-1 rounded border text-sm disabled:opacity-40"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={loading || page === 1}
        >Previous</button>
        <span className="text-sm">Page {page}{totalPages ? ` / ${totalPages}` : ""}</span>
        <button
          className="px-3 py-1 rounded border text-sm disabled:opacity-40"
          onClick={() => setPage(p => totalPages ? Math.min(totalPages, p + 1) : p + 1)}
          disabled={loading || (totalPages ? page >= totalPages : false)}
        >Next</button>
      </div>
    </div>
  );
}
