"use client";

import React from "react";
import { X, Plus } from "lucide-react";

import type { ComboSuggestion } from "@/lib/api/combo";

type Props = {
  suggestions: ComboSuggestion[];
  onAddOne: (itemId: string) => Promise<void>;
  onAddAll: (
    items: { foodItemId: string; quantity?: number }[]
  ) => Promise<void>;
  onClose: () => void;
};

export default function ComboSuggestionsModal({
  suggestions,
  onAddOne,
  onAddAll,
  onClose,
}: Props) {
  if (!suggestions || suggestions.length === 0) return null;

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
