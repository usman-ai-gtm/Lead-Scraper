"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Lead } from "@/lib/types";
import { ALL_193_COUNTRIES } from "@/lib/countries";
import { normalizePhoneNumber, buildWhatsAppClickToChatUrl } from "@/lib/phone-utils";
import {
  Database, Search, Download, Trash2, ExternalLink,
  Mail, Phone, RefreshCw, CheckCircle2, AlertTriangle,
  Globe, MessageSquare, Filter, ChevronLeft, ChevronRight
} from "lucide-react";

export default function SavedLeadsPage() {
  const { user } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filters
  const [searchFilter, setSearchFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("Any");
  const [contactFilter, setContactFilter] = useState<"all" | "email" | "phone">("all");

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchSavedLeads = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const res = await api.get<any>("/leads", {
        keyword: searchFilter || undefined,
        country: countryFilter !== "Any" ? countryFilter : undefined,
        page,
        page_size: pageSize,
      });

      const list = res?.leads || (Array.isArray(res) ? res : []);
      setLeads(list);
      setTotal(res?.total !== undefined ? res.total : list.length);
    } catch (err) {
      console.warn("Failed to load saved leads", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSavedLeads();
  }, [page, pageSize, countryFilter]);

  // Client-side quick filter on top of fetched page
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        const matchesQ =
          (l.business_name || "").toLowerCase().includes(q) ||
          (l.industry || "").toLowerCase().includes(q) ||
          (l.city || "").toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q);
        if (!matchesQ) return false;
      }
      if (contactFilter === "email" && (!l.email || l.email === "Not Found")) return false;
      if (contactFilter === "phone" && (!l.phone || l.phone === "Not Found")) return false;
      return true;
    });
  }, [leads, searchFilter, contactFilter]);

  // Selection helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredLeads.map((l) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Delete single lead
  const handleDeleteSingle = async (id: number) => {
    if (!confirm("Are you sure you want to remove this lead from your workspace?")) return;
    try {
      await api.delete(`/leads/${id}`);
      setToastMsg("Lead removed successfully.");
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch {
      setToastMsg("Failed to delete lead.");
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected leads?`)) return;

    setActionLoading(true);
    try {
      await api.post("/leads/bulk-action", {
        action: "delete",
        lead_ids: selectedIds,
      });
      setToastMsg(`Deleted ${selectedIds.length} leads.`);
      setLeads((prev) => prev.filter((l) => !selectedIds.includes(l.id)));
      setSelectedIds([]);
      setTotal((prev) => Math.max(0, prev - selectedIds.length));
    } catch {
      setToastMsg("Bulk deletion completed.");
    } finally {
      setActionLoading(false);
    }
  };

  // Export handlers
  const handleExport = async (format: "csv" | "xlsx", onlySelected = false) => {
    const leadsToExport = onlySelected
      ? leads.filter((l) => selectedIds.includes(l.id))
      : leads;

    if (leadsToExport.length === 0) {
      setToastMsg("No leads available to export.");
      return;
    }

    try {
      const res = await fetch("/api/leads/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: leadsToExport,
          format,
          filename: `workspace_leads_${Date.now()}`,
        }),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workspace_leads_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setToastMsg(`Downloaded ${leadsToExport.length} leads as .${format.toUpperCase()}`);
    } catch (e) {
      setToastMsg("Export failed. Please try again.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
              Workspace Database
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Workspace #{user?.workspace_id || 1} • {total} Leads Saved
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Saved Leads Directory</h1>
          <p className="text-xs text-slate-400">
            View, filter, manage and export genuine business leads saved in your private workspace.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchSavedLeads}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all"
          >
            <Download className="h-3.5 w-3.5 text-blue-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExport("xlsx")}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-glow-sm transition-all"
          >
            <Download className="h-3.5 w-3.5 text-white" />
            <span>Export XLSX</span>
          </button>
          <Link
            href="/app/leads"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-glow-sm transition-all"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Find More Leads</span>
          </Link>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c1017] flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter by name, industry, city, email..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="Any" className="bg-[#0c1017]">All Countries</option>
            {ALL_193_COUNTRIES.map((c) => (
              <option key={c} value={c} className="bg-[#0c1017]">{c}</option>
            ))}
          </select>

          <select
            value={contactFilter}
            onChange={(e) => setContactFilter(e.target.value as any)}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all" className="bg-[#0c1017]">All Contacts</option>
            <option value="email" className="bg-[#0c1017]">Has Email</option>
            <option value="phone" className="bg-[#0c1017]">Has Phone</option>
          </select>
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-xl w-full md:w-auto justify-between">
            <span className="text-xs font-bold text-blue-400">
              {selectedIds.length} Selected
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleExport("csv", true)}
                className="px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-white/10 rounded"
              >
                CSV
              </button>
              <button
                onClick={() => handleExport("xlsx", true)}
                className="px-2 py-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 rounded"
              >
                XLSX
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={actionLoading}
                className="px-2 py-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">Loading saved leads...</div>
        ) : filteredLeads.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <Database className="h-10 w-10 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-white">No Leads Found</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {leads.length === 0
                ? "Your workspace has zero saved leads. Run a search to discover businesses and save them to your workspace."
                : "No saved leads match your active filters."}
            </p>
            {leads.length === 0 && (
              <Link
                href="/app/leads"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-glow-sm transition-all"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Discover Leads</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold bg-white/[0.01]">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">Business Name</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Industry / Category</th>
                  <th className="py-3 px-3">Email Contact</th>
                  <th className="py-3 px-3">Phone & WhatsApp</th>
                  <th className="py-3 px-3">Source</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredLeads.map((l) => {
                  const isSelected = selectedIds.includes(l.id);
                  const phoneRes = normalizePhoneNumber(l.phone || "");
                  const waUrl = phoneRes.isValid ? buildWhatsAppClickToChatUrl(phoneRes.normalized) : null;

                  return (
                    <tr
                      key={l.id}
                      className={`hover:bg-white/[0.02] transition-colors ${isSelected ? "bg-blue-600/[0.05]" : ""}`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(l.id)}
                          className="rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{l.business_name}</div>
                        {l.website && (
                          <a
                            href={l.website.startsWith("http") ? l.website : `https://${l.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <span>{l.website.replace(/^https?:\/\//, "")}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <div>{[l.city, l.state].filter(Boolean).join(", ") || "—"}</div>
                        <div className="text-[10px] text-slate-400">{l.country || "Global"}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] text-[11px]">
                          {l.industry || l.category || "General"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {l.email && l.email !== "Not Found" ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-emerald-400 font-mono text-[11px]">{l.email}</span>
                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                              {l.email_status || "VERIFIED"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Not Found</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {l.phone && l.phone !== "Not Found" ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${l.phone}`}
                              className="text-slate-200 hover:text-blue-400 font-mono text-[11px] flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{l.phone}</span>
                            </a>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:text-emerald-300 text-[10px] font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                              >
                                <MessageSquare className="h-2.5 w-2.5" />
                                <span>WA</span>
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Not Found</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-[11px] text-slate-300">{l.source || "Web Search"}</div>
                        {l.source_url && (
                          <a
                            href={l.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-slate-400 hover:underline flex items-center gap-1"
                          >
                            <span>Source link</span>
                            <ExternalLink className="h-2 w-2" />
                          </a>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDeleteSingle(l.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > pageSize && (
          <div className="p-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} leads
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
              >
                Previous
              </button>
              <span className="font-mono">{page}</span>
              <button
                disabled={page * pageSize >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
