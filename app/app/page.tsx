"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Lead } from "@/lib/types";
import { ALL_193_COUNTRIES } from "@/lib/countries";
import { getSuggestedCitiesForCountry } from "@/lib/cities";
import {
  Search, Database, Download, RefreshCw,
  Building2, Globe, Mail, Phone, CheckCircle2,
  ExternalLink, ArrowRight, ShieldCheck, Layers, Sparkles, Lock, MessageCircle
} from "lucide-react";

const STANDARD_INDUSTRIES = [
  "Technology & SaaS",
  "Real Estate Agencies",
  "Construction & Engineering",
  "Healthcare & Medical Clinics",
  "Hospitality & Tourism",
  "Professional Services & Consulting",
  "Legal Services & Law Firms",
  "Financial & Wealth Management",
  "Logistics & Freight Supply",
  "E-Commerce & Retail",
  "Marketing & Advertising Agencies",
  "Automotive & Transport",
  "Manufacturing & Industrial",
  "Mobile Accessories & Electronics",
  "Restaurants & Food Services",
  "OTHER"
];

const DEMO_SAMPLE_LEADS: Lead[] = [
  {
    id: -1,
    lead_score: 98,
    crm_stage: "NEW",
    business_name: "Apex Global Cloud Solutions",
    website: "https://apexcloud.example",
    email: "contact@apexcloud.example",
    email_status: "VERIFIED",
    phone: "+1 (415) 555-0199",
    phone_status: "VERIFIED",
    country: "United States",
    city: "San Francisco",
    industry: "Technology & SaaS",
  },
  {
    id: -2,
    lead_score: 94,
    crm_stage: "NEW",
    business_name: "Solaria Clean Energy Group",
    website: "https://solaria-energy.example",
    email: "info@solaria-energy.example",
    email_status: "VERIFIED",
    phone: "+44 20 7946 0912",
    phone_status: "VERIFIED",
    country: "United Kingdom",
    city: "London",
    industry: "Manufacturing & Industrial",
  },
  {
    id: -3,
    lead_score: 91,
    crm_stage: "NEW",
    business_name: "Nexus Dental Care & Aesthetics",
    website: "https://nexusdental.example",
    email: "reception@nexusdental.example",
    email_status: "VERIFIED",
    phone: "+1 (416) 555-0143",
    phone_status: "VERIFIED",
    country: "Canada",
    city: "Toronto",
    industry: "Healthcare & Medical Clinics",
  },
  {
    id: -4,
    lead_score: 96,
    crm_stage: "NEW",
    business_name: "Vanguard Commercial Real Estate",
    website: "https://vanguardcre.example",
    email: "leasing@vanguardcre.example",
    email_status: "VERIFIED",
    phone: "+61 2 9876 5432",
    phone_status: "VERIFIED",
    country: "Australia",
    city: "Sydney",
    industry: "Real Estate Agencies",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLocked } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [metrics, setMetrics] = useState<any>({
    total_leads_found: 0,
    saved_leads: 0,
    available_email_contacts: 0,
    connected_gmail_accounts: 0,
    emails_sent: 0,
    failed_emails: 0,
    remaining_quota: 5000,
    max_quota: 5000,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick Search launcher state
  const [quickCountry, setQuickCountry] = useState("United States");
  const [suggestedCities, setSuggestedCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState("ALL_CITIES");
  const [quickIndustry, setQuickIndustry] = useState("Technology & SaaS");
  const [customIndustry, setCustomIndustry] = useState("");
  const [quickKeyword, setQuickKeyword] = useState("");

  // Update suggested cities when country changes
  useEffect(() => {
    const cities = getSuggestedCitiesForCountry(quickCountry);
    setSuggestedCities(cities);
    setSelectedCity("ALL_CITIES");
  }, [quickCountry]);

  const fetchWorkspaceOverview = async () => {
    try {
      setRefreshing(true);
      const [leadsRes, metricsRes] = await Promise.all([
        api.get<any>("/leads", { page: 1, page_size: 10 }),
        fetch("/api/workspace/metrics", {
          headers: {
            Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : ""}`,
            "X-Workspace-Id": typeof window !== "undefined" ? localStorage.getItem("usman_gtm_workspace_id") || "1" : "1",
          },
        }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      const items = leadsRes?.leads || (Array.isArray(leadsRes) ? leadsRes : []);
      setLeads(items);
      setTotalLeads(leadsRes?.total !== undefined ? leadsRes.total : items.length);

      if (metricsRes) {
        setMetrics(metricsRes);
      }
    } catch (err) {
      console.warn("Could not load leads overview", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceOverview();
  }, []);

  const handleLaunchSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (quickCountry) params.set("country", quickCountry);
    if (selectedCity && selectedCity !== "ALL_CITIES") {
      params.set("city", selectedCity);
    }
    const finalIndustry = quickIndustry === "OTHER" ? customIndustry.trim() : quickIndustry;
    if (finalIndustry && finalIndustry !== "Any") {
      params.set("industry", finalIndustry);
    }
    if (quickKeyword.trim()) {
      params.set("keyword", quickKeyword.trim());
    }
    router.push(`/app/leads?${params.toString()}`);
  };

  // Calculate actual verified contact rate from real leads (never hardcode 100%)
  const leadsWithEmail = leads.filter((l) => l.email && l.email !== "Not Found" && l.email.includes("@")).length;
  const leadsWithPhone = leads.filter((l) => l.phone && l.phone !== "Not Found").length;
  const contactRate = totalLeads > 0 ? Math.round(((leadsWithEmail + leadsWithPhone) / (totalLeads * 2)) * 100) : 0;

  // Active verified non-Maps sources configured in system
  const activeSourcesCount = 8; // Google Organic, Official Websites, Facebook, Instagram, YouTube, TikTok, X, Directories

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Locked Client Banner (Preview Mode) */}
      {isLocked && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <Lock className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  {((user as any)?.account_type === "FREE_PREVIEW" || user?.status === "PREVIEW_ONLY")
                    ? "FREE PREVIEW ACCOUNT — EXPLORATION MODE"
                    : "ACCOUNT INACTIVE OR EXPIRED"}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {((user as any)?.account_type === "FREE_PREVIEW" || user?.status === "PREVIEW_ONLY")
                  ? "FREE PREVIEW ACCOUNT — Explore the software before purchasing. Contact the Owner to get your fully activated account."
                  : "Your account is currently locked or expired. Please contact the Owner for activation or renewal."}
              </p>
              <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-400">
                <span>• <strong className="text-white">Basic:</strong> $25 / Month (30 Days)</span>
                <span>• <strong className="text-amber-400">Lifetime:</strong> $100 One-Time (Permanent Access + Google Maps)</span>
              </div>
            </div>

            <a
              href={`https://wa.me/923174383702?text=${encodeURIComponent(
                `Hello Usman, I would like to activate my subscription ($25/mo Basic or $100 Lifetime). My account is: ${(user as any)?.username || user?.email || ""}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Contact Owner on WhatsApp (+923174383702)</span>
            </a>
          </div>
        </div>
      )}

      {/* Header & Quick Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
              B2B Lead Extraction Engine
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Workspace #{user?.workspace_id || 1} • Data Isolated
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Lead Extraction Command Center
          </h1>
          <p className="text-xs text-slate-400">
            Discover verified commercial leads, authentic public emails, and direct phone lines from official sources.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchWorkspaceOverview}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
            <span>Sync</span>
          </button>
          <Link
            href="/app/leads"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-glow-sm transition-all"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Start Lead Search</span>
          </Link>
          <Link
            href="/app/exports"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>Export Data</span>
          </Link>
        </div>
      </div>

      {/* Real Workspace Metric Cards (Strictly Derived from Database) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Card 1: Total Leads Found */}
        <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-blue-500/30 transition-all">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Leads Found
          </div>
          <div className="text-xl font-extrabold text-white font-mono">
            {metrics.total_leads_found}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Search queries</div>
        </div>

        {/* Card 2: Saved Leads */}
        <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-blue-500/30 transition-all">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Saved Leads
          </div>
          <div className="text-xl font-extrabold text-blue-400 font-mono">
            {metrics.saved_leads}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">In workspace</div>
        </div>

        {/* Card 3: Available Email Contacts */}
        <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-emerald-500/30 transition-all">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Email Contacts
          </div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">
            {metrics.available_email_contacts}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Verified emails</div>
        </div>

        {/* Card 4: Connected Gmail Accounts */}
        <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-purple-500/30 transition-all">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Connected Gmail
          </div>
          <div className="text-xl font-extrabold text-purple-400 font-mono">
            {metrics.connected_gmail_accounts}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">OAuth mailboxes</div>
        </div>

        {/* Card 5: Emails Sent */}
        <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-indigo-500/30 transition-all">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Emails Sent
          </div>
          <div className="text-xl font-extrabold text-indigo-400 font-mono">
            {metrics.emails_sent}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Delivered</div>
        </div>

        {/* Card 6: Failed Emails */}
        <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-rose-500/30 transition-all">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Failed Emails
          </div>
          <div className="text-xl font-extrabold text-rose-400 font-mono">
            {metrics.failed_emails}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Bounced / rejected</div>
        </div>

        {/* Card 7: Remaining Quota */}
        <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-amber-500/30 transition-all">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Remaining Quota
          </div>
          <div className="text-xl font-extrabold text-amber-400 font-mono">
            {metrics.remaining_quota}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">of {metrics.max_quota} quota</div>
        </div>
      </div>

      {/* QUICK SEARCH LAUNCHER */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Quick Search Launcher</h2>
          </div>
          <span className="text-[11px] text-slate-400">193 Nations • Multi-Source Public Web Scraper</span>
        </div>

        <form onSubmit={handleLaunchSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Country Selector with ALL COUNTRIES */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Globe className="h-3 w-3 text-blue-400" /> Country
              </label>
              <select
                value={quickCountry}
                onChange={(e) => setQuickCountry(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL COUNTRIES" className="bg-[#0c1017] text-white font-bold">
                  🌐 ALL COUNTRIES (Global Search)
                </option>
                {ALL_193_COUNTRIES.map((c) => (
                  <option key={c} value={c} className="bg-[#0c1017] text-white">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* City Selection (15-20 Suggested Cities, No Manual Typing Required) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Building2 className="h-3 w-3 text-emerald-400" /> Suggested Cities
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="ALL_CITIES" className="bg-[#0c1017] text-white font-semibold">
                  Entire Country ({quickCountry === "ALL COUNTRIES" ? "Global Hubs" : "All Cities"})
                </option>
                {suggestedCities.map((city) => (
                  <option key={city} value={city} className="bg-[#0c1017] text-white">
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Industry Selector with OTHER option */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Layers className="h-3 w-3 text-purple-400" /> Industry
              </label>
              <select
                value={quickIndustry}
                onChange={(e) => setQuickIndustry(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="Any" className="bg-[#0c1017]">Any Industry</option>
                {STANDARD_INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind} className="bg-[#0c1017]">
                    {ind === "OTHER" ? "✏️ OTHER (Custom Industry / Term)" : ind}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Keyword */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-blue-400" /> Target Keyword
              </label>
              <input
                type="text"
                value={quickKeyword}
                onChange={(e) => setQuickKeyword(e.target.value)}
                placeholder="e.g. Mobile Accessories, Software..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Custom Industry Input when "OTHER" is selected */}
          {quickIndustry === "OTHER" && (
            <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-500/10 animate-in fade-in">
              <label className="block text-[11px] font-semibold text-purple-300 uppercase tracking-wider mb-1">
                Enter Custom Industry / Target Category:
              </label>
              <input
                type="text"
                required
                value={customIndustry}
                onChange={(e) => setCustomIndustry(e.target.value)}
                placeholder="e.g. Solar Energy Contractors, Drone Videographers, Textile Importers..."
                className="w-full rounded-xl border border-purple-500/30 bg-[#0c1017] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-400 focus:outline-none"
              />
            </div>
          )}

          {/* Action Row */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all flex items-center gap-2 shadow-glow-sm cursor-pointer"
            >
              <span>Find Qualified Leads</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* RECENT SAVED LEADS */}
      {(() => {
        const isPreviewUser = (user as any)?.account_type === "FREE_PREVIEW" || user?.status === "PREVIEW_ONLY";
        const displayLeads = leads.length > 0 ? leads : (isPreviewUser ? DEMO_SAMPLE_LEADS : []);

        return (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  {isPreviewUser && leads.length === 0 ? "Sample Qualified Leads (Preview)" : "Recently Saved Workspace Leads"}
                </h2>
              </div>
              <Link
                href="/app/saved-leads"
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <span>View All Leads ({totalLeads})</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading workspace leads...</div>
            ) : displayLeads.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <Database className="h-8 w-8 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-white">No Saved Leads Yet</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Your workspace currently has 0 saved leads. Use the Lead Search engine to discover authentic businesses and save them to your private workspace.
                </p>
                <Link
                  href="/app/leads"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-glow-sm transition-all"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Launch Lead Discovery</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">Business</th>
                      <th className="py-3 px-3">Location</th>
                      <th className="py-3 px-3">Industry</th>
                      <th className="py-3 px-3">Email</th>
                      <th className="py-3 px-3">Phone</th>
                      <th className="py-3 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {displayLeads.map((l) => {
                      const isDemo = l.id < 0;
                      return (
                        <tr key={l.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{l.business_name}</span>
                              {isDemo && (
                                <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                  DEMO SAMPLE
                                </span>
                              )}
                            </div>
                            {l.website && (
                              <a
                                href={l.website.startsWith("http") ? l.website : `https://${l.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-mono"
                              >
                                <span>{l.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {[l.city, l.country].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-white/[0.04] text-[11px]">
                              {l.industry || l.category || "General"}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {l.email ? (
                              <span className="text-emerald-400 font-mono text-[11px]">{l.email}</span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {l.phone ? (
                              <span className="text-slate-200 font-mono text-[11px]">{l.phone}</span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {isDemo ? (
                              <span className="text-[10px] text-amber-400 font-mono">Sample Preview</span>
                            ) : (
                              <Link
                                href="/app/saved-leads"
                                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/[0.03] hover:bg-white/[0.08]"
                              >
                                Manage
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
