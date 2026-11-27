"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ClientAccount } from "@/lib/types";
import {
  Receipt,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Power,
  MessageCircle,
  DollarSign,
  Clock,
  Eye,
  X,
  Plus,
  Trash2,
  CreditCard,
  XCircle,
  HelpCircle,
  ExternalLink,
  Landmark,
  Bell,
} from "lucide-react";

const METHOD_PRESETS = [
  { name: "Easypaisa", region: "Pakistan", currency: "PKR", method_type: "mobile_wallet" },
  { name: "JazzCash", region: "Pakistan", currency: "PKR", method_type: "mobile_wallet" },
  { name: "Meezan Bank", region: "Pakistan", currency: "PKR", method_type: "bank_transfer" },
  { name: "NayaPay", region: "Pakistan", currency: "PKR", method_type: "mobile_wallet" },
  { name: "Binance", region: "Worldwide (Crypto)", currency: "USDT", method_type: "crypto" },
  { name: "Payoneer", region: "Worldwide", currency: "USD", method_type: "payoneer" },
  { name: "Bank Transfer", region: "International / Local Wire", currency: "USD", method_type: "bank_transfer" },
];

export default function AdminPaymentsPage() {
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [fxRates, setFxRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"submissions" | "methods" | "ledger">("submissions");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Proof screenshot viewer modal
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerMime, setViewerMime] = useState<string>("image/png");
  const [viewerTitle, setViewerTitle] = useState<string>("");

  // Review / Approve / Reject / More Info Confirmation Modal
  const [reviewSub, setReviewSub] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT" | "MORE_INFO_REQUIRED">("APPROVE");
  const [reviewPlan, setReviewPlan] = useState<"BASIC" | "LIFETIME" | "CUSTOM">("BASIC");
  const [reviewPrice, setReviewPrice] = useState<string>("25");
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [reviewCustomUnit, setReviewCustomUnit] = useState<string>("hours");
  const [reviewCustomVal, setReviewCustomVal] = useState<number>(1);
  const [reviewLeadAllowance, setReviewLeadAllowance] = useState<number>(50);
  const [reviewConfirmedFunds, setReviewConfirmedFunds] = useState<boolean>(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // FX rate manual override form state
  const [fxEditCurrency, setFxEditCurrency] = useState<string>("PKR");
  const [fxEditRate, setFxEditRate] = useState<string>("");
  const [fxSaving, setFxSaving] = useState(false);

  // Owner Support WhatsApp / Email Settings
  const [ownerWhatsapp, setOwnerWhatsapp] = useState<string>("+923174383702");
  const [ownerSupportEmail, setOwnerSupportEmail] = useState<string>("");
  const [savingSupport, setSavingSupport] = useState<boolean>(false);
  const [pendingBonusCount, setPendingBonusCount] = useState<number>(0);

  // Payment Method + Structured Bank / Receiving Configuration Form
  const emptyMethodForm = {
    id: undefined as number | undefined,
    name: "",
    region: "Worldwide",
    currency: "USD",
    account_holder_name: "",
    account_identifier: "",
    wallet_address: "",
    payment_link: "",
    qr_image_data: "",
    instructions: "",
    is_active: false,
    sort_order: 10,
    details_json: {
      method_type: "custom",
      display_title: "",
      bank_name: "",
      bank_address: "",
      beneficiary_name: "",
      receiving_number: "",
      account_number: "",
      iban: "",
      branch_info: "",
      routing_aba: "",
      swift_bic: "",
      account_type: "",
      supported_currency: "USD",
      network: "",
      warning_text: "",
      payment_email: "",
    },
  };
  const [methodForm, setMethodForm] = useState<any>(emptyMethodForm);
  const [savingMethod, setSavingMethod] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [clientsRes, subsRes, methRes, fxRes, settingsRes, gmailGovRes] = await Promise.all([
        api.get<any>("/admin/clients").catch(() => null),
        api.get<any>("/admin/payments/submissions").catch(() => null),
        api.get<any>("/admin/payments/methods").catch(() => null),
        api.get<any>("/admin/payments/fx").catch(() => null),
        api.get<any>("/admin/settings").catch(() => null),
        api.get<any>("/admin/gmail/overview").catch(() => null),
      ]);
      const list = Array.isArray(clientsRes) ? clientsRes : clientsRes?.clients || [];
      setClients(list);
      setSubmissions(Array.isArray(subsRes?.submissions) ? subsRes.submissions : []);
      setMethods(Array.isArray(methRes?.methods) ? methRes.methods : []);
      setFxRates(Array.isArray(fxRes?.rates) ? fxRes.rates : []);
      if (settingsRes?.settings) {
        setOwnerWhatsapp(settingsRes.settings.whatsappNumber || "");
        setOwnerSupportEmail(settingsRes.settings.supportEmail || "");
      }
      if (Array.isArray(gmailGovRes?.bonus_requests)) {
        setPendingBonusCount(
          gmailGovRes.bonus_requests.filter((b: any) => String(b.status).toUpperCase() === "PENDING").length
        );
      }
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to load payment workspace.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleOpenProof = async (sub: any) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch(`/api/payments/submissions/${sub.id}/proof`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail || "Could not load screenshot.");
      }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      setViewerMime(sub.screenshot_mime || blob.type || "image/png");
      setViewerTitle(`Submission ${sub.request_code || `#${sub.id}`} — ${sub.username} (${sub.screenshot_filename})`);
      setViewerUrl(objUrl);
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to open screenshot.", type: "error" });
    }
  };

  const openReviewModal = (sub: any, mode: "APPROVE" | "REJECT" | "MORE_INFO_REQUIRED") => {
    setReviewSub(sub);
    setReviewAction(mode);
    setReviewConfirmedFunds(false);
    const reqP = String(sub.requested_plan || "BASIC").toUpperCase();
    setReviewPlan(reqP === "LIFETIME" ? "LIFETIME" : reqP === "CUSTOM" ? "CUSTOM" : "BASIC");
    setReviewPrice(String(sub.agreed_price_usd ?? (reqP === "LIFETIME" ? 100 : 25)));
    setReviewNotes(sub.admin_notes || "");
    const u = String(sub.custom_duration_unit || "hours").toLowerCase();
    const v = Number(sub.custom_duration_value) || 1;
    setReviewCustomUnit(u);
    setReviewCustomVal(v);
    const defaultLeads =
      sub.lead_allowance && Number(sub.lead_allowance) > 0
        ? Number(sub.lead_allowance)
        : u === "hours"
        ? v * 50
        : u === "days"
        ? v * 250
        : u === "weeks"
        ? v * 1000
        : v * 5000;
    setReviewLeadAllowance(defaultLeads);
  };

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewSub) return;
    if (reviewAction === "APPROVE" && !reviewConfirmedFunds) {
      setMsg({ text: "Please check the confirmation box verifying receipt of actual funds before approving.", type: "error" });
      return;
    }
    setReviewSubmitting(true);
    setMsg(null);
    try {
      const payload: any = {
        action: reviewAction,
        admin_notes: reviewNotes.trim() || undefined,
      };
      if (reviewAction === "APPROVE") {
        payload.target_plan = reviewPlan;
        payload.agreed_price_usd = Number(reviewPrice);
        if (reviewPlan === "CUSTOM") {
          payload.duration_value = reviewCustomVal;
          payload.duration_unit = reviewCustomUnit;
          payload.lead_allowance = reviewLeadAllowance;
        }
      }
      const res = await api.post<any>(`/admin/payments/submissions/${reviewSub.id}`, payload);
      setMsg({
        text: res?.message || `Payment submission #${reviewSub.id} processed cleanly and verified in DB.`,
        type: "success",
      });
      setReviewSub(null);
      await loadAll();
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to process review.", type: "error" });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleQrFileSelect = (file?: File) => {
    if (!file) return;
    if (file.size > 512 * 1024) {
      setMsg({ text: "QR image must be under 512KB.", type: "error" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setMethodForm((prev: any) => ({ ...prev, qr_image_data: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSupportSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSupport(true);
    setMsg(null);
    try {
      await api.post("/admin/settings", {
        whatsapp_number: ownerWhatsapp.trim(),
        support_email: ownerSupportEmail.trim(),
      });
      setMsg({ text: "Saved Owner WhatsApp & support contact settings cleanly.", type: "success" });
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to update support settings.", type: "error" });
    } finally {
      setSavingSupport(false);
    }
  };

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMethod(true);
    setMsg(null);
    try {
      const payload = {
        ...methodForm,
        details_json: methodForm.details_json || null,
      };
      const res = await api.post<any>("/admin/payments/methods", payload);
      setMsg({
        text: `Payment method '${res?.method?.name || methodForm.name}' saved & verified.`,
        type: "success",
      });
      setMethodForm(emptyMethodForm);
      await loadAll();
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to save payment method.", type: "error" });
    } finally {
      setSavingMethod(false);
    }
  };

  const handleDeleteMethod = async (id: number, name: string) => {
    if (!confirm(`Delete payment method '${name}'?`)) return;
    try {
      await api.delete(`/admin/payments/methods?id=${id}`);
      setMsg({ text: `Payment method '${name}' removed.`, type: "success" });
      await loadAll();
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to delete method.", type: "error" });
    }
  };

  const handleSaveFxOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setFxSaving(true);
    try {
      const res = await api.post<any>("/admin/payments/fx", {
        currency: fxEditCurrency,
        rate_from_usd: Number(fxEditRate),
      });
      if (res?.rates) setFxRates(res.rates);
      setFxEditRate("");
      setMsg({ text: `Saved Owner manual FX rate for ${fxEditCurrency}.`, type: "success" });
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to save FX override.", type: "error" });
    } finally {
      setFxSaving(false);
    }
  };

  const handleRefreshLiveFx = async () => {
    setFxSaving(true);
    try {
      const res = await api.post<any>("/admin/payments/fx", { refresh_live_rates: true });
      if (res?.rates) setFxRates(res.rates);
      setMsg({ text: "Refreshed live market exchange rates cleanly.", type: "success" });
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to refresh FX rates.", type: "error" });
    } finally {
      setFxSaving(false);
    }
  };

  const handleClearFxOverride = async (currencyCode: string) => {
    setFxSaving(true);
    try {
      const res = await api.post<any>("/admin/payments/fx", {
        currency: currencyCode,
        clear_override: true,
      });
      if (res?.rates) setFxRates(res.rates);
      setMsg({ text: `Restored live market rate for ${currencyCode}.`, type: "success" });
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to reset rate.", type: "error" });
    } finally {
      setFxSaving(false);
    }
  };

  const handleActivate = async (clientId: number, clientEmail: string) => {
    setActionLoadingId(clientId);
    setMsg(null);
    try {
      const res = await api.post<any>(`/admin/clients/${clientId}/status`, { status: "ACTIVE" });
      setMsg({
        text: res?.message || `Updated client ${clientEmail}!`,
        type: res?.restored_access === false ? "error" : "success",
      });
      await loadAll();
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to activate client", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSuspend = async (clientId: number, clientEmail: string) => {
    setActionLoadingId(clientId);
    setMsg(null);
    try {
      await api.post(`/admin/clients/${clientId}/status`, { status: "SUSPENDED" });
      setMsg({ text: `Suspended client ${clientEmail}. Paid features are now locked.`, type: "success" });
      await loadAll();
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to suspend client", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingSubCount = submissions.filter((s) => s.status === "PENDING" || s.status === "MORE_INFO_REQUIRED").length;
  const activeMethodCount = methods.filter((m) => m.is_active && m.is_configured).length;
  const paidActive = clients.filter((c) => c.status === "ACTIVE");

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/app/admin" className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              <span>Admin Center</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Owner Payment Verification &amp; Bank Settings
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Payment Requests, Bank Settings &amp; FX Rates</h1>
          <p className="text-xs text-slate-400">
            Configure Bank Transfer details, global payment methods, FX exchange rates, and approve verified customer payments onto existing accounts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/app/admin/integrations/google"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/35 text-blue-200 font-bold text-xs"
          >
            <span>Google OAuth &amp; Setup Bonuses</span>
            {pendingBonusCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black">
                {pendingBonusCount}
              </span>
            )}
          </Link>
          <button
            onClick={loadAll}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/[0.03] border border-white/10 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {ownerWhatsapp && (
            <a
              href={`https://wa.me/${ownerWhatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow-sm transition-all cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Support WhatsApp ({ownerWhatsapp})</span>
            </a>
          )}
        </div>
      </div>

      {/* Pending Notification Alert Banner */}
      {pendingSubCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-200">
            <Bell className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>{pendingSubCount} Pending Payment Request(s)</strong> awaiting your funds verification. Review each screenshot carefully before clicking Approve.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("submissions")}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-black font-black text-xs cursor-pointer shrink-0"
          >
            Review Pending Proofs
          </button>
        </div>
      )}

      {/* Feedback */}
      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            msg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="underline text-xs cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Pending Proof Submissions</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{pendingSubCount} Pending</div>
          <div className="text-[10px] text-slate-400">{submissions.length} total submitted</div>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Configured Payment Methods</span>
            <CreditCard className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{activeMethodCount} Active</div>
          <div className="text-[10px] text-slate-400">{methods.length} saved configurations</div>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Active Paid Accounts</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{paidActive.length} Clients</div>
          <div className="text-[10px] text-slate-400">Manually verified by Owner</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("submissions")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
            activeTab === "submissions"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-white bg-white/[0.03]"
          }`}
        >
          <span>Payment Requests Queue</span>
          {pendingSubCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black">
              {pendingSubCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("methods")}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
            activeTab === "methods"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-white bg-white/[0.03]"
          }`}
        >
          Bank Transfer, Payment Methods &amp; FX Settings
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
            activeTab === "ledger"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-white bg-white/[0.03]"
          }`}
        >
          Client Accounts Ledger
        </button>
      </div>

      {/* TAB 1: SUBMISSION REVIEW QUEUE */}
      {activeTab === "submissions" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h2 className="text-sm font-bold text-white">Submitted Payment Proofs</h2>
            <span className="text-xs text-slate-400">Newest &amp; Pending first</span>
          </div>

          {submissions.length === 0 ? (
            <p className="text-xs text-slate-500">No payment proofs have been submitted by customers yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-2.5">Request ID</th>
                    <th className="py-3 px-2.5">Customer</th>
                    <th className="py-3 px-2.5">Requested Plan &amp; Leads</th>
                    <th className="py-3 px-2.5">Amount &amp; Currency</th>
                    <th className="py-3 px-2.5">Method &amp; Ref</th>
                    <th className="py-3 px-2.5">Existing Account</th>
                    <th className="py-3 px-2.5">Submitted At</th>
                    <th className="py-3 px-2.5">Status</th>
                    <th className="py-3 px-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {submissions.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-2.5 font-mono text-white font-bold">
                        <div>{s.request_code || `#${s.id}`}</div>
                        <div className="text-[10px] text-slate-500">Row #{s.id}</div>
                      </td>

                      <td className="py-3 px-2.5">
                        <Link
                          href={`/app/admin/clients/${s.user_id}`}
                          className="font-bold text-blue-300 hover:underline flex items-center gap-1"
                        >
                          <span>@{s.username}</span>
                        </Link>
                        <div className="text-[10px] text-slate-400 font-mono">
                          WS #{s.workspace_id} {s.email ? `• ${s.email}` : ""}
                        </div>
                      </td>

                      <td className="py-3 px-2.5">
                        <span className="font-bold text-white block">{s.plan_label || s.requested_plan}</span>
                        {s.requested_plan === "CUSTOM" && s.custom_duration_value && (
                          <div className="text-[10px] text-purple-300">
                            {s.custom_duration_value} {s.custom_duration_unit}
                            {s.lead_allowance ? ` • ${Number(s.lead_allowance).toLocaleString()} leads` : ""}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-2.5 font-mono">
                        <div className="font-bold text-emerald-300">${s.agreed_price_usd} USD</div>
                        {s.currency && s.currency !== "USD" && (
                          <div className="text-[10px] text-slate-300">
                            {Number(s.converted_amount ?? s.agreed_price_usd).toLocaleString()} {s.currency}
                            {s.exchange_rate ? ` (@${s.exchange_rate})` : ""}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-2.5">
                        <div className="font-semibold text-slate-200">{s.payment_method_name}</div>
                        {s.payment_reference && (
                          <div className="text-[10px] font-mono text-slate-400">Ref: {s.payment_reference}</div>
                        )}
                        {s.customer_note && (
                          <div className="text-[10px] text-slate-400 max-w-[180px] truncate" title={s.customer_note}>
                            Note: {s.customer_note}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-2.5">
                        <div className="text-[11px] text-slate-200">{s.current_user_plan_label || s.current_user_plan || "N/A"}</div>
                        <div className="text-[10px] font-mono text-slate-400">{s.current_user_status || "UNKNOWN"}</div>
                      </td>

                      <td className="py-3 px-2.5 text-[10px] font-mono text-slate-400">
                        {new Date(s.created_at).toLocaleString()}
                      </td>

                      <td className="py-3 px-2.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            s.status === "APPROVED"
                              ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"
                              : s.status === "REJECTED"
                              ? "text-rose-300 bg-rose-500/15 border-rose-500/30"
                              : s.status === "MORE_INFO_REQUIRED"
                              ? "text-amber-300 bg-amber-500/15 border-amber-500/30"
                              : "text-blue-300 bg-blue-500/15 border-blue-500/30"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>

                      <td className="py-3 px-2.5 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenProof(s)}
                            className="px-2 py-1 rounded bg-white/[0.05] hover:bg-white/10 text-slate-200 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View Proof</span>
                          </button>
                          <Link
                            href={`/app/admin/clients/${s.user_id}`}
                            className="px-2 py-1 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-semibold inline-flex items-center gap-1"
                          >
                            <span>View Account</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                          {s.status !== "APPROVED" && (
                            <>
                              <button
                                onClick={() => openReviewModal(s, "APPROVE")}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => openReviewModal(s, "MORE_INFO_REQUIRED")}
                                className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-semibold cursor-pointer inline-flex items-center gap-1"
                              >
                                <HelpCircle className="h-3 w-3" />
                                <span>Need Info</span>
                              </button>
                              <button
                                onClick={() => openReviewModal(s, "REJECT")}
                                className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-semibold cursor-pointer inline-flex items-center gap-1"
                              >
                                <XCircle className="h-3 w-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BANK TRANSFER CONFIG, PAYMENT METHODS & FX RATES */}
      {activeTab === "methods" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Add/Edit Method & Bank Form */}
            <div className="lg:col-span-6 rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Landmark className="h-4 w-4 text-blue-400" />
                <span>{methodForm.id ? "Edit Payment Method / Bank Settings" : "Add Payment Method / Bank Transfer"}</span>
              </h2>

              <div className="flex flex-wrap gap-1.5">
                {METHOD_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() =>
                      setMethodForm((prev: any) => ({
                        ...prev,
                        name: p.name,
                        region: p.region,
                        currency: p.currency,
                        details_json: {
                          ...prev.details_json,
                          method_type: p.method_type,
                          supported_currency: p.currency,
                          bank_name: p.method_type === "bank_transfer" ? p.name : prev.details_json?.bank_name || "",
                          network: p.method_type === "crypto" ? "TRC20" : "",
                        },
                      }))
                    }
                    className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10px] text-slate-300 cursor-pointer"
                  >
                    + {p.name}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSaveMethod} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-1">
                    <label className="block font-semibold text-slate-300 mb-1">Method Name *</label>
                    <input
                      type="text"
                      required
                      value={methodForm.name}
                      onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })}
                      placeholder="Meezan Bank / Payoneer"
                      className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Region *</label>
                    <input
                      type="text"
                      required
                      value={methodForm.region}
                      onChange={(e) => setMethodForm({ ...methodForm, region: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Currency *</label>
                    <input
                      type="text"
                      required
                      value={methodForm.currency}
                      onChange={(e) => setMethodForm({ ...methodForm, currency: e.target.value.toUpperCase() })}
                      className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                {/* Structured Bank Transfer Fields Section */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2.5">
                  <div className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
                    Structured Bank Details (Meezan Bank / Wire Transfers — Only Filled Fields Display)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={methodForm.details_json?.bank_name || ""}
                        onChange={(e) =>
                          setMethodForm({
                            ...methodForm,
                            details_json: { ...methodForm.details_json, bank_name: e.target.value },
                          })
                        }
                        placeholder="e.g. Meezan Bank / Mercury"
                        className="w-full rounded-lg border border-white/10 bg-[#121824] px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Beneficiary / Account Holder</label>
                      <input
                        type="text"
                        value={methodForm.details_json?.beneficiary_name || ""}
                        onChange={(e) =>
                          setMethodForm({
                            ...methodForm,
                            details_json: { ...methodForm.details_json, beneficiary_name: e.target.value },
                          })
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#121824] px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Receiving Number / Raast ID</label>
                      <input
                        type="text"
                        value={methodForm.details_json?.receiving_number || ""}
                        onChange={(e) =>
                          setMethodForm({
                            ...methodForm,
                            details_json: { ...methodForm.details_json, receiving_number: e.target.value },
                          })
                        }
                        placeholder="e.g. 03072074354 (if not IBAN)"
                        className="w-full rounded-lg border border-white/10 bg-[#121824] px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Bank Account Number</label>
                      <input
                        type="text"
                        value={methodForm.details_json?.account_number || ""}
                        onChange={(e) =>
                          setMethodForm({
                            ...methodForm,
                            details_json: { ...methodForm.details_json, account_number: e.target.value },
                          })
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#121824] px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">IBAN</label>
                      <input
                        type="text"
                        value={methodForm.details_json?.iban || ""}
                        onChange={(e) =>
                          setMethodForm({
                            ...methodForm,
                            details_json: { ...methodForm.details_json, iban: e.target.value },
                          })
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#121824] px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Branch Information</label>
                      <input
                        type="text"
                        value={methodForm.details_json?.branch_info || ""}
                        onChange={(e) =>
                          setMethodForm({
                            ...methodForm,
                            details_json: { ...methodForm.details_json, branch_info: e.target.value },
                          })
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#121824] px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">SWIFT / BIC</label>
                      <input
                        type="text"
                        value={methodForm.details_json?.swift_bic || ""}
                        onChange={(e) =>
                          setMethodForm({
                            ...methodForm,
                            details_json: { ...methodForm.details_json, swift_bic: e.target.value },
                          })
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#121824] px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Supported Receiving Currency</label>
                      <input
                        type="text"
                        value={methodForm.details_json?.supported_currency || ""}
                        onChange={(e) =>
                          setMethodForm({
                            ...methodForm,
                            details_json: { ...methodForm.details_json, supported_currency: e.target.value.toUpperCase() },
                          })
                        }
                        placeholder="PKR / USD"
                        className="w-full rounded-lg border border-white/10 bg-[#121824] px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Standard Non-Bank Fields (Easypaisa, JazzCash, NayaPay, Payoneer, Binance) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Account Holder / Beneficiary</label>
                    <input
                      type="text"
                      value={methodForm.account_holder_name || ""}
                      onChange={(e) => setMethodForm({ ...methodForm, account_holder_name: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Mobile Number / Payoneer Email</label>
                    <input
                      type="text"
                      value={methodForm.account_identifier || ""}
                      onChange={(e) => setMethodForm({ ...methodForm, account_identifier: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Wallet Address (Binance Crypto)</label>
                    <input
                      type="text"
                      value={methodForm.wallet_address || ""}
                      onChange={(e) => setMethodForm({ ...methodForm, wallet_address: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Crypto Network (e.g. TRC20)</label>
                    <input
                      type="text"
                      value={methodForm.details_json?.network || ""}
                      onChange={(e) =>
                        setMethodForm({
                          ...methodForm,
                          details_json: { ...methodForm.details_json, network: e.target.value.toUpperCase() },
                        })
                      }
                      placeholder="TRC20"
                      className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Network Warning (If Crypto)</label>
                    <input
                      type="text"
                      value={methodForm.details_json?.warning_text || ""}
                      onChange={(e) =>
                        setMethodForm({
                          ...methodForm,
                          details_json: { ...methodForm.details_json, warning_text: e.target.value },
                        })
                      }
                      placeholder="Send funds only using the TRC20 network..."
                      className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">QR Code Image (&lt;512KB)</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleQrFileSelect(e.target.files?.[0])}
                      className="w-full rounded-xl border border-white/10 bg-[#121824] px-2.5 py-1.5 text-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Customer Payment Instructions</label>
                  <textarea
                    rows={2}
                    value={methodForm.instructions || ""}
                    onChange={(e) => setMethodForm({ ...methodForm, instructions: e.target.value })}
                    placeholder="Transfer exact amount and upload screenshot proof inside Usage & Subscription."
                    className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={Boolean(methodForm.is_active)}
                    onChange={(e) => setMethodForm({ ...methodForm, is_active: e.target.checked })}
                  />
                  <span className="font-semibold text-white">Active &amp; Visible to Customers</span>
                </label>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={savingMethod}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer disabled:opacity-50"
                  >
                    {savingMethod ? "Saving..." : methodForm.id ? "Update Payment Method" : "Save Payment Method"}
                  </button>
                  {methodForm.id && (
                    <button
                      type="button"
                      onClick={() => setMethodForm(emptyMethodForm)}
                      className="px-3 py-2 rounded-xl bg-white/[0.04] text-slate-300 cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Configured Methods List + FX Override */}
            <div className="lg:col-span-6 space-y-6">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
                <h2 className="text-sm font-bold text-white">Configured Payment Methods</h2>
                {methods.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No payment methods configured yet. Use the presets on the left to add Bank Transfer, Payoneer, Binance, Trust Wallet, JazzCash, or Easypaisa cleanly.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {methods.map((m) => (
                      <div key={m.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2 text-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{m.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                              {m.region} • {m.currency}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                m.is_active && m.is_configured
                                  ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"
                                  : "text-slate-400 bg-slate-800 border-white/10"
                              }`}
                            >
                              {m.is_active && m.is_configured ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setMethodForm({
                                  ...emptyMethodForm,
                                  ...m,
                                  details_json: {
                                    ...emptyMethodForm.details_json,
                                    ...(m.details_json || {}),
                                  },
                                })
                              }
                              className="px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/10 text-slate-200 text-[11px] font-semibold cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMethod(m.id, m.name)}
                              className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 space-y-0.5">
                          {m.details_json?.bank_name && (
                            <div>
                              Bank: {m.details_json.bank_name}
                              {m.details_json.receiving_number ? ` (Receiving: ${m.details_json.receiving_number})` : ""}
                              {m.details_json.account_number ? ` (Acc: ${m.details_json.account_number})` : ""}
                              {m.details_json.iban ? ` (IBAN: ${m.details_json.iban})` : ""}
                            </div>
                          )}
                          {m.account_holder_name && <div>Holder: {m.account_holder_name}</div>}
                          {m.account_identifier && <div>Identifier: {m.account_identifier}</div>}
                          {m.wallet_address && (
                            <div>
                              Wallet: {m.wallet_address}
                              {m.details_json?.network ? ` (${m.details_json.network})` : ""}
                            </div>
                          )}
                        </div>
                        {m.instructions && <div className="text-[11px] text-slate-300">{m.instructions}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Currency Exchange Rates Management */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-white">Currency Exchange Rates (USD Base)</h2>
                    <p className="text-[11px] text-slate-400">
                      Automatically updated from live FX feed or manually pinned by Owner.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshLiveFx}
                    disabled={fxSaving}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${fxSaving ? "animate-spin" : ""}`} />
                    <span>Sync Live Rates</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {fxRates
                    .filter((r) => r.currency !== "USD")
                    .map((r) => (
                      <div key={r.currency} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{r.currency}</span>
                          {r.isManualOverride && (
                            <button
                              type="button"
                              onClick={() => handleClearFxOverride(r.currency)}
                              className="text-[9px] text-amber-300 underline cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <div className="font-mono text-emerald-300 font-bold">{Number(r.rateFromUsd).toFixed(2)}</div>
                        <div className="text-[9px] text-slate-500 truncate">{r.source}</div>
                      </div>
                    ))}
                </div>

                <form onSubmit={handleSaveFxOverride} className="flex flex-wrap items-end gap-2 pt-2 border-t border-white/[0.06]">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Currency</label>
                    <select
                      value={fxEditCurrency}
                      onChange={(e) => setFxEditCurrency(e.target.value)}
                      className="rounded-lg border border-white/10 bg-[#121824] px-2.5 py-1.5 text-white"
                    >
                      {["PKR", "INR", "GBP", "EUR", "AED", "CAD", "AUD"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-[10px] text-slate-400 mb-1">Custom 1 USD Rate Override</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      required
                      value={fxEditRate}
                      onChange={(e) => setFxEditRate(e.target.value)}
                      placeholder="e.g. 278.50"
                      className="w-full rounded-lg border border-white/10 bg-[#121824] px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={fxSaving}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
                  >
                    Pin Manual Rate
                  </button>
                </form>
              </div>

              {/* Owner Support Contact Settings (Used by Other Payment Method & Support Links) */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4 text-xs">
                <div className="border-b border-white/[0.08] pb-3">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                    <span>Owner Support Contact Settings</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Used dynamically when customers click &quot;Other Payment Method &rarr; Contact the Owner&quot;. Leave WhatsApp blank to hide unconfigured links cleanly.
                  </p>
                </div>

                <form onSubmit={handleSaveSupportSettings} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-300 mb-1">Owner WhatsApp Support Number</label>
                      <input
                        type="text"
                        value={ownerWhatsapp}
                        onChange={(e) => setOwnerWhatsapp(e.target.value)}
                        placeholder="+923174383702"
                        className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-300 mb-1">Owner Support Email (Optional)</label>
                      <input
                        type="email"
                        value={ownerSupportEmail}
                        onChange={(e) => setOwnerSupportEmail(e.target.value)}
                        placeholder="support@yourdomain.com"
                        className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={savingSupport}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50"
                  >
                    {savingSupport ? "Saving..." : "Save Support Contact Settings"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CLIENT LEDGER */}
      {activeTab === "ledger" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-400" />
              <span>Client Accounts Quick Ledger</span>
            </h3>
            <span className="text-xs text-slate-400">{clients.length} Accounts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Workspace</th>
                  <th className="py-3 px-3">Plan</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {clients.map((c) => {
                  const isActive = c.status === "ACTIVE";
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3">
                        <Link href={`/app/admin/clients/${c.id}`} className="font-bold text-blue-300 hover:underline">
                          {c.username || c.full_name}
                        </Link>
                        <div className="text-[11px] text-slate-400 font-mono">{c.email}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">#{c.workspace_id}</td>
                      <td className="py-3 px-3">{c.plan_label || c.plan}</td>
                      <td className="py-3 px-3 font-mono font-bold">{c.status}</td>
                      <td className="py-3 px-3 text-right">
                        {isActive ? (
                          <button
                            onClick={() => handleSuspend(c.id, c.username || c.email)}
                            disabled={actionLoadingId === c.id}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-xs cursor-pointer"
                          >
                            <Power className="h-3.5 w-3.5 inline mr-1" /> Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(c.id, c.username || c.email)}
                            disabled={actionLoadingId === c.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-xs cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" /> Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* APPROVAL / REJECTION / MORE INFO CONFIRMATION SCREEN */}
      {reviewSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleConfirmReview}
            className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0c1017] p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-extrabold text-white">
                {reviewAction === "APPROVE"
                  ? `Confirm Approval — ${reviewSub.request_code || `#${reviewSub.id}`}`
                  : reviewAction === "REJECT"
                  ? `Reject Payment — ${reviewSub.request_code || `#${reviewSub.id}`}`
                  : `Request More Info — ${reviewSub.request_code || `#${reviewSub.id}`}`}
              </h3>
              <button type="button" onClick={() => setReviewSub(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 font-mono text-[11px] space-y-1">
              <div>
                Customer: <strong className="text-white">@{reviewSub.username}</strong> (ID #{reviewSub.user_id} • WS #{reviewSub.workspace_id})
              </div>
              <div>
                Submitted Amount: <strong className="text-emerald-300">${reviewSub.agreed_price_usd} USD</strong>
                {reviewSub.currency !== "USD" &&
                  ` (${Number(reviewSub.converted_amount ?? reviewSub.agreed_price_usd).toLocaleString()} ${reviewSub.currency})`}
                {" "}via <strong>{reviewSub.payment_method_name}</strong>
              </div>
              {reviewSub.payment_reference && <div>Receipt Ref: {reviewSub.payment_reference}</div>}
            </div>

            {reviewAction === "APPROVE" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Apply Plan To Existing Account</label>
                    <select
                      value={reviewPlan}
                      onChange={(e) => {
                        const val = e.target.value as "BASIC" | "LIFETIME" | "CUSTOM";
                        setReviewPlan(val);
                        if (val === "BASIC") setReviewPrice("25");
                        if (val === "LIFETIME") setReviewPrice("100");
                      }}
                      className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
                    >
                      <option value="BASIC">Basic Plan (30 Days • Maps Excluded)</option>
                      <option value="LIFETIME">Lifetime Access (Permanent • Maps Included)</option>
                      <option value="CUSTOM">Custom Plan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Verified Amount (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={reviewPrice}
                      onChange={(e) => setReviewPrice(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                {reviewPlan === "CUSTOM" && (
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Unit</label>
                      <select
                        value={reviewCustomUnit}
                        onChange={(e) => setReviewCustomUnit(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#121824] px-2.5 py-2 text-white"
                      >
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                        <option value="lifetime">Lifetime</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        disabled={reviewCustomUnit === "lifetime"}
                        value={reviewCustomVal}
                        onChange={(e) => setReviewCustomVal(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full rounded-xl border border-white/10 bg-[#121824] px-2.5 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">Lead Allowance</label>
                      <input
                        type="number"
                        min={1}
                        value={reviewLeadAllowance}
                        onChange={(e) => setReviewLeadAllowance(Math.max(1, parseInt(e.target.value, 10) || 50))}
                        className="w-full rounded-xl border border-white/10 bg-[#121824] px-2.5 py-2 text-white font-mono"
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reviewConfirmedFunds}
                    onChange={(e) => setReviewConfirmedFunds(e.target.checked)}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <span className="text-emerald-200 font-semibold leading-snug">
                    I confirm actual payment funds were received and verified for @{reviewSub.username}. Activate this existing customer account now.
                  </span>
                </label>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                {reviewAction === "APPROVE" ? "Approval / Audit Note (Optional)" : "Reason / Note to Customer *"}
              </label>
              <textarea
                rows={3}
                required={reviewAction !== "APPROVE"}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  reviewAction === "APPROVE"
                    ? "Verified in receiving account."
                    : "Explain clearly what is missing or why this proof was rejected."
                }
                className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={() => setReviewSub(null)} className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                disabled={reviewSubmitting}
                className={`px-5 py-2 rounded-xl font-bold text-white cursor-pointer disabled:opacity-50 ${
                  reviewAction === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : reviewAction === "REJECT"
                    ? "bg-rose-600 hover:bg-rose-500"
                    : "bg-amber-600 hover:bg-amber-500"
                }`}
              >
                {reviewSubmitting
                  ? "Verifying & Updating DB..."
                  : reviewAction === "APPROVE"
                  ? "Confirm & Activate Account"
                  : reviewAction === "REJECT"
                  ? "Confirm Rejection (Keep Plan Unchanged)"
                  : "Send More Info Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Authenticated Proof Modal Viewer */}
      {viewerUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-[#0c1017] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-white font-mono">{viewerTitle}</span>
              <button
                onClick={() => {
                  URL.revokeObjectURL(viewerUrl);
                  setViewerUrl(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-black/40 rounded-xl p-2">
              {viewerMime === "application/pdf" ? (
                <iframe src={viewerUrl} title={viewerTitle} className="w-full h-[70vh] rounded-lg" />
              ) : (
                <img src={viewerUrl} alt={viewerTitle} className="max-h-[70vh] object-contain rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
