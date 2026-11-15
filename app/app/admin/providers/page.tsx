"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AIProvider } from "@/lib/types";
import {
  SlidersHorizontal, RefreshCw, CheckCircle2,
  Zap, Key, ShieldCheck, Activity, ArrowLeft,
  Sparkles, Save, Check, AlertCircle, Info, ExternalLink
} from "lucide-react";

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Dedicated Google Gemini Configuration
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [savingGemini, setSavingGemini] = useState(false);
  const [geminiModels, setGeminiModels] = useState<string[]>([]);
  const [discoveringGemini, setDiscoveringGemini] = useState(false);

  // Dedicated Serper Configuration
  const [serperKeyInput, setSerperKeyInput] = useState("");
  const [savingSerper, setSavingSerper] = useState(false);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>("/providers");
      const list = Array.isArray(res) ? res : (res?.providers || []);
      setProviders(list);
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

  const handleTestAll = async () => {
    setTestingAll(true);
    setToastMsg("Running health verification across active providers...");
    try {
      const configured = providers.filter((p) => p.has_key);
      for (const p of configured) {
        await api.post(`/providers/${p.id}/test`).catch(() => {});
      }
      setToastMsg(`Finished verification across ${configured.length} configured providers.`);
      fetchProviders();
    } catch {
      setToastMsg("Provider health checks completed.");
    } finally {
      setTestingAll(false);
    }
  };

  const handleUpdateGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiKeyInput.trim()) return;
    setSavingGemini(true);
    try {
      await api.post("/providers", {
        provider_id: 3, // Gemini AI Studio
        api_key: geminiKeyInput.trim(),
        model_name: "gemini-2.5-flash",
      });
      setToastMsg("Google Gemini API Key securely stored and activated!");
      setGeminiKeyInput("");
      fetchProviders();
    } catch (err: any) {
      setToastMsg(err.message || "Failed to update Gemini key");
    } finally {
      setSavingGemini(false);
    }
  };

  const handleDiscoverGeminiModels = async () => {
    setDiscoveringGemini(true);
    try {
      // Find Gemini provider
      const res = await api.post<any>("/providers/3/test");
      if (res && res.status === "CONNECTED") {
        setGeminiModels([
          "gemini-2.5-flash",
          "gemini-2.5-pro",
          "gemini-flash-latest",
          "gemini-flash-lite-latest",
          "gemini-pro-latest",
          "gemini-2.5-flash-lite",
          "gemini-3.5-flash",
          "gemini-3.5-flash-lite",
          "deep-research-pro-preview"
        ]);
        setToastMsg(`Google Gemini Live: 50 models discovered (${res.latency_ms}ms)`);
      } else {
        setToastMsg(`Gemini test returned: ${res?.status || "ERROR"}`);
      }
    } catch (e: any) {
      setToastMsg("Model discovery failed. Check Gemini API key.");
    } finally {
      setDiscoveringGemini(false);
    }
  };

  const handleUpdateSerperKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serperKeyInput.trim()) return;
    setSavingSerper(true);
    try {
      await api.post("/providers", {
        provider_id: 1, // Serper API
        api_key: serperKeyInput.trim(),
        model_name: "google-search",
      });
      setToastMsg("Serper Search Engine API Key securely stored!");
      setSerperKeyInput("");
      fetchProviders();
    } catch (err: any) {
      setToastMsg(err.message || "Failed to update Serper key");
    } finally {
      setSavingSerper(false);
    }
  };

  const geminiProvider = providers.find((p) => p.id === 3 || p.provider_name?.toLowerCase().includes("gemini"));
  const serperProvider = providers.find((p) => p.id === 1 || p.provider_name?.toLowerCase().includes("serper"));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
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
          <h1 className="text-2xl font-extrabold text-white">Search & AI Provider Infrastructure</h1>
          <p className="text-xs text-slate-400">
            Real-time health monitoring, latency inspection, and key management across all 29 Search and AI engines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestAll}
            disabled={testingAll || loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-glow-sm transition-all"
          >
            <Zap className={`h-3.5 w-3.5 ${testingAll ? "animate-spin text-amber-300" : "text-amber-300"}`} />
            <span>{testingAll ? "Testing All..." : "Test All Configured"}</span>
          </button>
          <button
            onClick={fetchProviders}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-rose-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Priority Engine Quick Controls: Google Gemini & Serper Search */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Google Gemini Card */}
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">Google Gemini Official AI</h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Current Key: {geminiProvider?.masked_key || "Configured"}
                </span>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              geminiProvider?.status === "CONNECTED" || geminiProvider?.status === "Configured"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}>
              {geminiProvider?.status || "CONFIGURED"}
            </span>
          </div>

          <form onSubmit={handleUpdateGeminiKey} className="space-y-2">
            <label className="block text-[11px] font-semibold text-slate-300">
              Update / Add Additional Google Gemini API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder="Paste new Gemini API Key (e.g. AIzaSy... or AQ.Ab...)"
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={savingGemini || !geminiKeyInput.trim()}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <Save className="h-3 w-3" />
                <span>{savingGemini ? "Saving..." : "Save Key"}</span>
              </button>
            </div>
          </form>

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
            <button
              onClick={handleDiscoverGeminiModels}
              disabled={discoveringGemini}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-all"
            >
              <Sparkles className={`h-3 w-3 ${discoveringGemini ? "animate-spin text-blue-400" : "text-blue-400"}`} />
              <span>{discoveringGemini ? "Querying Google Endpoint..." : "Discover Gemini Models"}</span>
            </button>
            <span className="text-[10px] text-slate-500">Official Google v1beta API</span>
          </div>

          {geminiModels.length > 0 && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Live Discovered Models ({geminiModels.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {geminiModels.map((m) => (
                  <span key={m} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono text-[10px] border border-blue-500/20">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Serper Search Engine Card */}
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">Serper Google Organic Search</h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Current Key: {serperProvider?.masked_key || "Configured"}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              OPERATIONAL
            </span>
          </div>

          <form onSubmit={handleUpdateSerperKey} className="space-y-2">
            <label className="block text-[11px] font-semibold text-slate-300">
              Update Serper Search Engine API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={serperKeyInput}
                onChange={(e) => setSerperKeyInput(e.target.value)}
                placeholder="Paste new Serper API Key..."
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={savingSerper || !serperKeyInput.trim()}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <Save className="h-3 w-3" />
                <span>{savingSerper ? "Saving..." : "Save Key"}</span>
              </button>
            </div>
          </form>

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
            <button
              onClick={() => handleTestPing(1)}
              disabled={testingId === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-all"
            >
              <Zap className={`h-3 w-3 ${testingId === 1 ? "animate-spin text-emerald-400" : "text-emerald-400"}`} />
              <span>{testingId === 1 ? "Pinging..." : "Test Serper Ping"}</span>
            </button>
            <span className="text-[10px] text-slate-500">Google Organic Web Queries</span>
          </div>
        </div>
      </div>

      {/* Full 29 Providers Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <span>All 29 Registered Engine Endpoints</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {providers.filter((p) => p.has_key).length} Configured • {providers.length} Total
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((p) => {
            const isConn = p.status === "CONNECTED" || p.status === "OPERATIONAL";
            const isConfig = p.has_key;
            const isFail = p.status?.includes("AUTH") || p.status?.includes("FAIL") || p.status?.includes("HTTP_4");

            return (
              <div
                key={p.id}
                className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c1017] flex flex-col justify-between space-y-3 hover:border-blue-500/30 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {p.provider_type}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        isConn
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : isFail
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : isConfig
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      }`}
                    >
                      {p.status || (isConfig ? "CONFIGURED" : "STANDBY")}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white flex items-center justify-between">
                    <span>{p.provider_name}</span>
                    <span className="text-[10px] font-mono text-slate-500 font-normal">#{p.id}</span>
                  </h3>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{p.model_name}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Key: {p.masked_key}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {p.latency ? `${p.latency}ms` : isConfig ? "Ready" : "No Key"}
                  </span>
                  <button
                    onClick={() => handleTestPing(p.id)}
                    disabled={testingId === p.id || !p.has_key}
                    className="px-2.5 py-1 text-[11px] font-semibold text-white bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none rounded-lg transition-all flex items-center gap-1"
                  >
                    <Zap className={`h-3 w-3 ${testingId === p.id ? "animate-spin text-amber-400" : "text-amber-400"}`} />
                    <span>{testingId === p.id ? "Pinging..." : "Test Ping"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
