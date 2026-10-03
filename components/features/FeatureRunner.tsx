"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Sparkles, Play, CheckCircle2, AlertTriangle, ShieldCheck,
  Terminal, RefreshCw, Cpu, Layers, History, ExternalLink,
  ChevronRight, Database, FileText
} from "lucide-react";

export interface FeatureMetadata {
  id: number;
  name: string;
  group: string;
  engine: string;
  status: string;
  ai_powered: boolean;
  approval_required: boolean;
  consent_required: boolean;
}

interface FeatureRunnerProps {
  initialFeatureId?: number;
  compact?: boolean;
}

export default function FeatureRunner({ initialFeatureId = 111, compact = false }: FeatureRunnerProps) {
  const [featureId, setFeatureId] = useState<number>(initialFeatureId);
  const [featuresCatalog, setFeaturesCatalog] = useState<FeatureMetadata[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<number | undefined>(undefined);
  const [leadsList, setLeadsList] = useState<{ id: number; business_name: string }[]>([]);
  const [aiMode, setAiMode] = useState<string>("QUALITY MODE");
  const [dryRun, setDryRun] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>("");

  useEffect(() => {
    // Load catalog
    api.get<{ total_features: number; features: FeatureMetadata[] }>("/features/catalog")
      .then((data) => {
        if (data?.features) setFeaturesCatalog(data.features);
      })
      .catch(() => {});

    // Load recent leads for context
    api.get<{ leads: any[] }>("/leads?limit=20")
      .then((data) => {
        if (data?.leads) {
          setLeadsList(data.leads.map((l: any) => ({ id: l.id, business_name: l.business_name })));
          if (data.leads.length > 0) setSelectedLeadId(data.leads[0].id);
        }
      })
      .catch(() => {});

    // Load history
    loadHistory();
  }, []);

  const loadHistory = () => {
    api.get<{ history: any[] }>("/features/history?limit=10")
      .then((data) => {
        if (data?.history) setHistory(data.history);
      })
      .catch(() => {});
  };

  const currentMeta = featuresCatalog.find((f) => f.id === featureId) || {
    id: featureId,
    name: `Feature #${featureId}`,
    group: "Enterprise Tier",
    engine: "UniversalEngine",
    status: "READY",
    ai_powered: true,
    approval_required: false,
    consent_required: false
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      const res = await api.post<any>(`/features/${featureId}/execute`, {
        lead_id: selectedLeadId,
        mode: aiMode,
        dry_run: dryRun,
        context: {
          timestamp: new Date().toISOString(),
          requested_by: "Universal Studio"
        }
      });
      setResult(res);
      loadHistory();
    } catch (err: any) {
      setResult({ status: "error", error: err.message || "Feature execution failed." });
    } finally {
      setLoading(false);
    }
  };

  const filteredFeatures = featuresCatalog.filter(
    (f) =>
      f.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      f.id.toString().includes(searchFilter) ||
      f.group.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Feature Selector & Header Banner */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold shrink-0">
              #{currentMeta.id}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white tracking-tight">{currentMeta.name}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase ${
                  currentMeta.status === "READY"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}>
                  {currentMeta.status}
                </span>
                {currentMeta.ai_powered && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" /> AI Engine
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Tier: <strong className="text-slate-300">{currentMeta.group}</strong> • Engine: <code className="text-blue-300">{currentMeta.engine}</code>
              </p>
            </div>
          </div>

          {/* Quick Switch Dropdown */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search all 600 features..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-slate-200 placeholder-slate-500 w-56 focus:outline-none focus:border-blue-500"
            />
            <select
              value={featureId}
              onChange={(e) => {
                setFeatureId(Number(e.target.value));
                setResult(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-blue-500 max-w-xs"
            >
              {filteredFeatures.slice(0, 100).map((f) => (
                <option key={f.id} value={f.id} className="bg-slate-900 text-white">
                  #{f.id} — {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Execution Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Account / Lead Context
            </label>
            <select
              value={selectedLeadId || ""}
              onChange={(e) => setSelectedLeadId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="" className="bg-slate-900">None (Global Scope)</option>
              {leadsList.map((l) => (
                <option key={l.id} value={l.id} className="bg-slate-900">
                  {l.business_name} (ID: #{l.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              AI Inference Mode
            </label>
            <select
              value={aiMode}
              onChange={(e) => setAiMode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="QUALITY MODE" className="bg-slate-900">QUALITY MODE (Deep Reasoning)</option>
              <option value="BALANCED MODE" className="bg-slate-900">BALANCED MODE (Speed & Precision)</option>
              <option value="FAST MODE" className="bg-slate-900">FAST MODE (Low Latency)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Execution Safety
            </label>
            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0"
                />
                Dry Run Simulation (No side-effects)
              </label>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleExecute}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-glow-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Executing #{featureId}...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" /> Execute #{featureId}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Output & Results Panel */}
      {result && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Execution Output</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Status: <span className="text-emerald-400 font-bold">{result.status || "completed"}</span>
            </span>
          </div>

          <div className="space-y-4">
            {result.summary && (
              <div className="p-4 rounded-xl bg-blue-500/[0.04] border border-blue-500/20 text-xs text-blue-200 leading-relaxed">
                {result.summary}
              </div>
            )}

            {/* Structured JSON payload display */}
            <div className="rounded-xl border border-white/[0.06] bg-[#07090e] p-4 overflow-x-auto">
              <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Recent Feature Execution Logs */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <History className="h-4 w-4 text-slate-400" /> Recent Execution Audit Trail
            </div>
            <span className="text-xs text-slate-500">{history.length} logged runs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-white/[0.06]">
                  <th className="pb-2">Feature</th>
                  <th className="pb-2">Lead ID</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300 font-mono">
                {history.map((h: any) => (
                  <tr key={h.id}>
                    <td className="py-2 text-blue-400 font-sans font-semibold">
                      #{h.feature_id} — {h.feature_name}
                    </td>
                    <td className="py-2 text-slate-400">{h.lead_id ? `#${h.lead_id}` : "Global"}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400">
                        {h.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500 text-[11px]">{h.started_at?.slice(0, 19).replace("T", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
