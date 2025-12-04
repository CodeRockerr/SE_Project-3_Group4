"use client";
import { useState, useEffect, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';

interface IngredientTagInputProps {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export default function IngredientTagInput({ label, value, onChange, placeholder = 'Type ingredient and press Enter', maxTags = 25 }: IngredientTagInputProps) {
  const [input, setInput] = useState('');

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    if (value.includes(tag)) return;
    if (value.length >= maxTags) return;
    onChange([...value, tag]);
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && value.length) {
      // Remove last tag on backspace when empty
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold tracking-wide text-[var(--cream)] uppercase">{label}</label>
      <div className="flex flex-wrap gap-2 p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] min-h-[56px] focus-within:border-[var(--orange)] transition-colors">
        {value.map(tag => (
          <span key={tag} className="group inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[var(--orange)]/20 border border-[var(--orange)]/40 text-[var(--text)]">
            {tag}
            <button type="button" aria-label={`Remove ${tag}`} onClick={() => removeTag(tag)} className="opacity-60 group-hover:opacity-100 hover:text-[var(--cream)]">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length ? '' : placeholder}
          className="flex-1 min-w-[140px] bg-transparent outline-none text-xs placeholder:text-[var(--text-muted)]"
        />
        {!!input && (
          <button
            type="button"
            onClick={() => addTag(input)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[var(--orange)] text-[var(--bg)] font-semibold hover:bg-[var(--cream)] hover:text-[var(--bg)] transition-colors"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        )}
      </div>
      {value.length >= maxTags && (
        <p className="text-[var(--warning)] text-[10px]">Max {maxTags} ingredients reached.</p>
      )}
    </div>
  );
}
