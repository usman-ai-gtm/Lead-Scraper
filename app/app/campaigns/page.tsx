"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { MultiCountrySelector } from "@/components/leads/MultiCountrySelector";
import {
  Layers, Plus, Play, Pause, XCircle, RotateCcw, Trash2,
  RefreshCw, CheckCircle2, AlertTriangle, Globe, MapPin, Search,
  Database, ArrowRight, ShieldCheck, Crown, ExternalLink, ChevronDown, ChevronUp
} from "lucide-react";

interface CampaignItem {
  id: string;
  name: string;
  campaign_type: "FIND_LEADS" | "GOOGLE_MAPS_SEARCH";
  keyword: string;
  countries: string[];
  target_quantity: number;
  contact_requirement: string;
  status: "PENDING" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED" | "FAILED";
  current_country?: string;
  candidates_processed: number;
  eligible_leads_count: number;
  duplicates_skipped: number;
  missing_contact_count: number;
  errors_count: number;
  progress_percent: number;
  search_variations?: string[];
  country_stats?: Record<string, { discovered: number; eligible: number; duplicates: number; missing_contact: number }>;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export default function CampaignsPage() {
  const { user, isLocked } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New Campaign Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [campaignType, setCampaignType] = useState<"FIND_LEADS" | "GOOGLE_MAPS_SEARCH">("FIND_LEADS");
  const [keyword, setKeyword] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["United States"]);
  const [targetQuantity, setTargetQuantity] = useState<number>(100);
  const [contactRequirement, setContactRequirement] = useState<
    "EMAIL_AND_PHONE" | "EMAIL_ONLY" | "PHONE_ONLY" | "EMAIL_OR_PHONE"
  >("EMAIL_OR_PHONE");
  const [creating, setCreating] = useState(false);

  const isOwner = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" || (user as any)?.account_type === "MASTER_OWNER";
  const planUpper = String(user?.plan || "BASIC").toUpperCase();
  const isLifetime = isOwner || planUpper === "LIFETIME" || planUpper === "OWNER_LIFETIME";

  const fetchCampaigns = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch("/api/campaigns", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.campaigns)) {
        setCampaigns(data.campaigns);
      }
    } catch (err) {
      console.warn("Failed to fetch campaigns", err);
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Poll active running campaigns every 4s
  useEffect(() => {
    const hasRunning = campaigns.some((c) => c.status === "RUNNING" || c.status === "PENDING");
    if (!hasRunning) return;

    const interval = setInterval(() => {
      fetchCampaigns(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [campaigns]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !keyword.trim()) {
      setToastMsg("Please provide both Campaign Name and Target Keyword.");
      return;
    }

    if (campaignType === "GOOGLE_MAPS_SEARCH" && !isLifetime) {
      setToastMsg("Google Maps campaigns are exclusive to the $100 Lifetime Plan. Please upgrade to unlock.");
      return;
    }

    setCreating(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          campaign_type: campaignType,
          keyword: keyword.trim(),
          countries: selectedCountries,
          target_quantity: targetQuantity,
          contact_requirement: contactRequirement,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Failed to launch campaign.");
      }

      setToastMsg(`Campaign "${name.trim()}" created & running in background!`);
      setIsNewModalOpen(false);
      setName("");
      setKeyword("");
      fetchCampaigns();
    } catch (err: any) {
      setToastMsg(`Error creating campaign: ${err?.message || "Failed"}`);
    } finally {
      setCreating(false);
    }
  };

  const handleCampaignAction = async (campaignId: string, action: "PAUSE" | "RESUME" | "CANCEL" | "RETRY") => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch(`/api/campaigns/${campaignId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Action ${action} failed`);

      setToastMsg(`Campaign ${action.toLowerCase()}d successfully.`);
      fetchCampaigns(true);
    } catch (err: any) {
      setToastMsg(`Action failed: ${err?.message}`);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to delete this campaign? (Saved leads will be preserved).")) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Delete failed");
      setToastMsg("Campaign deleted.");
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    } catch (err: any) {
      setToastMsg(`Delete error: ${err?.message}`);
    }
  };

  const totalLeadsExtracted = campaigns.reduce((acc, c) => acc + (c.eligible_leads_count || 0), 0);
  const totalDuplicatesBlocked = campaigns.reduce((acc, c) => acc + (c.duplicates_skipped || 0), 0);
  const activeRunningCount = campaigns.filter((c) => c.status === "RUNNING").length;

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
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Long-Running Background Campaigns
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Server-Side Persistence • Pause / Resume / Retry
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Lead Generation Campaigns</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Run comprehensive, multi-country lead generation campaigns in the background. Campaigns continue running even if your browser closes, automatically executing smart query variations and contact deduplication.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchCampaigns()}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-white/10 bg-[#0c1017] hover:bg-white/[0.04] text-slate-300 transition-all cursor-pointer"
            title="Refresh campaigns"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-purple-400" : ""}`} />
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total Campaigns</div>
          <div className="text-xl font-extrabold text-white mt-0.5">{campaigns.length}</div>
          <div className="text-[10px] text-purple-400 mt-0.5 font-mono">Workspace Workflows</div>
        </div>
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Currently Running</div>
          <div className="text-xl font-extrabold text-blue-400 mt-0.5">{activeRunningCount}</div>
          <div className="text-[10px] text-blue-300 mt-0.5 font-mono">Persistent Server Jobs</div>
        </div>
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Eligible Leads Found</div>
          <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{totalLeadsExtracted}</div>
          <div className="text-[10px] text-emerald-300 mt-0.5 font-mono">Saved to Master Database</div>
        </div>
        <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Duplicates Excluded</div>
          <div className="text-xl font-extrabold text-amber-400 mt-0.5">{totalDuplicatesBlocked}</div>
          <div className="text-[10px] text-amber-300 mt-0.5 font-mono">Cross-Campaign Deduplication</div>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">Loading campaign workflows...</div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-12 text-center space-y-3">
            <Layers className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Lead Campaigns Created Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Launch long-running multi-country campaigns for organic web search or Google Maps. They will execute across multiple countries and save leads directly to your workspace database.
            </p>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Campaign</span>
            </button>
          </div>
        ) : (
          campaigns.map((camp) => {
            const isExpanded = expandedId === camp.id;
            const progress = Math.min(Math.max(camp.progress_percent || 0, 0), 100);

            // Status badge styling
            const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
              RUNNING: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
              COMPLETED: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
              PAUSED: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
              CANCELLED: { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30" },
              FAILED: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30" },
              PENDING: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
            };
            const sStyle = statusConfig[camp.status] || statusConfig.PENDING;

            return (
              <div
                key={camp.id}
                className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-4 hover:border-white/15 transition-all"
              >
                {/* Main Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${sStyle.bg} ${sStyle.text} ${sStyle.border}`}>
                        {camp.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.04] text-slate-300 border border-white/10 flex items-center gap-1">
                        {camp.campaign_type === "GOOGLE_MAPS_SEARCH" ? (
                          <>
                            <MapPin className="h-3 w-3 text-amber-400" />
                            <span>Google Maps Engine</span>
                          </>
                        ) : (
                          <>
                            <Search className="h-3 w-3 text-blue-400" />
                            <span>Multi-Platform Non-Maps Engine</span>
                          </>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Target: {camp.target_quantity} leads • Criteria: {camp.contact_requirement}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{camp.name}</span>
                      <span className="text-xs text-slate-400 font-normal">
                        ({camp.keyword})
                      </span>
                    </h2>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {camp.status === "RUNNING" && (
                      <button
                        onClick={() => handleCampaignAction(camp.id, "PAUSE")}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-1 cursor-pointer"
                        title="Pause Campaign"
                      >
                        <Pause className="h-3.5 w-3.5" />
                        <span>Pause</span>
                      </button>
                    )}

                    {camp.status === "PAUSED" && (
                      <button
                        onClick={() => handleCampaignAction(camp.id, "RESUME")}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center gap-1 cursor-pointer"
                        title="Resume Campaign"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Resume</span>
                      </button>
                    )}

                    {(camp.status === "RUNNING" || camp.status === "PAUSED" || camp.status === "PENDING") && (
                      <button
                        onClick={() => handleCampaignAction(camp.id, "CANCEL")}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-white/[0.04] border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                        title="Cancel Campaign"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}

                    {(camp.status === "FAILED" || camp.status === "CANCELLED" || camp.status === "COMPLETED") && (
                      <button
                        onClick={() => handleCampaignAction(camp.id, "RETRY")}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all flex items-center gap-1 cursor-pointer"
                        title="Retry Campaign"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Retry</span>
                      </button>
                    )}

                    <Link
                      href={`/app/saved-leads?campaign_id=${camp.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all flex items-center gap-1"
                    >
                      <Database className="h-3.5 w-3.5" />
                      <span>View Leads ({camp.eligible_leads_count})</span>
                    </Link>

                    <button
                      onClick={() => handleDeleteCampaign(camp.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Campaign Record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Real-time Metrics */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      {camp.status === "RUNNING" && <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />}
                      <span>
                        {camp.current_country ? `Processing: ${camp.current_country}` : `Countries: ${camp.countries.length}`}
                      </span>
                    </span>
                    <span className="text-white font-bold">{progress}% Completed</span>
                  </div>

                  <div className="w-full bg-white/[0.04] rounded-full h-2 overflow-hidden border border-white/5">
                    <div
                      className={`h-full transition-all duration-500 ${
                        camp.status === "COMPLETED" ? "bg-emerald-500" : camp.status === "RUNNING" ? "bg-blue-500" : "bg-purple-500"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-slate-500 text-[10px] block">CANDIDATES</span>
                      <span className="text-white font-bold">{camp.candidates_processed}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-slate-500 text-[10px] block">QUALIFIED</span>
                      <span className="text-emerald-400 font-bold">{camp.eligible_leads_count} / {camp.target_quantity}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-slate-500 text-[10px] block">DUPLICATES BLOCKED</span>
                      <span className="text-amber-400 font-bold">{camp.duplicates_skipped}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-slate-500 text-[10px] block">MISSING CONTACTS</span>
                      <span className="text-rose-400 font-bold">{camp.missing_contact_count}</span>
                    </div>
                  </div>
                </div>

                {/* Toggle Country Drilldown */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : camp.id)}
                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isExpanded ? "Hide Details & Country Stats" : "Show Country Breakdown & Search Variations"}</span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3 animate-in fade-in">
                      {/* Search Variations Explored */}
                      {camp.search_variations && camp.search_variations.length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                            Smart Search Variations Explored:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {camp.search_variations.map((v, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Country Stats Breakdown */}
                      {camp.country_stats && Object.keys(camp.country_stats).length > 0 && (
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                            Per-Country Extraction Metrics:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.entries(camp.country_stats).map(([cName, cStat]) => (
                              <div key={cName} className="p-2.5 rounded-lg border border-white/5 bg-black/20 text-xs space-y-1">
                                <div className="font-bold text-white truncate">{cName}</div>
                                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                                  <span className="text-slate-400">Found: <b className="text-white">{cStat.discovered}</b></span>
                                  <span className="text-slate-400">Eligible: <b className="text-emerald-400">{cStat.eligible}</b></span>
                                  <span className="text-slate-400">Dupe: <b className="text-amber-400">{cStat.duplicates}</b></span>
                                  <span className="text-slate-400">Skip: <b className="text-rose-400">{cStat.missing_contact}</b></span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* NEW CAMPAIGN MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#0e1420] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Create Background Lead Campaign</h3>
                  <p className="text-[11px] text-slate-400">Persistent search across selected countries</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              {/* Campaign Name */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q4 Global Tech Agencies Outreach"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Campaign Engine Type */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">Search Engine Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCampaignType("FIND_LEADS")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      campaignType === "FIND_LEADS"
                        ? "bg-purple-600/20 border-purple-500 text-white"
                        : "bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5 text-blue-400" />
                      <span>Find Leads Engine</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Google Web & Social Profiles</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isLifetime) {
                        setToastMsg("⭐ Google Maps is an exclusive feature of the $100 Lifetime Plan.");
                        return;
                      }
                      setCampaignType("GOOGLE_MAPS_SEARCH");
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      campaignType === "GOOGLE_MAPS_SEARCH"
                        ? "bg-amber-500/20 border-amber-500 text-white"
                        : "bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-amber-400" />
                      <span>Google Maps ($100 Deal)</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Local Business Intelligence</div>
                  </button>
                </div>
              </div>

              {/* Target Keyword */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">Target Keyword / Industry *</label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. Software Development Companies, Real Estate Brokers"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Multi-Country Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">Target Countries</label>
                <MultiCountrySelector
                  selectedCountries={selectedCountries}
                  onChange={setSelectedCountries}
                />
              </div>

              {/* Target Quantity Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">Target Lead Quantity</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[50, 100, 250, 500, 1000].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setTargetQuantity(qty)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        targetQuantity === qty
                          ? "bg-purple-600 text-white shadow-sm"
                          : "bg-white/[0.04] text-slate-400 hover:text-white"
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Requirements */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">Contact Requirements</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "EMAIL_OR_PHONE", label: "Email OR Phone" },
                    { id: "EMAIL_AND_PHONE", label: "Email AND Phone" },
                    { id: "EMAIL_ONLY", label: "Email Only" },
                    { id: "PHONE_ONLY", label: "Phone Only" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setContactRequirement(opt.id as any)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        contactRequirement === opt.id
                          ? "bg-purple-500/20 border-purple-500 text-white font-bold"
                          : "bg-white/[0.02] border-white/10 text-slate-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {creating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{creating ? "Launching Campaign..." : "Start Background Campaign"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
