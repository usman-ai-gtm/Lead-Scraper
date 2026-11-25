"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { getCityOptionsForCountries } from "@/lib/cities";
import { Building2, Check, ChevronDown, Search, Plus } from "lucide-react";

export interface SelectedCityTarget {
  city: string;
  country: string;
  key: string; // `${city}||${country}`
}

interface MultiCitySelectorProps {
  selectedCountries: string[];
  specificCitiesEnabled: boolean;
  onToggleSpecificCities: (enabled: boolean) => void;
  selectedCities: SelectedCityTarget[];
  onChangeCities: (cities: SelectedCityTarget[]) => void;
}

export function MultiCitySelector({
  selectedCountries,
  specificCitiesEnabled,
  onToggleSpecificCities,
  selectedCities,
  onChangeCities,
}: MultiCitySelectorProps) {
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

  // Remove any previously selected cities that belong to deselected countries
  useEffect(() => {
    if (selectedCities.length === 0) return;
    const countrySet = new Set(selectedCountries);
    const filtered = selectedCities.filter((c) => countrySet.has(c.country));
    if (filtered.length !== selectedCities.length) {
      onChangeCities(filtered);
    }
  }, [selectedCountries]); // eslint-disable-line react-hooks/exhaustive-deps

  const cityOptions = useMemo(() => {
    if (!specificCitiesEnabled || selectedCountries.length === 0) return [];
    const perCountryCap = selectedCountries.length > 5 ? 25 : selectedCountries.length > 1 ? 60 : 250;
    return getCityOptionsForCountries(selectedCountries, searchQuery, perCountryCap);
  }, [specificCitiesEnabled, selectedCountries, searchQuery]);

  const selectedKeys = useMemo(() => new Set(selectedCities.map((c) => c.key)), [selectedCities]);

  const toggleCity = (opt: SelectedCityTarget) => {
    if (selectedKeys.has(opt.key)) {
      onChangeCities(selectedCities.filter((c) => c.key !== opt.key));
    } else {
      onChangeCities([...selectedCities, opt]);
    }
  };

  const handleSelectAllMatching = () => {
    const map = new Map<string, SelectedCityTarget>();
    for (const c of selectedCities) map.set(c.key, c);
    for (const opt of cityOptions) map.set(opt.key, opt);
    onChangeCities(Array.from(map.values()));
  };

  const handleClearCities = () => {
    onChangeCities([]);
  };

  const handleAddCustomCity = () => {
    const clean = searchQuery.trim();
    if (!clean || selectedCountries.length === 0) return;
    const country = selectedCountries[0];
    const key = `${clean}||${country}`;
    if (!selectedKeys.has(key)) {
      onChangeCities([...selectedCities, { city: clean, country, key }]);
    }
    setSearchQuery("");
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={specificCitiesEnabled}
            onChange={(e) => {
              const checked = e.target.checked;
              onToggleSpecificCities(checked);
              if (!checked) {
                setIsOpen(false);
              }
            }}
            className="h-3.5 w-3.5 rounded border-white/20 bg-[#121824] text-blue-500 focus:ring-blue-500/40"
          />
          <Building2 className="h-3.5 w-3.5 text-amber-400" />
          <span>Select Specific Cities</span>
        </label>
        <span className="text-[10px] font-mono text-slate-400">
          {specificCitiesEnabled ? "City Filter Active" : "Whole Country Mode"}
        </span>
      </div>

      {!specificCitiesEnabled ? (
        <div className="w-full rounded-xl border border-white/[0.08] bg-[#121824]/70 px-3 py-2.5 text-[11px] text-slate-300 flex items-center justify-between gap-2">
          <span className="truncate">
            Whole country coverage ({selectedCountries.length || 0}{" "}
            {selectedCountries.length === 1 ? "country" : "countries"})
          </span>
          <button
            type="button"
            onClick={() => onToggleSpecificCities(true)}
            className="text-[10px] font-bold text-amber-400 hover:text-amber-300 shrink-0 cursor-pointer"
          >
            Pick Cities
          </button>
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            disabled={selectedCountries.length === 0}
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-[#0c1017] px-3.5 py-2.5 text-xs text-white hover:border-amber-400/60 transition-all text-left disabled:opacity-50"
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                {selectedCountries.length === 0
                  ? "Select a country first..."
                  : selectedCities.length === 0
                  ? "Choose 1 or more cities..."
                  : selectedCities.length === 1
                  ? `${selectedCities[0].city} (${selectedCities[0].country})`
                  : `${selectedCities[0].city} +${selectedCities.length - 1} more (${selectedCities.length})`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
                {selectedCities.length}
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
                  placeholder="Search cities in selected countries..."
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.08] mb-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllMatching}
                  disabled={cityOptions.length === 0}
                  className="text-amber-400 hover:text-amber-300 font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Select Shown ({cityOptions.length})
                </button>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleClearCities}
                    className="text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCities}
                    className="text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
                {cityOptions.map((opt) => {
                  const isSelected = selectedKeys.has(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleCity(opt)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-amber-500/20 text-amber-200 font-medium"
                          : "hover:bg-white/[0.04] text-slate-300"
                      }`}
                    >
                      <span className="truncate">
                        {opt.city}
                        {selectedCountries.length > 1 && (
                          <span className="text-[10px] text-slate-400 ml-1.5">({opt.country})</span>
                        )}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}

                {cityOptions.length === 0 && (
                  <div className="py-3 text-center text-xs text-slate-500 space-y-2">
                    <div>No matching city found in dataset for selected countries.</div>
                    {searchQuery.trim() && selectedCountries.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAddCustomCity}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-semibold cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add &quot;{searchQuery.trim()}&quot; ({selectedCountries[0]})</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">{selectedCities.length} cities selected</span>
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
      )}
    </div>
  );
}
