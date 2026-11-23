"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { LeadQualityBadge } from "@/components/leads/LeadQualityBadge";
import {
  Sparkles, CheckCircle2, RefreshCw, Globe, Mail, Phone,
  ExternalLink, Search, Database, ArrowRight, ShieldCheck, History,
  Building2, AlertCircle
} from "lucide-react";

interface LeadItem {
  id: number;
  business_name: string;
  website?: string;
  domain?: string;
  email?: string;
  phone?: string;
  country?: string;
  industry?: string;
  is_enriched?: boolean;
  enriched_at?: string;
  enrichment_data?: any;
  quality_score?: number;
  quality_category?: string;
  quality_reasons?: string[];
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  twitter?: string;
  tiktok?: string;
}

interface EnrichmentLog {
  id: number;
  lead_id: number;
  source: string;
  changes: Record<string, any>;
  created_at: string;
}

export default function EnrichmentPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [logs, setLogs] = useState<EnrichmentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enrichingId, setEnrichingId] = useState<number | null>(null);
  const [bulkEnriching, setBulkEnriching] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"leads" | "logs">("leads");

  const fetchEnrichmentData = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const [leadsRes, logsRes] = await Promise.all([
        fetch("/api/leads?page_size=50", { headers }).then((r) => r.json()),
        fetch("/api/leads/enrich", { headers }).then((r) => r.json()).catch(() => ({ logs: [] })),
      ]);

      if (leadsRes && Array.isArray(leadsRes.leads)) {
        setLeads(leadsRes.leads);
      }
      if (logsRes && Array.isArray(logsRes.logs)) {
        setLogs(logsRes.logs);
      }
    } catch (err) {
      console.warn("Failed to load enrichment data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEnrichmentData();
  }, []);

  const handleEnrichSingle = async (leadId: number) => {
    setEnrichingId(leadId);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch(`/api/leads/${leadId}/enrich`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enrichment failed");

      setToastMsg(`Successfully enriched "${data.lead?.business_name || "lead"}"!`);
      // Update local state
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...data.lead } : l)));
      fetchEnrichmentData();
    } catch (err: any) {
      setToastMsg(`Notice: ${err?.message || "Failed"}`);
    } finally {
      setEnrichingId(null);
    }
  };

  const handleBulkEnrich = async () => {
    setBulkEnriching(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch("/api/leads/enrich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ batch_size: 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk enrichment failed");

      setToastMsg(`Bulk enrichment finished: ${data.enriched_count || 0} leads enriched with fresh data!`);
      fetchEnrichmentData();
    } catch (err: any) {
      setToastMsg(`Error: ${err?.message || "Bulk enrichment failed"}`);
    } finally {
      setBulkEnriching(false);
    }
  };

  const totalLeads = leads.length;
  const enrichedCount = leads.filter((l) => l.is_enriched).length;
  const pendingCount = totalLeads - enrichedCount;
  const enrichmentRate = totalLeads > 0 ? Math.round((enrichedCount / totalLeads) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-blue-500/30 bg-[#0c121e]/95 px-4 py-3 text-xs text-white shadow-2xl backdrop-blur-md flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 max-w-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="leading-snug">{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-pink-400 bg-pink-500/10 px-2.5 py-0.5 rounded border border-pink-500/20 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Autonomous Lead Enrichment
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Social Profiles • Public Emails • Official Domains • Audit Trails
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Lead Intelligence Enrichment</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Enhance existing prospects with official websites, LinkedIn company profiles, Instagram, Facebook, YouTube channels, and verified emails. Changes are permanently logged with audit evidence.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchEnrichmentData}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-white/10 bg-[#0c1017] hover:bg-white/[0.04] text-slate-300 transition-all cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-pink-400" : ""}`} />
          </button>
          <button
            onClick={handleBulkEnrich}
            disabled={bulkEnriching || pendingCount === 0}
            className="px-4 py-2 text-xs font-bold text-white bg-pink-600 hover:bg-pink-500 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {bulkEnriching ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span>{bulkEnriching ? "Enriching Top 10..." : "Enrich Top 10 Leads"}</span>
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total Leads</div>
          <div className="text-xl font-extrabold text-white mt-0.5">{totalLeads}</div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Workspace Database</div>
        </div>
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Enriched Leads</div>
          <div className="text-xl font-extrabold text-pink-400 mt-0.5">{enrichedCount}</div>
          <div className="text-[10px] text-pink-300 mt-0.5 font-mono">Social & Domain Verified</div>
        </div>
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Pending Enrichment</div>
          <div className="text-xl font-extrabold text-amber-400 mt-0.5">{pendingCount}</div>
          <div className="text-[10px] text-amber-300 mt-0.5 font-mono">Unenriched Prospects</div>
        </div>
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Enrichment Coverage</div>
          <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{enrichmentRate}%</div>
          <div className="text-[10px] text-emerald-300 mt-0.5 font-mono">Completed Ratio</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
        <button
          onClick={() => setActiveTab("leads")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
            activeTab === "leads"
              ? "text-white bg-white/[0.08] border-b-2 border-pink-500"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Building2 className="h-4 w-4 text-pink-400" />
          <span>Leads Intelligence Registry</span>
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
            activeTab === "logs"
              ? "text-white bg-white/[0.08] border-b-2 border-pink-500"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <History className="h-4 w-4 text-purple-400" />
          <span>Enrichment Audit Logs</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300">
            {logs.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Leads View */}
      {activeTab === "leads" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-500">Loading leads for enrichment...</div>
          ) : leads.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <Database className="h-10 w-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No saved leads in your workspace.</p>
              <Link href="/app/leads" className="text-xs text-blue-400 font-bold hover:underline">
                Find Leads First →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold bg-white/[0.01]">
                  <tr>
                    <th className="py-3 px-4">Business & Domain</th>
                    <th className="py-3 px-4">Enrichment Status</th>
                    <th className="py-3 px-4">Quality Score</th>
                    <th className="py-3 px-4">Discovered Social Profiles</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {leads.map((l) => {
                    const isEnriching = enrichingId === l.id;
                    return (
                      <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{l.business_name}</div>
                          {l.website ? (
                            <a
                              href={l.website.startsWith("http") ? l.website : `https://${l.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                            >
                              <span>{l.domain || l.website.replace(/^https?:\/\//, "")}</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            <span className="text-slate-500 text-[11px] italic">No website discovered</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {l.is_enriched ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                              <CheckCircle2 className="h-3 w-3" /> Enriched
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                              Pending
                            </span>
                          )}
                          {l.enriched_at && (
                            <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                              {new Date(l.enriched_at).toLocaleDateString()}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <LeadQualityBadge
                            score={l.quality_score}
                            category={l.quality_category}
                            reasons={l.quality_reasons}
                          />
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                            {l.linkedin && (
                              <a href={l.linkedin} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20">
                                LinkedIn
                              </a>
                            )}
                            {l.instagram && (
                              <a href={l.instagram} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-300 border border-pink-500/20 hover:bg-pink-500/20">
                                Instagram
                              </a>
                            )}
                            {l.facebook && (
                              <a href={l.facebook} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 rounded bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20">
                                Facebook
                              </a>
                            )}
                            {l.youtube && (
                              <a href={l.youtube} target="_blank" rel="noreferrer" className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20">
                                YouTube
                              </a>
                            )}
                            {!l.linkedin && !l.instagram && !l.facebook && !l.youtube && (
                              <span className="text-slate-500 italic">None yet</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {l.email && <div className="text-emerald-400 truncate max-w-[180px]">{l.email}</div>}
                          {l.phone && <div className="text-slate-400">{l.phone}</div>}
                          {!l.email && !l.phone && <span className="text-slate-500 italic">No contacts</span>}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleEnrichSingle(l.id)}
                            disabled={isEnriching}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-pink-600 hover:bg-pink-500 shadow-sm transition-all flex items-center gap-1.5 ml-auto cursor-pointer disabled:opacity-50"
                          >
                            {isEnriching ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            <span>{isEnriching ? "Enriching..." : "Enrich"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Audit Logs View */}
      {activeTab === "logs" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Immutable Enrichment Audit Trail</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Never overwrites verified data with weaker data
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No enrichment activity has been logged yet. Enrich leads above to populate this audit trail.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-white">Lead #{log.lead_id} — Source: {log.source}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Fields Updated: {Object.keys(log.changes || {}).join(", ") || "None"}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
