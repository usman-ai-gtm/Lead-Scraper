"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ALL_193_COUNTRIES } from "@/lib/countries";
import {
  Download, FileSpreadsheet, FileText, CheckCircle2,
  Database, RefreshCw, Filter, ShieldCheck, ArrowRight,
  ExternalLink
} from "lucide-react";

export default function ExportsPage() {
  const { user } = useAuth();

  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Filters for targeted export
  const [exportCountry, setExportCountry] = useState("Any");
  const [exportIndustry, setExportIndustry] = useState("Any");

  const fetchStats = async () => {
    try {
      const res = await api.get<any>("/leads", { page: 1, page_size: 1 });
      setTotalLeads(res?.total !== undefined ? res.total : 0);
    } catch {
      setTotalLeads(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDownloadExport = async (format: "csv" | "xlsx") => {
    setDownloading(format);
    try {
      // First fetch leads from caller's isolated workspace
      const res = await api.get<any>("/leads", {
        country: exportCountry !== "Any" ? exportCountry : undefined,
        industry: exportIndustry !== "Any" ? exportIndustry : undefined,
        page: 1,
        page_size: 5000,
      });

      const leadsToExport = res?.leads || (Array.isArray(res) ? res : []);

      if (leadsToExport.length === 0) {
        setToastMsg("No leads match your export criteria. Try changing filters or finding more leads.");
        setDownloading(null);
        return;
      }

      const exportRes = await fetch("/api/leads/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: leadsToExport,
          format,
          filename: `usman_ai_leads_ws${user?.workspace_id || 1}_${Date.now()}`,
        }),
      });

      if (!exportRes.ok) throw new Error("Export request failed");

      const blob = await exportRes.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `usman_ai_leads_ws${user?.workspace_id || 1}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setToastMsg(`Successfully generated and downloaded ${leadsToExport.length} leads in .${format.toUpperCase()} format.`);
    } catch (e: any) {
      setToastMsg("Failed to export leads. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  const EXPORT_COLUMNS = [
    { name: "Business Name", desc: "Official registered or trading name" },
    { name: "Industry & Category", desc: "B2B sector classification" },
    { name: "Location & Address", desc: "Country, state, city, and street address" },
    { name: "Website", desc: "Direct company domain with protocol" },
    { name: "Public Email", desc: "FOUND, UNVERIFIED, or VERIFIED status" },
    { name: "Public Phone", desc: "Normalized international format" },
    { name: "WhatsApp Number", desc: "Click-to-chat compatible number" },
    { name: "Social Profiles", desc: "LinkedIn, Instagram, Facebook, and Twitter links" },
    { name: "Business Description", desc: "Public overview of commercial activity" },
    { name: "Services", desc: "Reported capabilities and offerings" },
    { name: "Original Source URL", desc: "Live link to original public listing" },
    { name: "Extraction Date", desc: "ISO 8601 discovery timestamp" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
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
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
            Export Center
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Tenant Isolated • CSV & Native XLSX
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">Export Workspace Leads</h1>
        <p className="text-xs text-slate-400">
          Download your saved leads in clean, industry-standard CSV and Microsoft Excel (.xlsx) formats.
        </p>
      </div>

      {/* Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CSV Card */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c1017] flex flex-col justify-between hover:border-blue-500/30 transition-all space-y-4">
          <div>
            <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Comma-Separated Values (CSV)</h3>
            <p className="text-xs text-slate-400 mt-1">
              RFC 4180 compliant CSV encoded with UTF-8 BOM. Perfect for importing directly into Excel, Google Sheets, HubSpot, or Salesforce.
            </p>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              {loading ? "..." : `${totalLeads} Available Leads`}
            </span>
            <button
              onClick={() => handleDownloadExport("csv")}
              disabled={downloading !== null || totalLeads === 0}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all disabled:opacity-40 flex items-center gap-2 shadow-glow-sm"
            >
              <Download className={`h-3.5 w-3.5 ${downloading === "csv" ? "animate-bounce" : ""}`} />
              <span>{downloading === "csv" ? "Generating CSV..." : "Download CSV"}</span>
            </button>
          </div>
        </div>

        {/* XLSX Card */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c1017] flex flex-col justify-between hover:border-emerald-500/30 transition-all space-y-4">
          <div>
            <div className="h-10 w-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Microsoft Excel (.xlsx)</h3>
            <p className="text-xs text-slate-400 mt-1">
              Genuine binary OpenXML spreadsheet formatted with clean headers, typed columns, and preservation of special characters.
            </p>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              {loading ? "..." : `${totalLeads} Available Leads`}
            </span>
            <button
              onClick={() => handleDownloadExport("xlsx")}
              disabled={downloading !== null || totalLeads === 0}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all disabled:opacity-40 flex items-center gap-2 shadow-glow-sm"
            >
              <Download className={`h-3.5 w-3.5 ${downloading === "xlsx" ? "animate-bounce" : ""}`} />
              <span>{downloading === "xlsx" ? "Generating XLSX..." : "Download XLSX"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Targeted Export Filters */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c1017] space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
          <Filter className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Targeted Export Filters</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Filter by Country
            </label>
            <select
              value={exportCountry}
              onChange={(e) => setExportCountry(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="Any" className="bg-[#0c1017]">All Countries</option>
              {ALL_193_COUNTRIES.map((c) => (
                <option key={c} value={c} className="bg-[#0c1017]">{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Filter by Industry
            </label>
            <select
              value={exportIndustry}
              onChange={(e) => setExportIndustry(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="Any" className="bg-[#0c1017]">All Industries</option>
              <option value="Real Estate" className="bg-[#0c1017]">Real Estate</option>
              <option value="Healthcare & Medical Clinics" className="bg-[#0c1017]">Healthcare & Clinics</option>
              <option value="Technology & SaaS" className="bg-[#0c1017]">Technology & SaaS</option>
              <option value="Hospitality & Tourism" className="bg-[#0c1017]">Hospitality & Tourism</option>
              <option value="Professional Services" className="bg-[#0c1017]">Professional Services</option>
              <option value="Legal Services" className="bg-[#0c1017]">Legal Services</option>
              <option value="Financial & Wealth Management" className="bg-[#0c1017]">Financial Services</option>
              <option value="Construction & Engineering" className="bg-[#0c1017]">Construction & Engineering</option>
              <option value="Logistics & Supply Chain" className="bg-[#0c1017]">Logistics & Supply Chain</option>
              <option value="E-Commerce & Retail" className="bg-[#0c1017]">E-Commerce & Retail</option>
            </select>
          </div>
        </div>
      </div>

      {/* Export Field Inventory */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c1017] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Exported Data Fields (12 Columns)</h2>
          </div>
          <span className="text-[11px] text-slate-400">Zero synthetic or fabricated data</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {EXPORT_COLUMNS.map((col, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="text-xs font-bold text-white">{col.name}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{col.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
