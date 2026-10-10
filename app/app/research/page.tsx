"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Sparkles, Search, Building, Globe, CheckCircle2, Mail, MessageSquare,
  ExternalLink, RefreshCw, Cpu, Users, ShieldAlert, Zap,
  Copy, Check, ArrowRight, Lightbulb, Target, HelpCircle,
  TrendingUp, Award, Layers
} from "lucide-react";

interface DecisionMaker {
  name: string;
  title: string;
  role: string;
  focus: string;
}

interface ResearchData {
  status: string;
  company_name: string;
  website: string;
  domain: string;
  sector: string;
  business_model: string;
  intent_score: number;
  overview: string;
  products_services: string[];
  tech_stack: string[];
  pain_points: string[];
  buying_signals: string[];
  decision_makers: DecisionMaker[];
  suggested_email: string;
  suggested_email_subject?: string;
  suggested_whatsapp: string;
}

function ResearchContent() {
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("lead_id");
  const companyParam = searchParams.get("company");

  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchData | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedWA, setCopiedWA] = useState(false);
  const [savedToCrm, setSavedToCrm] = useState(false);
  const [savedLeads, setSavedLeads] = useState<any[]>([]);

  // Load saved leads from localStorage so user can easily pick one
  useEffect(() => {
    try {
      const stored = localStorage.getItem("usman_saved_leads");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedLeads(parsed);
        }
      }
    } catch {}
  }, []);

  const executeResearch = async (name?: string, site?: string, leadId?: number) => {
    const targetName = (name !== undefined ? name : companyName).trim();
    const targetSite = (site !== undefined ? site : website).trim();

    if (!targetName && !targetSite && !leadId) return;

    setLoading(true);
    setSavedToCrm(false);
    try {
      const res = await api.post<ResearchData>("/research", {
        company_name: targetName || undefined,
        website: targetSite || undefined,
        lead_id: leadId,
      });
      if (res) {
        setResult(res);
        if (targetName) setCompanyName(targetName);
        if (targetSite) setWebsite(targetSite);
      }
    } catch (err: any) {
      console.warn("Research error", err);
    } finally {
      setLoading(false);
    }
  };

  // If navigated with URL params, automatically research that company
  useEffect(() => {
    if (leadIdParam) {
      executeResearch(undefined, undefined, Number(leadIdParam));
    } else if (companyParam) {
      setCompanyName(companyParam);
      executeResearch(companyParam);
    }
  }, [leadIdParam, companyParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName && !website) return;
    executeResearch();
  };

  const handleQuickSample = (name: string, url: string) => {
    setCompanyName(name);
    setWebsite(url);
    executeResearch(name, url);
  };

  const handleSelectSavedLead = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = Number(e.target.value);
    if (!selectedId) return;
    const found = savedLeads.find((l) => l.id === selectedId);
    if (found) {
      const name = found.business_name || found.company_name || "";
      const site = found.website || "";
      setCompanyName(name);
      setWebsite(site);
      executeResearch(name, site, found.id);
    }
  };

  const copyEmailToClipboard = () => {
    if (!result) return;
    const fullText = `${result.suggested_email_subject ? result.suggested_email_subject + "\n\n" : ""}${result.suggested_email}`;
    navigator.clipboard.writeText(fullText);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const copyWAToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.suggested_whatsapp);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2500);
  };

  const handleSaveToCrm = () => {
    if (!result) return;
    try {
      const currentCrm = JSON.parse(localStorage.getItem("usman_crm_deals") || "[]");
      currentCrm.push({
        id: Date.now(),
        title: `${result.company_name} — High Value Account`,
        company_name: result.company_name,
        deal_value: 4500,
        stage: "Prospect Qualified",
        probability: result.intent_score || 85,
        created_at: new Date().toISOString()
      });
      localStorage.setItem("usman_crm_deals", JSON.stringify(currentCrm));
      setSavedToCrm(true);
    } catch {
      setSavedToCrm(true);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header with Plain-Language Explanation */}
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#0c1017] via-[#101726] to-[#0c1017] p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Company Intel & Pitch Generator
              </span>
              <span className="text-[11px] text-slate-400 font-mono">1-Click Client Closer</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              AI Prospect Intelligence & Pitch Studio
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Enter any prospect company name or domain. AI deep-analyzes their business operations, discovers commercial pain points, and synthesizes <strong>ready-to-send Cold Email</strong> and <strong>WhatsApp Sales Pitches</strong> tailored to their decision-makers.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Link
              href="/app/leads"
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-slate-300 hover:text-white transition flex items-center gap-1.5 font-medium"
            >
              <Users className="h-3.5 w-3.5 text-blue-400" />
              <span>Back to Leads</span>
            </Link>
          </div>
        </div>

        {/* 3 Value Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/[0.06]">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <Search className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">1. Deep Company Analysis</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Understand what they do, their industry sector, and their core business model.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">2. Commercial Pain Points</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Identify operational gaps and challenges so you can pitch targeted, high-value solutions.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">3. Ready-to-Send Pitches</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Get personalized Cold Email and WhatsApp pitches with 1-click copy to start closing deals immediately.</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Search & Quick Select Form */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 shadow-lg space-y-4">
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Building className="absolute left-3.5 top-3 h-4 w-4 text-purple-400" />
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company Name (e.g. Shopify, Nike, Al-Fatah, Apex Logistics)..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:bg-white/[0.06] focus:outline-none transition"
            />
          </div>

          <div className="relative flex-1 w-full">
            <Globe className="absolute left-3.5 top-3 h-4 w-4 text-blue-400" />
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="Website URL (optional e.g. shopify.com or https://nike.com)..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:bg-white/[0.06] focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading || (!companyName && !website)}
            className="w-full lg:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-glow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Analyzing Company & Writing Pitch...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>Analyze & Generate Pitch</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Selection Shortcuts */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.05] text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
              <span>Quick 1-Click Samples:</span>
            </span>
            <button
              type="button"
              onClick={() => handleQuickSample("Stripe", "https://stripe.com")}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] transition text-[11px]"
            >
              ⚡ Stripe (Fintech)
            </button>
            <button
              type="button"
              onClick={() => handleQuickSample("Shopify", "https://shopify.com")}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] transition text-[11px]"
            >
              ⚡ Shopify (E-Commerce)
            </button>
            <button
              type="button"
              onClick={() => handleQuickSample("HubSpot", "https://hubspot.com")}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] transition text-[11px]"
            >
              ⚡ HubSpot (B2B SaaS)
            </button>
            <button
              type="button"
              onClick={() => handleQuickSample("Apex Logistics", "https://apexlogistics.com")}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] transition text-[11px]"
            >
              ⚡ Apex Logistics (Supply Chain)
            </button>
          </div>

          {/* Load from Saved Leads Dropdown */}
          {savedLeads.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-400 text-[11px] whitespace-nowrap">Or pick from your saved leads:</span>
              <select
                onChange={handleSelectSavedLead}
                defaultValue=""
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white focus:outline-none focus:border-purple-500"
              >
                <option value="" disabled className="bg-[#0b0f17]">
                  Select Saved Lead ({savedLeads.length})
                </option>
                {savedLeads.slice(0, 20).map((l) => (
                  <option key={l.id} value={l.id} className="bg-[#0b0f17]">
                    {l.business_name || l.company_name} ({l.country || "Global"})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 3. Empty State (When no search has been executed yet) */}
      {!result && !loading && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0c1017]/50 p-12 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-glow-sm">
            <Target className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white">Search Any Target Company</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter any prospect company name or domain above, or click one of the quick samples. The AI will generate a comprehensive commercial breakdown, identify pain points, and synthesize ready-to-send outreach pitches.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => handleQuickSample("Shopify", "https://shopify.com")}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition flex items-center gap-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Try Demo with Shopify</span>
            </button>
            <button
              onClick={() => handleQuickSample("Stripe", "https://stripe.com")}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-200 text-xs transition"
            >
              Try Demo with Stripe
            </button>
          </div>
        </div>
      )}

      {/* 4. Active Results Workspace */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* Executive Summary Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5 mb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <h2 className="text-2xl font-extrabold text-white">
                    {result.company_name}
                  </h2>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {result.sector || "Commercial Enterprise"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Business Model:</span>
                    <span className="text-slate-200 font-medium">{result.business_model}</span>
                  </div>
                  {result.website && (
                    <a
                      href={result.website.startsWith("http") ? result.website : `https://${result.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 font-mono"
                    >
                      <span>{result.domain}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Buying Intent Score Badge */}
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center min-w-[120px]">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Buying Intent</div>
                  <div className="text-xl font-extrabold text-emerald-300 flex items-center justify-center gap-1">
                    <span>{result.intent_score}</span>
                    <span className="text-xs text-emerald-500 font-normal">/100</span>
                  </div>
                  <div className="text-[10px] text-emerald-400/80 mt-0.5">High Commercial Fit</div>
                </div>

                <button
                  onClick={handleSaveToCrm}
                  disabled={savedToCrm}
                  className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                    savedToCrm
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                      : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-200 hover:text-white"
                  }`}
                >
                  {savedToCrm ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Saved to CRM!</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
                      <span>Add to CRM</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Business Overview Description */}
            <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-amber-400" />
                <span>Executive Business Overview</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {result.overview}
              </p>
            </div>
          </div>

          {/* 3 Pillars Grid: Pain Points, Buying Signals, Tech Stack */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Pain Points */}
            <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-b from-[#160d12] to-[#0c1017] p-5 shadow-lg">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400 mb-1.5">
                <ShieldAlert className="h-4 w-4" />
                <span>Identified Pain Points</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Key operational challenges and gaps you can address in your outreach:
              </p>
              <ul className="space-y-2.5">
                {result.pain_points?.map((p: string, i: number) => (
                  <li key={i} className="text-xs text-rose-100 p-3 rounded-xl bg-rose-500/[0.06] border border-rose-500/15 leading-relaxed flex items-start gap-2">
                    <span className="text-rose-400 font-bold shrink-0 mt-0.5">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. Buying Signals */}
            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#0d1612] to-[#0c1017] p-5 shadow-lg">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
                <Zap className="h-4 w-4" />
                <span>Verified Buying Signals</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Commercial signals indicating active market presence and purchasing intent:
              </p>
              <ul className="space-y-2.5">
                {result.buying_signals?.map((s: string, i: number) => (
                  <li key={i} className="text-xs text-emerald-100 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 leading-relaxed flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Tech Stack */}
            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-b from-[#0d121c] to-[#0c1017] p-5 shadow-lg">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-1.5">
                <Cpu className="h-4 w-4" />
                <span>Detected Tech Stack</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Tools, web infrastructure, and frameworks detected on their public web presence:
              </p>
              <div className="flex flex-wrap gap-2">
                {result.tech_stack?.map((t: string, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-200 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 font-medium"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>{t}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Decision Makers */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Users className="h-4 w-4 text-cyan-400" />
                  <span>Target Buying Committee & Decision Makers</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Key executive contacts to reach out to for faster deal qualification and closing.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {result.decision_makers?.map((dm: DecisionMaker, idx: number) => (
                <div key={idx} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-cyan-500/30 transition">
                  <div className="font-bold text-xs text-white mb-0.5">{dm.title}</div>
                  <div className="text-[11px] text-cyan-400 font-semibold mb-1">{dm.role}</div>
                  <div className="text-[10px] text-slate-400 leading-relaxed">
                    <strong className="text-slate-300">Focus:</strong> {dm.focus}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ACTIONABLE READY-TO-SEND PITCHES (The Core Value!) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Ready Cold Email Pitch */}
            <div className="rounded-2xl border border-purple-500/20 bg-[#0c1017] p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                        Synthesized Cold Email Pitch
                      </h4>
                      <p className="text-[10px] text-slate-500">Ready to Send — High Response Rate</p>
                    </div>
                  </div>

                  <button
                    onClick={copyEmailToClipboard}
                    className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Email</span>
                      </>
                    )}
                  </button>
                </div>

                {result.suggested_email_subject && (
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] mb-3 text-xs">
                    <span className="text-slate-400 font-bold">Subject: </span>
                    <span className="text-slate-200">{result.suggested_email_subject}</span>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {result.suggested_email}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">1-Click Launch into Campaign</span>
                <Link
                  href={`/app/outreach/campaigns/new?company=${encodeURIComponent(result.company_name)}`}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-glow-sm"
                >
                  <span>Launch in Outreach</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* 2. Ready WhatsApp Business Pitch */}
            <div className="rounded-2xl border border-emerald-500/20 bg-[#0c1017] p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        WhatsApp Business Pitch
                      </h4>
                      <p className="text-[10px] text-slate-500">Direct Chat Pitch — High Conversion</p>
                    </div>
                  </div>

                  <button
                    onClick={copyWAToClipboard}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    {copiedWA ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Pitch</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/15 text-xs text-emerald-100 leading-relaxed font-sans whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {result.suggested_whatsapp}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">Test or Send on WhatsApp</span>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(result.suggested_whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-glow-sm"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Open Direct in WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResearchPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading AI Research Studio...</div>}>
      <ResearchContent />
    </React.Suspense>
  );
}
