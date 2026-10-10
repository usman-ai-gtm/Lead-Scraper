"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Database, Plus, DollarSign, Calendar, TrendingUp, CheckCircle2,
  Building2, Users, ArrowRight, RefreshCw, Layers, ListFilter, Send,
  Trash2, Search, ExternalLink, Sparkles, Download, Check, Briefcase,
  ChevronRight, Award, ShieldCheck
} from "lucide-react";

export interface CRMDeal {
  id: number;
  title: string;
  company_name: string;
  amount: number;
  stage: string;
  win_probability: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  expected_close_date?: string;
  created_at?: string;
}

const PIPELINE_STAGES = [
  "New Lead",
  "Qualified",
  "Contacted",
  "Replied",
  "Meeting",
  "Proposal",
  "Won",
  "Lost"
];

const DEFAULT_DEMO_DEALS: CRMDeal[] = [
  {
    id: 101,
    title: "Apex Global Tech — Enterprise Cloud",
    company_name: "Apex Global Tech",
    amount: 45000,
    stage: "New Lead",
    win_probability: 40,
    contact_name: "Johnathan Vance",
    contact_email: "j.vance@apexglobal.io",
    website: "https://apexglobal.io",
    expected_close_date: "2026-11-15"
  },
  {
    id: 102,
    title: "FinEdge Systems — Multi-Seat License",
    company_name: "FinEdge Systems",
    amount: 24000,
    stage: "New Lead",
    win_probability: 35,
    contact_name: "Marcus Aurelius",
    contact_email: "marcus@finedge.io",
    website: "https://finedge.io",
    expected_close_date: "2026-11-20"
  },
  {
    id: 103,
    title: "Nexus Logistics — Outbound Automation",
    company_name: "Nexus Logistics Co",
    amount: 32000,
    stage: "Qualified",
    win_probability: 60,
    contact_name: "Sarah Chen",
    contact_email: "schen@nexuslogistics.com",
    website: "https://nexuslogistics.com",
    expected_close_date: "2026-11-30"
  },
  {
    id: 104,
    title: "Vanguard Health — GTM Intelligence",
    company_name: "Vanguard Health Systems",
    amount: 85000,
    stage: "Contacted",
    win_probability: 70,
    contact_name: "Dr. David Miller",
    contact_email: "dmiller@vanguardhealth.org",
    website: "https://vanguardhealth.org",
    expected_close_date: "2026-12-05"
  },
  {
    id: 105,
    title: "BlueStone Capital — Lead Pipeline Scale",
    company_name: "BlueStone Financial",
    amount: 55000,
    stage: "Replied",
    win_probability: 80,
    contact_name: "Elena Rostova",
    contact_email: "elena@bluestonecap.com",
    website: "https://bluestonecap.com",
    expected_close_date: "2026-12-15"
  },
  {
    id: 106,
    title: "CloudFlow Architecture — Platform Migration",
    company_name: "CloudFlow Inc",
    amount: 62000,
    stage: "Meeting",
    win_probability: 85,
    contact_name: "Michael Brody",
    contact_email: "mbrody@cloudflow.tech",
    website: "https://cloudflow.tech",
    expected_close_date: "2026-12-20"
  },
  {
    id: 107,
    title: "HyperScale Retail — Global Prospecting",
    company_name: "HyperScale Retail",
    amount: 48000,
    stage: "Proposal",
    win_probability: 90,
    contact_name: "Claire Dupont",
    contact_email: "claire@hyperscale.com",
    website: "https://hyperscale.com",
    expected_close_date: "2026-12-30"
  },
  {
    id: 108,
    title: "Vertex Digital — Annual Enterprise Tier",
    company_name: "Vertex Digital Solutions",
    amount: 96000,
    stage: "Won",
    win_probability: 100,
    contact_name: "Alexander Smith",
    contact_email: "alex@vertexdigital.com",
    website: "https://vertexdigital.com",
    expected_close_date: "2026-10-30"
  }
];

export default function CRMPage() {
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"kanban" | "table" | "companies" | "contacts">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [savedLeadsCount, setSavedLeadsCount] = useState(0);
  const [importNotification, setImportNotification] = useState("");

  // Create Deal Modal State
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [newDealTitle, setNewDealTitle] = useState("");
  const [newDealCompany, setNewDealCompany] = useState("");
  const [newDealAmount, setNewDealAmount] = useState(35000);
  const [newDealStage, setNewDealStage] = useState("New Lead");
  const [newDealWinP, setNewDealWinP] = useState(50);
  const [newDealContact, setNewDealContact] = useState("");
  const [newDealEmail, setNewDealEmail] = useState("");
  const [newDealWebsite, setNewDealWebsite] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Initialize and synchronize deals
  useEffect(() => {
    try {
      // Check stored discovered leads
      const storedLeads = localStorage.getItem("usman_saved_leads");
      if (storedLeads) {
        const parsed = JSON.parse(storedLeads);
        if (Array.isArray(parsed)) setSavedLeadsCount(parsed.length);
      }

      // Check stored CRM deals
      const storedCrm = localStorage.getItem("usman_crm_deals");
      if (storedCrm) {
        const parsed = JSON.parse(storedCrm);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize stages
          const normalized = parsed.map((d: any) => ({
            ...d,
            stage: normalizeStage(d.stage)
          }));
          setDeals(normalized);
          setLoading(false);
          return;
        }
      }

      // If empty in localStorage, initialize with demo enterprise deals
      setDeals(DEFAULT_DEMO_DEALS);
      localStorage.setItem("usman_crm_deals", JSON.stringify(DEFAULT_DEMO_DEALS));
    } catch {
      setDeals(DEFAULT_DEMO_DEALS);
    } finally {
      setLoading(false);
    }
  }, []);

  const normalizeStage = (stg: string): string => {
    if (!stg) return "New Lead";
    const upper = stg.toUpperCase();
    if (upper === "NEW" || upper === "NEW LEAD") return "New Lead";
    if (upper === "QUALIFIED") return "Qualified";
    if (upper === "CONTACTED") return "Contacted";
    if (upper === "REPLIED") return "Replied";
    if (upper === "MEETING") return "Meeting";
    if (upper === "PROPOSAL" || upper === "NEGOTIATION") return "Proposal";
    if (upper === "WON" || upper === "CLOSED WON") return "Won";
    if (upper === "LOST" || upper === "CLOSED LOST") return "Lost";
    return stg;
  };

  const saveDealsToStorage = (updated: CRMDeal[]) => {
    setDeals(updated);
    try {
      localStorage.setItem("usman_crm_deals", JSON.stringify(updated));
    } catch {}
  };

  const handleStageChange = (dealId: number, targetStage: string) => {
    const updated = deals.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d));
    saveDealsToStorage(updated);
  };

  const advanceStage = (dealId: number) => {
    const found = deals.find((d) => d.id === dealId);
    if (!found) return;
    const currentIndex = PIPELINE_STAGES.indexOf(found.stage);
    if (currentIndex >= 0 && currentIndex < PIPELINE_STAGES.length - 2) {
      const nextStage = PIPELINE_STAGES[currentIndex + 1];
      handleStageChange(dealId, nextStage);
    } else if (found.stage === "Proposal") {
      handleStageChange(dealId, "Won");
    }
  };

  const handleDeleteDeal = (dealId: number) => {
    const updated = deals.filter((d) => d.id !== dealId);
    saveDealsToStorage(updated);
  };

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const newDeal: CRMDeal = {
        id: Date.now(),
        title: newDealTitle.trim() || `${newDealCompany.trim()} — Commercial Opportunity`,
        company_name: newDealCompany.trim() || "Commercial Client",
        amount: Number(newDealAmount) || 25000,
        stage: newDealStage,
        win_probability: Number(newDealWinP) || 50,
        contact_name: newDealContact.trim() || undefined,
        contact_email: newDealEmail.trim() || undefined,
        website: newDealWebsite.trim() || undefined,
        expected_close_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
      };

      const updated = [newDeal, ...deals];
      saveDealsToStorage(updated);

      // Reset modal fields
      setNewDealTitle("");
      setNewDealCompany("");
      setNewDealAmount(35000);
      setNewDealContact("");
      setNewDealEmail("");
      setNewDealWebsite("");
      setDealModalOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  // 1-Click Import All Discovered Leads from /app/leads into CRM
  const handleImportDiscoveredLeads = () => {
    try {
      const stored = localStorage.getItem("usman_saved_leads");
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) return;

      const newImports: CRMDeal[] = parsed.map((l: any, i: number) => {
        const name = l.business_name || l.company_name || `Target Account ${i + 1}`;
        const score = l.lead_score || 80;
        return {
          id: Date.now() + i,
          title: `${name} — Outbound Opportunity`,
          company_name: name,
          amount: Math.floor(Math.random() * 25000) + 15000,
          stage: i % 3 === 0 ? "Qualified" : "New Lead",
          win_probability: Math.min(Math.round(score * 0.8), 90),
          contact_name: l.contact_name || undefined,
          contact_email: l.email || undefined,
          contact_phone: l.phone || undefined,
          website: l.website || l.source_url || undefined,
          expected_close_date: new Date(Date.now() + 45 * 86400000).toISOString().split("T")[0]
        };
      });

      // Filter out duplicates by company_name
      const existingNames = new Set(deals.map((d) => d.company_name.toLowerCase()));
      const uniqueImports = newImports.filter((d) => !existingNames.has(d.company_name.toLowerCase()));

      const combined = [...uniqueImports, ...deals];
      saveDealsToStorage(combined);
      setImportNotification(`Successfully imported ${uniqueImports.length} discovered leads into CRM!`);
      setTimeout(() => setImportNotification(""), 4000);
    } catch (err) {
      console.warn("Import error", err);
    }
  };

  const handleResetDemoPipeline = () => {
    saveDealsToStorage(DEFAULT_DEMO_DEALS);
    setImportNotification("Reset pipeline to benchmark enterprise opportunities.");
    setTimeout(() => setImportNotification(""), 3500);
  };

  // Pipeline Metrics
  const pipelineMetrics = useMemo(() => {
    const totalDeals = deals.length;
    const activeDeals = deals.filter((d) => d.stage !== "Lost");
    const totalPipelineValue = activeDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const wonDeals = deals.filter((d) => d.stage === "Won");
    const wonRevenue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const avgWinProb =
      totalDeals > 0
        ? Math.round(deals.reduce((sum, d) => sum + (d.win_probability || 0), 0) / totalDeals)
        : 0;

    return { totalDeals, totalPipelineValue, wonRevenue, avgWinProb };
  }, [deals]);

  // Unique Companies List
  const companiesList = useMemo(() => {
    const map = new Map<string, { company_name: string; website?: string; totalAmount: number; dealCount: number }>();
    deals.forEach((d) => {
      const key = d.company_name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          company_name: d.company_name,
          website: d.website,
          totalAmount: d.amount || 0,
          dealCount: 1
        });
      } else {
        const item = map.get(key)!;
        item.totalAmount += d.amount || 0;
        item.dealCount += 1;
      }
    });
    return Array.from(map.values());
  }, [deals]);

  // Unique Contacts List
  const contactsList = useMemo(() => {
    const list: any[] = [];
    deals.forEach((d) => {
      if (d.contact_email || d.contact_name) {
        list.push({
          id: d.id,
          name: d.contact_name || "Decision Maker",
          email: d.contact_email || "No email available",
          phone: d.contact_phone,
          company: d.company_name,
          stage: d.stage
        });
      }
    });
    return list;
  }, [deals]);

  // Filtered Deals for Table View
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const matchesSearch =
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.contact_email && d.contact_email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStage = stageFilter === "ALL" || d.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [deals, searchQuery, stageFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header with Executive Stats */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.06] pb-5 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" />
                Enterprise Pipeline & Deals
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Live Revenue Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Enterprise CRM & Sales Pipeline
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Track deals from initial qualification through commercial proposal to closed-won contracts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {savedLeadsCount > 0 && (
              <button
                onClick={handleImportDiscoveredLeads}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-all shadow-sm"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>Import {savedLeadsCount} Leads to CRM</span>
              </button>
            )}

            <button
              onClick={() => setDealModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-glow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create Deal</span>
            </button>

            <button
              onClick={handleResetDemoPipeline}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition"
              title="Reset Demo Opportunities"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {importNotification && (
          <div className="p-3 mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{importNotification}</span>
          </div>
        )}

        {/* 4 Revenue Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-blue-400" />
              <span>Total Pipeline Value</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              ${pipelineMetrics.totalPipelineValue.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Across {deals.length} opportunities</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Award className="h-3.5 w-3.5 text-emerald-400" />
              <span>Closed Won Revenue</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              ${pipelineMetrics.wonRevenue.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-500/80 mt-0.5">Verified signed contracts</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
              <span>Average Win Probability</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-300 font-mono">
              {pipelineMetrics.avgWinProb}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Weighted pipeline forecast</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Briefcase className="h-3.5 w-3.5 text-amber-400" />
              <span>Active Companies</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {companiesList.length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Prospect accounts tracked</div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-between gap-4 mt-6 pt-5 border-t border-white/[0.06] flex-wrap">
          <div className="flex rounded-xl bg-white/[0.03] border border-white/10 p-1 text-xs">
            <button
              onClick={() => setActiveTab("kanban")}
              className={`px-4 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "kanban" ? "bg-blue-600 text-white shadow-glow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => setActiveTab("table")}
              className={`px-4 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "table" ? "bg-blue-600 text-white shadow-glow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span>Deals Table ({deals.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("companies")}
              className={`px-4 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "companies" ? "bg-blue-600 text-white shadow-glow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Companies ({companiesList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("contacts")}
              className={`px-4 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === "contacts" ? "bg-blue-600 text-white shadow-glow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Contacts ({contactsList.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. VIEW: KANBAN BOARD */}
      {activeTab === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-6 min-h-[580px] scrollbar-thin">
          {PIPELINE_STAGES.map((stg) => {
            const dealsInStage = deals.filter((d) => d.stage === stg);
            const stageTotal = dealsInStage.reduce((acc, d) => acc + (d.amount || 0), 0);

            return (
              <div
                key={stg}
                className="w-72 shrink-0 rounded-2xl border border-white/[0.08] bg-[#090d16] flex flex-col justify-between"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{stg}</span>
                    <span className="text-[10px] text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded-full">
                      {dealsInStage.length}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-blue-400 font-bold">
                    ${(stageTotal / 1000).toFixed(0)}k
                  </span>
                </div>

                {/* Deal Cards Container */}
                <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[520px]">
                  {dealsInStage.length === 0 ? (
                    <div className="text-center py-10 text-[11px] text-slate-600 border border-dashed border-white/5 rounded-xl">
                      No deals in this stage
                    </div>
                  ) : (
                    dealsInStage.map((deal) => (
                      <div
                        key={deal.id}
                        className="rounded-xl border border-white/[0.07] bg-[#0c121e] p-3.5 shadow-sm hover:border-blue-500/40 transition-all space-y-2.5 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-xs text-white leading-tight">
                              {deal.title}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                              {deal.company_name}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteDeal(deal.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition p-1"
                            title="Delete Deal"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="font-black text-emerald-400 font-mono">
                            ${deal.amount?.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-purple-300 font-mono bg-purple-500/10 px-1.5 py-0.5 rounded">
                            {deal.win_probability}% Win
                          </span>
                        </div>

                        {deal.contact_name && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span className="text-slate-500">Contact:</span>
                            <span className="text-slate-300 truncate">{deal.contact_name}</span>
                          </div>
                        )}

                        {/* Card Stage Controls */}
                        <div className="pt-2.5 border-t border-white/[0.05] flex items-center justify-between gap-1">
                          <select
                            value={deal.stage}
                            onChange={(e) => handleStageChange(deal.id, e.target.value)}
                            className="bg-transparent text-slate-400 hover:text-white font-medium text-[10px] focus:outline-none cursor-pointer max-w-[110px]"
                          >
                            {PIPELINE_STAGES.map((s) => (
                              <option key={s} value={s} className="bg-[#0c1017] text-white">
                                {s}
                              </option>
                            ))}
                          </select>

                          {deal.stage !== "Won" && deal.stage !== "Lost" && (
                            <button
                              onClick={() => advanceStage(deal.id)}
                              className="px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 text-[10px] font-bold flex items-center gap-1 transition"
                            >
                              <span>Next</span>
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. VIEW: DEALS TABLE */}
      {activeTab === "table" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] overflow-hidden shadow-xl space-y-3 p-4">
          {/* Table Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search deals, companies, contacts..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] text-slate-500">Stage Filter:</span>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL" className="bg-[#0b0f17]">All Stages</option>
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s} className="bg-[#0b0f17]">{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Deal Title & Company</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Contract Amount</th>
                  <th className="py-3 px-4">Win Probability</th>
                  <th className="py-3 px-4">Key Contact</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredDeals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                      No deals match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map((d) => (
                    <tr key={d.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{d.title}</div>
                        <div className="text-[11px] text-slate-400">{d.company_name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-[11px]">
                          {d.stage}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        ${d.amount?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-purple-400 font-mono font-semibold">
                        {d.win_probability}%
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-300">{d.contact_name || "—"}</div>
                        <div className="text-[10px] text-slate-500">{d.contact_email || ""}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => advanceStage(d.id)}
                            className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-[11px] font-semibold"
                            title="Advance to Next Stage"
                          >
                            Advance
                          </button>
                          <button
                            onClick={() => handleDeleteDeal(d.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. VIEW: COMPANIES */}
      {activeTab === "companies" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-400" />
              <span>Tracked Enterprise Accounts & Companies</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{companiesList.length} Accounts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companiesList.map((c, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-blue-500/30 transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="font-bold text-white text-sm mb-1">{c.company_name}</div>
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>{c.dealCount} active deal{c.dealCount > 1 ? "s" : ""}</span>
                    <span className="font-mono font-bold text-emerald-400">
                      ${c.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between">
                  <Link
                    href={`/app/research?company=${encodeURIComponent(c.company_name)}`}
                    className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>AI Research</span>
                  </Link>

                  {c.website && (
                    <a
                      href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1"
                    >
                      <span>Website</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. VIEW: CONTACTS */}
      {activeTab === "contacts" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <span>Decision Makers & Executive Contacts</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{contactsList.length} Contacts</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contactsList.map((ct) => (
              <div
                key={ct.id}
                className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-emerald-500/30 transition flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="font-bold text-white text-sm mb-0.5">{ct.name}</div>
                  <div className="text-xs text-blue-400 font-medium mb-1">{ct.company}</div>
                  <div className="text-[11px] text-slate-300 font-mono">{ct.email}</div>
                  {ct.phone && <div className="text-[11px] text-slate-400 font-mono">{ct.phone}</div>}
                </div>

                <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/[0.04] text-slate-400">
                    {ct.stage}
                  </span>
                  <Link
                    href={`/app/outreach/campaigns/new?contact_email=${encodeURIComponent(ct.email)}&company=${encodeURIComponent(ct.company)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                  >
                    <Send className="h-3 w-3" />
                    <span>Send Outreach</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. CREATE DEAL MODAL */}
      {dealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#0c121e] p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Create Enterprise Opportunity</h2>
            <form onSubmit={handleCreateDeal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Account Name</label>
                <input
                  type="text"
                  required
                  value={newDealCompany}
                  onChange={(e) => setNewDealCompany(e.target.value)}
                  placeholder="e.g. Shopify, Stripe, Apex Logistics..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deal Title (Optional)</label>
                <input
                  type="text"
                  value={newDealTitle}
                  onChange={(e) => setNewDealTitle(e.target.value)}
                  placeholder="e.g. Enterprise License Expansion"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contract Amount ($)</label>
                  <input
                    type="number"
                    required
                    value={newDealAmount}
                    onChange={(e) => setNewDealAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stage</label>
                  <select
                    value={newDealStage}
                    onChange={(e) => setNewDealStage(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0c1017] px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={newDealContact}
                    onChange={(e) => setNewDealContact(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={newDealEmail}
                    onChange={(e) => setNewDealEmail(e.target.value)}
                    placeholder="john@company.com"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDealModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-glow-sm"
                >
                  {isCreating ? "Saving..." : "Create Deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
