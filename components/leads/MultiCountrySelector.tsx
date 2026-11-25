"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { ALL_193_COUNTRIES } from "@/lib/countries";
import { Globe, Check, Search, ChevronDown } from "lucide-react";

interface MultiCountrySelectorProps {
  selectedCountries: string[];
  onChange: (countries: string[]) => void;
  singleSelect?: boolean;
}

const POPULAR_COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "United Arab Emirates",
  "Saudi Arabia",
  "Pakistan",
  "India",
  "Singapore",
];

export function MultiCountrySelector({
  selectedCountries,
  onChange,
  singleSelect = false,
}: MultiCountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return ALL_193_COUNTRIES;
    const q = searchQuery.toLowerCase().trim();
    return ALL_193_COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [searchQuery]);

  const toggleCountry = (country: string) => {
    if (singleSelect) {
      onChange([country]);
      setIsOpen(false);
      return;
    }

    if (selectedCountries.includes(country)) {
      onChange(selectedCountries.filter((c) => c !== country));
    } else {
      onChange([...selectedCountries, country]);
    }
  };

  const handleSelectAll = () => {
    if (searchQuery.trim()) {
      const merged = Array.from(new Set([...selectedCountries, ...filteredCountries]));
      onChange(merged);
    } else {
      onChange([...ALL_193_COUNTRIES]);
    }
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  const handleClearSelection = () => {
    onChange([]);
    setSearchQuery("");
  };

  const isAllSelected = selectedCountries.length >= ALL_193_COUNTRIES.length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0c1017] px-3.5 py-2.5 text-xs text-white hover:border-blue-500/50 transition-all text-left"
      >
        <div className="flex items-center gap-2 truncate">
          <Globe className="h-3.5 w-3.5 text-purple-400 shrink-0" />
          <span className="truncate">
            {selectedCountries.length === 0
              ? "Select Country / Countries..."
              : isAllSelected
              ? `All ${ALL_193_COUNTRIES.length} Countries`
              : selectedCountries.length === 1
              ? selectedCountries[0]
              : `${selectedCountries[0]} +${selectedCountries.length - 1} more (${selectedCountries.length})`}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
            {selectedCountries.length}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-white/10 bg-[#0f1420] p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 w-full min-w-[290px]">
          <div className="relative mb-2">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${ALL_193_COUNTRIES.length} countries...`}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              autoFocus
            />
          </div>

          {!singleSelect && (
            <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.08] mb-2 text-[11px]">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
              >
                {searchQuery.trim() ? `Select Matching (${filteredCountries.length})` : `Select All (${ALL_193_COUNTRIES.length})`}
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Deselect All
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="mb-2">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Quick Markets</div>
            <div className="flex flex-wrap gap-1">
              {POPULAR_COUNTRIES.map((c) => {
                const active = selectedCountries.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCountry(c)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                      active
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
            {filteredCountries.map((c) => {
              const isSelected = selectedCountries.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCountry(c)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-purple-500/20 text-purple-200 font-medium"
                      : "hover:bg-white/[0.04] text-slate-300"
                  }`}
                >
                  <span className="truncate">{c}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-purple-400 shrink-0" />}
                </button>
              );
            })}
            {filteredCountries.length === 0 && (
              <div className="py-4 text-center text-xs text-slate-500">No countries match your search.</div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono">{selectedCountries.length} selected</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-xs text-white font-medium cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
