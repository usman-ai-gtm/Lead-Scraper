"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  Mail, Send, CheckCircle2, AlertCircle, RefreshCw,
  Eye, Sparkles, Shield, User, Building2, Check, X,
  Clock, AlertTriangle, ArrowRight, Ban, Filter, FileText,
  Plus, Trash2, BookmarkPlus
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
  lead_id?: number | null;
  recipient_email: string;
  recipient_name: string;
  sender_email?: string;
  subject: string;
  body?: string;
  outreach_status: string;
  gmail_message_id?: string;
  followup_notes?: string;
  sent_at: string;
}

function ColdEmailContent() {
  const { user, isLocked } = useAuth();

  // State
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  // Sender & Daily Quota state
  const [senderAccount, setSenderAccount] = useState<any | null>(null);
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [checkingSender, setCheckingSender] = useState(true);
  const [dailyQuota, setDailyQuota] = useState<number>(10);
  const [sentTodayUtc, setSentTodayUtc] = useState<number>(0);
  const [quotaTimezoneNote, setQuotaTimezoneNote] = useState<string>("UTC (00:00 UTC daily)");
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [allowDuplicateSend, setAllowDuplicateSend] = useState<boolean>(false);
  const [includeOptOutFooter, setIncludeOptOutFooter] = useState<boolean>(true);
  const [suppressions, setSuppressions] = useState<any[]>([]);
  const [newSuppressEmail, setNewSuppressEmail] = useState<string>("");

  // Email form & templates
  const [subject, setSubject] = useState("Exploring collaboration with {{business_name}}");
  const [bodyText, setBodyText] = useState(
    "Hi {{contact_name}},\n\nI came across {{business_name}} and was impressed by your work in {{city}}. At USMAN AI GTM, we help companies in the {{industry}} space discover verified B2B growth opportunities.\n\nWould you be open to a brief 10-minute introductory conversation next week?\n\nBest regards,\n{{sender_name}}\nUSMAN AI GTM"
  );
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(true);
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>("");
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);

  // Generation with Gemini AI
  const [aiGenerating, setAiGenerating] = useState(false);

  // Modals & previews
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Sending process
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, sent: 0, failed: 0 });
  const [retryingId, setRetryingId] = useState<number | null>(null);

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
      if (token && token !== "null" && token !== "undefined") headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  // 1. Fetch connected Gmail sender status & authoritative daily plan limits
  const fetchSenderStatus = async () => {
    setCheckingSender(true);
    try {
      const res = await fetch("/api/integrations/gmail/status", {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (typeof data?.daily_quota === "number") setDailyQuota(data.daily_quota);
      if (typeof data?.emails_sent_today === "number") setSentTodayUtc(data.emails_sent_today);
      if (data?.quota_reset_timezone) setQuotaTimezoneNote(data.quota_reset_timezone);

      if (data && data.status_code === "CONNECTED" && (data.account || (data.accounts && data.accounts.length > 0))) {
        const accts = data.accounts || (data.account ? [data.account] : []);
        const connectedList = accts.filter((a: any) => !a.health_status || a.health_status === "CONNECTED");
        setIsGmailConnected(connectedList.length > 0);
        setSenderAccount(connectedList[0] || data.account || accts[0]);
        setAllAccounts(connectedList.length > 0 ? connectedList : accts);
        setSelectedAccountId((prev) => {
          if (prev && connectedList.some((a: any) => String(a.id) === prev)) return prev;
          return connectedList[0]?.id ? String(connectedList[0].id) : "";
        });
      } else {
        setIsGmailConnected(false);
        setSenderAccount(null);
        setAllAccounts([]);
        setSelectedAccountId("");
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

  // 4. Fetch email template library
  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/outreach/templates", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data && Array.isArray(data.templates)) {
        setTemplates(data.templates);
        if (!selectedTemplateId && data.templates.length > 0) {
          const first = data.templates[0];
          setSelectedTemplateId(String(first.id));
          setSubject(first.subject);
          setBodyText(first.body);
        }
      }
    } catch (err) {
      console.warn("Could not load email templates", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchSuppressions = async () => {
    try {
      const res = await fetch("/api/outreach/suppressions", { headers: getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data?.suppressions)) setSuppressions(data.suppressions);
    } catch {}
  };

  useEffect(() => {
    fetchSenderStatus();
    fetchLeads();
    fetchHistory();
    fetchTemplates();
    fetchSuppressions();
  }, [historyFilter]);

  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuppressEmail.trim().includes("@")) return;
    try {
      const res = await fetch("/api/outreach/suppressions", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: newSuppressEmail.trim(), reason: "OPT_OUT_REQUESTED" }),
      });
      if (res.ok) {
        setNewSuppressEmail("");
        await fetchSuppressions();
        setToastType("info");
        setToastMsg("Recipient added to workspace opt-out / suppression list.");
      }
    } catch {}
  };

  const handleSelectTemplate = (idStr: string) => {
    setSelectedTemplateId(idStr);
    const t = templates.find((item) => String(item.id) === idStr);
    if (t) {
      setSubject(t.subject);
      setBodyText(t.body);
    }
  };

  const handleSaveCustomTemplate = async () => {
    if (!newTemplateName.trim()) {
      alert("Please enter a name for your custom template.");
      return;
    }
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/outreach/templates", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newTemplateName.trim(),
          subject,
          body: bodyText,
          category: "CUSTOM",
        }),
      });
      const data = await res.json();
      if (res.ok && data.template) {
        setToastType("success");
        setToastMsg(`Template "${newTemplateName}" saved successfully.`);
        setSaveModalOpen(false);
        setNewTemplateName("");
        await fetchTemplates();
        setSelectedTemplateId(String(data.template.id));
      } else {
        alert(data.error || "Failed to save template.");
      }
    } catch (err: any) {
      alert("Error saving template: " + err.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async () => {
    const cur = templates.find((t) => String(t.id) === selectedTemplateId);
    if (!cur || cur.is_default) {
      alert("Default system templates cannot be deleted.");
      return;
    }
    if (!confirm(`Are you sure you want to delete "${cur.name}"?`)) return;

    try {
      const res = await fetch(`/api/outreach/templates?id=${cur.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setToastType("info");
        setToastMsg(`Template "${cur.name}" deleted.`);
        await fetchTemplates();
      }
    } catch (err: any) {
      alert("Error deleting template: " + err.message);
    }
  };

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
    const businessName = lead.business_name || "Company";
    const firstName = businessName.split(/\s+/)[0] || "Business Owner";
    const senderName = senderAccount?.sender_name || user?.full_name || "USMAN AI GTM";
    const serviceName = "B2B Growth & Lead Solutions";

    let rendered = text
      .replace(/\{\{first_name\}\}/gi, firstName)
      .replace(/\{\{business_name\}\}/gi, businessName)
      .replace(/\{\{company_name\}\}/gi, businessName)
      .replace(/\{\{contact_name\}\}/gi, firstName)
      .replace(/\{\{city\}\}/gi, lead.city || "your region")
      .replace(/\{\{country\}\}/gi, lead.country || "")
      .replace(/\{\{industry\}\}/gi, lead.industry || "industry")
      .replace(/\{\{website\}\}/gi, lead.website || "")
      .replace(/\{\{service_name\}\}/gi, serviceName)
      .replace(/\{\{sender_name\}\}/gi, senderName);

    // Strict Anti-Glitch Cleanup: strip any leftover unresolved placeholders
    rendered = rendered
      .replace(/\{\{[^}]+\}\}/g, "")
      .replace(/\[(?:Business Name|Contact Name|Name|Your Name|Company Name|Sender Name|Title|Service Name)\]/gi, "");

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
      const draftObj = data?.draft || data?.email_draft;
      if (res.ok && draftObj) {
        setSubject(draftObj.subject || subject);
        setBodyText(
          `${draftObj.greeting || "Hi {{contact_name}},"}\n\n${draftObj.body}\n\n${
            draftObj.call_to_action || ""
          }\n\n${draftObj.signature || "Best regards,\n{{sender_name}}"}`
        );
        setToastType("success");
        setToastMsg("Personalized draft created with Gemini AI based on lead details.");
      } else {
        setToastType("error");
        setToastMsg(data.error || "Failed to generate AI email draft.");
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
    setSendProgress({ current: 0, total: selectedLeadIds.length, sent: 0, failed: 0 });

    let successCount = 0;
    let failCount = 0;
    let stopReason = "";

    const targetLeads = leads.filter((l) => selectedLeadIds.includes(l.id));
    const safeDelayMs = Math.max(1, Math.min(30, delaySeconds)) * 1000;

    for (let i = 0; i < targetLeads.length; i++) {
      const lead = targetLeads[i];
      setSendProgress({ current: i + 1, total: targetLeads.length, sent: successCount, failed: failCount });

      if (lead.crm_stage === "DO NOT CONTACT") {
        failCount++;
        continue;
      }

      const optOutNote = includeOptOutFooter
        ? "\n\n---\nIf you prefer not to receive further emails, reply 'Unsubscribe' and we will opt you out immediately."
        : "";
      const personalizedSubject = renderTemplate(subject, lead);
      const personalizedBody = renderTemplate(bodyText, lead) + optOutNote;

      try {
        const res = await fetch("/api/integrations/gmail/send", {
          method: "POST",
          credentials: "include",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            lead_id: lead.id,
            recipient_email: lead.email,
            recipient_name: lead.business_name,
            subject: personalizedSubject,
            body: personalizedBody,
            allow_duplicate: allowDuplicateSend,
            account_id: selectedAccountId ? Number(selectedAccountId) : undefined,
          }),
        });

        const resData = await res.json().catch(() => ({}));
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
          if (res.status === 429) {
            stopReason = resData.error || "Daily sending limit reached.";
            setSendProgress({ current: i + 1, total: targetLeads.length, sent: successCount, failed: failCount });
            break;
          }
        }
      } catch {
        failCount++;
      }

      setSendProgress({ current: i + 1, total: targetLeads.length, sent: successCount, failed: failCount });

      if (i < targetLeads.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, safeDelayMs));
      }
    }

    setIsSending(false);
    setToastType(stopReason ? "error" : successCount > 0 ? "success" : "error");
    setToastMsg(
      stopReason
        ? `${stopReason} Completed ${successCount} successful sends before stopping.`
        : `Outreach batch finished: ${successCount} sent successfully${failCount > 0 ? `, ${failCount} failed` : ""}.`
    );
    setSelectedLeadIds([]);
    await fetchSenderStatus();
    await fetchHistory();
  };

  const handleRetrySend = async (record: OutreachRecord) => {
    setRetryingId(record.id);
    try {
      const res = await fetch("/api/integrations/gmail/send", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          lead_id: record.lead_id || undefined,
          recipient_email: record.recipient_email,
          recipient_name: record.recipient_name || record.recipient_email,
          subject: record.subject,
          body: record.body || bodyText,
          allow_duplicate: true,
          account_id: selectedAccountId ? Number(selectedAccountId) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setToastType("success");
        setToastMsg(`Retried successfully to ${record.recipient_email}!`);
      } else {
        setToastType("error");
        setToastMsg(data.error || "Retry send failed.");
      }
      await fetchSenderStatus();
      await fetchHistory();
    } catch (err: any) {
      setToastType("error");
      setToastMsg(err?.message || "Retry send error.");
    } finally {
      setRetryingId(null);
    }
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
            Select qualified B2B leads, personalize your message, and send directly via authenticated Google Gmail API submission.
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
                onChange={(e) => {
                  setSelectedAccountId(e.target.value);
                  const chosen = allAccounts.find((a: any) => String(a.id) === e.target.value);
                  if (chosen) setSenderAccount(chosen);
                }}
                className="rounded-xl border border-emerald-500/30 bg-[#0e1628] px-3 py-1.5 text-xs font-semibold text-emerald-400 focus:outline-none"
              >
                {allAccounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    Sender: {acc.sender_email} ({sentTodayUtc}/{dailyQuota} plan UTC cap)
                  </option>
                ))}
              </select>
            </div>
          ) : isGmailConnected && senderAccount ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <Mail className="h-3.5 w-3.5" />
              <span className="font-semibold">{senderAccount.sender_email}</span>
              <span className="text-[10px] text-emerald-300 font-mono">
                ({sentTodayUtc}/{dailyQuota} UTC today)
              </span>
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
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">Compose Personalized Message</h3>
              <p className="text-[11px] text-slate-400">
                Choose a pre-built template or draft your own with AI.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSaveModalOpen(true)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all flex items-center gap-1.5"
                title="Save current message as custom template"
              >
                <BookmarkPlus className="h-3.5 w-3.5 text-emerald-400" />
                <span>Save Template</span>
              </button>

              <button
                onClick={handleGeminiDraft}
                disabled={aiGenerating || leads.length === 0}
                className="px-3 py-1.5 text-xs font-semibold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className={`h-3.5 w-3.5 ${aiGenerating ? "animate-spin" : ""}`} />
                <span>{aiGenerating ? "Drafting with Gemini..." : "Draft with Gemini AI"}</span>
              </button>
            </div>
          </div>

          {/* Template Selector Bar */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <FileText className="h-4 w-4 text-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                disabled={loadingTemplates}
                className="w-full bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="" disabled className="bg-[#0c1017] text-slate-500">
                  Select an email template...
                </option>
                <optgroup label="Default System Templates (10)" className="bg-[#0c1017] text-blue-400 font-semibold">
                  {templates
                    .filter((t) => t.is_default)
                    .map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#0c1017] text-slate-200 font-normal">
                        {t.name}
                      </option>
                    ))}
                </optgroup>
                {templates.some((t) => !t.is_default) && (
                  <optgroup label="Custom Workspace Templates" className="bg-[#0c1017] text-emerald-400 font-semibold">
                    {templates
                      .filter((t) => !t.is_default)
                      .map((t) => (
                        <option key={t.id} value={t.id} className="bg-[#0c1017] text-slate-200 font-normal">
                          {t.name} (Custom)
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>
            {templates.find((t) => String(t.id) === selectedTemplateId && !t.is_default) && (
              <button
                type="button"
                onClick={handleDeleteTemplate}
                className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                title="Delete this custom template"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Variable Insertion Pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="text-slate-400">Insert tag:</span>
            {[
              { tag: "{{first_name}}", label: "First Name" },
              { tag: "{{business_name}}", label: "Business Name" },
              { tag: "{{company_name}}", label: "Company" },
              { tag: "{{industry}}", label: "Industry" },
              { tag: "{{city}}", label: "City" },
              { tag: "{{website}}", label: "Website" },
              { tag: "{{service_name}}", label: "Service" },
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

          {/* Delay Pacing & Sending Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Delay Between Emails ({delaySeconds}s safe pacing)
              </label>
              <select
                value={delaySeconds}
                disabled={isSending}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-full rounded-lg border border-white/10 bg-[#0c1017] px-2.5 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value={1}>1 second (Fast batch)</option>
                <option value={2}>2 seconds (Recommended safe)</option>
                <option value={5}>5 seconds (Conservative)</option>
                <option value={10}>10 seconds (High deliverability)</option>
                <option value={20}>20 seconds (Human pacing)</option>
              </select>
            </div>
            <div className="flex flex-col justify-between">
              <div className="text-[11px] text-slate-300">
                Daily Plan Quota Remaining:{" "}
                <strong className={dailyQuota - sentTodayUtc <= 0 ? "text-rose-400" : "text-emerald-400"}>
                  {Math.max(0, dailyQuota - sentTodayUtc)} / {dailyQuota}
                </strong>{" "}
                <span className="text-slate-500">({quotaTimezoneNote})</span>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowDuplicateSend}
                  onChange={(e) => setAllowDuplicateSend(e.target.checked)}
                  className="rounded border-white/20"
                />
                <span>Allow re-sending to contacts messaged within 30 days</span>
              </label>
              <label className="flex items-center gap-2 text-[11px] text-emerald-300/90 mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeOptOutFooter}
                  onChange={(e) => setIncludeOptOutFooter(e.target.checked)}
                  className="rounded border-white/20"
                />
                <span>Include unsubscribe / opt-out notice in email footer</span>
              </label>
            </div>
          </div>

          {isSending && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2 text-xs">
              <div className="flex justify-between font-mono text-[11px] text-blue-200">
                <span>
                  Sending progress: {sendProgress.current}/{sendProgress.total} (Sent: {sendProgress.sent}, Failed: {sendProgress.failed}, Pending: {Math.max(0, sendProgress.total - sendProgress.current)})
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${sendProgress.total > 0 ? Math.round((sendProgress.current / sendProgress.total) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}

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
                  <th className="py-3 px-3 text-right">Details / Retry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-medium text-white">
                      <div>{record.recipient_name || record.recipient_email}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{record.recipient_email}</div>
                      {record.sender_email && (
                        <div className="text-[10px] text-slate-500 font-mono">From: {record.sender_email}</div>
                      )}
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
                      {record.outreach_status === "FAILED" && record.followup_notes && (
                        <div className="text-[10px] text-rose-300/80 mt-0.5 max-w-[180px] truncate" title={record.followup_notes}>
                          {record.followup_notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {record.sent_at ? new Date(record.sent_at).toLocaleString() : "Recently"}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500 font-mono text-[10px]">
                      {record.outreach_status === "FAILED" ? (
                        <button
                          type="button"
                          onClick={() => handleRetrySend(record)}
                          disabled={retryingId === record.id}
                          className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          {retryingId === record.id ? "Retrying..." : "Retry"}
                        </button>
                      ) : (
                        <span className="truncate max-w-[140px] inline-block">
                          {record.gmail_message_id || "Direct Dispatch"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WORKSPACE OPT-OUT / UNSUBSCRIBE SUPPRESSION LIST */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Ban className="h-4 w-4 text-amber-400" />
              <span>Unsubscribe &amp; Opt-Out Suppression List ({suppressions.length})</span>
            </h3>
            <p className="text-xs text-slate-400">
              Emails on this workspace suppression list are automatically blocked from outbound sends.
            </p>
          </div>
          <form onSubmit={handleAddSuppression} className="flex items-center gap-2">
            <input
              type="email"
              value={newSuppressEmail}
              onChange={(e) => setNewSuppressEmail(e.target.value)}
              placeholder="opt-out@company.com"
              className="rounded-xl border border-white/10 bg-[#121824] px-3 py-1.5 text-xs text-white font-mono"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-amber-600/25 hover:bg-amber-600/40 border border-amber-500/40 text-amber-200 text-xs font-bold cursor-pointer"
            >
              Add Opt-Out
            </button>
          </form>
        </div>
        {suppressions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suppressions.map((s: any) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-[11px] font-mono text-slate-300"
              >
                <span>{s.email}</span>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/outreach/suppressions?id=${s.id}`, {
                      method: "DELETE",
                      headers: getAuthHeaders(),
                    });
                    await fetchSuppressions();
                  }}
                  className="text-rose-400 hover:text-rose-300 cursor-pointer"
                  title="Remove from suppression list"
                >
                  ×
                </button>
              </span>
            ))}
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

      {/* SAVE CUSTOM TEMPLATE MODAL */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1017] p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Save as Custom Template</h3>
              </div>
              <button
                onClick={() => setSaveModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Save your current subject line and body text as a reusable workspace template.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g. Agency Website Audit Intro"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomTemplate}
                disabled={savingTemplate || !newTemplateName.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-glow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>{savingTemplate ? "Saving..." : "Save Template"}</span>
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
                <span>Plan daily quota: {sentTodayUtc}/{dailyQuota} UTC sends used today</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                <span>Pacing delay: {delaySeconds}s between messages</span>
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
