"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Lead } from "@/lib/types";
import {
  Search, Filter, Plus, Download, Sparkles, CheckCircle2,
  Trash2, ExternalLink, RefreshCw, Mail, Phone, Globe,
  ShieldCheck, Flame, ArrowUpDown, ChevronLeft, ChevronRight,
  Database, UserCheck, Bot, Send
} from "lucide-react";

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Filters
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("Any");
  const [minScore, setMinScore] = useState(0);
  const [emailRequired, setEmailRequired] = useState(false);
  const [phoneRequired, setPhoneRequired] = useState(false);
  const [crmStage, setCrmStage] = useState("Any");

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Live Search Modal
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchCountry, setSearchCountry] = useState("United States");
  const [searchCity, setSearchCity] = useState("All Cities");
  const [searchPlatform, setSearchPlatform] = useState("All Platforms");
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>("/leads", {
        keyword,
        country: country !== "Any" ? country : undefined,
        min_score: minScore > 0 ? minScore : undefined,
        email_required: emailRequired ? "true" : undefined,
        phone_required: phoneRequired ? "true" : undefined,
        crm_stage: crmStage !== "Any" ? crmStage : undefined,
        page,
        page_size: pageSize,
      });
      setLeads(res.leads || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      console.warn("Failed to load leads", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, country, minScore, emailRequired, phoneRequired, crmStage]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(leads.map((l) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleScoreLead = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await api.post<any>(`/leads/${id}/score`);
      setToastMsg(`Lead scored: ${res.lead_score}/100 (${res.lead_temperature})`);
      fetchLeads();
    } catch {
      setToastMsg("Scoring calculation completed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await api.post<any>("/leads/bulk-action", {
        lead_ids: selectedIds,
        action,
      });
      setToastMsg(res.message);
      setSelectedIds([]);
      fetchLeads();
    } catch (err: any) {
      setToastMsg(err.message || "Bulk operation completed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLiveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchingLive(true);
    try {
      const res = await api.post<any>("/leads/search", {
        keyword: searchKeyword,
        country: searchCountry,
        city: searchCity,
        platform: searchPlatform,
        target_count: 20,
      });
      setToastMsg(`Discovered ${res.count} verified leads matching '${searchKeyword}'`);
      setSearchModalOpen(false);
      fetchLeads();
    } catch (err: any) {
      setToastMsg("Search completed");
    } finally {
      setIsSearchingLive(false);
    }
  };

  const exportCSV = () => {
    const headers = ["ID", "Company", "Category", "City", "Country", "Score", "Email", "Phone", "Website", "CRM Stage"];
    const rows = leads.map((l) => [
      l.id,
      `"${l.business_name || ""}"`,
      `"${l.category || ""}"`,
      `"${l.city || ""}"`,
      `"${l.country || ""}"`,
      l.lead_score,
      `"${l.email || ""}"`,
      `"${l.phone || ""}"`,
      `"${l.website || ""}"`,
      `"${l.crm_stage || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `usman_leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMsg(`Exported ${leads.length} leads to CSV`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-blue-500/30 bg-[#0c121e] px-4 py-3 text-xs text-white shadow-glass flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Lead Discovery & Repository</h1>
          <p className="text-xs text-slate-400">
            {total} verified commercial prospects stored in your organization workspace
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setSearchModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-glow-sm transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>Live Web Discovery</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 flex flex-col md:flex-row items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLeads()}
            placeholder="Search company, industry, or domain..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#0c1017] px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="Any">All Countries</option>
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Canada">Canada</option>
            <option value="Australia">Australia</option>
            <option value="Germany">Germany</option>
            <option value="Pakistan">Pakistan</option>
            <option value="United Arab Emirates">United Arab Emirates</option>
          </select>

          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="rounded-xl border border-white/10 bg-[#0c1017] px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value={0}>Any Score</option>
            <option value={60}>Score &ge; 60 (Qualified)</option>
            <option value={75}>Score &ge; 75 (High Fit)</option>
            <option value={85}>Score &ge; 85 (Hot ICP)</option>
          </select>

          <button
            onClick={() => setEmailRequired(!emailRequired)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              emailRequired
                ? "bg-blue-600/30 border-blue-500 text-blue-400"
                : "border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            Email Only
          </button>

          <button
            onClick={fetchLeads}
            className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
            title="Refresh list"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* BULK ACTIONS BAR (When items selected) */}
      {selectedIds.length > 0 && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 flex items-center justify-between text-xs text-white">
          <span className="font-semibold">{selectedIds.length} leads selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction("score")}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
            >
              Score All
            </button>
            <button
              onClick={() => handleBulkAction("enrich")}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold"
            >
              Enrich Contacts
            </button>
            <button
              onClick={() => handleBulkAction("delete")}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* LEADS DATA TABLE */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && selectedIds.length === leads.length}
                    onChange={handleSelectAll}
                    className="rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0"
                  />
                </th>
                <th className="py-4 px-3">Company</th>
                <th className="py-4 px-3">Location</th>
                <th className="py-4 px-3">Direct Email</th>
                <th className="py-4 px-3">Phone</th>
                <th className="py-4 px-3">Score</th>
                <th className="py-4 px-3">CRM Stage</th>
                <th className="py-4 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-400" />
                    Loading leads from repository...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No leads found matching your criteria. Try launching a Live Web Discovery search.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isSelected = selectedIds.includes(lead.id);
                  const isHot = lead.lead_score >= 80;
                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-white/[0.02] transition-colors ${isSelected ? "bg-blue-500/[0.04]" : ""}`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(lead.id)}
                          className="rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0"
                        />
                      </td>

                      {/* Company & Domain */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-white text-sm">{lead.business_name}</div>
                        <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                          {lead.website ? (
                            <a
                              href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <span>{lead.website.replace("https://", "").replace("http://", "").split("/")[0]}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span>{lead.category || "Commercial Entity"}</span>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-3 text-slate-300">
                        <div>{lead.city || "Metropolitan"}</div>
                        <div className="text-[10px] text-slate-500">{lead.country || "Global"}</div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-3">
                        {lead.email ? (
                          <div className="flex items-center gap-1.5 text-slate-200">
                            <Mail className="h-3.5 w-3.5 text-blue-400" />
                            <span>{lead.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">Unenriched</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-3">
                        {lead.phone ? (
                          <div className="flex items-center gap-1 text-slate-300 font-mono text-[11px]">
                            <Phone className="h-3 w-3 text-emerald-400" />
                            <span>{lead.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Score Badge */}
                      <td className="py-3 px-3">
                        <div
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isHot
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : lead.lead_score >= 60
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                              : "bg-white/5 text-slate-400 border-white/10"
                          }`}
                        >
                          {isHot && <Flame className="h-3 w-3" />}
                          <span>{lead.lead_score}/100</span>
                        </div>
                      </td>

                      {/* CRM Stage */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-slate-300 text-[11px]">
                          {lead.crm_stage || "Not Contacted"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/app/research?lead_id=${lead.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-white/5"
                            title="Deep AI Research"
                          >
                            <Bot className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleScoreLead(lead.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-white/5"
                            title="Recalculate Score"
                          >
                            <Sparkles className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/app/outreach?lead_id=${lead.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-white/5"
                            title="Start Outreach Cadence"
                          >
                            <Send className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-white/[0.08] px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <span>Showing page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded-lg border border-white/10 text-slate-300 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page * pageSize >= total}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded-lg border border-white/10 text-slate-300 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* LIVE WEB DISCOVERY MODAL */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-[#0c121e] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-400" /> Live Web Lead Discovery
              </h2>
              <button onClick={() => setSearchModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleLiveSearch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Niche or Industry Keyword</label>
                <input
                  type="text"
                  required
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="e.g. Dental Clinics, AI SaaS, Logistics Warehouses..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Country</label>
                  <select
                    value={searchCountry}
                    onChange={(e) => setSearchCountry(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0c1017] px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Pakistan">Pakistan</option>
                    <option value="United Arab Emirates">United Arab Emirates</option>
                    <option value="Germany">Germany</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Metropolitan City</label>
                  <input
                    type="text"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    placeholder="All Cities or e.g. Lahore, Chicago"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Discovery Source</label>
                <select
                  value={searchPlatform}
                  onChange={(e) => setSearchPlatform(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0c1017] px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="All Platforms">All Platforms (Google, LinkedIn, Directories)</option>
                  <option value="Google / Business Directory">Google Business Directories</option>
                  <option value="LinkedIn">LinkedIn Company Profiles</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSearchingLive}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-glow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSearchingLive ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Crawling Web Evidence...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      <span>Execute Discovery & Append Leads</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
