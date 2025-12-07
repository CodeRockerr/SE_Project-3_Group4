"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import ItemCard from "@/components/ItemCard";
import IngredientTagInput from "@/components/IngredientTagInput";
import { UtensilsCrossed, SlidersHorizontal, ShoppingCart, Home } from 'lucide-react';
import { useCart } from "@/context/CartContext";
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
  const [sortMode, setSortMode] = useState<'matches' | 'calories' | 'price-asc' | 'price-desc'>('matches');
  const { summary } = useCart();

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
    } catch (e) {
      const error = e as Error;
      setError(error?.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  }, [include, exclude, page, limit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = total ? Math.ceil(total / limit) : undefined;

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto">
      <div className="mb-8 text-center relative">
        {/* Home Button - Top Left */}
        <Link
          href="/dashboard"
          className="absolute top-0 left-0 p-2 transition-colors hover:opacity-70 text-[var(--howl-neutral)]"
          title="Back to Dashboard"
        >
          <Home className="h-6 w-6" />
        </Link>

        {/* Cart Button - Top Right */}
        <Link
          href="/cart"
          className="absolute top-0 right-0 p-2 transition-colors hover:opacity-70 text-[var(--howl-neutral)]"
        >
          <ShoppingCart className="h-6 w-6" />
          {summary.totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-[var(--orange)] text-[var(--text)] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {summary.totalItems}
            </span>
          )}
        </Link>

        <h1 className="text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4 text-[var(--howl-neutral)]">
          Ingredient{' '}
          <span className="relative inline-block">
            Matches
            <motion.svg
              className="absolute -bottom-2 left-0 w-full"
              height="8"
              viewBox="0 0 200 8"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeInOut" }}
            >
              <motion.path
                d="M2 5C60 2 140 2 198 5"
                stroke="var(--howl-primary)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </motion.svg>
          </span>
        </h1>
        <p className="mt-2 text-sm text-[var(--text-subtle)] max-w-2xl mx-auto">
          <b>Build your Plate: Include flavors you love, Exclude what you don’t!!</b>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <IngredientTagInput label="Include Ingredients" value={include} onChange={(tags) => { setInclude(tags); setPage(1); }} />
        <IngredientTagInput label="Exclude Ingredients" value={exclude} onChange={(tags) => { setExclude(tags); setPage(1); }} />
      </div>

      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <motion.button
            onClick={fetchData}
            className="inline-flex items-center gap-2 bg-[var(--orange)] text-[var(--text)] text-sm font-semibold px-4 py-2 rounded-full hover:bg-[var(--cream)] hover:text-[var(--bg)] transition-colors"
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <UtensilsCrossed className="h-4 w-4" />
            {loading ? 'Loading...' : 'Get Matches'}
          </motion.button>
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <SlidersHorizontal className="h-4 w-4 text-[var(--text-subtle)]" />
            </motion.div>
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value as 'matches' | 'calories' | 'price-asc' | 'price-desc')}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text)] focus:border-[var(--orange)] focus:outline-none"
            >
              <option value="matches">Sort: Matches</option>
              <option value="calories">Sort: Calories</option>
              <option value="price-asc">Sort: Price (Low to High)</option>
              <option value="price-desc">Sort: Price (High to Low)</option>
            </select>
          </motion.div>
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
        {data
          .slice() // shallow copy for client sorting
          .sort((a: FoodItem, b: FoodItem) => {
            if (sortMode === 'calories') {
              return (a.calories || 0) - (b.calories || 0);
            } else if (sortMode === 'price-asc') {
              return ((a as unknown as {price: number}).price || 0) - ((b as unknown as {price: number}).price || 0);
            } else if (sortMode === 'price-desc') {
              return ((b as unknown as {price: number}).price || 0) - ((a as unknown as {price: number}).price || 0);
            }
            return ((b as unknown as {matchScore: number}).matchScore || 0) - ((a as unknown as {matchScore: number}).matchScore || 0);
          })
          .map((food: FoodItem) => {
          const key = food._id || `${food.restaurant || (food as unknown as {company: string}).company}-${food.item}`;
          return (
            <div key={key} className="space-y-2">
              <ItemCard
                price={(food as unknown as {price: number}).price}
                {...food}
              />
              {/* Matched ingredients chips */}
              {include.length > 0 && (
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {(food.ingredients || []).filter(ing => 
                    include.some(inc => ing.toLowerCase().includes(inc.toLowerCase()))
                  ).map(ing => (
                    <span key={ing} className="px-2 py-1 rounded-full bg-[var(--orange)]/15 border border-[var(--orange)]/30 text-[var(--text)]">{ing}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!loading && data.length === 0 && <p className="text-sm text-gray-500 col-span-full">No results found for current filters.</p>}
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
