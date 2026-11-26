"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ClientAccount } from "@/lib/types";
import {
  Receipt,
  CheckCircle2,
  AlertTriangle,
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
  ShieldCheck,
  XCircle,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

const METHOD_PRESETS = [
  { name: "Payoneer", region: "Worldwide", currency: "USD" },
  { name: "Binance", region: "Worldwide (Crypto)", currency: "USDT" },
  { name: "Trust Wallet", region: "Worldwide (Crypto)", currency: "USDT" },
  { name: "JazzCash", region: "Pakistan", currency: "PKR" },
  { name: "Easypaisa", region: "Pakistan", currency: "PKR" },
  { name: "Meezan Bank", region: "Pakistan / SWIFT", currency: "PKR" },
  { name: "NayaPay", region: "Pakistan", currency: "PKR" },
  { name: "International Bank Transfer", region: "Worldwide", currency: "USD" },
];

export default function AdminPaymentsPage() {
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"submissions" | "methods" | "ledger">("submissions");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Proof screenshot viewer modal
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerMime, setViewerMime] = useState<string>("image/png");
  const [viewerTitle, setViewerTitle] = useState<string>("");

  // Review / Approve / Reject / More Info Modal
  const [reviewSub, setReviewSub] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT" | "MORE_INFO_REQUIRED">("APPROVE");
  const [reviewPlan, setReviewPlan] = useState<"BASIC" | "LIFETIME" | "CUSTOM">("BASIC");
  const [reviewPrice, setReviewPrice] = useState<string>("25");
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [reviewCustomDays, setReviewCustomDays] = useState<number>(30);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Payment Method Editor Form
  const [methodForm, setMethodForm] = useState<any>({
    id: undefined,
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
  });
  const [savingMethod, setSavingMethod] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [clientsRes, subsRes, methRes] = await Promise.all([
        api.get<any>("/admin/clients").catch(() => null),
        api.get<any>("/admin/payments/submissions").catch(() => null),
        api.get<any>("/admin/payments/methods").catch(() => null),
      ]);
      const list = Array.isArray(clientsRes) ? clientsRes : clientsRes?.clients || [];
      setClients(list);
      setSubmissions(Array.isArray(subsRes?.submissions) ? subsRes.submissions : []);
      setMethods(Array.isArray(methRes?.methods) ? methRes.methods : []);
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
      setViewerTitle(`Submission #${sub.id} — ${sub.username} (${sub.screenshot_filename})`);
      setViewerUrl(objUrl);
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to open screenshot.", type: "error" });
    }
  };

  const openReviewModal = (sub: any, mode: "APPROVE" | "REJECT" | "MORE_INFO_REQUIRED") => {
    setReviewSub(sub);
    setReviewAction(mode);
    const reqP = String(sub.requested_plan || "BASIC").toUpperCase();
    setReviewPlan(reqP === "LIFETIME" ? "LIFETIME" : reqP === "CUSTOM" ? "CUSTOM" : "BASIC");
    setReviewPrice(String(sub.agreed_price_usd ?? (reqP === "LIFETIME" ? 100 : 25)));
    setReviewNotes(sub.admin_notes || "");
    setReviewCustomDays(Number(sub.custom_duration_value) || 30);
  };

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewSub) return;
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
          payload.duration_value = reviewCustomDays;
          payload.duration_unit = reviewSub.custom_duration_unit || "days";
        }
      }
      const res = await api.post<any>(`/admin/payments/submissions/${reviewSub.id}`, payload);
      setMsg({
        text: res?.message || `Payment submission #${reviewSub.id} updated.`,
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

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMethod(true);
    setMsg(null);
    try {
      const res = await api.post<any>("/admin/payments/methods", methodForm);
      setMsg({
        text: `Payment method '${res?.method?.name || methodForm.name}' saved & verified.`,
        type: "success",
      });
      setMethodForm({
        id: undefined,
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
      });
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
              Payments &amp; Verification
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Manual Payment Review &amp; Methods</h1>
          <p className="text-xs text-slate-400">
            Configure worldwide receiving methods, inspect customer screenshots privately, and approve payments onto existing accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/[0.03] border border-white/10 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <a
            href="https://wa.me/923174383702"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow-sm transition-all cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Support WhatsApp (+923174383702)</span>
          </a>
        </div>
      </div>

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
            activeTab === "submissions" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Payment Submissions ({submissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("methods")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
            activeTab === "methods" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Payment Methods Settings ({methods.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
            activeTab === "ledger" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Client Status Ledger ({clients.length})</span>
        </button>
      </div>

      {/* TAB 1: PAYMENT SUBMISSIONS */}
      {activeTab === "submissions" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Payment Submissions</h2>
              <p className="text-[11px] text-slate-400">
                Inspect screenshot proof in your receiving account before approving. Approving updates the exact existing customer account and preserves workspace data.
              </p>
            </div>
          </div>

          {submissions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No payment proof submissions received yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-2.5">Customer &amp; IDs</th>
                    <th className="py-2.5 px-2.5">Requested Plan &amp; Price</th>
                    <th className="py-2.5 px-2.5">Method &amp; Ref</th>
                    <th className="py-2.5 px-2.5">Current Subscription</th>
                    <th className="py-2.5 px-2.5">Submitted</th>
                    <th className="py-2.5 px-2.5">Status</th>
                    <th className="py-2.5 px-2.5 text-right">Owner Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {submissions.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-2.5">
                        <div className="font-bold text-white font-mono">
                          #{s.id} • {s.username}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          User #{s.user_id} • WS #{s.workspace_id}
                        </div>
                        <div className="text-[10px] text-slate-500">{s.email}</div>
                      </td>

                      <td className="py-3 px-2.5">
                        <div className="font-bold text-blue-300">{s.requested_plan}</div>
                        <div className="font-mono font-bold text-emerald-300">
                          {s.agreed_price_usd} {s.currency}
                        </div>
                      </td>

                      <td className="py-3 px-2.5">
                        <div className="font-semibold text-white">{s.payment_method_name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Ref: {s.payment_reference || "—"}
                        </div>
                        {s.customer_note && (
                          <div className="text-[10px] text-slate-400 max-w-xs truncate" title={s.customer_note}>
                            {s.customer_note}
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
                            <span>Screenshot</span>
                          </button>
                          <Link
                            href={`/app/admin/clients/${s.user_id}`}
                            className="px-2 py-1 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-semibold inline-flex items-center gap-1"
                          >
                            <span>Details</span>
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

      {/* TAB 2: OWNER PAYMENT SETTINGS */}
      {activeTab === "methods" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form */}
          <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-400" />
              <span>{methodForm.id ? "Edit Payment Method" : "Add Payment Method"}</span>
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
                    }))
                  }
                  className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[10px] text-slate-300 cursor-pointer"
                >
                  + {p.name}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveMethod} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Payment Method Name *</label>
                <input
                  type="text"
                  required
                  value={methodForm.name}
                  onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })}
                  placeholder="e.g. Payoneer / Meezan Bank / JazzCash"
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Region / Availability *</label>
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

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={methodForm.account_holder_name || ""}
                  onChange={(e) => setMethodForm({ ...methodForm, account_holder_name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Account ID / IBAN / Mobile Number</label>
                <input
                  type="text"
                  value={methodForm.account_identifier || ""}
                  onChange={(e) => setMethodForm({ ...methodForm, account_identifier: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Wallet Address (Binance / Trust Wallet)</label>
                <input
                  type="text"
                  value={methodForm.wallet_address || ""}
                  onChange={(e) => setMethodForm({ ...methodForm, wallet_address: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Payment Link (Optional https://...)</label>
                <input
                  type="url"
                  value={methodForm.payment_link || ""}
                  onChange={(e) => setMethodForm({ ...methodForm, payment_link: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">QR Code Image (Optional, PNG/JPG/WebP &lt; 512KB)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleQrFileSelect(e.target.files?.[0])}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-1.5 text-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Customer Instructions</label>
                <textarea
                  rows={2}
                  value={methodForm.instructions || ""}
                  onChange={(e) => setMethodForm({ ...methodForm, instructions: e.target.value })}
                  placeholder="Include your Lead Scraper username in transfer reference and upload screenshot."
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
                  {savingMethod ? "Saving..." : methodForm.id ? "Update Method" : "Save Payment Method"}
                </button>
                {methodForm.id && (
                  <button
                    type="button"
                    onClick={() =>
                      setMethodForm({
                        id: undefined,
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
                      })
                    }
                    className="px-3 py-2 rounded-xl bg-white/[0.04] text-slate-300 cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Configured Methods List */}
          <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
            <h2 className="text-sm font-bold text-white">Configured Payment Methods</h2>
            {methods.length === 0 ? (
              <p className="text-xs text-slate-500">
                No payment methods added yet. Use the form on the left to add Payoneer, Binance, Trust Wallet, JazzCash, Easypaisa, Meezan Bank, NayaPay, or another verified bank method.
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
                          onClick={() => setMethodForm(m)}
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
                      {m.account_holder_name && <div>Holder: {m.account_holder_name}</div>}
                      {m.account_identifier && <div>Account/IBAN: {m.account_identifier}</div>}
                      {m.wallet_address && <div>Wallet: {m.wallet_address}</div>}
                      {m.payment_link && <div>Link: {m.payment_link}</div>}
                    </div>
                    {m.instructions && <div className="text-[11px] text-slate-300">{m.instructions}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EXISTING CLIENT QUICK STATUS LEDGER */}
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
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
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

      {/* Review Payment Submission Modal */}
      {reviewSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form onSubmit={handleConfirmReview} className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0c1017] p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">
                {reviewAction === "APPROVE"
                  ? `Approve Payment #${reviewSub.id}`
                  : reviewAction === "REJECT"
                  ? `Reject Payment #${reviewSub.id}`
                  : `Request More Info (#${reviewSub.id})`}
              </h3>
              <button type="button" onClick={() => setReviewSub(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] font-mono space-y-1 text-[11px]">
              <div>
                Existing Customer: <strong className="text-white">{reviewSub.username}</strong> (ID #{reviewSub.user_id} • WS #{reviewSub.workspace_id})
              </div>
              <div>
                Submitted Amount: <strong className="text-emerald-300">{reviewSub.agreed_price_usd} {reviewSub.currency}</strong> via {reviewSub.payment_method_name}
              </div>
            </div>

            {reviewAction === "APPROVE" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Assign Plan *</label>
                    <select
                      value={reviewPlan}
                      onChange={(e) => setReviewPlan(e.target.value as any)}
                      className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
                    >
                      <option value="BASIC">Basic Plan (30 Days)</option>
                      <option value="LIFETIME">Lifetime Access (Permanent + Maps)</option>
                      <option value="CUSTOM">Custom Plan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Verified Price ({reviewSub.currency})</label>
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
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Custom Duration (Days)</label>
                    <input
                      type="number"
                      min={1}
                      value={reviewCustomDays}
                      onChange={(e) => setReviewCustomDays(Math.max(1, parseInt(e.target.value, 10) || 30))}
                      className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                {reviewAction === "APPROVE" ? "Approval / Internal Notes (Optional)" : "Reason / Message to Customer *"}
              </label>
              <textarea
                rows={3}
                required={reviewAction !== "APPROVE"}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  reviewAction === "APPROVE"
                    ? "Verified in receiving account."
                    : "Explain what detail or transaction proof is missing."
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
                  ? "Processing..."
                  : reviewAction === "APPROVE"
                  ? "Confirm Approval & Update Account"
                  : reviewAction === "REJECT"
                  ? "Confirm Rejection"
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
