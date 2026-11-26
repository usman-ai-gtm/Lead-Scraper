"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  Lock,
  Sparkles,
  Database,
  Search,
  Mail,
  Upload,
  Copy,
  Check,
  FileText,
  Clock,
  Eye,
  X,
  Send,
} from "lucide-react";

interface PaymentMethodItem {
  id: number;
  name: string;
  region: string;
  currency: string;
  account_holder_name: string | null;
  account_identifier: string | null;
  wallet_address: string | null;
  payment_link: string | null;
  qr_image_data: string | null;
  instructions: string | null;
  is_active: boolean;
}

interface PaymentSubmissionItem {
  id: number;
  user_id: number;
  workspace_id: number;
  username: string;
  email: string;
  requested_plan: string;
  plan_label?: string;
  agreed_price_usd: number;
  currency: string;
  payment_method_name: string;
  payment_reference?: string;
  customer_note?: string;
  screenshot_filename: string;
  screenshot_mime: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "MORE_INFO_REQUIRED";
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

function formatCountdown(expiresAt?: string | null, isLifetime?: boolean, tickMs?: number): string {
  if (isLifetime) return "Permanent — No Expiry";
  if (!expiresAt) return "No expiry set";
  const expMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expMs)) return "Invalid date";
  const diff = expMs - (tickMs || Date.now());
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1000);
  return `${days}d ${hours}h ${mins}m ${secs}s left`;
}

export default function SubscriptionPage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    leads_count: 0,
    searches_count: 0,
    connected_accounts: 0,
    max_leads: 5000,
  });

  // Payment config & submissions
  const [supportEmail, setSupportEmail] = useState<string | null>(null);
  const [supportEmailConfigured, setSupportEmailConfigured] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("+923174383702");
  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [submissions, setSubmissions] = useState<PaymentSubmissionItem[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Payment proof upload form state
  const [selectedPlan, setSelectedPlan] = useState<"BASIC" | "LIFETIME" | "CUSTOM">("BASIC");
  const [agreedPrice, setAgreedPrice] = useState<string>("25");
  const [currency, setCurrency] = useState<string>("USD");
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [manualMethodName, setManualMethodName] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [customerNote, setCustomerNote] = useState<string>("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<PaymentSubmissionItem | null>(null);

  // Secure proof modal viewer (authenticated blob)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerMime, setViewerMime] = useState<string>("image/png");
  const [viewerTitle, setViewerTitle] = useState<string>("");

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const [meRes, metricsRes, payCfgRes, subsRes] = await Promise.all([
        api.get<any>("/auth/me").catch(() => null),
        api.get<any>("/workspace/metrics").catch(() => null),
        api.get<any>("/payments/config").catch(() => null),
        api.get<any>("/payments/submissions").catch(() => null),
      ]);
      if (meRes) setProfile(meRes);
      if (metricsRes) {
        setStats({
          leads_count: metricsRes.saved_leads ?? metricsRes.total_leads_found ?? 0,
          searches_count: metricsRes.total_leads_found ?? 0,
          connected_accounts: metricsRes.connected_gmail_accounts ?? 0,
          max_leads: metricsRes.max_quota ?? 5000,
        });
      }
      if (payCfgRes) {
        setSupportEmail(payCfgRes.support_email || null);
        setSupportEmailConfigured(Boolean(payCfgRes.support_email_configured && payCfgRes.support_email));
        if (payCfgRes.whatsapp_number) setWhatsappNumber(payCfgRes.whatsapp_number);
        const list = Array.isArray(payCfgRes.methods) ? payCfgRes.methods : [];
        setMethods(list);
        if (list.length > 0 && !selectedMethodId) {
          setSelectedMethodId(String(list[0].id));
          setCurrency(list[0].currency || "USD");
        }
      }
      if (subsRes && Array.isArray(subsRes.submissions)) {
        setSubmissions(subsRes.submissions);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (user?.id) {
      void loadSubscriptionData();
    }
  }, [
    user?.id,
    user?.workspace_id,
    user?.plan,
    user?.plan_label,
    user?.status,
    user?.google_maps_enabled,
    user?.daily_email_limit,
    user?.subscription_expires_at,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  const liveProfile = user ? { ...profile, ...user } : profile;
  const currentStatus = liveProfile?.status || "LOCKED";
  const isLocked =
    currentStatus === "LOCKED" ||
    currentStatus === "PENDING" ||
    currentStatus === "SUSPENDED" ||
    currentStatus === "REVOKED";
  const isExpired = currentStatus === "EXPIRED";
  const isActive = currentStatus === "ACTIVE";
  const planTypeUpper = String(liveProfile?.plan_type || liveProfile?.plan || "").toUpperCase();
  const isLifetime =
    planTypeUpper === "LIFETIME" ||
    planTypeUpper === "OWNER_LIFETIME" ||
    (planTypeUpper === "CUSTOM" && String(liveProfile?.custom_duration_unit || "").toLowerCase() === "lifetime");
  const isCustom = planTypeUpper === "CUSTOM";

  const displayUsername = String((liveProfile as any)?.username || liveProfile?.email || "customer");
  const displayEmail = String(liveProfile?.email || displayUsername);
  const displayCurrentPlan = String(
    liveProfile?.plan_label ||
      (isCustom ? "Custom Plan" : isLifetime ? "Lifetime Plan ($100)" : isActive ? "Basic Plan ($25 / 30 Days)" : "Free Preview / Inactive")
  );
  const waDigits = whatsappNumber.replace(/[^0-9]/g, "") || "923174383702";

  const WHATSAPP_LINK = `https://wa.me/${waDigits}?text=${encodeURIComponent(
    `Hello Usman, I need help with my Lead Scraper subscription.\nMy registered username: ${displayUsername}\nMy registered email: ${displayEmail}\nMy current subscription: ${displayCurrentPlan}`
  )}`;

  const supportMailtoHref =
    supportEmailConfigured && supportEmail
      ? `mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent(
          "Lead Scraper — Subscription Support"
        )}&body=${encodeURIComponent(
          `Hello Usman,\n\nI need help with my Lead Scraper subscription.\n\nMy registered username: ${displayUsername}\n\nMy registered email: ${displayEmail}\n\nMy current subscription: ${displayCurrentPlan}\n\nPlease contact me regarding subscription activation or payment.\n\nThank you.`
        )}`
      : null;

  const copyValue = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handlePlanSelect = (plan: "BASIC" | "LIFETIME" | "CUSTOM") => {
    setSelectedPlan(plan);
    if (plan === "BASIC") setAgreedPrice("25");
    else if (plan === "LIFETIME") setAgreedPrice("100");
    document.getElementById("payment-proof-upload")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    if (!proofFile) {
      setUploadError("Please select a payment screenshot or PDF receipt (JPG, JPEG, PNG, WebP, or PDF).");
      return;
    }
    const activeMethod = methods.find((m) => String(m.id) === selectedMethodId);
    const methodName = activeMethod ? activeMethod.name : manualMethodName.trim();
    if (!methodName) {
      setUploadError("Please select an active payment method or specify the payment method used.");
      return;
    }

    setSubmittingProof(true);
    try {
      const formData = new FormData();
      formData.append("file", proofFile);
      formData.append("requested_plan", selectedPlan);
      formData.append("agreed_price_usd", agreedPrice || "25");
      formData.append("currency", currency || "USD");
      if (activeMethod) formData.append("payment_method_id", String(activeMethod.id));
      formData.append("payment_method_name", methodName);
      if (paymentReference.trim()) formData.append("payment_reference", paymentReference.trim());
      if (customerNote.trim()) formData.append("customer_note", customerNote.trim());

      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch("/api/payments/submissions", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to upload payment proof.");
      }

      setLastSubmitted(data.submission);
      setProofFile(null);
      setPaymentReference("");
      setCustomerNote("");
      await loadSubscriptionData();
      void refreshUser();
    } catch (err: any) {
      setUploadError(err?.message || "Payment proof upload failed.");
    } finally {
      setSubmittingProof(false);
    }
  };

  const openProofViewer = async (sub: PaymentSubmissionItem) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch(`/api/payments/submissions/${sub.id}/proof`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail || "Could not load payment proof.");
      }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      setViewerMime(sub.screenshot_mime || blob.type || "image/png");
      setViewerTitle(`Payment Proof #${sub.id} (${sub.screenshot_filename})`);
      setViewerUrl(objUrl);
    } catch (err: any) {
      setUploadError(err?.message || "Failed to preview proof.");
    }
  };

  const closeProofViewer = () => {
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    setViewerUrl(null);
  };

  const buildProofWhatsAppUrl = (sub: PaymentSubmissionItem) => {
    const msg =
      `Hello Usman, I uploaded payment proof #${sub.id}.\n` +
      `Username: ${sub.username}\n` +
      `Registered Email: ${sub.email}\n` +
      `Selected Plan: ${sub.requested_plan}\n` +
      `Agreed Price: ${sub.agreed_price_usd} ${sub.currency}\n` +
      `Payment Method: ${sub.payment_method_name}\n` +
      `Payment Reference: ${sub.payment_reference || "Provided in screenshot"}\n` +
      `Proof Reference: #SUB-${sub.id} (${sub.screenshot_filename})\n\n` +
      `(Attaching my payment screenshot in this chat now)`;
    return `https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`;
  };

  const buildProofMailtoUrl = (sub: PaymentSubmissionItem) => {
    if (!supportEmailConfigured || !supportEmail) return null;
    const body =
      `Hello Usman,\n\nI have submitted a payment proof for my Lead Scraper subscription.\n\n` +
      `Customer username: ${sub.username}\n` +
      `Registered email: ${sub.email}\n` +
      `Selected plan: ${sub.requested_plan}\n` +
      `Agreed price: ${sub.agreed_price_usd} ${sub.currency}\n` +
      `Payment reference: ${sub.payment_reference || "See attached screenshot"}\n` +
      `Payment submission date: ${new Date(sub.created_at).toUTCString()}\n` +
      `Submission ID: #${sub.id}\n\n` +
      `Note: I am attaching my payment screenshot manually to this email.\n\nThank you.`;
    return `mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent(
      "Lead Scraper — Payment Proof"
    )}&body=${encodeURIComponent(body)}`;
  };

  const liveCountdownText = formatCountdown(liveProfile?.subscription_expires_at, isLifetime, nowTick);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
              Workspace Billing &amp; Quota
            </span>
            <span className="text-xs text-slate-400 font-mono">
              User: {displayUsername} • Workspace #{user?.workspace_id || 1}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Subscription &amp; Payment Center</h1>
          <p className="text-xs text-slate-400">
            View your live subscription timer, contact support, review Owner-configured payment details, and upload payment proof for verification.
          </p>
        </div>

        <button
          onClick={() => {
            void refreshUser();
            void loadSubscriptionData();
          }}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
          <span>Sync Status</span>
        </button>
      </div>

      {/* 2. Current Subscription, Account Status, Expiry Date & Remaining Time */}
      <div
        className={`rounded-2xl border p-6 ${
          isActive
            ? "border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-[#0e1628] to-[#090d16]"
            : isExpired
            ? "border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-[#0e1628] to-[#090d16]"
            : "border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#0e1628] to-[#090d16]"
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-2 flex items-start gap-3.5">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-400"
                  : isExpired
                  ? "bg-rose-500/20 text-rose-400"
                  : "bg-amber-500/20 text-amber-400"
              }`}
            >
              {isActive ? <ShieldCheck className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
            </div>
            <div className="space-y-1">
              <div className="text-[11px] text-slate-400">1. Current Subscription</div>
              <div className="text-base font-black text-white">{displayCurrentPlan}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-slate-400">2. Account Status:</span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    isActive
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : isExpired
                      ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                      : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                  }`}
                >
                  {currentStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-1">
            <div className="text-[10px] uppercase font-semibold text-slate-400">3. Expiry Date (UTC)</div>
            <div className="text-xs font-mono font-bold text-white">
              {isLifetime
                ? "Never / Permanent"
                : liveProfile?.subscription_expires_at
                ? new Date(liveProfile.subscription_expires_at).toUTCString()
                : "Not active"}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-1">
            <div className="text-[10px] uppercase font-semibold text-slate-400">4. Remaining Time</div>
            <div
              className={`text-xs font-mono font-extrabold ${
                isLifetime ? "text-amber-300" : isActive && !isExpired ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {isActive || isLifetime ? liveCountdownText : currentStatus}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 mt-4 pt-3 border-t border-white/[0.06]">
          {isActive
            ? `Google Maps: ${(liveProfile?.google_maps_enabled || isLifetime) ? "Included" : "Excluded"} • Daily Cold Email Limit: ${liveProfile?.daily_email_limit ?? (isLifetime ? 500 : 10)}/day (UTC).`
            : isExpired
            ? "Your subscription has expired. Paid search and outreach features are locked until you renew with the Owner."
            : "Account currently in locked/preview mode. Use the manual payment instructions and upload proof below, or contact Owner support."}
        </p>
      </div>

      {/* Usage & Quota Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Saved Leads</span>
            <Database className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats.leads_count} <span className="text-xs font-normal text-slate-500">/ 5,000</span>
          </div>
          <div className="text-[10px] text-slate-400">Workspace #{user?.workspace_id || 1}</div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Lead Searches</span>
            <Search className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats.searches_count} <span className="text-xs font-normal text-emerald-400">Active</span>
          </div>
          <div className="text-[10px] text-slate-400">Multi-country B2B discovery</div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Connected Gmail</span>
            <CreditCard className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.connected_accounts}</div>
          <div className="text-[10px] text-slate-400">Per-workspace OAuth isolation</div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Daily Email Allowance</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {liveProfile?.daily_email_limit ?? (isLifetime ? 500 : 10)} / day
          </div>
          <div className="text-[10px] text-slate-400">Reset daily at 00:00 UTC</div>
        </div>
      </div>

      {/* 5. Upgrade / Renew Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isActive && !isLifetime && !isCustom
              ? "border-blue-500/50 bg-[#0e1628]"
              : "border-white/[0.08] bg-[#0c1017]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">30 Days</span>
            <span className="text-xl font-extrabold text-white">$25</span>
          </div>
          <h3 className="text-sm font-bold text-white mb-2">Basic Plan</h3>
          <ul className="space-y-1 text-[11px] text-slate-300 mb-4">
            <li>• Find Leads + Saved Leads + Search History</li>
            <li>• XLSX &amp; PDF Exports + AI Assistant</li>
            <li>• 10 cold emails/UTC day (Maps excluded)</li>
          </ul>
          <button
            type="button"
            onClick={() => handlePlanSelect("BASIC")}
            className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
          >
            Select Basic ($25) for Payment
          </button>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-all ${
            isLifetime && !isCustom
              ? "border-amber-500/60 bg-[#191508]"
              : "border-amber-500/30 bg-gradient-to-b from-[#14120a] to-[#0c1017]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">One-Time</span>
            <span className="text-xl font-extrabold text-amber-300">$100</span>
          </div>
          <h3 className="text-sm font-bold text-amber-200 mb-2">Lifetime Access Plan</h3>
          <ul className="space-y-1 text-[11px] text-slate-300 mb-4">
            <li>• Everything in Basic with NO expiry</li>
            <li>• Google Maps + AI Lead Research included</li>
            <li>• Up to 500 cold emails/UTC day</li>
          </ul>
          <button
            type="button"
            onClick={() => handlePlanSelect("LIFETIME")}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-bold text-xs cursor-pointer"
          >
            Select Lifetime ($100) for Payment
          </button>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-all ${
            isCustom ? "border-purple-500/50 bg-[#140e24]" : "border-white/[0.08] bg-[#0c1017]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Negotiated Deal</span>
            <span className="text-sm font-extrabold text-purple-300">Custom Price</span>
          </div>
          <h3 className="text-sm font-bold text-white mb-2">Custom Subscription</h3>
          <ul className="space-y-1 text-[11px] text-slate-300 mb-4">
            <li>• Final price &amp; modules agreed directly with Owner</li>
            <li>• Custom hours / days / months / lifetime duration</li>
            <li>• Enter your agreed amount below</li>
          </ul>
          <button
            type="button"
            onClick={() => handlePlanSelect("CUSTOM")}
            className="w-full py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 font-bold text-xs cursor-pointer"
          >
            Submit Custom Deal Proof
          </button>
        </div>
      </div>

      {/* 6 & 7. Need Help or Want to Subscribe? (WhatsApp Support + Support via Email) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Need help or want to subscribe?</h3>
          </div>
          <span className="text-xs font-mono text-emerald-400">{whatsappNumber}</span>
        </div>

        <p className="text-xs text-slate-400">
          Payments are manually negotiated and verified by the Owner so you get the exact agreed deal for your workspace (<strong className="text-slate-200">{displayUsername}</strong>). Contact us via WhatsApp or Email below.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp Support ({whatsappNumber})</span>
          </a>

          {supportMailtoHref ? (
            <a
              href={supportMailtoHref}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Mail className="h-4 w-4" />
              <span>Support via Email</span>
            </a>
          ) : (
            <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <span>
                Support via Email is waiting on server <code className="font-mono text-amber-200">OWNER_SUPPORT_EMAIL</code> configuration — please use WhatsApp above.
              </span>
            </div>
          )}

          <Link
            href="/pricing"
            className="px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 font-semibold text-xs border border-white/10 inline-flex items-center gap-1.5"
          >
            <span>Full Plan Overview</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* 8. Available Configured Payment Methods */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/[0.06] pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-400" />
              <span>Official Payment Methods</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Only active payment methods verified and configured by the Owner are displayed below.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">{methods.length} Active Method(s)</span>
        </div>

        {methods.length === 0 ? (
          <div className="p-5 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-xs text-slate-300 space-y-2">
            <div className="font-bold text-white">No payment receiving details are currently published here.</div>
            <p className="text-slate-400">
              To avoid outdated transfer details, contact the Owner via WhatsApp ({whatsappNumber}) or Support via Email to confirm today&apos;s receiving account (Payoneer, Binance, Trust Wallet, JazzCash, Easypaisa, Meezan Bank, NayaPay, or bank transfer) and agreed price before transferring.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {methods.map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  setSelectedMethodId(String(m.id));
                  setCurrency(m.currency || "USD");
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2.5 text-xs ${
                  selectedMethodId === String(m.id)
                    ? "border-blue-500/60 bg-blue-500/[0.06]"
                    : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-white text-sm">{m.name}</div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-white/[0.05] text-slate-300 border border-white/10">{m.region}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                      {m.currency}
                    </span>
                  </div>
                </div>

                {m.account_holder_name && (
                  <div className="text-[11px] text-slate-300">
                    <span className="text-slate-500">Account Holder:</span>{" "}
                    <strong className="text-white">{m.account_holder_name}</strong>
                  </div>
                )}

                {m.account_identifier && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/40 border border-white/[0.05] font-mono text-[11px]">
                    <span className="truncate text-blue-200">{m.account_identifier}</span>
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        copyValue(m.account_identifier!, `acc-${m.id}`);
                      }}
                      className="text-slate-400 hover:text-white shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === `acc-${m.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                )}

                {m.wallet_address && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/40 border border-white/[0.05] font-mono text-[11px]">
                    <span className="truncate text-amber-200">{m.wallet_address}</span>
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        copyValue(m.wallet_address!, `wal-${m.id}`);
                      }}
                      className="text-slate-400 hover:text-white shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === `wal-${m.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                )}

                {m.payment_link && (
                  <a
                    href={m.payment_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(ev) => ev.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:underline"
                  >
                    <span>Open Payment Link</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {m.qr_image_data && (
                  <div className="pt-1">
                    <img src={m.qr_image_data} alt={`${m.name} QR`} className="h-28 w-28 rounded-lg border border-white/10 bg-white p-1 object-contain" />
                  </div>
                )}

                {m.instructions && <p className="text-[11px] text-slate-400 leading-relaxed">{m.instructions}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 9. Payment Proof Upload Section */}
      <div id="payment-proof-upload" className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-5">
        <div className="border-b border-white/[0.06] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Upload className="h-4 w-4 text-emerald-400" />
            <span>Submit Payment Proof for Owner Verification</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Uploading your screenshot sends your payment proof directly to the Owner Dashboard. Subscriptions are activated only after Owner verification.
          </p>
        </div>

        {/* Account identity confirmation strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 block">Account Username</span>
            <strong className="text-white">{displayUsername}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 block">Registered Email</span>
            <strong className="text-white break-all">{displayEmail}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="text-[10px] text-slate-400 block">Selected Plan &amp; Price</span>
            <strong className="text-emerald-300">
              {selectedPlan} • {agreedPrice || "0"} {currency}
            </strong>
          </div>
        </div>

        {uploadError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
            <button onClick={() => setUploadError(null)} className="text-xs underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {lastSubmitted && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Payment proof submitted successfully. Awaiting Owner verification.</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Submission <strong>#{lastSubmitted.id}</strong> ({lastSubmitted.agreed_price_usd} {lastSubmitted.currency} via {lastSubmitted.payment_method_name}) has been recorded securely in the Owner Dashboard.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <a
                href={buildProofWhatsAppUrl(lastSubmitted)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Send via WhatsApp</span>
              </a>

              {buildProofMailtoUrl(lastSubmitted) ? (
                <a
                  href={buildProofMailtoUrl(lastSubmitted)!}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Send via Email</span>
                </a>
              ) : (
                <span className="text-[11px] text-amber-300 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-amber-500/25">
                  Send via Email unavailable (OWNER_SUPPORT_EMAIL env not set)
                </span>
              )}

              <span className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-bold text-xs inline-flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5" />
                <span>Submitted to Owner (#{lastSubmitted.id})</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Note: WhatsApp Web and mailto email links cannot attach screenshot files automatically — if you notify via WhatsApp or Email, please attach your screenshot manually in your message.
            </p>
          </div>
        )}

        <form onSubmit={handleUploadProof} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Selected Plan *</label>
              <select
                value={selectedPlan}
                onChange={(e) => handlePlanSelect(e.target.value as "BASIC" | "LIFETIME" | "CUSTOM")}
                className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white"
              >
                <option value="BASIC">Basic ($25 / 30 Days)</option>
                <option value="LIFETIME">Lifetime ($100 One-Time)</option>
                <option value="CUSTOM">Custom Agreed Plan</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Final Agreed Price *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={agreedPrice}
                onChange={(e) => setAgreedPrice(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Currency *</label>
              <input
                type="text"
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="USD / PKR / USDT"
                className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Payment Method Used *</label>
              {methods.length > 0 ? (
                <select
                  value={selectedMethodId}
                  onChange={(e) => {
                    setSelectedMethodId(e.target.value);
                    const found = methods.find((m) => String(m.id) === e.target.value);
                    if (found?.currency) setCurrency(found.currency);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white"
                >
                  {methods.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.name} ({m.currency})
                    </option>
                  ))}
                  <option value="">Other (Agreed with Owner)</option>
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={manualMethodName}
                  onChange={(e) => setManualMethodName(e.target.value)}
                  placeholder="e.g. Payoneer / Meezan / JazzCash"
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white"
                />
              )}
            </div>
          </div>

          {methods.length > 0 && !selectedMethodId && (
            <div className="text-xs">
              <label className="block font-semibold text-slate-300 mb-1">Specify Agreed Payment Method *</label>
              <input
                type="text"
                required
                value={manualMethodName}
                onChange={(e) => setManualMethodName(e.target.value)}
                placeholder="e.g. Bank Transfer / Payoneer"
                className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Transaction / Payment Reference</label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. TRX-8924103 or Last 4 digits"
                className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Payment Screenshot / PDF Receipt * <span className="text-slate-500 font-normal">(JPG, JPEG, PNG, WebP, PDF • max 5MB)</span>
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                required
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-1.5 text-xs text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white cursor-pointer"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-300 mb-1">Notes for Owner (Optional)</label>
            <input
              type="text"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="e.g. Agreed $20 discount on WhatsApp / Custom 7-day Maps bundle"
              className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            disabled={submittingProof}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-glow-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submittingProof ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Uploading Payment Proof...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Upload Payment Proof (Submit to Owner)</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* 10. Payment Submission Status */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-400" />
            <span>Your Payment Submission Status</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">{submissions.length} Submission(s)</span>
        </div>

        {submissions.length === 0 ? (
          <p className="text-xs text-slate-500">You have not uploaded any payment proofs yet.</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-white">#{s.id}</span>
                    <span className="font-bold text-blue-300">{s.requested_plan}</span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {s.agreed_price_usd} {s.currency}
                    </span>
                    <span className="text-slate-400">via {s.payment_method_name}</span>
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
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Submitted: {new Date(s.created_at).toLocaleString()}
                    {s.payment_reference ? ` • Ref: ${s.payment_reference}` : ""}
                  </div>
                  {s.admin_notes && (
                    <div className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                      <strong>Owner Note:</strong> {s.admin_notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openProofViewer(s)}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Screenshot</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Secure Authenticated Screenshot Modal */}
      {viewerUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-[#0c1017] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-white font-mono">{viewerTitle}</span>
              <button onClick={closeProofViewer} className="text-slate-400 hover:text-white cursor-pointer">
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
