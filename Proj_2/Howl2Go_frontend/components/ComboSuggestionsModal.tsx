"use client";

import React from "react";
import { X, Plus } from "lucide-react";

import type { ComboSuggestion } from "@/lib/api/combo";

// Convert backend reason codes to user-friendly labels
function formatReason(reason?: string): string | null {
  if (!reason) return null;
  // Hide technical/internal reason codes (fallbacks, db keys, etc.)
  // Only show friendly labels for known reasons.
  const reasonLabels: Record<string, string | null> = {
    popular_together: "Popular pair",
    // Show a friendly label for same-company fallback instead of raw code
    same_company_fallback: "More from this restaurant",
  };

  // If we have a friendly label, return it
  if (reasonLabels[reason] !== undefined) return reasonLabels[reason];

  // Defensive: don't show raw codes that look like internal identifiers
  // (contain underscores or are all-lowercase single-word tokens)
  if (/[_]/.test(reason) || /^([a-z0-9]+_?)+$/.test(reason)) return null;

  // Otherwise, return as-is (should be already human-friendly)
  return reason;
}

type Props = {
  suggestions: ComboSuggestion[];
  onAddOne: (itemId: string) => Promise<void>;
  onAddAll: (
    items: { foodItemId: string; quantity?: number }[]
  ) => Promise<void>;
  onApply?: (opts: {
    nutritional_focus?: string;
    preferences?: Record<string, unknown>;
  }) => Promise<ComboSuggestion[]>;
  onClose: () => void;
};

export default function ComboSuggestionsModal({
  suggestions,
  onAddOne,
  onAddAll,
  onApply,
  onClose,
}: Props) {
  const [nutritionalFocus, setNutritionalFocus] =
    React.useState<string>("balanced");
  const [preferences, setPreferences] = React.useState({
    vegetarian: false,
    low_sugar: false,
    low_sodium: false,
  });
  const [isApplying, setIsApplying] = React.useState(false);

  // DEBUG: Log suggestions to see what the backend returned
  React.useEffect(() => {
    console.log("ComboSuggestionsModal received suggestions:", suggestions);
    suggestions.forEach((s) => {
      console.log(
        `  - ${s.item.item}: reason=${s.reason}, formatReason=${formatReason(
          s.reason
        )}`
      );
    });
  }, [suggestions]);

  if (!suggestions || suggestions.length === 0) return null;

  const handleApply = async () => {
    if (!onApply) return;
    setIsApplying(true);
    try {
      await onApply({ nutritional_focus: nutritionalFocus, preferences });
    } catch (err) {
      console.error("Failed to apply preferences", err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        className="relative w-full max-w-3xl mx-4 mb-6 md:mb-0 bg-[var(--bg-card)] rounded-2xl p-6 border"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
            Complete Your Meal
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-[var(--bg-hover)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm mb-4" style={{ color: "var(--text-subtle)" }}>
          Popular items that pair well with your selection. Add individually or
          all at once.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-full mb-2">
            <div className="flex items-center gap-3">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--text)" }}
              >
                Nutritional focus:
              </label>
              <select
                value={nutritionalFocus}
                onChange={(e) => setNutritionalFocus(e.target.value)}
                className="px-2 py-1 rounded"
                style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
              >
                <option value="balanced">Balanced</option>
                <option value="low_calorie">Low Calorie</option>
                <option value="high_protein">High Protein</option>
                <option value="low_sugar">Low Sugar</option>
              </select>

              <div className="ml-4 flex items-center gap-2">
                <label className="text-sm" style={{ color: "var(--text)" }}>
                  <input
                    type="checkbox"
                    checked={preferences.vegetarian}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        vegetarian: e.target.checked,
                      })
                    }
                    className="mr-1"
                  />
                  Veg
                </label>
                <label className="text-sm" style={{ color: "var(--text)" }}>
                  <input
                    type="checkbox"
                    checked={preferences.low_sugar}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        low_sugar: e.target.checked,
                      })
                    }
                    className="mr-1"
                  />
                  Low sugar
                </label>
                <label className="text-sm" style={{ color: "var(--text)" }}>
                  <input
                    type="checkbox"
                    checked={preferences.low_sodium}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        low_sodium: e.target.checked,
                      })
                    }
                    className="mr-1"
                  />
                  Low sodium
                </label>
              </div>

              <button
                onClick={handleApply}
                disabled={isApplying}
                className="ml-auto px-3 py-1 rounded font-medium"
                style={{
                  backgroundColor: "var(--orange)",
                  color: "var(--text)",
                }}
              >
                {isApplying ? "Applying..." : "Apply"}
              </button>
            </div>
          </div>
          {suggestions.map((s) => (
            <div
              key={s.item._id}
              className="flex items-center gap-4 p-3 rounded-lg"
              style={{
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex-1">
                <div className="font-semibold" style={{ color: "var(--text)" }}>
                  {s.item.item || s.item._id}
                </div>
                <div
                  className="text-sm"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {s.item.company}
                </div>
                <div
                  className="text-xs mt-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {s.item.calories ? `${s.item.calories} cal · ` : ""}
                  {s.item.protein ? `${s.item.protein}g protein` : ""}
                </div>
                {formatReason(s.reason) && (
                  <div
                    className="text-xs mt-2 italic"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    {formatReason(s.reason)}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2">
                  {typeof s.nutritionalScore === "number" && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "var(--bg-chip)",
                        color: "var(--text)",
                      }}
                    >
                      Nut: {(s.nutritionalScore * 100).toFixed(0)}%
                    </span>
                  )}
                  {typeof s.popularity === "number" && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "var(--bg-chip)",
                        color: "var(--text)",
                      }}
                    >
                      Pop: {(s.popularity * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div
                  className="font-bold text-lg"
                  style={{ color: "var(--cream)" }}
                >
                  ${(s.item.price ?? 0).toFixed(2)}
                </div>
                <button
                  onClick={() => onAddOne(s.item._id)}
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: "var(--orange)",
                    color: "var(--text)",
                  }}
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded"
            style={{ color: "var(--text-subtle)" }}
          >
            Maybe later
          </button>
          <button
            onClick={() =>
              onAddAll(
                suggestions.map((s) => ({
                  foodItemId: s.item._id,
                  quantity: 1,
                }))
              )
            }
            className="px-4 py-2 rounded font-semibold"
            style={{ backgroundColor: "var(--orange)", color: "var(--text)" }}
          >
            Add All
          </button>
        </div>
      </div>
    </div>
  );
}
