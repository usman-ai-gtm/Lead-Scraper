"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  Mail, Send, CheckCircle2, AlertCircle, RefreshCw,
  Eye, Sparkles, Shield, User, Building2, Check, X,
  Clock, AlertTriangle, ArrowRight, Ban, Filter
} from "lucide-react";

interface LeadItem {
  id: number;
  business_name: string;
  email: string;
  phone?: string;
  city?: string;
  country?: string;
  industry?: string;
  website?: string;
  crm_stage?: string;
}

interface OutreachRecord {
  id: number;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  outreach_status: string;
  gmail_message_id?: string;
  sent_at: string;
}

function ColdEmailContent() {
  const { user, isLocked, refreshUser } = useAuth();

  // State
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  // Sender state
  const [senderAccount, setSenderAccount] = useState<any | null>(null);
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("ROUND_ROBIN");
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [checkingSender, setCheckingSender] = useState(true);

  // Email form
  const [subject, setSubject] = useState("Exploring collaboration with {{business_name}}");
  const [bodyText, setBodyText] = useState(
    "Hi {{contact_name}},\n\nI came across {{business_name}} and was impressed by your work in {{city}}. At USMAN AI GTM, we help companies in the {{industry}} space discover verified B2B growth opportunities.\n\nWould you be open to a brief 10-minute introductory conversation next week?\n\nBest regards,\n{{sender_name}}\nUSMAN AI GTM"
  );

  // Generation with Gemini AI
  const [aiGenerating, setAiGenerating] = useState(false);

  // Modals & previews
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Sending process
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });

  // Sending history
  const [history, setHistory] = useState<OutreachRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyFilter, setHistoryFilter] = useState("ALL");

  // Notifications
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("usman_gtm_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const wsId = localStorage.getItem("usman_gtm_workspace_id");
      if (wsId) headers["X-Workspace-Id"] = wsId;
    }
    return headers;
  };

  // 1. Fetch connected Gmail sender status
  const fetchSenderStatus = async () => {
    setCheckingSender(true);
    try {
      const res = await fetch("/api/integrations/gmail/status", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data && data.status_code === "CONNECTED" && (data.account || (data.accounts && data.accounts.length > 0))) {
        setIsGmailConnected(true);
        setSenderAccount(data.account || data.accounts[0]);
        setAllAccounts(data.accounts || (data.account ? [data.account] : []));
      } else {
        setIsGmailConnected(false);
        setSenderAccount(null);
        setAllAccounts([]);
      }
    } catch {
      setIsGmailConnected(false);
    } finally {
      setCheckingSender(false);
    }
  };

  // 2. Fetch saved leads for this workspace
  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch("/api/leads?page_size=100", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      const list: LeadItem[] = data.leads || (Array.isArray(data) ? data : []);
      // Filter leads with email
      const validLeads = list.filter(
        (l) => l.email && l.email.includes("@") && l.email !== "Not Found"
      );
      setLeads(validLeads);
    } catch (err) {
      console.warn("Could not load leads", err);
    } finally {
      setLoadingLeads(false);
    }
  };

  // 3. Fetch sending history from Neon PostgreSQL
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/outreach/records?status=${historyFilter}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setHistory(data.records || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchSenderStatus();
    fetchLeads();
    fetchHistory();
  }, [historyFilter]);

  // Insert personalization variable
  const insertVariable = (tag: string) => {
    setBodyText((prev) => prev + " " + tag);
  };

  // Toggle selection
  const toggleSelectLead = (id: number, crmStage?: string) => {
    if (crmStage === "DO NOT CONTACT") return;
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllValid = () => {
    const selectable = leads
      .filter((l) => l.crm_stage !== "DO NOT CONTACT")
      .map((l) => l.id);
    if (selectedLeadIds.length === selectable.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(selectable);
    }
  };

  // Render personalized template for a specific lead
  const renderTemplate = (text: string, lead: LeadItem) => {
    const contactName = lead.business_name || "Business Owner";
    const senderName = senderAccount?.sender_name || user?.full_name || "USMAN AI GTM";
    let rendered = text
      .replace(/{{business_name}}/g, lead.business_name || "your business")
      .replace(/{{contact_name}}/g, contactName)
      .replace(/{{city}}/g, lead.city || "your region")
      .replace(/{{country}}/g, lead.country || "")
      .replace(/{{industry}}/g, lead.industry || "industry")
      .replace(/{{website}}/g, lead.website || "")
      .replace(/{{sender_name}}/g, senderName);

    // Strict Anti-Glitch Cleanup: strip any leftover unresolved placeholders
    rendered = rendered
      .replace(/\{\{[^}]+\}\}/g, "")
      .replace(/\[(?:Business Name|Contact Name|Name|Your Name|Company Name|Sender Name|Title)\]/gi, "");

    return rendered.trim();
  };

  // Generate personalized email draft using Gemini AI
  const handleGeminiDraft = async () => {
    if (isLocked) {
      alert("Your account is currently locked. Please complete payment and contact the Owner for activation. Your premium access will begin after approval.");
      return;
    }
    const firstSelected = leads.find((l) => selectedLeadIds.includes(l.id)) || leads[0];
    if (!firstSelected) {
      alert("Please select at least one lead from the table to draft personalized outreach.");
      return;
    }

    setAiGenerating(true);
    try {
      const res = await fetch("/api/outreach/generate-email", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          lead: firstSelected,
          sender: {
            sender_name: senderAccount?.sender_name || user?.full_name || "Sales Outreach",
            company_name: user?.company || "USMAN AI GTM",
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.email_draft) {
        setSubject(data.email_draft.subject || subject);
        setBodyText(
          `${data.email_draft.greeting || "Hi {{contact_name}},"}\n\n${data.email_draft.body}\n\n${
            data.email_draft.call_to_action || ""
          }\n\n${data.email_draft.signature || "Best regards,\n{{sender_name}}"}`
        );
        setToastType("success");
        setToastMsg("Personalized draft created with Gemini AI based on lead details.");
      } else {
        alert(data.error || "Failed to generate AI email draft.");
      }
    } catch (err: any) {
      alert("Error generating email: " + err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  // Send test email to user
  const handleSendTest = async () => {
    if (isLocked) {
      alert("Your account is currently locked. Please complete payment and contact the Owner for activation. Your premium access will begin after approval.");
      return;
    }
    if (!isGmailConnected) {
      alert("Please connect your Gmail account first in Email Accounts.");
      return;
    }
    const targetEmail = senderAccount?.sender_email || user?.email;
    if (!targetEmail) return;

    try {
      const sampleLead = leads[0] || {
        id: 0,
        business_name: "Sample Company Ltd",
        city: "New York",
        industry: "Commercial",
        email: targetEmail,
      };

      const res = await fetch("/api/integrations/gmail/send", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          recipient_email: targetEmail,
          recipient_name: "Test Recipient",
          subject: "[TEST] " + renderTemplate(subject, sampleLead),
          body: renderTemplate(bodyText, sampleLead),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToastType("success");
        setToastMsg(`Test email sent to ${targetEmail} (Message ID: ${data.message_id || "OK"})`);
      } else {
        setToastType("error");
        setToastMsg(data.error || data.detail || "Failed to send test email.");
      }
    } catch (err: any) {
      setToastType("error");
      setToastMsg("Error: " + err.message);
    }
  };

  // Start sending to selected recipients
  const handleStartSending = async () => {
    if (isLocked) {
      alert("Your account is currently locked. Please complete payment and contact the Owner for activation. Your premium access will begin after approval.");
      return;
    }
    if (selectedLeadIds.length === 0) {
      alert("Please select at least one recipient lead.");
      return;
    }
    if (!isGmailConnected) {
      alert("No active Gmail account connected. Please connect your Gmail account first.");
      return;
    }

    setConfirmModalOpen(false);
    setIsSending(true);
    setSendProgress({ current: 0, total: selectedLeadIds.length });

    let successCount = 0;
    let failCount = 0;

    const targetLeads = leads.filter((l) => selectedLeadIds.includes(l.id));

    for (let i = 0; i < targetLeads.length; i++) {
      const lead = targetLeads[i];
      setSendProgress({ current: i + 1, total: targetLeads.length });

      // Strict safeguard: skip DO NOT CONTACT
      if (lead.crm_stage === "DO NOT CONTACT") {
        failCount++;
        continue;
      }

      const personalizedSubject = renderTemplate(subject, lead);
      const personalizedBody = renderTemplate(bodyText, lead);

      try {
        const res = await fetch("/api/integrations/gmail/send", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            lead_id: lead.id,
            recipient_email: lead.email,
            recipient_name: lead.business_name,
            subject: personalizedSubject,
            body: personalizedBody,
            account_id: selectedAccountId !== "ROUND_ROBIN" ? Number(selectedAccountId) : undefined,
          }),
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }

      // Safe pacing delay (500ms between dispatches to respect Google API quotas)
      if (i < targetLeads.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsSending(false);
    setToastType(successCount > 0 ? "success" : "error");
    setToastMsg(
      `Outreach completed: ${successCount} sent successfully${failCount > 0 ? `, ${failCount} failed` : ""}.`
    );
    setSelectedLeadIds([]);
    await fetchSenderStatus();
    await fetchHistory();
  };

  const previewLead = leads.find((l) => selectedLeadIds.includes(l.id)) || leads[0];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            toastType === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : toastType === "error"
              ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
              : "bg-blue-500/10 border-blue-500/20 text-blue-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastType === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="p-1 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
              Cold Email Outreach
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Workspace #{user?.workspace_id || 1} • Direct Gmail Dispatch
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Send Targeted Business Outreach
          </h1>
          <p className="text-xs text-slate-400">
            Select qualified B2B leads, personalize your message, and dispatch via your connected Gmail account with verified Google delivery.
          </p>
        </div>

        {/* Sender Account Status Pill & Multiple Account Selector */}
        <div className="flex items-center gap-2">
          {checkingSender ? (
            <span className="text-xs text-slate-500">Checking mailboxes...</span>
          ) : isGmailConnected && allAccounts.length > 1 ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="rounded-xl border border-emerald-500/30 bg-[#0e1628] px-3 py-1.5 text-xs font-semibold text-emerald-400 focus:outline-none"
              >
                <option value="ROUND_ROBIN">All Connected Accounts ({allAccounts.length} Mailboxes • Round-Robin)</option>
                {allAccounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.sender_email} ({acc.sent_today || 0}/{acc.daily_limit || 500} sent)
                  </option>
                ))}
              </select>
            </div>
          ) : isGmailConnected && senderAccount ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <Mail className="h-3.5 w-3.5" />
              <span className="font-semibold">{senderAccount.sender_email}</span>
              <span className="text-[10px] text-emerald-500">({senderAccount.sent_today || 0}/500 sent today)</span>
            </div>
          ) : (
            <Link
              href="/app/accounts"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs hover:bg-amber-500/20 transition-all"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Connect Gmail Account</span>
            </Link>
          )}
        </div>
      </div>

      {/* TWO-COLUMN WORKFLOW: RECIPIENT SELECTION + COMPOSE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: RECIPIENT LEADS (5 COLS) */}
        <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-bold text-white">Select Recipient Leads</h3>
              <p className="text-[11px] text-slate-400">
                {selectedLeadIds.length} of {leads.length} leads selected
              </p>
            </div>
            <button
              onClick={selectAllValid}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              {selectedLeadIds.length === leads.filter((l) => l.crm_stage !== "DO NOT CONTACT").length
                ? "Deselect All"
                : "Select All"}
            </button>
          </div>

          {loadingLeads ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading saved leads...</div>
          ) : leads.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Mail className="h-7 w-7 mx-auto text-slate-600" />
              <p className="font-semibold text-slate-300">No leads with email found in workspace.</p>
              <Link href="/app/leads" className="text-blue-400 hover:underline">
                Find and save business leads first &rarr;
              </Link>
            </div>
          ) : (
            <div className="max-h-[440px] overflow-y-auto space-y-2 pr-1">
              {leads.map((lead) => {
                const isSelected = selectedLeadIds.includes(lead.id);
                const isDnc = lead.crm_stage === "DO NOT CONTACT";
                return (
                  <div
                    key={lead.id}
                    onClick={() => toggleSelectLead(lead.id, lead.crm_stage)}
                    className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                      isDnc
                        ? "opacity-50 bg-rose-500/5 border-rose-500/20 cursor-not-allowed"
                        : isSelected
                        ? "bg-blue-600/10 border-blue-500/40 text-white"
                        : "bg-white/[0.02] border-white/[0.06] text-slate-300 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDnc}
                          onChange={() => {}}
                          className="rounded border-white/20 text-blue-600 focus:ring-0"
                        />
                        <span className="font-bold text-white truncate max-w-[180px]">
                          {lead.business_name}
                        </span>
                      </div>
                      {isDnc ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <Ban className="h-2.5 w-2.5" />
                          <span>DO NOT CONTACT</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {lead.city || lead.country || ""}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 pl-6 text-[11px] text-slate-400 font-mono truncate">
                      {lead.email}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: COMPOSE & PREVIEW (7 COLS) */}
        <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-bold text-white">Compose Personalized Message</h3>
              <p className="text-[11px] text-slate-400">
                Variables will be automatically replaced with each recipient&apos;s data.
              </p>
            </div>

            <button
              onClick={handleGeminiDraft}
              disabled={aiGenerating || leads.length === 0}
              className="px-3 py-1.5 text-xs font-semibold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className={`h-3.5 w-3.5 ${aiGenerating ? "animate-spin" : ""}`} />
              <span>{aiGenerating ? "Drafting with Gemini..." : "Draft with Gemini AI"}</span>
            </button>
          </div>

          {/* Variable Insertion Pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="text-slate-400">Insert tag:</span>
            {[
              { tag: "{{business_name}}", label: "Business Name" },
              { tag: "{{contact_name}}", label: "Contact Name" },
              { tag: "{{city}}", label: "City" },
              { tag: "{{industry}}", label: "Industry" },
              { tag: "{{website}}", label: "Website" },
            ].map((v) => (
              <button
                key={v.tag}
                type="button"
                onClick={() => insertVariable(v.tag)}
                className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 font-mono hover:text-white transition-colors"
              >
                {v.tag}
              </button>
            ))}
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Scaling customer acquisition for {{business_name}}"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Body Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Body (Plain Text / Natural Formatting)
            </label>
            <textarea
              rows={8}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none font-sans leading-relaxed"
            />
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(true)}
                disabled={!previewLead}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-40"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Preview Sample</span>
              </button>

              <button
                type="button"
                onClick={handleSendTest}
                disabled={!isGmailConnected}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5 text-blue-400" />
                <span>Send Test to Myself</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setConfirmModalOpen(true)}
              disabled={selectedLeadIds.length === 0 || !isGmailConnected || isSending}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl transition-all shadow-glow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>
                {isSending
                  ? `Sending (${sendProgress.current}/${sendProgress.total})...`
                  : `Send to ${selectedLeadIds.length} Selected Leads`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* SENDING HISTORY AUDIT TRAIL (STORED IN NEON POSTGRESQL) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Sending History & Audit Trail</span>
              <span className="text-xs font-mono font-semibold text-slate-500">
                ({history.length} records)
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Permanent audit log of outreach emails dispatched from this workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-[#0c1017] px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Records</option>
              <option value="EMAIL SENT">Dispatched (Success)</option>
              <option value="FAILED">Failed</option>
            </select>

            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/[0.04] border border-white/10"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {loadingHistory ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading sending history...</div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No outreach emails dispatched yet from this workspace.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-3">Recipient</th>
                  <th className="py-3 px-3">Subject</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Sent At</th>
                  <th className="py-3 px-3">Gmail Message ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-medium text-white">
                      <div>{record.recipient_name || record.recipient_email}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{record.recipient_email}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate">
                      {record.subject}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          record.outreach_status === "EMAIL SENT"
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                            : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                        }`}
                      >
                        {record.outreach_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {record.sent_at ? new Date(record.sent_at).toLocaleString() : "Recently"}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[10px] truncate max-w-[150px]">
                      {record.gmail_message_id || "Direct Dispatch"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {previewModalOpen && previewLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c1017] p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Personalized Preview</h3>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-1">
                <div>
                  <span className="text-slate-500">From: </span>
                  <span className="text-white font-mono">{senderAccount?.sender_email || "Your Gmail"}</span>
                </div>
                <div>
                  <span className="text-slate-500">To: </span>
                  <span className="text-white font-mono">{previewLead.email} ({previewLead.business_name})</span>
                </div>
                <div>
                  <span className="text-slate-500">Subject: </span>
                  <span className="text-white font-semibold">{renderTemplate(subject, previewLead)}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                {renderTemplate(bodyText, previewLead)}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl"
              >
                Looks Good
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION BEFORE SENDING MODAL */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1017] p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 pb-2 border-b border-white/[0.08]">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="text-base font-bold text-white">Confirm Outreach Dispatch</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to send <strong>{selectedLeadIds.length}</strong> personalized emails via your connected Gmail account (<strong>{senderAccount?.sender_email}</strong>).
            </p>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                <span>Google API limits respected (500 daily quota)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                <span>DO NOT CONTACT leads automatically suppressed</span>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartSending}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-glow-sm flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Confirm & Send Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ColdEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090e] flex items-center justify-center text-white text-xs">Loading...</div>}>
      <ColdEmailContent />
    </Suspense>
  );
}
