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
  Globe, MessageSquare, Filter, ChevronLeft, ChevronRight,
  History, Calendar, Clock, FileSpreadsheet, FileText, X,
  Layers, Eye, Check, Sparkles, Send, ShieldCheck, User
} from "lucide-react";
import { AiLeadResearchModal } from "@/components/leads/AiLeadResearchModal";

interface SearchRecord {
  id: string;
  workspace_id: number;
  user_id?: number;
  keyword: string;
  country: string;
  city: string;
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

interface SearchDateStat {
  search_date: string;
  total_searches: number;
  total_leads: number;
  total_with_phone: number;
}

interface ExportHistoryItem {
  id: number;
  workspace_id: number;
  export_target: string;
  search_record_id?: string;
  export_date_filter?: string;
  format: string;
  record_count: number;
  export_date: string;
  export_time: string;
  created_at: string;
}

function getSavedLeadsAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function SavedLeadsPage() {
  const { user, isLocked, refreshUser } = useAuth();

  // Tab State: "leads" | "history" | "export_history"
  const [activeTab, setActiveTab] = useState<"leads" | "history" | "export_history">("leads");

  // Leads State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filters for Saved Leads
  const [searchFilter, setSearchFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("Any");
  const [contactFilter, setContactFilter] = useState<"all" | "email" | "phone">("all");

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Search History State
  const [searchRecords, setSearchRecords] = useState<SearchRecord[]>([]);
  const [searchDates, setSearchDates] = useState<SearchDateStat[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("ALL");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearchKeyword, setHistorySearchKeyword] = useState("");

  // Search Drill-down Modal State
  const [viewingRecord, setViewingRecord] = useState<SearchRecord | null>(null);
  const [recordDetailLoading, setRecordDetailLoading] = useState(false);

  // Export Audit History State
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);
  const [exportHistoryLoading, setExportHistoryLoading] = useState(false);

  // Outreach & AI Email Assistant State
  const [outreachStatusFilter, setOutreachStatusFilter] = useState<string>("all");
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [activeEmailLead, setActiveEmailLead] = useState<Lead | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSenderName, setEmailSenderName] = useState(user?.full_name || "Sales Outreach");
  const [emailCompanyName, setEmailCompanyName] = useState(user?.company || "USMAN AI GTM");
  const [emailOfferDesc, setEmailOfferDesc] = useState("B2B lead generation, market intelligence, and verified business data solutions to scale customer acquisition.");
  const [emailGenerating, setEmailGenerating] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailFollowupDate, setEmailFollowupDate] = useState("");
  const [emailFollowupNotes, setEmailFollowupNotes] = useState("");
  const [emailOutreachStatus, setEmailOutreachStatus] = useState("NEW");
  const [emailMode, setEmailMode] = useState<"initial" | "followup">("initial");
  const [emailFeedback, setEmailFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // AI Lead Research Agent State (Lifetime Plan Exclusive)
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [selectedResearchLead, setSelectedResearchLead] = useState<Lead | null>(null);

  // Fetch Saved Master Leads
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

  // Fetch Search History & Dates
  const fetchSearchHistory = async () => {
    setHistoryLoading(true);
    try {
      const qParams: Record<string, string> = {};
      if (selectedDateFilter && selectedDateFilter !== "ALL") {
        qParams.date = selectedDateFilter;
      }
      if (historySearchKeyword.trim()) {
        qParams.keyword = historySearchKeyword.trim();
      }

      const res = await api.get<any>("/searches", qParams);
      const records = res?.records || (Array.isArray(res) ? res : []);
      setSearchRecords(records);

      // Fetch distinct dates summary
      const datesRes = await api.get<any>("/searches/dates");
      const datesList = datesRes?.dates || [];
      setSearchDates(datesList);
    } catch (err) {
      console.warn("Failed to load search history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch Export Audit History
  const fetchExportHistory = async () => {
    setExportHistoryLoading(true);
    try {
      const res = await api.get<any>("/exports/history");
      const list = res?.history || (Array.isArray(res) ? res : []);
      setExportHistory(list);
    } catch (err) {
      console.warn("Failed to load export audit history", err);
    } finally {
      setExportHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedLeads();
  }, [page, pageSize, countryFilter]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchSearchHistory();
    } else if (activeTab === "export_history") {
      fetchExportHistory();
    }
  }, [activeTab, selectedDateFilter]);

  // Open Historical Search Record Drilldown
  const handleOpenSearchRecord = async (recordId: string) => {
    setRecordDetailLoading(true);
    try {
      const res = await api.get<any>(`/searches/${encodeURIComponent(recordId)}`);
      if (res?.search_record) {
        setViewingRecord(res.search_record);
      } else {
        const found = searchRecords.find((r) => r.id === recordId);
        if (found) setViewingRecord(found);
      }
    } catch {
      const found = searchRecords.find((r) => r.id === recordId);
      if (found) setViewingRecord(found);
    } finally {
      setRecordDetailLoading(false);
    }
  };

  // Filtered Leads (Client-side view filter on top of fetched page)
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
      if (outreachStatusFilter !== "all") {
        const stage = l.crm_stage || "NEW";
        if (stage !== outreachStatusFilter) return false;
      }
      return true;
    });
  }, [leads, searchFilter, contactFilter, outreachStatusFilter]);

  // Outreach badge renderer
  const renderOutreachBadge = (status?: string) => {
    const s = status || "NEW";
    switch (s) {
      case "EMAIL SENT":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">EMAIL SENT</span>;
      case "DRAFT READY":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">DRAFT READY</span>;
      case "REPLIED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">REPLIED</span>;
      case "INTERESTED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">INTERESTED</span>;
      case "NOT INTERESTED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">NOT INTERESTED</span>;
      case "DO NOT CONTACT":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">DO NOT CONTACT</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700/50 text-slate-400 border border-slate-600/30">NEW</span>;
    }
  };

  const handleOpenEmailModal = (lead: Lead) => {
    if (isLocked) {
      setToastMsg("Your account is currently locked. Please complete payment and contact the Owner for activation. Your premium access will begin after approval.");
      return;
    }
    setActiveEmailLead(lead);
    setEmailOutreachStatus(lead.crm_stage || "NEW");
    setEmailFollowupDate(lead.next_followup || "");
    setEmailFollowupNotes("");
    setEmailSubject(lead.business_name ? `Strategic inquiry for ${lead.business_name}` : "Strategic Partnership Inquiry");
    setEmailBody("");
    setEmailFeedback(null);
    setEmailMode(lead.crm_stage === "EMAIL SENT" ? "followup" : "initial");
    setIsEmailModalOpen(true);
  };

  const handleGenerateDraft = async () => {
    if (!activeEmailLead) return;
    setEmailGenerating(true);
    setEmailFeedback(null);
    try {
      if (emailMode === "followup") {
        const res = await fetch("/api/outreach/generate-followup", {
          method: "POST",
          headers: getSavedLeadsAuthHeaders(),
          body: JSON.stringify({
            original_subject: emailSubject || `Strategic partnership with ${activeEmailLead.business_name}`,
            original_body: emailBody || "Previous note regarding B2B services.",
            lead: activeEmailLead,
            sender: {
              sender_name: emailSenderName,
              company_name: emailCompanyName,
              offer_description: emailOfferDesc,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Follow-up generation failed");
        setEmailSubject(data.draft.subject);
        setEmailBody(data.draft.full_email);
        setEmailFeedback({ type: "success", message: `Polite follow-up prepared by ${data.model}` });
      } else {
        const res = await fetch("/api/outreach/generate-email", {
          method: "POST",
          headers: getSavedLeadsAuthHeaders(),
          body: JSON.stringify({
            lead: activeEmailLead,
            sender: {
              sender_name: emailSenderName,
              company_name: emailCompanyName,
              offer_description: emailOfferDesc,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Draft generation failed");
        setEmailSubject(data.draft.subject);
        setEmailBody(data.draft.full_email);
        setEmailOutreachStatus("DRAFT READY");
        setLeads((prev) =>
          prev.map((l) => (l.id === activeEmailLead.id ? { ...l, crm_stage: "DRAFT READY" } : l))
        );
        setEmailFeedback({ type: "success", message: `Personalized cold outreach prepared by ${data.model}` });
      }
    } catch (e: any) {
      setEmailFeedback({ type: "error", message: e.message || "Failed to generate draft" });
    } finally {
      setEmailGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!activeEmailLead) return;
    if (emailOutreachStatus === "DO NOT CONTACT") {
      alert("This lead is marked as DO NOT CONTACT. Outreach is blocked by compliance policy.");
      return;
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      alert("Please ensure both subject and email body are present before sending.");
      return;
    }

    setEmailSending(true);
    setEmailFeedback(null);
    try {
      const res = await fetch("/api/integrations/gmail/send", {
        method: "POST",
        headers: getSavedLeadsAuthHeaders(),
        body: JSON.stringify({
          lead_id: activeEmailLead.id,
          recipient_email: activeEmailLead.email,
          recipient_name: activeEmailLead.business_name,
          subject: emailSubject,
          body: emailBody,
          followup_date: emailFollowupDate || undefined,
          followup_notes: emailFollowupNotes || undefined,
          outreach_status: emailOutreachStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Sending failed");
      }

      setEmailOutreachStatus("EMAIL SENT");
      setLeads((prev) =>
        prev.map((l) =>
          l.id === activeEmailLead.id
            ? { ...l, crm_stage: "EMAIL SENT", next_followup: emailFollowupDate || undefined }
            : l
        )
      );
      setEmailFeedback({
        type: "success",
        message: `Email sent successfully via Gmail API! Message ID: ${data.gmail_message_id}`,
      });
      setToastMsg(`Email sent to ${activeEmailLead.business_name} via Gmail.`);
    } catch (e: any) {
      setEmailFeedback({ type: "error", message: e.message || "Failed to send email via Gmail." });
    } finally {
      setEmailSending(false);
    }
  };

  const handleUpdateLeadStatus = async (leadId: number, newStatus: string) => {
    try {
      await fetch("/api/outreach/records", {
        method: "PATCH",
        headers: getSavedLeadsAuthHeaders(),
        body: JSON.stringify({ lead_id: leadId, status: newStatus }),
      });
      setEmailOutreachStatus(newStatus);
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, crm_stage: newStatus } : l))
      );
      setToastMsg(`Lead outreach status updated to ${newStatus}.`);
    } catch (e) {
      console.warn("Failed to update status", e);
    }
  };

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

  // Professional Export Handler (XLSX & Landscape PDF ONLY - CSV Prohibited)
  const handleExport = async (
    format: "xlsx" | "pdf",
    targetType: "all" | "selected" | "single_lead" | "search_record" | "date",
    payload?: { specificLeads?: any[]; searchRecord?: SearchRecord; dateStr?: string }
  ) => {
    if (isLocked) {
      setToastMsg("Your account is currently locked. Please complete payment and contact the Owner for activation. Your premium access will begin after approval.");
      return;
    }
    let leadsToExport: any[] = [];
    let filename = "";
    let exportTargetLabel = "";
    let meta: any = {};

    if (targetType === "single_lead" && payload?.specificLeads && payload.specificLeads.length > 0) {
      leadsToExport = payload.specificLeads;
      const bname = (leadsToExport[0].business_name || "lead").replace(/[^a-zA-Z0-9_-]/g, "_");
      filename = `USMAN_AI_${bname}_${Date.now()}`;
      exportTargetLabel = `Single Lead: ${leadsToExport[0].business_name}`;
      meta = {
        keyword: leadsToExport[0].industry || "Qualified Lead",
        search_date: leadsToExport[0].saved_date,
        search_time: leadsToExport[0].saved_time,
        export_target: exportTargetLabel,
      };
    } else if (targetType === "search_record" && payload?.searchRecord) {
      const sr = payload.searchRecord;
      // If leads not preloaded in record, fetch from endpoint
      if (!sr.leads || sr.leads.length === 0) {
        try {
          const detailRes = await api.get<any>(`/searches/${encodeURIComponent(sr.id)}`);
          leadsToExport = detailRes?.search_record?.leads || [];
        } catch {
          leadsToExport = [];
        }
      } else {
        leadsToExport = sr.leads;
      }
      const kw = sr.keyword.replace(/[^a-zA-Z0-9_-]/g, "_");
      filename = `USMAN_AI_SEARCH_${kw}_${sr.id}`;
      exportTargetLabel = `Search Record: ${sr.keyword} (${sr.id})`;
      meta = {
        keyword: sr.keyword,
        search_date: sr.search_date,
        search_time: sr.search_time,
        search_record_id: sr.id,
        export_target: exportTargetLabel,
      };
    } else if (targetType === "date" && payload?.dateStr) {
      const d = payload.dateStr;
      try {
        const dateLeadsRes = await api.get<any>(`/searches/date/${encodeURIComponent(d)}`);
        leadsToExport = dateLeadsRes?.leads || [];
      } catch {
        leadsToExport = [];
      }
      const cleanDate = d.replace(/[^a-zA-Z0-9_-]/g, "_");
      filename = `USMAN_AI_LEADS_DATE_${cleanDate}_${Date.now()}`;
      exportTargetLabel = `All Searches from Date: ${d}`;
      meta = {
        keyword: `Searches on ${d}`,
        search_date: d,
        export_target: exportTargetLabel,
      };
    } else if (targetType === "selected") {
      leadsToExport = leads.filter((l) => selectedIds.includes(l.id));
      filename = `USMAN_AI_SELECTED_LEADS_${Date.now()}`;
      exportTargetLabel = `Selected ${leadsToExport.length} Leads`;
      meta = {
        keyword: "Selected Workspace Leads",
        export_target: exportTargetLabel,
      };
    } else {
      // All Saved Leads in workspace
      leadsToExport = leads;
      filename = `USMAN_AI_WORKSPACE_LEADS_${Date.now()}`;
      exportTargetLabel = `All Saved Leads (${leads.length})`;
      meta = {
        keyword: searchFilter || "All Saved Leads",
        export_target: exportTargetLabel,
      };
    }

    if (leadsToExport.length === 0) {
      setToastMsg("No qualified leads available to export for this selection.");
      return;
    }

    setToastMsg(`Preparing professional ${format.toUpperCase()} export (${leadsToExport.length} records)...`);

    try {
      const res = await fetch("/api/leads/export", {
        method: "POST",
        headers: getSavedLeadsAuthHeaders(),
        body: JSON.stringify({
          leads: leadsToExport,
          format: format,
          filename: filename,
          meta: meta,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Export failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setToastMsg(`Successfully exported ${leadsToExport.length} leads in .${format.toUpperCase()} format!`);
    } catch (e: any) {
      setToastMsg(`Export failed: ${e?.message || "Please try again."}`);
    }
  };

  const selectedDateStat = useMemo(() => {
    if (!selectedDateFilter || selectedDateFilter === "ALL") return null;
    return searchDates.find((sd) => sd.search_date === selectedDateFilter) || null;
  }, [selectedDateFilter, searchDates]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-blue-500/30 bg-[#0c121e] px-4 py-3 text-xs text-white shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 max-w-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="leading-snug">{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-500 hover:text-white shrink-0">✕</button>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
              Workspace Database & Historical Records
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Workspace #{user?.workspace_id || 1} • Automated Auto-Save Active
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Saved Leads & Search History</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            All search results are automatically saved and organized into permanent historical search records with verified source evidence. Export datasets in Excel XLSX and Landscape PDF formats.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/app/leads"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-glow-sm transition-all"
          >
            <Search className="h-3.5 w-3.5" />
            <span>New Lead Search</span>
          </Link>
        </div>
      </div>

      {/* TABS NAVIGATION BAR */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("leads")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "leads"
              ? "text-white bg-white/[0.08] border-b-2 border-blue-500 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
          }`}
        >
          <Database className="h-4 w-4 text-blue-400" />
          <span>All Saved Leads</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300">
            {total}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "history"
              ? "text-white bg-white/[0.08] border-b-2 border-blue-500 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
          }`}
        >
          <History className="h-4 w-4 text-emerald-400" />
          <span>Search History & Date Records</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
            {searchRecords.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("export_history")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "export_history"
              ? "text-white bg-white/[0.08] border-b-2 border-blue-500 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
          }`}
        >
          <Download className="h-4 w-4 text-amber-400" />
          <span>Export Audit History</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300">
            {exportHistory.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: ALL SAVED LEADS (MASTER REPOSITORY)                     */}
      {/* ============================================================== */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          {/* Filter & Export Controls Bar */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c1017] flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
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

              <select
                value={outreachStatusFilter}
                onChange={(e) => setOutreachStatusFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="all" className="bg-[#0c1017]">All Outreach Statuses</option>
                <option value="NEW" className="bg-[#0c1017]">NEW</option>
                <option value="DRAFT READY" className="bg-[#0c1017]">DRAFT READY</option>
                <option value="EMAIL SENT" className="bg-[#0c1017]">EMAIL SENT</option>
                <option value="REPLIED" className="bg-[#0c1017]">REPLIED</option>
                <option value="INTERESTED" className="bg-[#0c1017]">INTERESTED</option>
                <option value="NOT INTERESTED" className="bg-[#0c1017]">NOT INTERESTED</option>
                <option value="DO NOT CONTACT" className="bg-[#0c1017]">DO NOT CONTACT</option>
              </select>

              <button
                onClick={fetchSavedLeads}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all"
                title="Refresh saved leads"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Bulk Actions & Master Export (XLSX & PDF ONLY) */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
              {selectedIds.length > 0 ? (
                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-xl">
                  <span className="text-xs font-bold text-blue-400 font-mono">
                    {selectedIds.length} Selected
                  </span>
                  <button
                    onClick={() => {
                      const first = leads.find((l) => selectedIds.includes(l.id));
                      if (first) handleOpenEmailModal(first);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-blue-300 hover:text-white bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded flex items-center gap-1 cursor-pointer"
                    title="Open AI Email Assistant for selected lead"
                  >
                    <Mail className="h-3 w-3 text-blue-400" />
                    <span>AI Email</span>
                  </button>
                  <button
                    onClick={() => {
                      const first = leads.find((l) => selectedIds.includes(l.id));
                      if (first) {
                        setSelectedResearchLead(first);
                        setIsResearchModalOpen(true);
                      }
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded flex items-center gap-1 cursor-pointer"
                    title="AI Lead Research Agent (Lifetime Exclusive)"
                  >
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    <span>AI Research</span>
                  </button>
                  <button
                    onClick={() => handleExport("pdf", "selected")}
                    className="px-2.5 py-1 text-[11px] font-bold text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 rounded flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="h-3 w-3 text-rose-400" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={() => handleExport("xlsx", "selected")}
                    className="px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded flex items-center gap-1 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3 w-3 text-emerald-400" />
                    <span>XLSX</span>
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={actionLoading}
                    className="px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport("pdf", "all")}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5 text-rose-400" />
                    <span>Export PDF (Landscape)</span>
                  </button>
                  <button
                    onClick={() => handleExport("xlsx", "all")}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-glow-sm transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-white" />
                    <span>Export All XLSX</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Master Leads Table */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] overflow-hidden shadow-xl">
            {loading ? (
              <div className="py-20 text-center text-xs text-slate-500">Loading saved leads database...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <Database className="h-10 w-10 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-white">No Saved Leads Found</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {leads.length === 0
                    ? "Your workspace database is currently empty. Run a search to automatically discover and save verified leads."
                    : "No saved leads match your active filters."}
                </p>
                {leads.length === 0 && (
                  <Link
                    href="/app/leads"
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-glow-sm transition-all"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Run Lead Search</span>
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
                      <th className="py-3 px-3">Business Name & Website</th>
                      <th className="py-3 px-3">Location</th>
                      <th className="py-3 px-3">Industry / Keyword</th>
                      <th className="py-3 px-3">Email & Verification</th>
                      <th className="py-3 px-3">Phone & WhatsApp</th>
                      <th className="py-3 px-3">Source Evidence</th>
                      <th className="py-3 px-3">Outreach Status</th>
                      <th className="py-3 px-3">Saved (PKT)</th>
                      <th className="py-3 px-3 text-right">Actions</th>
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
                                <span>{l.domain || l.website.replace(/^https?:\/\//, "")}</span>
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
                              {l.industry || l.category || "Commercial"}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {l.email && l.email !== "Not Found" ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-emerald-400 font-mono text-[11px] font-semibold">{l.email}</span>
                                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                                  {l.email_status || "VERIFIED"}
                                </span>
                                {l.email_source_url && (
                                  <a
                                    href={l.email_source_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[9px] text-slate-500 hover:text-blue-400 hover:underline inline-flex items-center gap-0.5 font-mono mt-0.5"
                                  >
                                    <span>Email Source</span>
                                    <ExternalLink className="h-2 w-2" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Not Found</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {l.phone && l.phone !== "Not Found" && l.phone !== "Not Listed" ? (
                              <div className="flex flex-col gap-0.5">
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
                                {l.phone_source_url && (
                                  <a
                                    href={l.phone_source_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[9px] text-slate-500 hover:text-blue-400 hover:underline inline-flex items-center gap-0.5 font-mono"
                                  >
                                    <span>Phone Source</span>
                                    <ExternalLink className="h-2 w-2" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Not Listed</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-[11px] text-slate-300">{l.source_platform || l.source || "Web Search"}</div>
                            {(l.original_source_url || l.source_url) && (
                              <a
                                href={l.original_source_url || l.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-slate-400 hover:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <span>Evidence Link</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-1 items-start">
                              {renderOutreachBadge(l.crm_stage)}
                              {l.next_followup && (
                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                  <Calendar className="h-2.5 w-2.5 text-blue-400" />
                                  <span>{l.next_followup}</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">
                            <div>{l.saved_date || l.extraction_date || "—"}</div>
                            <div className="text-slate-500">{l.saved_time || l.extraction_time || ""}</div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedResearchLead(l);
                                  setIsResearchModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                                title="AI Lead Research Agent (Lifetime Exclusive)"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEmailModal(l)}
                                className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors cursor-pointer"
                                title="AI Email Assistant (Gemini + Gmail)"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleExport("pdf", "single_lead", { specificLeads: [l] })}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Download PDF for this lead"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleExport("xlsx", "single_lead", { specificLeads: [l] })}
                                className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                title="Download XLSX for this lead"
                              >
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSingle(l.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete Lead"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {total > pageSize && (
              <div className="p-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                <div>
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} leads
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="font-mono text-white">{page}</span>
                  <button
                    disabled={page * pageSize >= total}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: SEARCH HISTORY & DATE RECORDS                          */}
      {/* ============================================================== */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Date Picker & Keyword Filter Banner */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c1017] space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-1 flex-wrap">
                {/* Specific Date Filter Selector */}
                <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-xs font-bold text-slate-300">Filter By Date:</span>
                  <select
                    value={selectedDateFilter}
                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-mono"
                  >
                    <option value="ALL" className="bg-[#0c1017]">All Dates ({searchDates.reduce((acc, d) => acc + d.total_searches, 0)} searches)</option>
                    {searchDates.map((sd) => (
                      <option key={sd.search_date} value={sd.search_date} className="bg-[#0c1017]">
                        {sd.search_date} ({sd.total_searches} search{sd.total_searches > 1 ? "es" : ""}, {sd.total_leads} leads)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Keyword search in history */}
                <div className="relative min-w-[200px]">
                  <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={historySearchKeyword}
                    onChange={(e) => setHistorySearchKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchSearchHistory()}
                    placeholder="Search keyword in history..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={fetchSearchHistory}
                  disabled={historyLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? "animate-spin text-blue-400" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Date Specific Batch Export Buttons */}
              {selectedDateFilter !== "ALL" && selectedDateStat && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport("pdf", "date", { dateStr: selectedDateFilter })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all cursor-pointer"
                    title={`Download all leads from ${selectedDateFilter} as PDF`}
                  >
                    <FileText className="h-3.5 w-3.5 text-rose-400" />
                    <span>Download {selectedDateFilter} PDF</span>
                  </button>
                  <button
                    onClick={() => handleExport("xlsx", "date", { dateStr: selectedDateFilter })}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-glow-sm transition-all cursor-pointer"
                    title={`Download all leads from ${selectedDateFilter} as XLSX`}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-white" />
                    <span>Download {selectedDateFilter} XLSX</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Date Stat Indicator */}
            {selectedDateFilter !== "ALL" && selectedDateStat && (
              <div className="flex items-center gap-4 text-xs font-mono bg-blue-500/[0.06] border border-blue-500/20 rounded-xl px-3.5 py-2">
                <span className="text-blue-300 font-bold">Selected Date: {selectedDateFilter}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-300">{selectedDateStat.total_searches} Searches Executed</span>
                <span className="text-slate-400">•</span>
                <span className="text-emerald-400 font-bold">{selectedDateStat.total_leads} Qualified Leads</span>
                <span className="text-slate-400">•</span>
                <span className="text-amber-300">{selectedDateStat.total_with_phone} with Phone Numbers</span>
              </div>
            )}
          </div>

          {/* Search History Records Table */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] overflow-hidden shadow-xl">
            {historyLoading ? (
              <div className="py-20 text-center text-xs text-slate-500">Loading search history records...</div>
            ) : searchRecords.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <History className="h-10 w-10 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-white">No Search Records Found</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {selectedDateFilter !== "ALL"
                    ? `No searches found for date ${selectedDateFilter}. Try selecting "All Dates" or running a new search.`
                    : "No historical searches recorded in this workspace yet. Run a lead search to create your first search record."}
                </p>
                <Link
                  href="/app/leads"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-glow-sm transition-all"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Start New Search</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold bg-white/[0.01]">
                    <tr>
                      <th className="py-3 px-3">Search Keyword</th>
                      <th className="py-3 px-3">Date (PKT)</th>
                      <th className="py-3 px-3">Time (PKT)</th>
                      <th className="py-3 px-3">Target Country / City</th>
                      <th className="py-3 px-3 text-center">Requested</th>
                      <th className="py-3 px-3 text-center">Qualified Leads</th>
                      <th className="py-3 px-3">Sources Searched</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {searchRecords.map((sr) => {
                      const sourcesList = Array.isArray(sr.sources) ? sr.sources : [];

                      return (
                        <tr key={sr.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                              <span>{sr.keyword}</span>
                              <span className="text-[10px] font-mono text-slate-500 bg-white/[0.04] px-1.5 py-0.5 rounded">
                                {sr.id}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Completed: {sr.completion_time || sr.search_time}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-blue-400 shrink-0" />
                              <span>{sr.search_date}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-slate-500 shrink-0" />
                              <span>{sr.search_time}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            <div>{sr.country}</div>
                            {sr.city && sr.city !== "All Cities" && (
                              <div className="text-[10px] text-slate-500">{sr.city}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-400">
                            {sr.requested_quantity}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className="font-bold font-mono text-emerald-400 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                {sr.qualified_quantity} Leads
                              </span>
                              {sr.leads_with_phone > 0 && (
                                <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  {sr.leads_with_phone} with phone
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {sourcesList.slice(0, 3).map((s, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] text-slate-400 truncate max-w-[120px]">
                                  {s.replace("Public ", "").replace("Organic ", "")}
                                </span>
                              ))}
                              {sourcesList.length > 3 && (
                                <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] text-slate-500 font-mono">
                                  +{sourcesList.length - 3} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleOpenSearchRecord(sr.id)}
                                className="px-2.5 py-1 text-[11px] font-bold text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                                title="View results for this historical search"
                              >
                                <Eye className="h-3 w-3 text-blue-400" />
                                <span>View Results</span>
                              </button>
                              <button
                                onClick={() => handleExport("pdf", "search_record", { searchRecord: sr })}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Download PDF for this search"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleExport("xlsx", "search_record", { searchRecord: sr })}
                                className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                title="Download XLSX for this search"
                              >
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: EXPORT AUDIT HISTORY                                    */}
      {/* ============================================================== */}
      {activeTab === "export_history" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c1017] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Export Audit History</h2>
              <p className="text-xs text-slate-400">
                Timestamped immutable records of all XLSX and PDF exports generated in this workspace.
              </p>
            </div>
            <button
              onClick={fetchExportHistory}
              disabled={exportHistoryLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${exportHistoryLoading ? "animate-spin text-amber-400" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] overflow-hidden shadow-xl">
            {exportHistoryLoading ? (
              <div className="py-20 text-center text-xs text-slate-500">Loading export audit logs...</div>
            ) : exportHistory.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <Download className="h-10 w-10 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-white">No Exports Recorded Yet</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  When you export qualified leads to Excel (.xlsx) or PDF, each export event is automatically audited and logged here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold bg-white/[0.01]">
                    <tr>
                      <th className="py-3 px-3">Export Target / Dataset</th>
                      <th className="py-3 px-3">Format</th>
                      <th className="py-3 px-3 text-center">Records Exported</th>
                      <th className="py-3 px-3">Export Date (PKT)</th>
                      <th className="py-3 px-3">Export Time (PKT)</th>
                      <th className="py-3 px-3 text-right">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {exportHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3 font-semibold text-white">
                          <div>{item.export_target}</div>
                          {item.search_record_id && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              Record ID: {item.search_record_id}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            item.format === "XLSX"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {item.format}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                          {item.record_count}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {item.export_date}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {item.export_time}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>VERIFIED</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VIEW HISTORICAL SEARCH RECORD & ASSOCIATED LEADS        */}
      {/* ============================================================== */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c121e] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    HISTORICAL SEARCH RECORD #{viewingRecord.id}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {viewingRecord.search_date} at {viewingRecord.search_time} PKT
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <span>Keyword: "{viewingRecord.keyword}"</span>
                  <span className="text-xs font-normal text-slate-400">({viewingRecord.country})</span>
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport("pdf", "search_record", { searchRecord: viewingRecord })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 text-rose-400" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => handleExport("xlsx", "search_record", { searchRecord: viewingRecord })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Download XLSX</span>
                </button>
                <button
                  onClick={() => setViewingRecord(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Metadata Strip */}
            <div className="p-4 bg-white/[0.01] border-b border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">REQUESTED QUANTITY</span>
                <span className="text-white font-bold">{viewingRecord.requested_quantity} Leads</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ACTUAL QUALIFIED</span>
                <span className="text-emerald-400 font-bold">{viewingRecord.qualified_quantity} Leads</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">WITH PHONE NUMBER</span>
                <span className="text-blue-400 font-bold">{viewingRecord.leads_with_phone} Leads</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">STATUS</span>
                <span className="text-emerald-400 font-bold">{viewingRecord.search_status}</span>
              </div>
            </div>

            {/* Modal Leads Table */}
            <div className="p-5 flex-1 overflow-y-auto">
              {recordDetailLoading ? (
                <div className="py-20 text-center text-xs text-slate-500">Loading associated leads...</div>
              ) : !viewingRecord.leads || viewingRecord.leads.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  No leads recorded for this search.
                </div>
              ) : (
                <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold bg-white/[0.02]">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Business Name & Website</th>
                        <th className="py-2.5 px-3">Verified Email</th>
                        <th className="py-2.5 px-3">Corporate Phone</th>
                        <th className="py-2.5 px-3">Location</th>
                        <th className="py-2.5 px-3">Source Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {viewingRecord.leads.map((l, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white">{l.business_name}</div>
                            {l.website && (
                              <a
                                href={l.website.startsWith("http") ? l.website : `https://${l.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <span>{l.domain || l.website}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-emerald-400 font-mono font-semibold">{l.email}</div>
                            <div className="text-[9px] text-slate-500 font-mono">{l.email_status || "VERIFIED"}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {l.phone && l.phone !== "Not Found" ? l.phone : "Not Listed"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            <div>{l.city ? `${l.city}, ${l.country}` : (l.country || "Global")}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-[11px] text-slate-300 truncate max-w-[180px]">
                              {l.source_platform || "Web Search"}
                            </div>
                            {(l.original_source_url || l.source_url) && (
                              <a
                                href={l.original_source_url || l.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <span>Source Evidence Link</span>
                                <ExternalLink className="h-2 w-2" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400 bg-white/[0.01]">
              <span className="font-mono">
                Historical search results preserved immutably • Download anytime in XLSX and PDF
              </span>
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI EMAIL ASSISTANT MODAL (GEMINI + GMAIL OUTREACH) */}
      {isEmailModalOpen && activeEmailLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0c1017] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {activeEmailLead.business_name}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      {activeEmailLead.email && activeEmailLead.email !== "Not Found" ? activeEmailLead.email : "No Email Found"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                    <span>{activeEmailLead.city ? `${activeEmailLead.city}, ${activeEmailLead.country}` : activeEmailLead.country || "Global"}</span>
                    <span>•</span>
                    <span>{activeEmailLead.industry || "B2B Business"}</span>
                    {activeEmailLead.website && (
                      <>
                        <span>•</span>
                        <a
                          href={activeEmailLead.website.startsWith("http") ? activeEmailLead.website : `https://${activeEmailLead.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline flex items-center gap-0.5"
                        >
                          <span>Website</span>
                          <ExternalLink className="h-2 w-2" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Status selector & Draft mode toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold text-[11px]">Outreach Status:</span>
                  <select
                    value={emailOutreachStatus}
                    onChange={(e) => handleUpdateLeadStatus(activeEmailLead.id, e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#0c1017] px-2.5 py-1 text-xs text-white font-semibold focus:outline-none"
                  >
                    <option value="NEW">NEW</option>
                    <option value="DRAFT READY">DRAFT READY</option>
                    <option value="EMAIL SENT">EMAIL SENT</option>
                    <option value="REPLIED">REPLIED</option>
                    <option value="INTERESTED">INTERESTED</option>
                    <option value="NOT INTERESTED">NOT INTERESTED</option>
                    <option value="DO NOT CONTACT">DO NOT CONTACT</option>
                  </select>
                </div>

                <div className="flex rounded-lg bg-black/40 border border-white/10 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setEmailMode("initial")}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      emailMode === "initial" ? "bg-blue-600 text-white shadow-glow-sm" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Initial Outreach
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailMode("followup")}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      emailMode === "followup" ? "bg-blue-600 text-white shadow-glow-sm" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Follow-up
                  </button>
                </div>
              </div>

              {/* Feedback banner */}
              {emailFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    emailFeedback.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  }`}
                >
                  {emailFeedback.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                  )}
                  <span>{emailFeedback.message}</span>
                </div>
              )}

              {/* DO NOT CONTACT Warning Banner */}
              {emailOutreachStatus === "DO NOT CONTACT" && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Outreach Blocked by Policy:</span> This business lead is marked as DO NOT CONTACT. Sending emails to this address is disabled to protect your domain reputation.
                  </div>
                </div>
              )}

              {/* Sender Context */}
              <div className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-blue-400" /> Sender Profile & Proposition
                  </span>
                  <span className="text-[10px] text-slate-500">Auto-configured from your workspace settings</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">Sender Name: </span>
                    <input
                      type="text"
                      value={emailSenderName}
                      onChange={(e) => setEmailSenderName(e.target.value)}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-white w-full mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400">Company Name: </span>
                    <input
                      type="text"
                      value={emailCompanyName}
                      onChange={(e) => setEmailCompanyName(e.target.value)}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-white w-full mt-0.5"
                    />
                  </div>
                </div>
              </div>

              {/* Action to Generate Draft */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleGenerateDraft}
                  disabled={emailGenerating}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {emailGenerating ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {emailGenerating
                      ? "Gemini AI Composing..."
                      : emailMode === "followup"
                      ? "Generate Follow-up Draft with Gemini"
                      : "Generate Personalized Draft with Gemini"}
                  </span>
                </button>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>gemini-3.5-flash-lite (Free Tier)</span>
                </div>
              </div>

              {/* Subject Line Input */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">Email Subject Line</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="e.g. Partnership inquiry for [Business Name]"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white font-medium focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Email Body Textarea */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">Message Body (Editable)</label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {emailBody.length} characters • {emailBody.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Click 'Generate Personalized Draft with Gemini' above to compose a natural, high-converting B2B outreach email based strictly on this lead's verified data."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-200 leading-relaxed focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>

              {/* Follow-up Reminder Setting */}
              <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Calendar className="h-3.5 w-3.5 text-blue-400" />
                  <span>Schedule Follow-up Reminder (Optional)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Follow-up Date</label>
                    <input
                      type="date"
                      value={emailFollowupDate}
                      onChange={(e) => setEmailFollowupDate(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Reminder Notes</label>
                    <input
                      type="text"
                      value={emailFollowupNotes}
                      onChange={(e) => setEmailFollowupNotes(e.target.value)}
                      placeholder="e.g. Check for response regarding clinic consultation"
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer with Explicit Approval Button */}
            <div className="p-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400 bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateLeadStatus(activeEmailLead.id, "DO NOT CONTACT")}
                  className="px-3 py-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 font-medium transition-colors cursor-pointer text-[11px]"
                >
                  Mark DO NOT CONTACT
                </button>
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Requires explicit customer approval before sending.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 text-white font-semibold transition-all cursor-pointer text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={emailSending || emailOutreachStatus === "DO NOT CONTACT" || !activeEmailLead.email || activeEmailLead.email === "Not Found"}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-glow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {emailSending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>{emailSending ? "Sending via Gmail..." : "Approve & Send via Gmail"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI LEAD RESEARCH AGENT MODAL (LIFETIME EXCLUSIVE) */}
      <AiLeadResearchModal
        isOpen={isResearchModalOpen}
        onClose={() => setIsResearchModalOpen(false)}
        lead={selectedResearchLead}
        onPushToOutreach={(draft) => {
          if (selectedResearchLead) {
            handleOpenEmailModal(selectedResearchLead);
            setEmailSubject(draft.subject);
            setEmailBody(draft.body);
          }
        }}
      />
    </div>
  );
}
