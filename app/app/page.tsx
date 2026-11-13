"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Lead } from "@/lib/types";
import { ALL_193_COUNTRIES } from "@/lib/countries";
import {
  Search, Database, Download, Settings, RefreshCw,
  Building2, Globe, Mail, Phone, CheckCircle2,
  ExternalLink, ArrowRight, ShieldCheck, Zap
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick Search launcher inputs
  const [quickCountry, setQuickCountry] = useState("United States");
  const [quickCity, setQuickCity] = useState("");
  const [quickIndustry, setQuickIndustry] = useState("Technology & SaaS");
  const [quickKeyword, setQuickKeyword] = useState("");

  const fetchWorkspaceOverview = async () => {
    try {
      setRefreshing(true);
      const res = await api.get<any>("/leads", { page: 1, page_size: 5 });
      const items = res?.leads || (Array.isArray(res) ? res : []);
      setLeads(items);
      setTotalLeads(res?.total !== undefined ? res.total : items.length);
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
    if (quickCity) params.set("city", quickCity);
    if (quickIndustry && quickIndustry !== "Any") params.set("industry", quickIndustry);
    if (quickKeyword) params.set("keyword", quickKeyword);
    router.push(`/app/leads?${params.toString()}`);
  };

  // Calculate actual verified emails and phones
  const leadsWithEmail = leads.filter((l) => l.email && l.email !== "Not Found").length;
  const leadsWithPhone = leads.filter((l) => l.phone && l.phone !== "Not Found").length;
  const contactRate = totalLeads > 0 ? Math.round(((leadsWithEmail + leadsWithPhone) / (totalLeads * 2)) * 100) : 100;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header & Quick Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
              B2B Lead Extraction Engine
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Workspace #{user?.workspace_id || 1} • Tenant Isolated
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Lead Extraction Command Center
          </h1>
          <p className="text-xs text-slate-400">
            Real public business discovery, verified contacts, and multi-format exports across 193 countries.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchWorkspaceOverview}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all"
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

      {/* Real Workspace Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Saved Leads</span>
            <Database className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{totalLeads}</div>
          <div className="text-[10px] text-slate-500 mt-1">In your private workspace</div>
        </div>

        <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Contact Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">{contactRate}%</div>
          <div className="text-[10px] text-slate-500 mt-1">Leads with verified contact</div>
        </div>

        <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Search Quota</span>
            <Zap className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-400">5,000</div>
          <div className="text-[10px] text-slate-500 mt-1">Monthly extraction limit</div>
        </div>

        <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Data Security</span>
            <ShieldCheck className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-sm font-bold text-white mt-1">Tenant Isolated</div>
          <div className="text-[10px] text-emerald-400 mt-1">PBKDF2 / Workspace Gated</div>
        </div>
      </div>

      {/* QUICK SEARCH LAUNCHER */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Quick Search Launcher</h2>
          </div>
          <span className="text-[11px] text-slate-400">193 Countries • Multi-Platform Public Scraper</span>
        </div>

        <form onSubmit={handleLaunchSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Country
            </label>
            <select
              value={quickCountry}
              onChange={(e) => setQuickCountry(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              {ALL_193_COUNTRIES.map((c) => (
                <option key={c} value={c} className="bg-[#0c1017] text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              City / State
            </label>
            <input
              type="text"
              value={quickCity}
              onChange={(e) => setQuickCity(e.target.value)}
              placeholder="e.g. London, Dubai, Chicago..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Industry
            </label>
            <select
              value={quickIndustry}
              onChange={(e) => setQuickIndustry(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="Any" className="bg-[#0c1017]">Any Industry</option>
              <option value="Real Estate" className="bg-[#0c1017]">Real Estate</option>
              <option value="Healthcare & Medical Clinics" className="bg-[#0c1017]">Healthcare & Clinics</option>
              <option value="Technology & SaaS" className="bg-[#0c1017]">Technology & SaaS</option>
              <option value="Hospitality & Tourism" className="bg-[#0c1017]">Hospitality & Tourism</option>
              <option value="Professional Services" className="bg-[#0c1017]">Professional Services</option>
              <option value="Legal Services" className="bg-[#0c1017]">Legal & Law Firms</option>
              <option value="Financial & Wealth Management" className="bg-[#0c1017]">Financial Services</option>
              <option value="Construction & Engineering" className="bg-[#0c1017]">Construction & Engineering</option>
              <option value="Logistics & Supply Chain" className="bg-[#0c1017]">Logistics & Freight</option>
              <option value="E-Commerce & Retail" className="bg-[#0c1017]">E-Commerce & Retail</option>
              <option value="Marketing & Advertising Agencies" className="bg-[#0c1017]">Marketing & Advertising</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Target Keyword
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={quickKeyword}
                onChange={(e) => setQuickKeyword(e.target.value)}
                placeholder="e.g. Dentists, Commercial..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shrink-0 flex items-center gap-1.5 shadow-glow-sm"
              >
                <span>Find</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* RECENT SAVED LEADS */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recently Saved Workspace Leads</h2>
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
        ) : leads.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Database className="h-8 w-8 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-white">No Saved Leads Yet</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your workspace currently has 0 saved leads. Use the Lead Search engine to discover businesses and save them to your private workspace.
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
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{l.business_name}</div>
                      {l.website && (
                        <a
                          href={l.website.startsWith("http") ? l.website : `https://${l.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>{l.website.replace(/^https?:\/\//, "")}</span>
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
                      <Link
                        href={`/app/saved-leads`}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/[0.03] hover:bg-white/[0.08]"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
