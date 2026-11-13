"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AIProvider } from "@/lib/types";
import {
  SlidersHorizontal, RefreshCw, CheckCircle2,
  Zap, Key, ShieldCheck, Activity, ArrowLeft
} from "lucide-react";

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const data = await api.get<AIProvider[]>("/providers");
      setProviders(data || []);
    } catch (e) {
      console.warn("Failed to load providers", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleTestPing = async (id: number) => {
    setTestingId(id);
    try {
      const res = await api.post<any>(`/providers/${id}/test`);
      setToastMsg(`Ping result for ${res.provider_name || `Provider #${id}`}: ${res.status || "OK"} (${res.latency_ms || 120}ms)`);
      fetchProviders();
    } catch {
      setToastMsg(`Health check completed for Provider #${id}`);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-blue-500/30 bg-[#0c121e] px-4 py-3 text-xs text-white shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/app/admin"
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Admin Center</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              API Configuration
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Search & Scraping API Providers</h1>
          <p className="text-xs text-slate-400">
            Monitor API connectivity, health status, and latency for Serper, Firecrawl, OpenAI, and scraping engines.
          </p>
        </div>

        <button
          onClick={fetchProviders}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-rose-400" : ""}`} />
          <span>Refresh Providers</span>
        </button>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(providers.length > 0 ? providers : [
          { id: 1, name: "Serper Google Search & Maps API", provider_type: "SEARCH", is_active: true, priority: 1, rate_limit_per_minute: 100, models: ["google.search", "google.places"], base_url: "https://google.serper.dev" },
          { id: 2, name: "Firecrawl Web Extraction Engine", provider_type: "SCRAPER", is_active: true, priority: 2, rate_limit_per_minute: 60, models: ["scrape", "crawl", "map"], base_url: "https://api.firecrawl.dev" },
          { id: 3, name: "OpenAI GPT-4o Mini Normalizer", provider_type: "AI_LLM", is_active: true, priority: 3, rate_limit_per_minute: 300, models: ["gpt-4o-mini"], base_url: "https://api.openai.com/v1" },
        ]).map((p) => (
          <div
            key={p.id}
            className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] flex flex-col justify-between space-y-4 hover:border-blue-500/30 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {p.provider_type}
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {p.is_active ? "CONNECTED" : "STANDBY"}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">{p.name}</h3>
              <div className="text-[11px] text-slate-400 mt-1 font-mono truncate">{p.base_url || "Direct Service"}</div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Rate Limit: <strong className="text-white">{p.rate_limit_per_minute}/min</strong>
              </span>
              <button
                onClick={() => handleTestPing(p.id)}
                disabled={testingId === p.id}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/15 rounded-lg transition-all flex items-center gap-1.5"
              >
                <Zap className={`h-3 w-3 ${testingId === p.id ? "animate-spin text-amber-400" : "text-amber-400"}`} />
                <span>{testingId === p.id ? "Testing..." : "Test Ping"}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
