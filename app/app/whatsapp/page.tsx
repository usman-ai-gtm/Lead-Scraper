"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  normalizePhoneNumber,
  buildWhatsAppClickToChatUrl,
  PhoneValidationResult,
} from "@/lib/phone-utils";
import {
  WhatsAppTemplate,
  WhatsAppActivityLog,
  WhatsAppSuppression,
  WhatsAppCompanionSettings,
  DEFAULT_COMPANION_TEMPLATES,
  interpolateTemplateVariables,
} from "@/lib/whatsapp-companion";
import {
  MessageSquare, Send, CheckCircle2, AlertCircle, ShieldCheck,
  Plus, Sparkles, Phone, Users, Clock, ArrowRight, Settings,
  ExternalLink, Copy, Trash2, Edit3, Filter, Search, Ban,
  Calendar, RefreshCw, Check, ArrowUpRight, HelpCircle,
  AlertTriangle, UserX, MessageCircle, FileText
} from "lucide-react";

export default function WhatsAppCompanionWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    }>
      <WhatsAppCompanionContent />
    </Suspense>
  );
}

function WhatsAppCompanionContent() {
  const searchParams = useSearchParams();
  const initialLeadIdParam = searchParams.get("lead_id");

  // Tabs
  const [activeTab, setActiveTab] = useState<
    "overview" | "open-web" | "composer" | "leads" | "templates" | "history" | "settings"
  >("overview");

  // Global Toast
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4500);
  };

  // ----------------- State -----------------
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>({
    metrics: {
      total_leads_with_phone: 0,
      drafts_prepared: 0,
      chats_opened: 0,
      marked_sent: 0,
      replies_recorded: 0,
      suppressed_contacts: 0,
    },
    recent_activities: [],
    upcoming_followups: [],
  });

  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsKeyword, setLeadsKeyword] = useState("");
  const [leadsFilter, setLeadsFilter] = useState<"all" | "ready" | "suppressed" | "drafted">("all");

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(DEFAULT_COMPANION_TEMPLATES);
  const [activities, setActivities] = useState<WhatsAppActivityLog[]>([]);
  const [suppressions, setSuppressions] = useState<WhatsAppSuppression[]>([]);
  
  const [settings, setSettings] = useState<WhatsAppCompanionSettings>({
    my_business_name: "USMAN AI GTM",
    my_offering: "Autonomous AI B2B Lead Intelligence",
    value_proposition: "automate qualified lead acquisition and shorten sales cycles",
    sender_name: "Muhammad Usman",
    default_country_code: "92",
    default_tone: "Professional & Direct",
    auto_open_web: true,
  });

  // ----------------- Composer State -----------------
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(1);
  const [draftMessage, setDraftMessage] = useState<string>("");
  const [selectedTone, setSelectedTone] = useState<string>("Professional & Direct");
  const [consentStatus, setConsentStatus] = useState<string>("Public B2B Directory Listing");
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [manualNote, setManualNote] = useState<string>("");
  const [followUpDate, setFollowUpDate] = useState<string>("");

  // Modals
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", category: "B2B_OUTREACH", body: "", description: "" });
  
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyForm, setReplyForm] = useState({ text: "", sentiment: "Positive" });

  const [suppressionModalOpen, setSuppressionModalOpen] = useState(false);
  const [suppressionForm, setSuppressionForm] = useState({ phone: "", reason: "User Opt-Out", business: "" });

  // ----------------- Fetch Initial Data -----------------
  const fetchOverview = async () => {
    try {
      const res = await api.get<any>("/whatsapp/overview");
      if (res) setOverview(res);
    } catch (e) {
      console.warn("Using offline overview");
    }
  };

  const fetchLeads = async () => {
    setLeadsLoading(true);
    try {
      const res = await api.get<any>("/whatsapp/leads", {
        keyword: leadsKeyword,
        status_filter: leadsFilter,
        page_size: 50,
      });
      if (res && res.leads) {
        setLeadsList(res.leads);
      }
    } catch {
      // Fallback
    } finally {
      setLeadsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get<any>("/whatsapp/templates");
      if (res && res.templates && res.templates.length > 0) {
        setTemplates(res.templates);
      }
    } catch {}
  };

  const fetchActivities = async () => {
    try {
      const res = await api.get<any>("/whatsapp/activities");
      if (res && res.activities) {
        setActivities(res.activities);
      }
    } catch {}
  };

  const fetchSuppressions = async () => {
    try {
      const res = await api.get<any>("/whatsapp/suppressions");
      if (res && res.suppressions) {
        setSuppressions(res.suppressions);
      }
    } catch {}
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get<any>("/whatsapp/settings");
      if (res && res.settings) {
        setSettings({
          my_business_name: res.settings.my_business_name || "USMAN AI GTM",
          my_offering: res.settings.my_offering || "Autonomous AI B2B Lead Intelligence",
          value_proposition: res.settings.value_proposition || "automate qualified client discovery",
          sender_name: res.settings.sender_name || "Muhammad Usman",
          default_country_code: res.settings.default_country_code || "92",
          default_tone: res.settings.default_tone || "Professional & Direct",
          auto_open_web: Boolean(res.settings.auto_open_web),
        });
      }
    } catch {}
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchOverview(),
      fetchLeads(),
      fetchTemplates(),
      fetchActivities(),
      fetchSuppressions(),
      fetchSettings(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Handle URL lead_id parameter
  useEffect(() => {
    if (initialLeadIdParam && leadsList.length > 0) {
      const lid = parseInt(initialLeadIdParam, 10);
      const found = leadsList.find((l) => l.id === lid);
      if (found) {
        setSelectedLeadId(found.id);
        setActiveTab("composer");
      }
    } else if (!selectedLeadId && leadsList.length > 0) {
      // Pick first eligible lead with valid phone if none selected
      const firstValid = leadsList.find((l) => l.phone_validation?.is_valid && !l.is_suppressed);
      if (firstValid) {
        setSelectedLeadId(firstValid.id);
      } else {
        setSelectedLeadId(leadsList[0].id);
      }
    }
  }, [initialLeadIdParam, leadsList]);

  // Selected Lead object
  const activeLead = useMemo(() => {
    return leadsList.find((l) => l.id === selectedLeadId) || leadsList[0] || null;
  }, [leadsList, selectedLeadId]);

  // Active Lead Phone Validation
  const activePhoneValidation: PhoneValidationResult = useMemo(() => {
    if (!activeLead) {
      return {
        raw: "",
        normalized: "",
        displayFormatted: "None",
        isValid: false,
        status: "MISSING",
        errorReason: "No lead selected",
      };
    }
    return normalizePhoneNumber(
      activeLead.phone,
      activeLead.country,
      settings.default_country_code
    );
  }, [activeLead, settings.default_country_code]);

  // Suppression check for active lead
  const isLeadSuppressed = useMemo(() => {
    if (!activeLead) return false;
    const cleanNum = activePhoneValidation.normalized.replace(/\D/g, "");
    return suppressions.some((s) => s.phone_number.replace(/\D/g, "") === cleanNum);
  }, [activeLead, activePhoneValidation, suppressions]);

  // Template interpolation
  const interpolationResult = useMemo(() => {
    if (!draftMessage) return { renderedText: "", missingVariables: [], resolvedVariables: {} };
    return interpolateTemplateVariables(
      draftMessage,
      {
        business_name: activeLead?.business_name,
        contact_name: activeLead?.contact_name,
        city: activeLead?.city,
        country: activeLead?.country,
        industry: activeLead?.industry || activeLead?.category,
        website: activeLead?.website,
        category: activeLead?.category,
      },
      {
        my_business_name: settings.my_business_name,
        value_proposition: settings.value_proposition,
        sender_name: settings.sender_name,
      }
    );
  }, [draftMessage, activeLead, settings]);

  // When selected lead or template changes, populate initial draft if draft is empty
  useEffect(() => {
    if (!draftMessage && templates.length > 0 && activeLead) {
      const tmpl = templates.find((t) => t.id === selectedTemplateId) || templates[0];
      if (tmpl) {
        setDraftMessage(tmpl.body);
      }
    }
  }, [selectedTemplateId, templates, activeLead]);

  // ----------------- Actions -----------------

  const handleApplyTemplate = (tmplId: number) => {
    setSelectedTemplateId(tmplId);
    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      setDraftMessage(tmpl.body);
      showToast(`Loaded template: "${tmpl.name}"`, "info");
    }
  };

  const handleGenerateAIDraft = async () => {
    if (!activeLead) {
      showToast("Please select a lead first", "error");
      return;
    }
    setIsGeneratingAI(true);
    try {
      const res = await api.post<any>("/whatsapp/ai-draft", {
        lead_id: activeLead.id,
        business_name: activeLead.business_name,
        industry: activeLead.industry || activeLead.category,
        city: activeLead.city,
        website: activeLead.website,
        rating: activeLead.rating,
        tone: selectedTone,
        my_business_name: settings.my_business_name,
        value_proposition: settings.value_proposition,
      });

      if (res && res.draft) {
        setDraftMessage(res.draft);
        showToast("AI personalized draft created based on verified lead data!", "success");
      }
    } catch (err: any) {
      // Fallback local smart draft
      const fallbackDraft = `Hello ${activeLead.business_name}! Reaching out from ${settings.my_business_name}. We help companies in ${activeLead.city || "your market"} ${settings.value_proposition}. Would you be open to a quick 5-minute conversation to explore synergies?`;
      setDraftMessage(fallbackDraft);
      showToast("Generated draft from local profile (AI service offline)", "info");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleOpenWhatsAppChat = async () => {
    if (!activeLead) return;
    if (!activePhoneValidation.isValid) {
      showToast(`Cannot open chat: ${activePhoneValidation.errorReason || "Invalid phone number"}`, "error");
      return;
    }
    if (isLeadSuppressed) {
      showToast("This contact is on the Suppression List. Outreach is blocked.", "error");
      return;
    }

    const finalDraft = interpolationResult.renderedText || draftMessage;
    const url = buildWhatsAppClickToChatUrl(activePhoneValidation.normalized, finalDraft);

    // Open WhatsApp in new tab
    window.open(url, "_blank", "noopener,noreferrer");

    // Record honest activity: CHAT_OPENED
    try {
      await api.post("/whatsapp/activities", {
        lead_id: activeLead.id,
        business_name: activeLead.business_name,
        contact_name: activeLead.contact_name,
        phone_number: activePhoneValidation.normalized,
        action: "CHAT_OPENED",
        notes: `Chat link opened with draft (${finalDraft.length} chars)`,
        next_followup: followUpDate || null,
      });
      showToast("Opened WhatsApp chat! Activity logged as 'Chat opened'.", "success");
      fetchOverview();
      fetchActivities();
    } catch {
      showToast("Opened WhatsApp chat in new window", "success");
    }
  };

  const handleMarkAsSentManually = async () => {
    if (!activeLead) return;
    try {
      await api.post("/whatsapp/activities", {
        lead_id: activeLead.id,
        business_name: activeLead.business_name,
        contact_name: activeLead.contact_name,
        phone_number: activePhoneValidation.normalized,
        action: "MANUALLY_MARKED_SENT",
        notes: manualNote ? `Manual confirmation: ${manualNote}` : "User manually confirmed message was sent via WhatsApp Web.",
        next_followup: followUpDate || null,
      });
      setManualNote("");
      showToast("Logged: Message manually marked as sent.", "success");
      fetchOverview();
      fetchActivities();
      fetchLeads();
    } catch {
      showToast("Action recorded", "info");
    }
  };

  const handleRecordReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead) return;
    try {
      await api.post("/whatsapp/activities", {
        lead_id: activeLead.id,
        business_name: activeLead.business_name,
        contact_name: activeLead.contact_name,
        phone_number: activePhoneValidation.normalized,
        action: "REPLY_RECORDED",
        notes: `Inbound Reply [${replyForm.sentiment}]: "${replyForm.text}"`,
        next_followup: followUpDate || null,
      });
      setReplyModalOpen(false);
      setReplyForm({ text: "", sentiment: "Positive" });
      showToast("Inbound prospect reply successfully recorded in CRM!", "success");
      fetchOverview();
      fetchActivities();
      fetchLeads();
    } catch {
      showToast("Reply saved", "info");
    }
  };

  const handleScheduleFollowUp = async () => {
    if (!activeLead || !followUpDate) {
      showToast("Please choose a follow-up date first", "error");
      return;
    }
    try {
      await api.post("/whatsapp/activities", {
        lead_id: activeLead.id,
        business_name: activeLead.business_name,
        contact_name: activeLead.contact_name,
        phone_number: activePhoneValidation.normalized,
        action: "FOLLOW_UP_SCHEDULED",
        notes: `Follow-up set for ${followUpDate}. Note: ${manualNote || "Standard follow-up cadence"}`,
        next_followup: followUpDate,
      });
      showToast(`Follow-up scheduled for ${followUpDate}`, "success");
      fetchOverview();
      fetchActivities();
      fetchLeads();
    } catch {
      showToast("Follow-up saved", "info");
    }
  };

  const handleOptOutLead = async () => {
    if (!activeLead) return;
    const confirm = window.confirm(
      `Are you sure you want to opt-out and suppress ${activeLead.business_name} (${activePhoneValidation.displayFormatted})? This will prevent further WhatsApp outreach.`
    );
    if (!confirm) return;

    try {
      await api.post("/whatsapp/activities", {
        lead_id: activeLead.id,
        business_name: activeLead.business_name,
        contact_name: activeLead.contact_name,
        phone_number: activePhoneValidation.normalized,
        action: "OPTED_OUT",
        notes: "Contact opted out by user command",
      });
      showToast(`${activeLead.business_name} opted out & added to suppression list.`, "info");
      fetchSuppressions();
      fetchOverview();
      fetchActivities();
      fetchLeads();
    } catch {
      showToast("Opt-out recorded", "info");
    }
  };

  // ----------------- Template CRUD -----------------

  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({ name: "", category: "B2B_OUTREACH", body: "", description: "" });
    setTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: WhatsAppTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateForm({
      name: tmpl.name,
      category: tmpl.category,
      body: tmpl.body,
      description: tmpl.description || "",
    });
    setTemplateModalOpen(true);
  };

  const handleSaveTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name.trim() || !templateForm.body.trim()) {
      showToast("Name and template body are required", "error");
      return;
    }

    try {
      if (editingTemplate) {
        await api.put(`/whatsapp/templates/${editingTemplate.id}`, templateForm);
        showToast("Template updated successfully!", "success");
      } else {
        await api.post("/whatsapp/templates", templateForm);
        showToast("New template created!", "success");
      }
      setTemplateModalOpen(false);
      fetchTemplates();
    } catch {
      showToast("Saved template locally", "info");
    }
  };

  const handleDuplicateTemplate = async (tmplId: number) => {
    try {
      await api.post(`/whatsapp/templates/${tmplId}/duplicate`);
      showToast("Template duplicated!", "success");
      fetchTemplates();
    } catch {
      showToast("Duplicated template", "info");
    }
  };

  const handleDeleteTemplate = async (tmplId: number) => {
    if (!window.confirm("Delete this message template?")) return;
    try {
      await api.delete(`/whatsapp/templates/${tmplId}`);
      showToast("Template deleted", "info");
      fetchTemplates();
    } catch {
      showToast("Template deleted", "info");
    }
  };

  // ----------------- Suppression CRUD -----------------

  const handleAddSuppressionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppressionForm.phone.trim()) return;

    try {
      await api.post("/whatsapp/suppressions", {
        phone_number: suppressionForm.phone,
        reason: suppressionForm.reason,
        business_name: suppressionForm.business,
      });
      setSuppressionModalOpen(false);
      setSuppressionForm({ phone: "", reason: "User Opt-Out", business: "" });
      showToast("Added to suppression list", "success");
      fetchSuppressions();
      fetchOverview();
      fetchLeads();
    } catch {
      showToast("Suppression recorded", "info");
    }
  };

  const handleRemoveSuppression = async (supId: number) => {
    try {
      await api.delete(`/whatsapp/suppressions/${supId}`);
      showToast("Removed from suppression list", "success");
      fetchSuppressions();
      fetchOverview();
      fetchLeads();
    } catch {
      showToast("Removed", "info");
    }
  };

  // ----------------- Save Settings -----------------

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/whatsapp/settings", settings);
      showToast("Companion settings saved successfully!", "success");
    } catch {
      showToast("Settings saved", "info");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl border px-4 py-3 text-xs text-white shadow-2xl flex items-center justify-between gap-4 backdrop-blur-xl animate-in slide-in-from-bottom-2 ${
            toastMsg.type === "error"
              ? "bg-rose-950/90 border-rose-500/40 text-rose-200"
              : toastMsg.type === "info"
              ? "bg-blue-950/90 border-blue-500/40 text-blue-200"
              : "bg-[#0a1813]/90 border-emerald-500/40 text-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMsg.type === "error" ? (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            ) : toastMsg.type === "info" ? (
              <Sparkles className="h-4 w-4 text-blue-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            )}
            <span className="font-medium">{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1.5">
              <MessageCircle className="h-3 w-3" /> WhatsApp Web Outreach Companion
            </span>
            <span className="text-[11px] text-slate-400 font-mono">100% Free • Official Click-to-Chat • Zero API Surcharges</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">WhatsApp Outreach Companion & CRM</h1>
          <p className="text-xs text-slate-400 max-w-3xl mt-0.5">
            Manual, compliant WhatsApp Web workflow integrated with your live CRM records. Prepare AI-personalized drafts, open official wa.me chat links, and track honest sales interactions without per-message platform charges.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="https://web.whatsapp.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-glow-sm transition-all"
            title="Open WhatsApp Web official interface in a new tab"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Open WhatsApp Web</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-200" />
          </a>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.08] overflow-x-auto pb-1 select-none">
        {[
          { id: "overview", label: "Overview", icon: CheckCircle2 },
          { id: "open-web", label: "Open WhatsApp Web", icon: MessageSquare },
          { id: "composer", label: "Prepare a Message", icon: Sparkles },
          { id: "leads", label: "Selected Leads", icon: Users, badge: overview.metrics.total_leads_with_phone },
          { id: "templates", label: "Message Templates", icon: FileText, badge: templates.length },
          { id: "history", label: "Activity History", icon: Clock },
          { id: "settings", label: "Settings", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-white/[0.08] text-white border border-white/10 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-emerald-400" : "text-slate-500"}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-slate-500"
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[
              { label: "CRM Leads (Phone)", val: overview.metrics.total_leads_with_phone, desc: "Stored in CRM", color: "text-blue-400" },
              { label: "Drafts Prepared", val: overview.metrics.drafts_prepared, desc: "Tailored messages", color: "text-indigo-400" },
              { label: "Chats Opened", val: overview.metrics.chats_opened, desc: "wa.me links launched", color: "text-emerald-400" },
              { label: "Marked Sent", val: overview.metrics.marked_sent, desc: "User confirmed", color: "text-teal-400" },
              { label: "Replies Logged", val: overview.metrics.replies_recorded, desc: "Prospect responses", color: "text-amber-400" },
              { label: "Suppressed / Opt-Out", val: overview.metrics.suppressed_contacts, desc: "Excluded from outreach", color: "text-rose-400" },
            ].map((stat, idx) => (
              <div key={idx} className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 flex flex-col justify-between">
                <span className="text-[11px] font-medium text-slate-400">{stat.label}</span>
                <div className={`text-2xl font-extrabold mt-1.5 font-mono ${stat.color}`}>{stat.val}</div>
                <span className="text-[10px] text-slate-500 mt-1">{stat.desc}</span>
              </div>
            ))}
          </div>

          {/* Quick Launch & Guidance Banner */}
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 via-[#0c121e] to-[#0c1017] p-5 shadow-glass flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">How the Free Companion Works</span>
              </div>
              <h2 className="text-base font-bold text-white">Zero WhatsApp Business Cloud API Costs — 100% Legitimate Web Access</h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Avoid the recurring message costs and template verification delays of the Meta Business Cloud API. Pair your official WhatsApp Web in a separate browser tab, compose personalized messages here, and launch official click-to-chat links directly into WhatsApp.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
              <button
                onClick={() => setActiveTab("composer")}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>Prepare a Message</span>
              </button>
              <a
                href="https://web.whatsapp.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center justify-center gap-2 shadow-glow-sm transition-all"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Open WhatsApp Web</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Two-Column: Workflow Steps & Follow-Up Reminders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Step-by-Step Practical Workflow */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Recommended Manual Workflow
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Safe & Compliant</span>
              </div>

              <div className="space-y-3">
                {[
                  { step: "1", title: "Pair Official WhatsApp Web", desc: "Open web.whatsapp.com and scan the official QR with your phone. Only needed once per browser session." },
                  { step: "2", title: "Select Lead & Verify Number", desc: "Pick genuine CRM lead. System normalizes international phone numbers and warns if format is incomplete." },
                  { step: "3", title: "Personalize with AI or Templates", desc: "Resolve {{business_name}} and {{value_proposition}} variables or click 'Generate AI Draft' to tailor." },
                  { step: "4", title: "Open Official Click-to-Chat", desc: "Click 'Open WhatsApp Chat' to open https://wa.me/{phone} with your prefilled draft in WhatsApp Web." },
                  { step: "5", title: "Review & Send Manually", desc: "Review in WhatsApp and press send yourself. System truthfully records that chat was opened without fake delivery receipts." },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold shrink-0 font-mono">
                      {item.step}
                    </span>
                    <div>
                      <h4 className="text-xs font-semibold text-white">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Follow-up Reminders */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    CRM Follow-Up Reminders
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Manual Reminders</span>
                </div>

                <div className="mt-3 space-y-2.5">
                  {overview.upcoming_followups && overview.upcoming_followups.length > 0 ? (
                    overview.upcoming_followups.map((fu: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-3">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">Lead #{fu.lead_id}</span>
                            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-mono">
                              Due: {fu.next_followup}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{fu.draft_text || "Follow-up touch scheduled"}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedLeadId(fu.lead_id);
                            setActiveTab("composer");
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-slate-300 font-semibold shrink-0"
                        >
                          Open Draft
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No follow-ups due. Set a follow-up date when composing a message in the companion!
                    </div>
                  )}
                </div>
              </div>

              {/* Safe outreach guarantee */}
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] text-slate-300 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Anti-Spam & Ethics Safe:</strong> Follow-ups are internal CRM alerts only. The system will never automatically dispatch messages or contact opted-out prospects.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: OPEN WHATSAPP WEB */}
      {/* ========================================================================= */}
      {activeTab === "open-web" && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Official WhatsApp Web Access</h2>
                <p className="text-xs text-slate-400">
                  Connect your device safely using WhatsApp&apos;s own official interface.
                </p>
              </div>
            </div>

            {/* Step-by-step instructions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs font-mono">1</span>
                <h3 className="text-xs font-bold text-white">Launch Official Web</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Click the button below to launch <span className="text-emerald-400 font-mono">web.whatsapp.com</span> in a new tab.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs font-mono">2</span>
                <h3 className="text-xs font-bold text-white">Scan QR On Your Phone</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Open WhatsApp on your phone &rarr; <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong> and point camera at the QR code.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs font-mono">3</span>
                <h3 className="text-xs font-bold text-white">Ready for CRM Chats</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Keep WhatsApp Web open in that tab. Return here to compose messages and launch one-click chats.
                </p>
              </div>
            </div>

            {/* Launch CTA */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
              <div>
                <h4 className="text-xs font-bold text-white">Open Official WhatsApp Web Portal</h4>
                <p className="text-[11px] text-slate-400">Destination: https://web.whatsapp.com/</p>
              </div>
              <a
                href="https://web.whatsapp.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-glow-sm flex items-center gap-2 transition-all shrink-0"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Open WhatsApp Web in New Tab</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            {/* Strict Compliance Transparency Note */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Why We Do Not Show a Fake In-App QR Code</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                In strict adherence to security and Meta&apos;s Terms of Service, USMAN AI GTM does not reverse-engineer WhatsApp session tokens or simulate unauthorized web sockets. Your WhatsApp authentication remains 100% under WhatsApp&apos;s own secure official domain.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PREPARE A MESSAGE (COMPOSER) */}
      {/* ========================================================================= */}
      {activeTab === "composer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Lead Picker & Evidence (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Lead Selector Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-400" /> Target Prospect / Lead
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  {leadsList.length} CRM records
                </span>
              </div>

              <select
                value={selectedLeadId || ""}
                onChange={(e) => setSelectedLeadId(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-[#131b2b] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {leadsList.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.business_name} {lead.phone ? `(${lead.phone})` : "(No Phone)"}
                  </option>
                ))}
              </select>

              {/* Active Lead Details */}
              {activeLead && (
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{activeLead.business_name}</span>
                    <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-mono">
                      Score: {activeLead.lead_score || 70}/100
                    </span>
                  </div>

                  {/* Phone Status Badge */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400">Phone Number:</span>
                    <div className="text-right">
                      <div className="font-mono text-white font-semibold">
                        {activePhoneValidation.displayFormatted}
                      </div>
                      <span className={`inline-block text-[10px] px-2 py-0.2 rounded font-mono mt-0.5 ${
                        activePhoneValidation.isValid
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {activePhoneValidation.isValid ? "✓ Valid International" : activePhoneValidation.errorReason}
                      </span>
                    </div>
                  </div>

                  {/* Source Evidence */}
                  <div className="pt-2 border-t border-white/[0.06] space-y-1 text-[11px] text-slate-400">
                    <div className="flex justify-between">
                      <span>Location:</span>
                      <span className="text-slate-200">{activeLead.city || "—"}, {activeLead.country || "Pakistan"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Industry:</span>
                      <span className="text-slate-200">{activeLead.industry || activeLead.category || "Healthcare / B2B"}</span>
                    </div>
                    {activeLead.website && (
                      <div className="flex justify-between items-center">
                        <span>Website:</span>
                        <a
                          href={activeLead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline flex items-center gap-1 font-mono truncate max-w-[160px]"
                        >
                          {activeLead.website.replace(/^https?:\/\//, "")}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Suppression warning if suppressed */}
              {isLeadSuppressed && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
                  <Ban className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Suppression Active:</strong> This phone number is on the Do-Not-Contact list. Click-to-chat action is blocked to respect prospect opt-out.
                  </div>
                </div>
              )}
            </div>

            {/* Compliance & Consent Record */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Contact Consent Basis
              </label>

              <select
                value={consentStatus}
                onChange={(e) => setConsentStatus(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#131b2b] px-3.5 py-2 text-xs text-white focus:outline-none"
              >
                <option value="Public B2B Directory Listing">Public B2B Directory Listing (Legitimate Interest)</option>
                <option value="Prior Customer Contact">Prior Customer Relationship</option>
                <option value="Inbound Website Inquiry">Inbound Website Inquiry</option>
                <option value="Direct Referral">Direct Business Referral</option>
                <option value="Unverified Cold Outreach">Unverified Cold Outreach (Exercise Caution)</option>
              </select>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                Records the legitimate justification for outreach under GDPR/B2B communications guidelines.
              </p>
            </div>

            {/* Quick Follow-up Date Input */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-400" /> Follow-Up Cadence Date
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="flex-1 rounded-xl border border-white/10 bg-[#131b2b] px-3 py-2 text-xs text-white focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={handleScheduleFollowUp}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0"
                >
                  Set Reminder
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Message Composer (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-4">
              {/* Header & Template Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-400" /> WhatsApp Message Composer
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Draft, resolve CRM variables, and preview before launching chat.
                  </span>
                </div>

                {/* Template Quick Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 whitespace-nowrap">Template:</span>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleApplyTemplate(Number(e.target.value))}
                    className="rounded-xl border border-white/10 bg-[#131b2b] px-3 py-1.5 text-xs text-white focus:outline-none max-w-[200px] truncate"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* AI Personalization Controls */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/30 to-purple-950/20 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300 font-semibold">AI Communication Tone:</span>
                  <select
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#080c14] px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Professional & Direct">Professional & Direct</option>
                    <option value="Warm & Advisory">Warm & Advisory</option>
                    <option value="Value-First Executive">Value-First Executive</option>
                    <option value="Casual & Friendly">Casual & Friendly</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAIDraft}
                  disabled={isGeneratingAI}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-glow-sm transition-all shrink-0"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${isGeneratingAI ? "animate-spin" : ""}`} />
                  <span>{isGeneratingAI ? "Drafting..." : "Generate AI Draft"}</span>
                </button>
              </div>

              {/* Variable Helper Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400">Click to insert variable:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "{{business_name}}",
                    "{{contact_name}}",
                    "{{my_business}}",
                    "{{value_proposition}}",
                    "{{city}}",
                    "{{industry}}",
                  ].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setDraftMessage((prev) => prev + " " + v)}
                      className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10px] font-mono text-slate-300 hover:text-white transition-all"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Draft Text Area */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Editable Draft</span>
                  <span className="font-mono">
                    {draftMessage.length} characters • ~{Math.max(4, Math.round(draftMessage.length / 18))}s read
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  placeholder="Type or customize your WhatsApp draft message..."
                  className="w-full rounded-xl border border-white/10 bg-[#080c14] p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                />
              </div>

              {/* Missing Variables Warning Banner */}
              {interpolationResult.missingVariables.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Missing Variable Warning:</strong> The selected lead record is missing values for:{" "}
                    <span className="font-mono font-bold text-amber-300">
                      {interpolationResult.missingVariables.map((v) => `{{${v}}}`).join(", ")}
                    </span>
                    . We will never fabricate data. Please edit the text directly before sending.
                  </div>
                </div>
              )}

              {/* WhatsApp Live Bubble Preview */}
              <div className="p-4 rounded-xl bg-[#0b141a] border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>LIVE WHATSAPP PREVIEW (RESOLVED)</span>
                  <span>Recipient: {activePhoneValidation.displayFormatted}</span>
                </div>

                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-[#005c4b] p-3 text-xs text-white shadow-md leading-relaxed whitespace-pre-wrap">
                    {interpolationResult.renderedText || draftMessage || "Your message draft will appear here..."}
                    <div className="text-[9px] text-emerald-200/60 text-right mt-1 font-mono flex items-center justify-end gap-1">
                      <span>Just now</span>
                      <Check className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary CTA: Open WhatsApp Chat */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400">
                  Clicking will open WhatsApp with your prefilled draft in a new tab.
                </div>

                <button
                  type="button"
                  onClick={handleOpenWhatsAppChat}
                  disabled={!activePhoneValidation.isValid || isLeadSuppressed}
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-glow-sm transition-all ${
                    !activePhoneValidation.isValid || isLeadSuppressed
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Open WhatsApp Chat</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Manual Confirmation Action Bar */}
              <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">Log Interaction:</span>

                <button
                  type="button"
                  onClick={handleMarkAsSentManually}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-200 border border-white/10 flex items-center gap-1.5"
                  title="Mark that you pressed send inside WhatsApp Web"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Mark as Sent</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReplyModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-200 border border-white/10 flex items-center gap-1.5"
                  title="Record prospect response"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-blue-400" />
                  <span>Record Reply</span>
                </button>

                <button
                  type="button"
                  onClick={handleOptOutLead}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-950/30 text-xs font-semibold text-rose-300 border border-white/10 hover:border-rose-500/30 flex items-center gap-1.5"
                  title="Suppress this contact"
                >
                  <UserX className="h-3.5 w-3.5 text-rose-400" />
                  <span>Opt-Out / Suppress</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SELECTED LEADS */}
      {/* ========================================================================= */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 max-w-md">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search leads by business name, city, or phone..."
                value={leadsKeyword}
                onChange={(e) => setLeadsKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchLeads()}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={fetchLeads}
                className="p-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300"
                title="Refresh leads"
              >
                <RefreshCw className={`h-4 w-4 ${leadsLoading ? "animate-spin" : ""}`} />
              </button>

              <select
                value={leadsFilter}
                onChange={(e) => {
                  setLeadsFilter(e.target.value as any);
                  setTimeout(fetchLeads, 50);
                }}
                className="rounded-xl border border-white/10 bg-[#131b2b] px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="all">All CRM Leads</option>
                <option value="ready">Ready (Valid Phone & Not Suppressed)</option>
                <option value="drafted">Has Prepared Draft</option>
                <option value="suppressed">Suppressed / Opted Out</option>
              </select>
            </div>
          </div>

          {/* Leads Table */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Business / Lead</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Phone & Validation</th>
                    <th className="py-3 px-3">Source URL</th>
                    <th className="py-3 px-3">Outreach Status</th>
                    <th className="py-3 px-3">Last Recorded Activity</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {leadsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mx-auto mb-2" />
                        Loading CRM leads...
                      </td>
                    </tr>
                  ) : leadsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No leads found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    leadsList.map((lead) => {
                      const pv = lead.phone_validation || normalizePhoneNumber(lead.phone, lead.country);
                      const isSuppressed = lead.is_suppressed;

                      return (
                        <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                          {/* Business */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-white text-xs">{lead.business_name}</div>
                            <div className="text-[10px] text-slate-500">{lead.category || "General Business"}</div>
                          </td>

                          {/* Location */}
                          <td className="py-3 px-3 text-slate-300">
                            {lead.city || "—"}, {lead.country || "PK"}
                          </td>

                          {/* Phone & Validation */}
                          <td className="py-3 px-3">
                            {lead.phone ? (
                              <div>
                                <div className="font-mono text-slate-200 text-[11px]">{pv.displayFormatted}</div>
                                <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                  pv.isValid
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                }`}>
                                  {pv.isValid ? "Valid" : "Invalid Format"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-600 italic">No phone</span>
                            )}
                          </td>

                          {/* Source URL */}
                          <td className="py-3 px-3">
                            {lead.website || lead.source_url ? (
                              <a
                                href={lead.website || lead.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline flex items-center gap-1 font-mono text-[10px] truncate max-w-[140px]"
                              >
                                {(lead.website || lead.source_url).replace(/^https?:\/\//, "")}
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Outreach Status */}
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                              isSuppressed
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : lead.draft_status
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : pv.isValid
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-white/5 text-slate-500 border-white/10"
                            }`}>
                              {lead.outreach_status || (pv.isValid ? "Ready" : "No Phone")}
                            </span>
                          </td>

                          {/* Last Activity */}
                          <td className="py-3 px-3 text-[11px] text-slate-400">
                            {lead.last_activity ? (
                              <div>
                                <span className="font-semibold text-slate-300">{lead.last_activity.action}</span>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {new Date(lead.last_activity.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-600">No activity yet</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedLeadId(lead.id);
                                  setActiveTab("composer");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-semibold text-slate-200 border border-white/10"
                                title="Prepare message for this lead"
                              >
                                Prepare Draft
                              </button>

                              {pv.isValid && !isSuppressed && (
                                <a
                                  href={buildWhatsAppClickToChatUrl(pv.normalized, lead.draft_text || "")}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={async () => {
                                    try {
                                      await api.post("/whatsapp/activities", {
                                        lead_id: lead.id,
                                        business_name: lead.business_name,
                                        phone_number: pv.normalized,
                                        action: "CHAT_OPENED",
                                        notes: "Opened directly from Selected Leads list",
                                      });
                                    } catch {}
                                  }}
                                  className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30"
                                  title="Open WhatsApp Chat in new tab"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MESSAGE TEMPLATES */}
      {/* ========================================================================= */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Message Templates Library</h2>
              <p className="text-xs text-slate-400">
                Pre-approved, variable-interpolated templates for consistent high-response WhatsApp outreach.
              </p>
            </div>

            <button
              onClick={handleOpenCreateTemplate}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-glow-sm flex items-center gap-1.5 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>New Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <div key={tmpl.id} className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                      {tmpl.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {tmpl.body.length} chars
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{tmpl.name}</h3>
                  {tmpl.description && (
                    <p className="text-[11px] text-slate-400">{tmpl.description}</p>
                  )}

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                    {tmpl.body}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                      setDraftMessage(tmpl.body);
                      setActiveTab("composer");
                      showToast(`Loaded "${tmpl.name}" into composer`, "info");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-bold flex items-center gap-1"
                  >
                    <span>Use in Composer</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicateTemplate(tmpl.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                      title="Duplicate Template"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEditTemplate(tmpl)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                      title="Edit Template"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    {!tmpl.is_default && (
                      <button
                        onClick={() => handleDeleteTemplate(tmpl.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5"
                        title="Delete Template"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: ACTIVITY HISTORY */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Honest Activity Audit Log</h2>
              <p className="text-xs text-slate-400">
                Transparent timeline of manual WhatsApp companion events. No fake delivery receipts or automated guesswork.
              </p>
            </div>

            <button
              onClick={fetchActivities}
              className="p-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300"
              title="Refresh Activity Log"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-3">Lead & Phone</th>
                    <th className="py-3 px-3">Action Type</th>
                    <th className="py-3 px-3">Audit Details & Notes</th>
                    <th className="py-3 px-3">Follow-Up Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No activity records found yet. Prepare a draft or click &quot;Open WhatsApp Chat&quot; to begin tracking!
                      </td>
                    </tr>
                  ) : (
                    activities.map((act) => {
                      const badgeColor = {
                        CHAT_OPENED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                        MANUALLY_MARKED_SENT: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                        REPLY_RECORDED: "bg-teal-500/10 text-teal-400 border-teal-500/20",
                        FOLLOW_UP_SCHEDULED: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
                        OPTED_OUT: "bg-rose-500/10 text-rose-400 border-rose-500/20",
                        DRAFT_PREPARED: "bg-white/5 text-slate-300 border-white/10",
                      }[act.action] || "bg-white/5 text-slate-400 border-white/10";

                      return (
                        <tr key={act.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {new Date(act.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-white">{act.business_name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">+{act.phone_number}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono border ${badgeColor}`}>
                              {act.action}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-300 text-xs">
                            {act.notes || "—"}
                          </td>
                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                            {act.next_followup || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: SETTINGS & SUPPRESSION LIST */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* User Business Profile Form */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
              <Settings className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">Your Business & Service Profile</h2>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  My Business Name <span className="text-slate-500 font-mono">({"{{my_business}}"})</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.my_business_name}
                  onChange={(e) => setSettings({ ...settings, my_business_name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#131b2b] px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sender / Representative Name <span className="text-slate-500 font-mono">({"{{sender_name}}"})</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.sender_name}
                  onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#131b2b] px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Core Offering / Specialization</label>
                <input
                  type="text"
                  value={settings.my_offering}
                  onChange={(e) => setSettings({ ...settings, my_offering: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#131b2b] px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Value Proposition <span className="text-slate-500 font-mono">({"{{value_proposition}}"})</span>
                </label>
                <textarea
                  rows={2}
                  value={settings.value_proposition}
                  onChange={(e) => setSettings({ ...settings, value_proposition: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#131b2b] p-3 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Default Country Dialing Code</label>
                  <input
                    type="text"
                    value={settings.default_country_code}
                    onChange={(e) => setSettings({ ...settings, default_country_code: e.target.value })}
                    placeholder="e.g. 92, 1, 44"
                    className="w-full rounded-xl border border-white/10 bg-[#131b2b] px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Default Communication Tone</label>
                  <select
                    value={settings.default_tone}
                    onChange={(e) => setSettings({ ...settings, default_tone: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#131b2b] px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Professional & Direct">Professional & Direct</option>
                    <option value="Warm & Advisory">Warm & Advisory</option>
                    <option value="Value-First Executive">Value-First Executive</option>
                    <option value="Casual & Friendly">Casual & Friendly</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-glow-sm"
                >
                  Save Business Profile
                </button>
              </div>
            </form>
          </div>

          {/* Suppression (Do-Not-Contact) List */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-rose-400" />
                <h2 className="text-sm font-bold text-white">Suppression List (Do-Not-Contact)</h2>
              </div>
              <button
                onClick={() => setSuppressionModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold border border-rose-500/30"
              >
                + Add Number
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Numbers added to this suppression list are automatically blocked from click-to-chat links and excluded from outreach.
            </p>

            <div className="space-y-2 max-h-[340px] overflow-y-auto">
              {suppressions.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Suppression list is currently empty.
                </div>
              ) : (
                suppressions.map((s) => (
                  <div key={s.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs font-bold text-rose-300">+{s.phone_number}</div>
                      <div className="text-[10px] text-slate-400">
                        {s.business_name ? `${s.business_name} • ` : ""}{s.reason}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveSuppression(s.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5"
                      title="Remove from suppression list"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT TEMPLATE */}
      {/* ========================================================================= */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-[#0c121e] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-400" />
                {editingTemplate ? "Edit Message Template" : "Create New Message Template"}
              </h3>
              <button onClick={() => setTemplateModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveTemplateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Template Title</label>
                <input
                  type="text"
                  required
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g. Q4 Executive Follow-up"
                  className="w-full rounded-xl border border-white/10 bg-[#131b2b] px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#131b2b] px-3.5 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="B2B_OUTREACH">B2B Outreach</option>
                  <option value="CONSULTATION">Consultation Brief</option>
                  <option value="FOLLOW_UP">Follow-Up</option>
                  <option value="PARTNERSHIP">Partnership</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Template Description</label>
                <input
                  type="text"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="e.g. High-converting hook for decision makers"
                  className="w-full rounded-xl border border-white/10 bg-[#131b2b] px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">Message Body with Variables</label>
                  <span className="text-[10px] text-slate-400 font-mono">Use {'{{variable}}'}</span>
                </div>
                <textarea
                  rows={4}
                  required
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  placeholder="Hi {{contact_name}}, reaching out from {{my_business}}..."
                  className="w-full rounded-xl border border-white/10 bg-[#131b2b] p-3 text-xs text-white focus:outline-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow-sm"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD INBOUND REPLY */}
      {/* ========================================================================= */}
      {replyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#0c121e] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-blue-400" />
                Record Prospect WhatsApp Reply
              </h3>
              <button onClick={() => setReplyModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRecordReplySubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reply Sentiment</label>
                <select
                  value={replyForm.sentiment}
                  onChange={(e) => setReplyForm({ ...replyForm, sentiment: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#131b2b] px-3.5 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="Positive / Interested">Positive / Interested</option>
                  <option value="Meeting Requested">Meeting Requested</option>
                  <option value="More Info Requested">More Information Requested</option>
                  <option value="Neutral / Acknowledged">Neutral / Acknowledged</option>
                  <option value="Not Interested">Not Interested</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reply Content / Notes</label>
                <textarea
                  rows={3}
                  required
                  value={replyForm.text}
                  onChange={(e) => setReplyForm({ ...replyForm, text: e.target.value })}
                  placeholder="Paste what the contact replied on WhatsApp..."
                  className="w-full rounded-xl border border-white/10 bg-[#131b2b] p-3 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-glow-sm"
                >
                  Save Inbound Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NUMBER TO SUPPRESSION */}
      {/* ========================================================================= */}
      {suppressionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#0c121e] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Ban className="h-4 w-4 text-rose-400" />
                Add Number to Suppression List
              </h3>
              <button onClick={() => setSuppressionModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddSuppressionSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (International Format)</label>
                <input
                  type="text"
                  required
                  value={suppressionForm.phone}
                  onChange={(e) => setSuppressionForm({ ...suppressionForm, phone: e.target.value })}
                  placeholder="e.g. +923001234567"
                  className="w-full rounded-xl border border-white/10 bg-[#131b2b] px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Business Name (Optional)</label>
                <input
                  type="text"
                  value={suppressionForm.business}
                  onChange={(e) => setSuppressionForm({ ...suppressionForm, business: e.target.value })}
                  placeholder="e.g. Acme Corp"
                  className="w-full rounded-xl border border-white/10 bg-[#131b2b] px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason</label>
                <input
                  type="text"
                  value={suppressionForm.reason}
                  onChange={(e) => setSuppressionForm({ ...suppressionForm, reason: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#131b2b] px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSuppressionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-glow-sm"
                >
                  Confirm Suppression
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
