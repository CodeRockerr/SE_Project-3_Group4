"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { FoodItem } from "@/types/food";
import ItemCard from "@/components/ItemCard";
import LoadingSpinner from "@/components/LoadingSpinner";

// API Response Types
interface ApiRecommendation {
  company?: string;
  restaurant?: string;
  item?: string;
  calories?: number;
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
  weightWatchersPoints?: number | null;
  price?: number;
  ingredients?: string[];
  _id?: string;
  id?: string | number;
}

interface ApiResponse {
  recommendations?: ApiRecommendation[];
  results?: ApiRecommendation[];
  [key: string]: unknown;
}

type ApiData = ApiResponse | ApiRecommendation[] | ApiRecommendation;

function SmartMenuSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastCriteria, setLastCriteria] = useState<Record<string, unknown> | null>(null);
  const [refinementSuggestions, setRefinementSuggestions] = useState<string[]>([]);
  
  // Load previous search criteria from localStorage on component mount
  // Enables conversational refinements to survive page reloads
  useEffect(() => {
    try {
      const raw = localStorage.getItem("howl_lastCriteria");
      if (raw) {
        setLastCriteria(JSON.parse(raw));
      }
    } catch (e) {
      // Silently ignore parse errors, user can start fresh search
      console.warn("Failed to load lastCriteria from localStorage", e);
    }
  }, []);

  // Synchronize lastCriteria state with localStorage
  // Keeps search context in sync across page reloads and tabs
  useEffect(() => {
    try {
      if (lastCriteria) {
        localStorage.setItem("howl_lastCriteria", JSON.stringify(lastCriteria));
      } else {
        localStorage.removeItem("howl_lastCriteria");
      }
    } catch (e) {
      console.warn("Failed to persist lastCriteria", e);
    }
  }, [lastCriteria]);

  // Auto-submit when page loads with initial query from main page
  useEffect(() => {
    if (initialQuery && !foodItems.length && !isLoading && !error) {
      // Trigger search automatically with no previous criteria (fresh search)
      const submitSearch = async () => {
        setIsLoading(true);
        setError(null);
        setFoodItems([]);

        try {
          const response = await fetch("/api/food/recommend", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            // Initial search: previousCriteria is null
            // Only send previousCriteria when we actually have it
            body: JSON.stringify({ query: initialQuery }),
          });

          if (!response.ok) {
            if (response.status === 400) {
              setError(
                "Invalid search query. Try something like '100 calories food' or 'burger under 300 calories'"
              );
            } else if (response.status === 500) {
              setError("Server error. Please try again later.");
            } else {
              setError(`Error: ${response.status}. Please try again.`);
            }
            return;
          }

          const data = await response.json();
          // Store returned criteria to enable conversational refinements
          if (data && typeof data === 'object' && 'criteria' in data) {
                    const criteria = data.criteria || null;
                    setLastCriteria(criteria);
                    // Compute match count (prefer explicit count, fallback to recommendations length)
                    const matchCount = (data && typeof data === 'object' && 'count' in data && typeof (data as any).count === 'number')
                      ? (data as any).count
                      : (data && typeof data === 'object' && Array.isArray((data as any).recommendations))
                        ? (data as any).recommendations.length
                        : 0;
                    // Build human-friendly refinement suggestions from criteria when results are limited
                    try {
                      const suggs = buildRefinementSuggestions(criteria as any, matchCount);
                      setRefinementSuggestions(suggs);
                    } catch (e) {
                      console.warn('Failed to build refinement suggestions', e);
                      setRefinementSuggestions([]);
                    }
          }
          await parseAndSetFoodItems(data);
        } catch (error) {
          console.error("Error fetching recommendations:", error);
          setError(
            "Unable to connect to server. Please check your connection and try again."
          );
        } finally {
          setIsLoading(false);
        }
      };

      submitSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper function to parse API response
  const parseAndSetFoodItems = async (data: ApiData) => {
    console.log("API Response:", data);
    console.log("Data type:", typeof data);
    console.log("Is array?", Array.isArray(data));
    if (data && typeof data === 'object') {
      console.log("Data keys:", Object.keys(data as any));
      console.log("Has recommendations?", "recommendations" in data);
      if ("recommendations" in data) {
        console.log("Recommendations type:", typeof (data as any).recommendations);
        console.log("Is recommendations array?", Array.isArray((data as any).recommendations));
        console.log("Recommendations value:", (data as any).recommendations);
      }
    }

    let items: FoodItem[] = [];

    // Format 1: API returns recommendations array (ACTUAL FORMAT)
    if (
      !Array.isArray(data) &&
      "recommendations" in data &&
      Array.isArray(data.recommendations)
    ) {
      items = data.recommendations
        .map((item) => ({
        _id: item._id ? String(item._id) : item.id ? String(item.id) : undefined, // Include MongoDB _id, ensure it's a string
        restaurant: item.restaurant || item.company || "Unknown", // Use restaurant/company from backend
        item: item.item || "Unknown Item",
        calories: item.calories || 0,
        caloriesFromFat: item.caloriesFromFat || null,
        totalFat: item.totalFat || null,
        saturatedFat: item.saturatedFat || null,
        transFat: item.transFat || null,
        cholesterol: item.cholesterol || null,
        sodium: item.sodium || null,
        carbs: item.carbs || null,
        fiber: item.fiber || null,
        sugars: item.sugars || null,
        protein: item.protein || null,
        weightWatchersPoints: item.weightWatchersPoints || null,
        price: item.price,
        ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
      }));
    } else if (Array.isArray(data)) {
      // Format 2: Array of items
      items = data
        .map((item) => ({
        _id: item._id ? String(item._id) : item.id ? String(item.id) : undefined, // Include MongoDB _id, ensure it's a string
        restaurant: item.restaurant || item.company || "Unknown",
        item: item.item || "Unknown Item",
        calories: item.calories || 0,
        caloriesFromFat: item.caloriesFromFat || null,
        totalFat: item.totalFat || null,
        saturatedFat: item.saturatedFat || null,
        transFat: item.transFat || null,
        cholesterol: item.cholesterol || null,
        sodium: item.sodium || null,
        carbs: item.carbs || null,
        fiber: item.fiber || null,
        sugars: item.sugars || null,
        protein: item.protein || null,
        weightWatchersPoints: item.weightWatchersPoints || null,
        price: item.price,
        ingredients: Array.isArray((item as any).ingredients) ? (item as any).ingredients : [],
      }));
    } else if (
      !Array.isArray(data) &&
      "results" in data &&
      Array.isArray(data.results)
    ) {
      // Format 3: Wrapped in results
      items = data.results
        .map((item) => ({
        _id: item._id ? String(item._id) : item.id ? String(item.id) : undefined, // Include MongoDB _id, ensure it's a string
        restaurant: item.restaurant || item.company || "Unknown",
        item: item.item || "Unknown Item",
        calories: item.calories || 0,
        caloriesFromFat: item.caloriesFromFat || null,
        totalFat: item.totalFat || null,
        saturatedFat: item.saturatedFat || null,
        transFat: item.transFat || null,
        cholesterol: item.cholesterol || null,
        sodium: item.sodium || null,
        carbs: item.carbs || null,
        fiber: item.fiber || null,
        sugars: item.sugars || null,
        protein: item.protein || null,
        weightWatchersPoints: item.weightWatchersPoints || null,
        price: item.price,
        ingredients: Array.isArray((item as any).ingredients) ? (item as any).ingredients : [],
      }));
    } else if (!Array.isArray(data) && "restaurant" in data && "item" in data) {
      // Format 4: Single item
      items = [data as FoodItem];
    } else if (
      typeof data === "object" &&
      data !== null &&
      !Array.isArray(data)
    ) {
      // Format 5: Object with restaurant names as keys
      const extractValue = (val: unknown): number | null => {
        if (typeof val === "number") return val;
        if (typeof val === "object" && val !== null) {
          const obj = val as { max?: number; value?: number; min?: number };
          return obj.max || obj.value || obj.min || null;
        }
        return null;
      };

      items = Object.entries(data)
        .map(
        ([restaurant, itemData]: [string, ApiRecommendation]) => {
          return {
            _id: itemData._id ? String(itemData._id) : itemData.id ? String(itemData.id) : undefined, // Include MongoDB _id, ensure it's a string
            restaurant: (itemData && (itemData.restaurant || itemData.company)) || restaurant,
            item: itemData.item || "Unknown Item",
            calories: extractValue(itemData.calories) || 0,
            caloriesFromFat: extractValue(itemData.caloriesFromFat),
            totalFat: extractValue(itemData.totalFat),
            saturatedFat: extractValue(itemData.saturatedFat),
            transFat: extractValue(itemData.transFat),
            cholesterol: extractValue(itemData.cholesterol),
            sodium: extractValue(itemData.sodium),
            carbs: extractValue(itemData.carbs),
            fiber: extractValue(itemData.fiber),
            sugars: extractValue(itemData.sugars),
            protein: extractValue(itemData.protein),
            weightWatchersPoints: extractValue(itemData.weightWatchersPoints),
            price: itemData.price,
            ingredients: Array.isArray(itemData.ingredients) ? itemData.ingredients : [],
          };
        }
      );
    } else {
      console.error("Failed to parse response - no matching format", {
        isArray: Array.isArray(data),
        hasRecommendations: data && "recommendations" in data,
        recommendationsIsArray: data && Array.isArray((data as any).recommendations),
        dataKeys: data && typeof data === 'object' ? Object.keys(data as any) : 'not an object',
      });
      setError("Unexpected response format from server.");
      return;
    }

    // Don't set error for empty results - let the UI show suggestions instead
    // The empty state will be handled by the conditional rendering below
    setFoodItems(items);
    console.log("Parsed food items:", items);
  };

  // Handle search form submission with conversational refinement support
  // Sends current search query with previousCriteria for context-aware results
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Update URL to reflect new search query
    const params = new URLSearchParams();
    params.set("q", searchQuery);
    router.replace(`/search?${params.toString()}`, { scroll: false });

    setIsLoading(true);
    setError(null);
    setFoodItems([]);

    try {
      const response = await fetch("/api/food/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send query with previous criteria only when present
        body: JSON.stringify(lastCriteria ? { query: searchQuery, previousCriteria: lastCriteria } : { query: searchQuery }),
      });

      if (!response.ok) {
        if (response.status === 400) {
          setError(
            "Invalid search query. Try something like '100 calories food' or 'burger under 300 calories'"
          );
        } else if (response.status === 500) {
          setError("Server error. Please try again later.");
        } else {
          setError(`Error: ${response.status}. Please try again.`);
        }
        return;
      }

      const data = await response.json();
      console.log("Response from backend:", data);
      console.log("Response status:", response.status);
      
      // Store returned criteria for next refinement iteration
      if (data && typeof data === 'object' && 'criteria' in data) {
        const criteria = data.criteria || null;
        setLastCriteria(criteria);
        // Compute match count (prefer explicit count, fallback to recommendations length)
        const matchCount = (data && typeof data === 'object' && 'count' in data && typeof (data as any).count === 'number')
          ? (data as any).count
          : (data && typeof data === 'object' && Array.isArray((data as any).recommendations))
            ? (data as any).recommendations.length
            : 0;
        try {
          const suggs = buildRefinementSuggestions(criteria as any, matchCount);
          setRefinementSuggestions(suggs);
        } catch (e) {
          console.warn('Failed to build refinement suggestions', e);
          setRefinementSuggestions([]);
        }
      }
      
      try {
        await parseAndSetFoodItems(data);
      } catch (parseError) {
        console.error("Error in parseAndSetFoodItems:", parseError);
        setError("Error processing search results. Check console for details.");
        throw parseError;
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      setError(
        "Unable to connect to server. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Build human-friendly suggestion strings from parsed criteria
  // Only produce suggestions when matchCount is below a small threshold
  const buildRefinementSuggestions = (criteria: any, matchCount: number = 0): string[] => {
    const LIMIT_THRESHOLD = 3; // only show suggestions when results are limited
    if (!criteria || typeof criteria !== 'object') return [];
    if (typeof matchCount !== 'number') matchCount = Number(matchCount) || 0;
    if (matchCount > LIMIT_THRESHOLD) return [];

    const suggestions: string[] = [];

    const relaxMax = (max: number) => {
      if (typeof max !== 'number' || Number.isNaN(max)) return max;
      const byPercent = Math.round(max * 1.2);
      const byPlus = max + 100;
      return Math.max(byPercent, byPlus);
    };

    const relaxMin = (min: number) => {
      if (typeof min !== 'number' || Number.isNaN(min)) return min;
      return Math.max(0, Math.floor(min * 0.8));
    };

    if (criteria.calories) {
      const c = criteria.calories;
      if (c.max !== undefined && typeof c.max === 'number') {
        const relaxed = relaxMax(c.max);
        suggestions.push(`Would you consider under ${relaxed} calories instead?`);
      } else if (c.min !== undefined && typeof c.min === 'number') {
        const relaxed = relaxMin(c.min);
        suggestions.push(`Prefer meals above ${relaxed} calories?`);
      }
    }

    if (criteria.protein) {
      const p = criteria.protein;
      if (p.min !== undefined && typeof p.min === 'number') {
        const relaxed = relaxMin(p.min);
        suggestions.push(`Looking for at least ${relaxed}g protein?`);
      } else if (p.max !== undefined && typeof p.max === 'number') {
        const relaxed = relaxMax(p.max);
        suggestions.push(`Prefer protein under ${relaxed}g?`);
      }
    }

    if (criteria.totalFat) {
      const f = criteria.totalFat;
      if (f.max !== undefined && typeof f.max === 'number') {
        const relaxed = relaxMax(f.max);
        suggestions.push(`Would you like options under ${relaxed}g fat?`);
      }
    }

    // If no numeric suggestions yet, and there's an item/name criterion, offer a refinement
    if (suggestions.length === 0 && criteria.item && typeof criteria.item === 'object' && criteria.item.name) {
      suggestions.push(`Narrow results to items matching "${criteria.item.name}"`);
    }

    return suggestions.slice(0, 3);
  };

  const handleSearchChange = (value: string) => {
    // Just update the state while typing
    setSearchQuery(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Navigation Bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.8 }}
        className="sticky top-0 z-40 border-b backdrop-blur-sm"
        style={{
          borderColor:
            "color-mix(in srgb, var(--howl-neutral) 10%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--bg) 95%, transparent)",
        }}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 transition-colors rounded-lg hover:bg-[var(--bg-hover)] flex items-center gap-2 text-[var(--text)]"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline text-sm font-medium">Back</span>
            </Link>
            <Link href="/">
              <Image
                src="/Howl2go_orange_logo_transparent.png"
                alt="Howl2Go Logo"
                width={50}
                height={16}
                priority
              />
            </Link>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 font-semibold rounded-full transition-all hover:scale-105 bg-[var(--orange)] text-[var(--text)] text-sm"
          >
            Dashboard
          </Link>
        </nav>
      </motion.header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Search Bar - Shared Element */}
        <motion.div
          layoutId="hero-search-bar"
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-full max-w-3xl mx-auto">
            <form
              onSubmit={handleSearch}
              className="outline-none focus:outline-none"
            >
              <motion.div
                className="w-full px-6 py-4 rounded-2xl border-2 flex items-center bg-[var(--bg-card)] focus-within:outline-none"
                style={{
                  borderColor: "var(--orange)",
                  boxShadow: "0 8px 24px rgba(198, 107, 77, 0.25)",
                }}
              >
                <input
                  type="text"
                  placeholder="Search for any craving..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  aria-label="Search for food"
                  className="flex-1 bg-transparent outline-none focus:outline-none focus:ring-0 focus-visible:outline-none border-0 text-[var(--text)] placeholder:text-[var(--text-muted)] text-lg sm:text-xl"
                />
                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {searchQuery.trim().length > 0 && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: -10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="text-sm font-medium text-[var(--text-subtle)] flex items-center gap-1"
                      >
                        <span className="hidden sm:inline">Press</span>
                        <kbd className="px-2 py-0.5 text-xs bg-[var(--bg-hover)] border border-[var(--border)] rounded">
                          ↵
                        </kbd>
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <button
                    type="submit"
                    className="bg-transparent border-0 p-0 cursor-pointer outline-none focus:outline-none focus-visible:outline-none"
                  >
                    <Search className="h-6 w-6 text-[var(--orange)] ml-2" />
                  </button>
                </div>
              </motion.div>
            </form>

            {/* Clear conversational context UI */}
            {/* Shows when lastCriteria exists, allowing user to reset search history */}
            {lastCriteria && (
              <div className="mt-3 flex items-center justify-center gap-3">
                <div className="text-sm text-[var(--text-subtle)]">
                  Refining previous search
                </div>
                <button
                  onClick={() => setLastCriteria(null)} // Clears localStorage and state
                  className="px-3 py-1 text-sm rounded-full bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-hover)]"
                  aria-label="Clear search context"
                >
                  Clear context
                </button>
              </div>
            )}
            {/* Conversational refinement suggestions (human-friendly) */}
            {refinementSuggestions && refinementSuggestions.length > 0 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <ul className="flex gap-3 flex-wrap">
                  {refinementSuggestions.map((sugg, i) => (
                    <li key={`refine-${i}`}>
                      <button
                        onClick={() => {
                          // apply suggestion as a new search query
                          setSearchQuery(sugg);
                          const evt = new Event('submit', { bubbles: true });
                          // trigger form submit programmatically
                          document.querySelector('form')?.dispatchEvent(evt);
                        }}
                        className="px-3 py-1 text-sm rounded-full bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-hover)]"
                      >
                        {sugg}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <LoadingSpinner message="Searching for the perfect food items..." size="lg" />
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-[var(--text)] mb-2">
                Oops! Something went wrong
              </h3>
              <p className="text-[var(--text-subtle)] mb-6 max-w-md mx-auto">
                {error}
              </p>
              <button
                onClick={() => setError(null)}
                className="px-6 py-3 rounded-full font-semibold bg-[var(--orange)] text-[var(--text)] hover:bg-[var(--cream)] hover:text-[var(--bg)] transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          ) : foodItems.length > 0 ? (
            <div
              key="results"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {foodItems.map((item, idx) => (
                <div
                  key={`${item.restaurant}-${item.item}-${idx}`}
                  className="opacity-0 animate-[fadeInUp_0.5s_ease-out_forwards]"
                  style={{
                    animationDelay: `${idx * 100}ms`,
                  }}
                >
                  <ItemCard
                    {...item}
                    disableAnimation={true}
                    variant="default"
                    showReviews={true}
                  />
                </div>
              ))}
              <style jsx>{`
                @keyframes fadeInUp {
                  from {
                    opacity: 0;
                    transform: translateY(20px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>
            </div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              {initialQuery ? (
                <>
                  <div className="text-6xl mb-4">😔</div>
                  <h3 className="text-2xl font-bold text-[var(--text)] mb-2">
                    No Results Found
                  </h3>
                  <p className="text-[var(--text-subtle)] mb-4">
                    We couldn&apos;t find any items matching your search.
                    {refinementSuggestions && refinementSuggestions.length > 0 && (
                      <span className="block mt-2">
                        Try one of the suggestions above to broaden your search!
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-2xl font-bold text-[var(--text)] mb-2">
                    Start Your Search
                  </h3>
                  <p className="text-[var(--text-subtle)]">
                    Try searching for something like &quot;100 calories food&quot;
                    or &quot;burger under 300 calories&quot;
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function SmartMenuSearch() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
          <div className="text-[var(--text)]">Loading...</div>
        </div>
      }
    >
      <SmartMenuSearchContent />
    </Suspense>
  );
}
