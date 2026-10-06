"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FeatureRunner from "@/components/features/FeatureRunner";
import {
  Sparkles, Search, Layers, Play, CheckCircle2, AlertTriangle,
  Shield, Terminal, SlidersHorizontal, ArrowRight, Filter,
  Workflow, Database, Mail, LineChart, Users, ChevronRight,
  Maximize2, Minimize2, ExternalLink, Zap
} from "lucide-react";
import { api } from "@/lib/api";

const MODULE_CATEGORIES = [
  { id: "all", name: "All 600 Capabilities" },
  { id: "LEAD DISCOVERY", name: "Leads" },
  { id: "DATA ENRICHMENT", name: "Enrichment" },
  { id: "COMPANY INTELLIGENCE", name: "Company Intel" },
  { id: "AI RESEARCH", name: "Research" },
  { id: "BUYER INTELLIGENCE", name: "Buyer Intel" },
  { id: "SIGNALS & INTENT", name: "Signals & Intent" },
  { id: "CRM & PIPELINE", name: "CRM" },
  { id: "EMAIL OUTREACH", name: "Outreach" },
  { id: "WHATSAPP & OMNICHANNEL", name: "WhatsApp" },
  { id: "REVENUE INTELLIGENCE", name: "Revenue" },
  { id: "CUSTOMER SUCCESS", name: "Customers" },
  { id: "ABM", name: "ABM" },
  { id: "WORKFLOW AUTOMATION", name: "Automation" },
  { id: "ANALYTICS", name: "Analytics" },
  { id: "ADMIN CONTROL CENTER", name: "Admin" }
];

function FeaturesUniversalHubContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") ? parseInt(searchParams.get("id")!, 10) : 111;

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [activeFeatureId, setActiveFeatureId] = useState<number>(initialId);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"simple" | "advanced">("simple");

  useEffect(() => {
    // Check if query param changes
    const paramId = searchParams.get("id");
    if (paramId) {
      setActiveFeatureId(parseInt(paramId, 10));
    }
  }, [searchParams]);

  useEffect(() => {
    api.get<{ total_features: number; features: any[] }>("/features/catalog")
      .then((data) => {
        if (data?.features) setCatalog(data.features);
      })
      .catch(() => {
        // Fallback to local import if needed
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return catalog.filter((f) => {
      // Category filter
      let matchCat = true;
      if (activeCategory !== "all") {
        matchCat = (f.module && f.module.toLowerCase() === activeCategory.toLowerCase()) ||
                   (f.group && f.group.toLowerCase().includes(activeCategory.toLowerCase()));
      }

      // Search filter (searches by intent, name, id, module, description)
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.id.toString() === q ||
        (f.module && f.module.toLowerCase().includes(q)) ||
        (f.description && f.description.toLowerCase().includes(q)) ||
        (f.group && f.group.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [catalog, activeCategory, search]);

  const activeFeature = catalog.find((c) => c.id === activeFeatureId) || {
    id: activeFeatureId,
    name: `Feature #${activeFeatureId}`,
    module: "LEAD DISCOVERY",
    description: "Enterprise intelligence capability"
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
            <Sparkles className="h-3.5 w-3.5" /> Enterprise Capability Architecture
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            GTM Feature Library & Execution Studio
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search and launch 600+ interconnected intelligence, outreach, research, and predictive capabilities.
          </p>
        </div>

        {/* Simple vs Advanced Toggle */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-[#0c1017] border border-white/[0.08] self-start md:self-auto">
          <button
            onClick={() => setViewMode("simple")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "simple"
                ? "bg-blue-600 text-white shadow-glow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Simple Mode
          </button>
          <button
            onClick={() => setViewMode("advanced")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "advanced"
                ? "bg-blue-600 text-white shadow-glow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Advanced Engine
          </button>
        </div>
      </div>

      {/* Active Feature Runner Workspace */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Active Capability in Execution Studio
          </span>
          {viewMode === "advanced" && (
            <span className="text-xs font-mono text-blue-400">
              Feature ID: #{activeFeatureId} • Endpoint: /api/features/{activeFeatureId}/execute
            </span>
          )}
        </div>
        <FeatureRunner initialFeatureId={activeFeatureId} key={activeFeatureId} />
      </div>

      {/* Capability Search & Category Browser */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          {/* Global Capability Search */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search 600+ capabilities (e.g. buying committee, win probability, whatsapp)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div className="text-xs text-slate-400">
            Showing <strong className="text-white">{filtered.length}</strong> of 600 capabilities
          </div>
        </div>

        {/* Module Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2">
          {MODULE_CATEGORIES.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveCategory(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === m.id
                  ? "bg-blue-600 text-white shadow-glow-sm"
                  : "bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        {/* Capability Cards Grid */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Indexing 600 capabilities from enterprise engine...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.slice(0, 90).map((f) => {
              const isSelected = activeFeatureId === f.id;
              return (
                <div
                  key={f.id}
                  onClick={() => {
                    setActiveFeatureId(f.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
                    isSelected
                      ? "border-blue-500 bg-blue-500/10 shadow-glow-sm"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {f.module || "GTM INTELLIGENCE"}
                      </span>
                      {viewMode === "advanced" && (
                        <span className="font-mono text-xs text-slate-500 font-bold">
                          #{f.id}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                      {f.name}
                    </h3>

                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {f.description || `Enterprise capability #${f.id} for automated GTM intelligence.`}
                    </p>
                  </div>

                  {/* Connected Features & Action */}
                  <div className="pt-3 mt-3 border-t border-white/[0.04] flex items-center justify-between">
                    <div className="text-[10px] text-slate-500">
                      {f.connected_features ? (
                        <span>Connected to: #{f.connected_features.slice(0, 2).join(", #")}</span>
                      ) : (
                        <span>Status: <strong>{f.status || "READY"}</strong></span>
                      )}
                    </div>

                    <span className="flex items-center gap-1 text-xs font-bold text-blue-400 group-hover:text-blue-300">
                      {isSelected ? "Active" : "Open"} <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FeaturesUniversalHub() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-slate-500">Loading capability studio...</div>}>
      <FeaturesUniversalHubContent />
    </Suspense>
  );
}
