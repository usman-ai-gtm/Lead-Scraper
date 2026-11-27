"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Landmark,
  Info,
  ArrowDown,
  Wallet,
  Globe,
} from "lucide-react";
import { CustomPlanBuilder, PlanSelectionValue } from "@/components/payments/CustomPlanBuilder";
import { BuilderDurationUnit, FixedOrCustomPlan } from "@/lib/custom-plans";
import { doesMethodSupportCurrency, findCurrencyMeta } from "@/lib/currencies-iso4217";

interface BankTransferDetails {
  method_type?: "mobile_wallet" | "bank_transfer" | "crypto" | "payoneer" | "custom" | null;
  display_title?: string | null;
  bank_name?: string | null;
  bank_address?: string | null;
  beneficiary_name?: string | null;
  receiving_number?: string | null;
  account_number?: string | null;
  iban?: string | null;
  branch_info?: string | null;
  routing_aba?: string | null;
  swift_bic?: string | null;
  account_type?: string | null;
  supported_currency?: string | null;
  network?: string | null;
  warning_text?: string | null;
  payment_email?: string | null;
}

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
  details_json?: BankTransferDetails | null;
  is_active: boolean;
}

interface PaymentSubmissionItem {
  id: number;
  request_code?: string;
  user_id: number;
  workspace_id: number;
  username: string;
  email: string;
  requested_plan: string;
  plan_label?: string;
  agreed_price_usd: number;
  original_price_usd?: number;
  currency: string;
  exchange_rate?: number;
  converted_amount?: number;
  lead_allowance?: number | null;
  custom_duration_value?: number | null;
  custom_duration_unit?: string | null;
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
  if (!expiresAt) return "No active expiry set";
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

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function SubscriptionPageInner() {
  const { user, refreshUser } = useAuth();
  const searchParams = useSearchParams();

  const paymentStepRef = useRef<HTMLDivElement>(null);
  const detailsPanelRef = useRef<HTMLDivElement>(null);

  const qpPlanRaw = String(searchParams.get("plan") || "BASIC").toUpperCase();
  const initialPlan: FixedOrCustomPlan =
    qpPlanRaw === "LIFETIME" || qpPlanRaw === "CUSTOM" ? qpPlanRaw : "BASIC";
  const qpUnitRaw = String(searchParams.get("unit") || "hours").toLowerCase();
  const initialUnit: BuilderDurationUnit =
    qpUnitRaw === "days" || qpUnitRaw === "weeks" || qpUnitRaw === "months" ? qpUnitRaw : "hours";
  const initialQty = Math.max(1, parseInt(searchParams.get("qty") || "1", 10) || 1);
  const initialCurrency = String(searchParams.get("currency") || "USD").toUpperCase();

  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [profile, setProfile] = useState<any>(null);
  const [viewPlanOpen, setViewPlanOpen] = useState(false);

  const [stats, setStats] = useState({
    leads_count: 0,
    leads_used_in_period: 0,
    searches_count: 0,
    connected_accounts: 0,
    max_leads: 2500,
    remaining_leads: 2500,
    is_unlimited_quota: false,
  });

  // Payment config & submissions
  const [supportEmail, setSupportEmail] = useState<string | null>(null);
  const [supportEmailConfigured, setSupportEmailConfigured] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [whatsappConfigured, setWhatsappConfigured] = useState(false);
  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [submissions, setSubmissions] = useState<PaymentSubmissionItem[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Selected plan order synced with CustomPlanBuilder
  const [orderSelection, setOrderSelection] = useState<PlanSelectionValue>({
    plan: initialPlan,
    durationUnit: initialPlan === "CUSTOM" ? initialUnit : initialPlan === "LIFETIME" ? "lifetime" : "days",
    durationValue: initialPlan === "CUSTOM" ? initialQty : initialPlan === "LIFETIME" ? null : 30,
    includeGoogleMaps: initialPlan !== "BASIC",
    priceUsd: initialPlan === "LIFETIME" ? 100 : initialPlan === "CUSTOM" ? initialQty : 25,
    leadAllowance: initialPlan === "LIFETIME" ? 50000 : initialPlan === "CUSTOM" ? initialQty * 50 : 2500,
    dailyEmailLimit: initialPlan === "LIFETIME" ? 500 : 10,
    planLabel: initialPlan === "LIFETIME" ? "Lifetime Access ($100 One-Time)" : "Basic Plan ($25 / 30 Days)",
    currency: initialCurrency,
    exchangeRate: 1,
    convertedAmount: initialPlan === "LIFETIME" ? 100 : 25,
    fxAvailable: true,
    fxSource: "Base Pricing Currency",
  });

  // Payment method choice ("OTHER" or method id) & proof upload state
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [highlightedStep, setHighlightedStep] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [customerNote, setCustomerNote] = useState<string>("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => newIdempotencyKey());
  const [submittingProof, setSubmittingProof] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<PaymentSubmissionItem | null>(null);

  // Secure proof modal viewer
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
      if (metricsRes || meRes) {
        const isUnlim = Boolean(metricsRes?.is_unlimited_quota) || meRes?.max_leads_quota === null;
        const maxL = meRes?.max_leads_quota ?? metricsRes?.max_quota ?? 2500;
        const remL =
          meRes?.remaining_leads_quota !== undefined && meRes?.remaining_leads_quota !== null
            ? meRes.remaining_leads_quota
            : metricsRes?.remaining_quota ?? maxL;
        setStats({
          leads_count: metricsRes?.saved_leads ?? 0,
          leads_used_in_period: meRes?.leads_used_in_period ?? metricsRes?.leads_used_in_period ?? 0,
          searches_count: metricsRes?.total_leads_found ?? 0,
          connected_accounts: metricsRes?.connected_gmail_accounts ?? 0,
          max_leads: maxL,
          remaining_leads: remL,
          is_unlimited_quota: isUnlim,
        });
      }
      if (payCfgRes) {
        setSupportEmail(payCfgRes.support_email || null);
        setSupportEmailConfigured(Boolean(payCfgRes.support_email_configured && payCfgRes.support_email));
        const waRaw = payCfgRes.whatsapp_number ? String(payCfgRes.whatsapp_number).trim() : "";
        setWhatsappNumber(waRaw || null);
        setWhatsappConfigured(Boolean(payCfgRes.whatsapp_configured && waRaw));
        const list = Array.isArray(payCfgRes.methods) ? payCfgRes.methods : [];
        setMethods(list);
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
      (isCustom
        ? "Custom Plan"
        : isLifetime
        ? "Lifetime Plan ($100)"
        : isActive
        ? "Basic Plan ($25 / 30 Days)"
        : "Free Preview / Inactive")
  );
  const waDigits = whatsappNumber ? whatsappNumber.replace(/[^0-9]/g, "") : "";
  const WHATSAPP_LINK = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(
        `Hello Usman, I need help with payment / subscription.\nUsername: ${displayUsername}\nSelected Package: ${orderSelection.planLabel}\nCurrent Plan: ${displayCurrentPlan}`
      )}`
    : null;

  const supportMailtoHref =
    supportEmailConfigured && supportEmail
      ? `mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent(
          "Lead Scraper — Subscription Support"
        )}&body=${encodeURIComponent(
          `Hello Usman,\n\nI need help with my Lead Scraper subscription.\n\nUsername: ${displayUsername}\nCurrent Plan: ${displayCurrentPlan}\n\nThank you.`
        )}`
      : null;

  const copyValue = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1800);
  };

  // Part 6: Automatic smooth scroll + accessible focus when user clicks Choose Basic / Choose Lifetime / Use This Custom
  const handlePlanCommitted = (sel: PlanSelectionValue) => {
    setOrderSelection(sel);
    setHighlightedStep(true);
    setTimeout(() => setHighlightedStep(false), 1800);
    setTimeout(() => {
      if (paymentStepRef.current) {
        paymentStepRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        paymentStepRef.current.focus({ preventScroll: true });
      }
    }, 60);
  };

  const handleSelectMethodCard = (val: string) => {
    setSelectedMethodId(val);
    setUploadError(null);
    setTimeout(() => {
      if (detailsPanelRef.current) {
        const rect = detailsPanelRef.current.getBoundingClientRect();
        if (rect.top > window.innerHeight * 0.72 || rect.top < 0) {
          detailsPanelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    }, 50);
  };

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingProof) return;
    setUploadError(null);

    if (!proofFile) {
      setUploadError("Please select a payment screenshot or PDF receipt (JPG, JPEG, PNG, WebP, or PDF).");
      return;
    }
    if (selectedMethodId === "OTHER" || !selectedMethodId) {
      setUploadError("Please select one of the available payment methods above first.");
      return;
    }
    const activeMethod = methods.find((m) => String(m.id) === selectedMethodId);
    if (!activeMethod) {
      setUploadError("Please select an active payment method above.");
      return;
    }

    setSubmittingProof(true);
    try {
      const formData = new FormData();
      formData.append("file", proofFile);
      formData.append("username", displayUsername);
      formData.append("requested_plan", orderSelection.plan);
      formData.append("currency", orderSelection.currency || "USD");
      formData.append("include_google_maps", orderSelection.includeGoogleMaps ? "true" : "false");
      if (orderSelection.plan === "CUSTOM") {
        formData.append("custom_duration_unit", orderSelection.durationUnit);
        formData.append("custom_duration_value", String(orderSelection.durationValue || 1));
      }
      formData.append("payment_method_id", String(activeMethod.id));
      formData.append("payment_method_name", activeMethod.name);
      formData.append("idempotency_key", idempotencyKey);
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
      setIdempotencyKey(newIdempotencyKey());
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
      setViewerTitle(`Payment Proof ${sub.request_code || `#${sub.id}`} (${sub.screenshot_filename})`);
      setViewerUrl(objUrl);
    } catch (err: any) {
      setUploadError(err?.message || "Failed to preview proof.");
    }
  };

  const closeProofViewer = () => {
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    setViewerUrl(null);
  };

  const liveCountdownText = formatCountdown(liveProfile?.subscription_expires_at, isLifetime, nowTick);
  const selectedCurrencyMeta = findCurrencyMeta(orderSelection.currency);
  const compatibleMethods = methods.filter((m) => doesMethodSupportCurrency(m, orderSelection.currency));
  const [showAllMethodsOverride, setShowAllMethodsOverride] = useState(false);

  useEffect(() => {
    setShowAllMethodsOverride(false);
    if (selectedMethodId && selectedMethodId !== "OTHER") {
      const m = methods.find((item) => String(item.id) === selectedMethodId);
      if (m && !doesMethodSupportCurrency(m, orderSelection.currency)) {
        setSelectedMethodId("");
      }
    }
  }, [orderSelection.currency]); // eslint-disable-line react-hooks/exhaustive-deps

  const methodsToRender = showAllMethodsOverride ? methods : compatibleMethods;
  const selectedMethodObj =
    selectedMethodId && selectedMethodId !== "OTHER"
      ? methods.find((m) => String(m.id) === selectedMethodId) || null
      : null;
  const activeFeaturesList = Object.entries(liveProfile?.features || {}).filter(([, val]) => Boolean(val));

  const formatPayableText = () =>
    orderSelection.currency === "USD" || !orderSelection.fxAvailable
      ? `$${orderSelection.priceUsd.toFixed(2)} USD`
      : `${orderSelection.convertedAmount.toLocaleString()} ${orderSelection.currency} ($${orderSelection.priceUsd} USD)`;

  const renderSelectedMethodDetails = (m: PaymentMethodItem) => {
    const bd = m.details_json || {};
    const nameLower = m.name.toLowerCase();
    const isBinance = bd.method_type === "crypto" || nameLower.includes("binance");
    const isPayoneer = bd.method_type === "payoneer" || nameLower.includes("payoneer");
    const isMeezan = nameLower.includes("meezan") || bd.method_type === "bank_transfer";

    const rowsToShow: Array<{ label: string; value: string; copyLabel: string; key: string; mono?: boolean }> = [];

    if (isBinance) {
      if (bd.network) {
        rowsToShow.push({ label: "Network", value: bd.network, copyLabel: "Copy Network", key: `net-${m.id}` });
      }
      if (m.wallet_address) {
        rowsToShow.push({
          label: "Wallet address",
          value: m.wallet_address,
          copyLabel: "Copy Wallet Address",
          key: `wal-${m.id}`,
          mono: true,
        });
      }
    } else if (isPayoneer) {
      const beneficiary = m.account_holder_name || bd.beneficiary_name;
      const payEmail = bd.payment_email || m.account_identifier;
      if (beneficiary) {
        rowsToShow.push({ label: "Beneficiary", value: beneficiary, copyLabel: "Copy Beneficiary", key: `ben-${m.id}` });
      }
      if (payEmail) {
        rowsToShow.push({ label: "Payment email", value: payEmail, copyLabel: "Copy Email", key: `email-${m.id}`, mono: true });
      }
    } else if (isMeezan) {
      const holder = m.account_holder_name || bd.beneficiary_name;
      if (holder) {
        rowsToShow.push({ label: "Account holder", value: holder, copyLabel: "Copy Account Name", key: `holder-${m.id}` });
      }
      if (bd.receiving_number) {
        rowsToShow.push({
          label: "Receiving number",
          value: bd.receiving_number,
          copyLabel: "Copy Receiving Number",
          key: `recv-${m.id}`,
          mono: true,
        });
      }
      if (bd.account_number) {
        rowsToShow.push({
          label: "Bank account number",
          value: bd.account_number,
          copyLabel: "Copy Account Number",
          key: `accnum-${m.id}`,
          mono: true,
        });
      }
      if (bd.iban) {
        rowsToShow.push({ label: "IBAN", value: bd.iban, copyLabel: "Copy IBAN", key: `iban-${m.id}`, mono: true });
      }
      if (bd.branch_info) {
        rowsToShow.push({ label: "Branch information", value: bd.branch_info, copyLabel: "Copy Branch", key: `branch-${m.id}` });
      }
      if (bd.swift_bic) {
        rowsToShow.push({ label: "SWIFT / BIC", value: bd.swift_bic, copyLabel: "Copy SWIFT", key: `swift-${m.id}`, mono: true });
      }
      if (bd.supported_currency) {
        rowsToShow.push({
          label: "Supported receiving currency",
          value: bd.supported_currency,
          copyLabel: "Copy Currency",
          key: `scur-${m.id}`,
        });
      }
    } else {
      // Easypaisa, JazzCash, NayaPay, or other Owner-added mobile/custom methods
      if (m.account_holder_name) {
        rowsToShow.push({
          label: "Account holder",
          value: m.account_holder_name,
          copyLabel: "Copy Account Name",
          key: `holder-${m.id}`,
        });
      }
      if (m.account_identifier) {
        rowsToShow.push({
          label: "Number",
          value: m.account_identifier,
          copyLabel: "Copy Number",
          key: `num-${m.id}`,
          mono: true,
        });
      }
      if (m.wallet_address) {
        rowsToShow.push({
          label: "Wallet address",
          value: m.wallet_address,
          copyLabel: "Copy Wallet Address",
          key: `wal-${m.id}`,
          mono: true,
        });
      }
    }

    const headingTitle = isBinance ? bd.display_title || "Binance — USDT TRC20" : m.name;

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-black text-white">{headingTitle}</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/10">
                {m.region}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {bd.supported_currency || m.currency}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Transfer the exact amount shown below and then upload your transfer screenshot in the form underneath.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/35 px-3.5 py-2 rounded-xl shrink-0">
            <div>
              <div className="text-[10px] text-emerald-200 font-semibold uppercase tracking-wider">Exact Payable Amount</div>
              <div className="text-sm font-black text-white">{formatPayableText()}</div>
            </div>
            <button
              type="button"
              onClick={() =>
                copyValue(
                  orderSelection.currency === "USD" || !orderSelection.fxAvailable
                    ? String(orderSelection.priceUsd.toFixed(2))
                    : String(orderSelection.convertedAmount),
                  "due-amt"
                )
              }
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              {copiedField === "due-amt" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedField === "due-amt" ? "Copied" : "Copy Amount"}</span>
            </button>
          </div>
        </div>

        {/* TRC20 Network Critical Warning */}
        {isBinance && (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-100 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-black text-white uppercase tracking-wide">Important Network Warning</div>
              <p className="font-semibold text-rose-200 leading-relaxed">
                {bd.warning_text ||
                  "Send funds only using the TRC20 network. Sending through another network may result in permanent loss of funds."}
              </p>
              <p className="text-[11px] text-slate-300">
                Note: Uploading a payment screenshot submits a verification request; the Owner confirms actual blockchain receipt before activation.
              </p>
            </div>
          </div>
        )}

        {/* Copyable Receiving Fields (strictly ONLY for this selected method) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rowsToShow.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-black/45 border border-white/10"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{row.label}</div>
                <div className={`text-sm font-bold text-white break-all mt-0.5 ${row.mono ? "font-mono text-blue-200" : ""}`}>
                  {row.value}
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyValue(row.value, row.key)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-blue-600 text-slate-100 text-[11px] font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                {copiedField === row.key ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedField === row.key ? "Copied" : row.copyLabel}</span>
              </button>
            </div>
          ))}
        </div>

        {m.payment_link && (
          <a
            href={m.payment_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Official Payment Link</span>
          </a>
        )}

        {m.qr_image_data && (
          <div>
            <div className="text-[10px] text-slate-400 mb-1">Scan Payment QR Code</div>
            <img
              src={m.qr_image_data}
              alt={`${m.name} QR Code`}
              className="h-32 w-32 object-contain rounded-xl bg-white p-1.5 border border-white/15"
            />
          </div>
        )}

        {m.instructions && (
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-slate-200 leading-relaxed">
            <strong className="text-blue-300 block mb-0.5">How to Complete Transfer:</strong>
            {m.instructions}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-7 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
              Usage &amp; Subscription
            </span>
            <span className="text-xs text-slate-400 font-mono">
              @{displayUsername} • Workspace #{user?.workspace_id || 1}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Your Plan, Usage &amp; Billing Center</h1>
          <p className="text-xs text-slate-400">
            Real database-verified plan status, remaining lead &amp; email quotas, custom plan calculator, and payment verification.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/app/accounts#gmail-bonus"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/35 text-xs font-bold text-purple-200"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Gmail Setup Bonus</span>
          </Link>
          <button
            onClick={() => {
              void refreshUser();
              void loadSubscriptionData();
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            <span>Sync DB Status</span>
          </button>
        </div>
      </div>

      {/* PART 11: AUTHORITATIVE CURRENT ACTIVE PLAN HERO CARD */}
      <div
        className={`rounded-2xl border-2 p-6 shadow-xl ${
          isActive
            ? "border-emerald-500/50 bg-gradient-to-r from-emerald-500/15 via-[#0e1628] to-[#090d16]"
            : isExpired
            ? "border-rose-500/50 bg-gradient-to-r from-rose-500/15 via-[#0e1628] to-[#090d16]"
            : "border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-[#0e1628] to-[#090d16]"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4 mb-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-300"
                  : isExpired
                  ? "bg-rose-500/20 text-rose-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {isActive ? <ShieldCheck className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                  {isActive ? "YOUR ACTIVE SUBSCRIPTION" : `ACCOUNT STATUS: ${currentStatus}`}
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : isExpired
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {currentStatus}
                </span>
              </div>
              <h2 className="text-xl font-black text-white mt-1.5">{displayCurrentPlan}</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {isActive
                  ? "Your subscription is active cleanly from database verification. You do not need to buy another plan unless you want to upgrade or extend."
                  : isExpired
                  ? "Your timed subscription has expired. Choose a fixed or custom package below to renew without losing your workspace or saved leads."
                  : "Free Preview / Locked state. Pick Basic ($25), Lifetime ($100), or a Custom package below and submit payment proof to activate this account."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setViewPlanOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/20 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Eye className="h-4 w-4 text-blue-300" />
            <span>View Plan</span>
          </button>
        </div>

        {/* Live Authoritative Fields */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-black/35 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-slate-400">Activation Date</div>
            <div className="font-mono font-bold text-white text-[11px]">
              {liveProfile?.subscription_start
                ? new Date(liveProfile.subscription_start).toLocaleDateString()
                : "Not activated"}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/35 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-slate-400">Expiry Date</div>
            <div className="font-mono font-bold text-white text-[11px]">
              {isLifetime
                ? "Lifetime (No Expiry)"
                : liveProfile?.subscription_expires_at
                ? new Date(liveProfile.subscription_expires_at).toLocaleString()
                : "Not set"}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/35 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-slate-400">Remaining Time</div>
            <div className={`font-mono font-extrabold text-[11px] ${isActive ? "text-emerald-300" : "text-rose-300"}`}>
              {isActive || isLifetime ? liveCountdownText : currentStatus}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/35 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-slate-400">Remaining Lead Allowance</div>
            <div className="font-mono font-bold text-purple-300 text-[11px]">
              {stats.is_unlimited_quota
                ? "Unlimited (Owner)"
                : `${stats.remaining_leads.toLocaleString()} / ${stats.max_leads.toLocaleString()}`}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/35 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-slate-400">Google Maps Access</div>
            <div
              className={`font-bold text-[11px] ${
                isActive && (liveProfile?.google_maps_enabled || isLifetime) ? "text-amber-300" : "text-rose-300"
              }`}
            >
              {isActive && (liveProfile?.google_maps_enabled || isLifetime) ? "Included" : "Not Included"}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/35 border border-white/10 space-y-0.5">
            <div className="text-[10px] text-slate-400">Email Sending Allowance</div>
            <div className="font-mono font-bold text-emerald-300 text-[11px]">
              {isActive ? `${liveProfile?.daily_email_limit ?? (isLifetime ? 500 : 10)} / day (UTC)` : "0 / day (Locked)"}
            </div>
          </div>
        </div>
      </div>

      {/* Live Usage Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Generated This Cycle</span>
            <Database className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats.leads_used_in_period.toLocaleString()}{" "}
            <span className="text-xs font-normal text-slate-400">
              / {stats.is_unlimited_quota ? "Unlimited" : stats.max_leads.toLocaleString()}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">{stats.leads_count.toLocaleString()} total saved in workspace</div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Leads Found</span>
            <Search className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.searches_count.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400">Multi-country B2B discovery</div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Connected Gmail</span>
            <Mail className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{stats.connected_accounts}</div>
          <div className="text-[10px] text-slate-400">Workspace OAuth isolated mailboxes</div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Daily Outreach Cap</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {isActive ? liveProfile?.daily_email_limit ?? (isLifetime ? 500 : 10) : 0} / day
          </div>
          <div className="text-[10px] text-slate-400">Resets daily at 00:00 UTC</div>
        </div>
      </div>

      {/* SECTION A: UPGRADE / BUY PACKAGE (PART 6 AUTO-SCROLL SOURCE) */}
      <div className="space-y-3 pt-2 border-t border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-white">
              {isActive ? "Optional Upgrade, Renewal, or Custom Package Extension" : "Step 1 — Choose a Plan or Build a Custom Package"}
            </h2>
            <p className="text-xs text-slate-400">
              Click <strong>Choose Basic</strong>, <strong>Choose Lifetime</strong>, or <strong>Use This Custom</strong> to save your package and jump straight to payment selection below.
            </p>
          </div>
        </div>

        <CustomPlanBuilder
          initialPlan={initialPlan}
          initialUnit={initialUnit}
          initialQty={initialQty}
          initialCurrency={initialCurrency}
          activePlanType={isActive ? planTypeUpper : null}
          onChange={(sel) => setOrderSelection(sel)}
          onPlanCommitted={handlePlanCommitted}
        />
      </div>

      {/* SECTION B: NEXT STEP — SELECT YOUR PAYMENT METHOD (PART 2, PART 3 & PART 6 TARGET) */}
      <div
        id="next-step-payment-method"
        ref={paymentStepRef}
        tabIndex={-1}
        className={`rounded-2xl border p-6 space-y-5 outline-none transition-all duration-500 ${
          highlightedStep
            ? "border-blue-400 bg-[#0d1626] ring-2 ring-blue-500/40 shadow-2xl"
            : "border-white/[0.08] bg-[#0c1017]"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
              <ArrowDown className="h-3.5 w-3.5" />
              <span>NEXT STEP — SELECT YOUR PAYMENT METHOD</span>
            </div>
            <h3 className="text-lg font-black text-white mt-1">SELECT YOUR PAYMENT METHOD</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Selected Package: <strong className="text-white">{orderSelection.planLabel}</strong> • Payable:{" "}
              <strong className="text-emerald-300">{formatPayableText()}</strong>
            </p>
          </div>

          <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 self-start">
            {orderSelection.includeGoogleMaps ? "Google Maps Included" : "Google Maps Not Included"}
          </span>
        </div>

        {/* Honest Currency Compatibility & USDT Network Guard */}
        {orderSelection.currency === "USDT" && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/35 text-xs text-amber-100 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>USDT — TRC20 Network Only:</strong> Only payment channels supporting TRC20 settlement are shown first. Double-check the network before initiating any crypto transfer.
            </div>
          </div>
        )}

        {compatibleMethods.length === 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-100 space-y-3">
            <div className="flex items-start gap-2.5">
              <Globe className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-white">
                  No payment method is currently configured for {selectedCurrencyMeta.code} ({selectedCurrencyMeta.name}). Contact support for assistance.
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Your estimated plan total in {selectedCurrencyMeta.code} is displayed for planning reference. Choose USD, PKR, EUR, GBP, or USDT (TRC20) above if paying via an existing channel, or contact support below.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {WHATSAPP_LINK && (
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Contact Support (WhatsApp)</span>
                </a>
              )}
              {supportMailtoHref && (
                <a
                  href={supportMailtoHref}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold inline-flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Email Support</span>
                </a>
              )}
              {methods.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllMethodsOverride((v) => !v)}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-slate-200 font-semibold cursor-pointer"
                >
                  {showAllMethodsOverride
                    ? "Show Only Exact Currency Matches"
                    : `Show Configured Methods (${methods.length})`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Clean Selectable Payment Method Cards Only (never showing all bank/wallet numbers simultaneously) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {methodsToRender.map((m) => {
            const isSelected = String(m.id) === selectedMethodId;
            const supportsSelected = doesMethodSupportCurrency(m, orderSelection.currency);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMethodCard(String(m.id))}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? "border-blue-400 bg-blue-600/20 shadow-md ring-1 ring-blue-400/50"
                    : "border-white/10 bg-white/[0.025] hover:border-white/30 hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <Wallet className={`h-4 w-4 ${isSelected ? "text-blue-300" : "text-slate-400"}`} />
                  {isSelected ? (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      Selected
                    </span>
                  ) : !supportsSelected ? (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Accepts {m.currency}
                    </span>
                  ) : null}
                </div>
                <div>
                  <div className="text-sm font-black text-white">{m.name}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {m.currency} • {m.region}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Other Payment Method Card */}
          <button
            type="button"
            onClick={() => handleSelectMethodCard("OTHER")}
            className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              selectedMethodId === "OTHER"
                ? "border-emerald-400 bg-emerald-600/20 shadow-md ring-1 ring-emerald-400/50"
                : "border-white/10 bg-white/[0.025] hover:border-white/30 hover:bg-white/[0.05]"
            }`}
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <MessageCircle className={`h-4 w-4 ${selectedMethodId === "OTHER" ? "text-emerald-300" : "text-slate-400"}`} />
              {selectedMethodId === "OTHER" && (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Selected
                </span>
              )}
            </div>
            <div>
              <div className="text-sm font-black text-white">Other Payment Method</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Ask Owner for alternatives</div>
            </div>
          </button>
        </div>

        {/* Single-Method Receiving Details Panel (displayed immediately below selection) */}
        <div
          id="selected-payment-details"
          ref={detailsPanelRef}
          className="rounded-2xl border border-white/10 bg-[#090d16] p-5"
        >
          {!selectedMethodId ? (
            <div className="text-center py-6 space-y-1.5">
              <CreditCard className="h-6 w-6 text-blue-400 mx-auto" />
              <div className="text-sm font-bold text-white">Select a Payment Method Card Above</div>
              <p className="text-xs text-slate-400">
                Choose Easypaisa, JazzCash, Meezan Bank, NayaPay, Binance, Payoneer, or Other Payment Method to display the exact receiving details and upload your screenshot proof.
              </p>
            </div>
          ) : selectedMethodId === "OTHER" ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
              <div className="space-y-1">
                <h4 className="text-base font-black text-white">Other Payment Method</h4>
                <p className="text-xs text-slate-300">
                  Don&apos;t see your preferred payment method?{" "}
                  {WHATSAPP_LINK ? (
                    <a
                      href={WHATSAPP_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-300 font-bold underline hover:text-emerald-200"
                    >
                      Contact the Owner
                    </a>
                  ) : (
                    <span className="text-amber-300 font-semibold">
                      Contact the Owner (Owner WhatsApp support number is not configured in settings yet).
                    </span>
                  )}
                </p>
              </div>
              {WHATSAPP_LINK && (
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-2 shrink-0"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Contact the Owner ({whatsappNumber})</span>
                </a>
              )}
            </div>
          ) : selectedMethodObj ? (
            renderSelectedMethodDetails(selectedMethodObj)
          ) : (
            <div className="text-xs text-amber-200">
              Selected payment method is currently unavailable. Choose another method above.
            </div>
          )}
        </div>
      </div>

      {/* SECTION C: SUBMIT PAYMENT PROOF FOR ORDER VERIFICATION (PART 4) */}
      {selectedMethodObj && (
        <div id="payment-proof-upload" className="rounded-2xl border border-emerald-500/25 bg-[#0c1017] p-6 space-y-5">
          <div className="border-b border-white/[0.06] pb-3">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-400" />
              <span>SUBMIT PAYMENT PROOF FOR ORDER VERIFICATION</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Submitting proof saves a PENDING verification request in the database. Subscriptions activate only after the Owner confirms receipt of funds.
            </p>
          </div>

          {/* Auto-Populated Verified Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] text-slate-400 font-sans block">Account Email</span>
              <strong className="text-white truncate block" title={displayEmail}>{displayEmail}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] text-slate-400 font-sans block">Username</span>
              <strong className="text-white">@{displayUsername}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] text-slate-400 font-sans block">Selected Plan</span>
              <strong className="text-blue-300">{orderSelection.plan}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] text-slate-400 font-sans block">Duration</span>
              <strong className="text-purple-300">
                {orderSelection.durationUnit === "lifetime"
                  ? "Lifetime"
                  : `${orderSelection.durationValue} ${orderSelection.durationUnit}`}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] text-slate-400 font-sans block">Lead Allowance</span>
              <strong className="text-white">{orderSelection.leadAllowance.toLocaleString()}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] text-slate-400 font-sans block">Google Maps</span>
              <strong className={orderSelection.includeGoogleMaps ? "text-amber-300" : "text-rose-300"}>
                {orderSelection.includeGoogleMaps ? "Included" : "Excluded"}
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] text-slate-400 font-sans block">Payment Method</span>
              <strong className="text-blue-200">{selectedMethodObj.name}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35">
              <span className="text-[10px] text-emerald-200 font-sans block">Total Payable ({orderSelection.currency})</span>
              <strong className="text-emerald-300">{formatPayableText()}</strong>
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
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Payment proof saved ({lastSubmitted.request_code || `#${lastSubmitted.id}`}) — Status: PENDING Owner Verification
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Recorded: ${lastSubmitted.agreed_price_usd} USD ({lastSubmitted.converted_amount ?? lastSubmitted.agreed_price_usd}{" "}
                {lastSubmitted.currency}) via {lastSubmitted.payment_method_name}. An in-app notification was sent to the Owner.
              </p>
            </div>
          )}

          <form onSubmit={handleUploadProof} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  1. Payment Screenshot * <span className="text-slate-500 font-normal">(JPG, PNG, WebP, PDF • max 5MB)</span>
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  required
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  2. Transfer Receipt / TXID Reference (Optional)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. TRX-8924103 or TRC20 TXID"
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">3. Note for Owner (Optional)</label>
                <input
                  type="text"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Sender name or transfer time..."
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2.5 text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingProof}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submittingProof ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Uploading Payment Proof...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Submit Payment Proof for Verification ({selectedMethodObj.name})</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* SECTION D: SUBMISSION HISTORY */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-400" />
            <span>Your Payment Request History</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">{submissions.length} Request(s)</span>
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
                    <span className="font-mono font-bold text-white">{s.request_code || `#${s.id}`}</span>
                    <span className="font-bold text-blue-300">{s.plan_label || s.requested_plan}</span>
                    <span className="font-mono text-emerald-300 font-bold">
                      {s.converted_amount ?? s.agreed_price_usd} {s.currency}
                      {s.currency !== "USD" ? ` ($${s.agreed_price_usd} USD)` : ""}
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

                <button
                  type="button"
                  onClick={() => openProofViewer(s)}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>View Screenshot</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Direct Support Links */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-slate-300">
          Need assistance with your payment, Gmail setup time compensation, or subscription?
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {WHATSAPP_LINK && (
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1.5"
            >
              <MessageCircle className="h-4 w-4" />
              <span>WhatsApp Support ({whatsappNumber})</span>
            </a>
          )}
          {supportMailtoHref && (
            <a
              href={supportMailtoHref}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold inline-flex items-center gap-1.5"
            >
              <Mail className="h-4 w-4" />
              <span>Email Support</span>
            </a>
          )}
        </div>
      </div>

      {/* VIEW PLAN MODAL */}
      {viewPlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0c1017] p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-extrabold text-white">Current Active Plan Details (Database)</h3>
              <button onClick={() => setViewPlanOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] text-slate-400 block">Plan Name</span>
                <strong className="text-white">{displayCurrentPlan}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] text-slate-400 block">Status</span>
                <strong className={isActive ? "text-emerald-300" : "text-rose-300"}>{currentStatus}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] text-slate-400 block">Activation Date</span>
                <strong className="text-white font-mono">
                  {liveProfile?.subscription_start
                    ? new Date(liveProfile.subscription_start).toUTCString()
                    : "Not activated"}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] text-slate-400 block">Expiry Date</span>
                <strong className="text-white font-mono">
                  {isLifetime
                    ? "Permanent — No Expiry"
                    : liveProfile?.subscription_expires_at
                    ? new Date(liveProfile.subscription_expires_at).toUTCString()
                    : "N/A"}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] text-slate-400 block">Lead Quota (Used / Cap)</span>
                <strong className="text-purple-300 font-mono">
                  {stats.is_unlimited_quota
                    ? "Unlimited (Owner)"
                    : `${stats.leads_used_in_period.toLocaleString()} / ${stats.max_leads.toLocaleString()} (${stats.remaining_leads.toLocaleString()} left)`}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] text-slate-400 block">Daily Gmail Sending Cap</span>
                <strong className="text-emerald-300 font-mono">
                  {isActive ? `${liveProfile?.daily_email_limit ?? 10} emails / day` : "Locked"}
                </strong>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="font-bold text-slate-200">Enabled Modules on Your Account:</div>
              {activeFeaturesList.length === 0 ? (
                <p className="text-slate-400">No paid modules currently unlocked.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {activeFeaturesList.map(([k]) => (
                    <span
                      key={k}
                      className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px]"
                    >
                      {k.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setViewPlanOpen(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECURE SCREENSHOT VIEWER MODAL */}
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

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-400">Loading subscription center...</div>}>
      <SubscriptionPageInner />
    </Suspense>
  );
}
