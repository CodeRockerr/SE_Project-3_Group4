"use client";

import { Search, UtensilsCrossed, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  isDemoMode: boolean;
  isSearchFocused: boolean;
  inputValue: string;
  typedText: string;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
}

export default function SearchBar({
  isDemoMode,
  isSearchFocused,
  inputValue,
  typedText,
  onInputChange,
  onKeyDown,
  onSearchFocus,
  onSearchBlur,
}: SearchBarProps) {
  const router = useRouter();

  return (
    <div className="w-full">
      {/* Search Bar - Hero Element with Shared Layout ID */}
      <div className="mb-8">
        <div
          className={`w-full px-6 py-5 text-xl sm:text-2xl rounded-full border-2 flex items-center min-h-[70px] relative transition-all duration-500 ease-out ${
            isSearchFocused
              ? 'border-[var(--orange)] shadow-[0_8px_24px_rgba(198,107,77,0.25)] scale-[1.02]'
              : 'border-[var(--search-bar-border)] shadow-none scale-100'
          }`}
          style={{
            backgroundColor: isDemoMode
              ? "var(--search-bar-bg-demo)"
              : "var(--search-bar-bg-live)",
          }}
        >
          {/* Always-present search input - focusable in both demo and live modes */}
          <input
            type="text"
            placeholder={isDemoMode ? "" : "Search for any craving..."}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            autoFocus={!isDemoMode}
            aria-label="Search for food"
            className="flex-1 bg-transparent border-none focus:border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-[var(--search-bar-text)] placeholder:text-[var(--search-bar-placeholder)] relative z-10"
          />

          {/* Demo Mode: Typewriter text overlay (positioned absolutely, doesn't block input) */}
          {isDemoMode && (
            <div className="absolute inset-0 flex items-center px-6 pointer-events-none select-none">
              <span className="text-[var(--howl-neutral)]">{typedText}</span>
              <span className="w-0.5 h-7 animate-pulse bg-[var(--howl-primary)] ml-1"></span>
            </div>
          )}

          {/* Search icon in Live Mode with Enter CTA */}
          {!isDemoMode && (
            <div className="flex items-center gap-2 ml-2 relative z-10">
              <div
                className={`transition-colors duration-300 ${
                  isSearchFocused ? 'text-[var(--orange)]' : 'text-[var(--howl-secondary)]'
                }`}
              >
                <Search className="h-6 w-6" />
              </div>
              {isSearchFocused && inputValue.trim().length > 0 && (
                <span className="text-sm font-medium text-[var(--cream)] flex items-center gap-1 animate-[fadeIn_0.3s_ease-out]">
                  <span className="hidden sm:inline">Press</span>
                  <kbd className="px-2 py-0.5 text-xs bg-[var(--bg-hover)] border border-[var(--border)] rounded">
                    ↵
                  </kbd>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Below-bar actions */}
        <div className="mt-6 flex flex-col items-center gap-3">
          {isSearchFocused && inputValue.trim().length > 1 && (
            <p className="text-xs text-[var(--text-subtle)] opacity-70 animate-[fadeIn_0.3s_ease-out]">
              Press Enter to search
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <span className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--text)] flex items-center gap-2 text-center leading-tight">
              <span>Order based on</span>
              <span className="relative inline-block">
                Ingredients
                <motion.svg
                  className="absolute -bottom-1 left-0 w-full"
                  height="6"
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
              <span>&rarr;</span>
            </span>
            <button
              type="button"
              onClick={() => router.push('/recommendations/ingredients')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--orange)] text-[var(--text)] text-sm font-semibold hover:bg-[var(--cream)] hover:text-[var(--bg)] transition-colors border border-[var(--orange)] shadow-[0_4px_14px_rgba(0,0,0,0.35)] focus:outline-none focus:ring-2 focus:ring-[var(--orange)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]"
              aria-label="Ingredient based recommendations"
            >
              <UtensilsCrossed className="h-4 w-4" />
              Ingredient Matches
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
