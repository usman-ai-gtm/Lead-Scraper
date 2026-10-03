"use client";

import React, { useState, useEffect } from "react";
import FeatureRunner from "@/components/features/FeatureRunner";
import {
  Sparkles, Search, Layers, Play, CheckCircle2, AlertTriangle,
  Shield, Terminal, SlidersHorizontal, ArrowRight, Filter
} from "lucide-react";
import { api } from "@/lib/api";

const TIERS = [
  { id: "all", name: "All 600 Features", range: "1–600" },
  { id: "core", name: "Core Intelligence", range: "1–100" },
  { id: "nextgen", name: "NextGen & Research", range: "101–200" },
  { id: "ultra201", name: "Ultra GTM Signals", range: "201–300" },
  { id: "ultra301", name: "Ultra Enterprise", range: "301–400" },
  { id: "outreach", name: "Outreach & WhatsApp", range: "401–500" },
  { id: "predictive", name: "Predictive & Command", range: "501–600" },
];

export default function FeaturesUniversalHub() {
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [activeFeatureId, setActiveFeatureId] = useState<number>(111);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.get<{ total_features: number; features: any[] }>("/features/catalog")
      .then((data) => {
        if (data?.features) setCatalog(data.features);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = catalog.filter((f) => {
    // Tier filter
    let matchTier = true;
    if (selectedTier === "core") matchTier = f.id >= 1 && f.id <= 100;
    else if (selectedTier === "nextgen") matchTier = f.id >= 101 && f.id <= 200;
    else if (selectedTier === "ultra201") matchTier = f.id >= 201 && f.id <= 300;
    else if (selectedTier === "ultra301") matchTier = f.id >= 301 && f.id <= 400;
    else if (selectedTier === "outreach") matchTier = f.id >= 401 && f.id <= 500;
    else if (selectedTier === "predictive") matchTier = f.id >= 501 && f.id <= 600;

    // Search filter
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.id.toString().includes(search) ||
      f.group.toLowerCase().includes(search.toLowerCase());

    return matchTier && matchSearch;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
            <Sparkles className="h-3.5 w-3.5" /> Universal Feature Hub (1–600)
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Enterprise Feature Engine & Execution Lab
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete inventory of all 600 registered intelligence, signal radar, CRM, outreach, and predictive features.
          </p>
        </div>
      </div>

      {/* Active Feature Runner Workspace */}
      <FeatureRunner initialFeatureId={activeFeatureId} key={activeFeatureId} />

      {/* 600-Feature Catalog Browser */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
          {/* Tier Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            {TIERS.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTier(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedTier === t.id
                    ? "bg-blue-600 text-white shadow-glow-sm"
                    : "bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                {t.name} <span className="opacity-60 text-[10px]">({t.range})</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, #ID, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4 text-xs text-slate-400">
            <span>Showing <strong>{filtered.length}</strong> of 600 registered features</span>
            <span className="text-[11px] text-slate-500">Click any card to load into Execution Studio</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading catalog...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.slice(0, 75).map((f) => (
                <div
                  key={f.id}
                  onClick={() => {
                    setActiveFeatureId(f.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                    activeFeatureId === f.id
                      ? "border-blue-500/50 bg-blue-500/[0.08]"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">#{f.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      f.status === "READY"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {f.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mt-1 group-hover:text-blue-300 transition-colors">
                    {f.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{f.group}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
