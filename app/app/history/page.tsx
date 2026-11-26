"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  History, Search, Calendar, Clock, Globe, Database,
  ArrowRight, Download, FileSpreadsheet, FileText, CheckCircle2,
  ExternalLink, Mail, Phone, X, Filter, RefreshCw, Eye
} from "lucide-react";

interface SearchRecordItem {
  id: string;
  workspace_id: number;
  keyword: string;
  country: string;
  city: string;
  industry?: string;
  sources: string[];
  requested_quantity: number;
  qualified_quantity: number;
  leads_with_phone: number;
  search_status: string;
  search_date: string;
  search_time: string;
  completion_time: string;
  created_at: string;
  leads?: any[];
}

export default function SearchHistoryPage() {
  const [records, setRecords] = useState<SearchRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState("ALL");
  const [keywordFilter, setKeywordFilter] = useState("");

  // Snapshot Viewer Modal
  const [activeRecord, setActiveRecord] = useState<SearchRecordItem | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<any>("/searches");
      const list = Array.isArray(data) ? data : (data?.records || []);
      setRecords(list);
    } catch (err: any) {
      setError(err?.message || "Failed to load search history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Unique dates for filter
  const uniqueDates = Array.from(new Set(records.map((r) => r.search_date).filter(Boolean)));

  // Filtered list
  const filteredRecords = records.filter((r) => {
    if (dateFilter !== "ALL" && r.search_date !== dateFilter) return false;
    if (keywordFilter.trim()) {
      const q = keywordFilter.toLowerCase();
      const matchKey = (r.keyword || "").toLowerCase().includes(q);
      const matchLoc = (r.country || "").toLowerCase().includes(q) || (r.city || "").toLowerCase().includes(q);
      return matchKey || matchLoc;
    }
    return true;
  });

  // Reopen snapshot
  const handleOpenSnapshot = async (record: SearchRecordItem) => {
    setSnapshotLoading(true);
    setActiveRecord(record);
    try {
      const res = await api.get<any>(`/searches/${encodeURIComponent(record.id)}`);
      const fullRecord = res?.search_record || res;
      if (fullRecord && fullRecord.leads) {
        setActiveRecord(fullRecord);
      }
    } catch (err) {
      console.error("Failed to load snapshot details:", err);
    } finally {
      setSnapshotLoading(false);
    }
  };

  // Export current snapshot
  const handleExportSnapshot = async (format: "xlsx" | "pdf" | "csv" | "json") => {
    if (!activeRecord || !activeRecord.leads || activeRecord.leads.length === 0) return;
    setExportLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch("/api/leads/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          leads: activeRecord.leads,
          format: format,
          filename: `SEARCH_SNAPSHOT_${(activeRecord.keyword || "leads").replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`,
          meta: {
            keyword: activeRecord.keyword,
            country: activeRecord.country,
            city: activeRecord.city,
            search_date: activeRecord.search_date,
            search_time: activeRecord.search_time,
            search_record_id: activeRecord.id,
            export_target: `Snapshot: ${activeRecord.keyword}`,
          },
        }),
      });

      if (!res.ok) throw new Error("Snapshot export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SNAPSHOT_${activeRecord.keyword.replace(/[^a-zA-Z0-9]/g, "_")}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      alert(`Export error: ${err?.message || "Unknown error"}`);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20">
              Workspace Persistence
            </span>
            <span className="text-xs text-slate-400 font-mono">Real Historical Snapshots</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Search History</h1>
          <p className="text-xs text-slate-400">
            Reopen previous lead search result snapshots without re-running queries or spending extra search credits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRecords}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/[0.03] border border-white/10 transition-colors"
            title="Refresh History"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            href="/app/leads"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-glow-sm transition-all"
          >
            <Search className="h-4 w-4" />
            <span>New Lead Search</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c1017] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="h-4 w-4 text-slate-500 shrink-0" />
          <input
            type="text"
            value={keywordFilter}
            onChange={(e) => setKeywordFilter(e.target.value)}
            placeholder="Filter by keyword, country, or city..."
            className="w-full sm:w-64 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-auto bg-[#090d16] border border-white/10 rounded-xl px-3 py-1.5 text-white focus:outline-none"
          >
            <option value="ALL">All Search Dates</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <span className="text-slate-400 font-mono text-[11px] shrink-0">
            ({filteredRecords.length} searches)
          </span>
        </div>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* COMPACT SEARCH HISTORY CARDS */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading historical search snapshots...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-400 space-y-2 rounded-2xl border border-white/[0.08] bg-[#0c1017]">
          <History className="h-8 w-8 mx-auto text-slate-600" />
          <p className="font-semibold text-slate-300">No search records found for this workspace.</p>
          <p className="text-slate-500">Run your first search in &ldquo;Find Leads&rdquo; to auto-save result snapshots here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((r) => {
            const sourcesList = Array.isArray(r.sources) ? r.sources : [];
            const primarySource = sourcesList[0] || "Google Organic Search";

            return (
              <div
                key={r.id}
                onClick={() => handleOpenSnapshot(r)}
                className="group rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-blue-500/40 hover:bg-[#0e1422] p-5 transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 truncate max-w-[180px]">
                      {r.country || "Global"} {r.city ? `• ${r.city}` : ""}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {r.search_time || "PKT"}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                    {r.keyword}
                  </h3>
                  <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    Source: {primarySource} {sourcesList.length > 1 ? `+${sourcesList.length - 1} more` : ""}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-bold text-white text-sm">
                      {r.qualified_quantity || 0} <span className="text-[10px] font-normal text-slate-400">leads</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold">
                      {r.leads_with_phone ? `${r.leads_with_phone} with phone` : "Public emails"}
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 text-blue-400 group-hover:text-blue-300 font-bold text-xs">
                    <span>Reopen Snapshot</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SNAPSHOT RE-OPEN MODAL */}
      {activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 py-6">
          <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-[#0c1017] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/[0.08] flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                    Saved Search Snapshot
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Date: {activeRecord.search_date} • Time: {activeRecord.search_time} PKT
                  </span>
                </div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <span>{activeRecord.keyword}</span>
                  <span className="text-xs font-normal text-slate-400">
                    ({activeRecord.country || "Global"}{activeRecord.city ? `, ${activeRecord.city}` : ""})
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleExportSnapshot("xlsx")}
                  disabled={exportLoading || !activeRecord.leads || activeRecord.leads.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all disabled:opacity-40"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={() => handleExportSnapshot("csv")}
                  disabled={exportLoading || !activeRecord.leads || activeRecord.leads.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => handleExportSnapshot("json")}
                  disabled={exportLoading || !activeRecord.leads || activeRecord.leads.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>JSON</span>
                </button>
                <button
                  onClick={() => handleExportSnapshot("pdf")}
                  disabled={exportLoading || !activeRecord.leads || activeRecord.leads.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all disabled:opacity-40"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => setActiveRecord(null)}
                  aria-label="Close snapshot modal"
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/5"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Leads Table */}
            <div className="flex-1 overflow-y-auto p-6">
              {snapshotLoading ? (
                <div className="py-16 text-center text-xs text-slate-500">Loading snapshot records...</div>
              ) : !activeRecord.leads || activeRecord.leads.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  No individual lead snapshots were linked to this search ID.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Business Name & Website</th>
                        <th className="py-2.5 px-3">Public Business Email</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Location & Industry</th>
                        <th className="py-2.5 px-3">Source Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {activeRecord.leads.map((lead: any, idx: number) => {
                        const emailStatus = lead.email_status || "FOUND";
                        return (
                          <tr key={idx} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-3 font-mono text-slate-500">{idx + 1}</td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-white">{lead.business_name || lead.name || "Business"}</div>
                              {lead.website && (
                                <a
                                  href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-mono mt-0.5"
                                >
                                  <span>{lead.website.replace(/^https?:\/\//i, "")}</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono">
                              <div className="text-slate-200 font-medium">{lead.email || "No Email Found"}</div>
                              <span className="text-[9px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                {emailStatus}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-300">
                              {lead.phone || "Not Listed"}
                            </td>
                            <td className="py-3 px-3 text-slate-400">
                              <div>{lead.city ? `${lead.city}, ${lead.country}` : lead.country || "Global"}</div>
                              <div className="text-[10px] text-slate-500">{lead.industry || lead.category || "Commercial"}</div>
                            </td>
                            <td className="py-3 px-3 text-[11px]">
                              {lead.original_source_url || lead.source_url ? (
                                <a
                                  href={lead.original_source_url || lead.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline flex items-center gap-1 font-mono"
                                >
                                  <span>View Source</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              ) : (
                                <span className="text-slate-500">{lead.source || "Google Web"}</span>
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

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/[0.08] bg-[#090d16] flex items-center justify-between text-xs text-slate-400">
              <div>
                Displaying <strong>{activeRecord.leads?.length || 0}</strong> genuine saved leads from snapshot without API re-query.
              </div>
              <button
                onClick={() => setActiveRecord(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-white font-semibold text-xs transition-colors"
              >
                Close Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
