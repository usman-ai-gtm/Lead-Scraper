"use client";

import React, { useState, useMemo } from "react";
import { api } from "@/lib/api";
import {
  ALL_FEATURES_ENABLED,
  BASIC_FEATURES,
  BASIC_DAILY_EMAIL_LIMIT,
  FEATURE_CATALOG,
  FeatureKey,
  FeatureMap,
  DurationUnit,
  LIFETIME_GMAIL_DAILY_SAFE_CAP,
  calculateCustomPlanExpiresAt,
  calculateSuggestedCustomPrice,
  formatDurationLabel,
  normalizeFeatures,
} from "@/lib/entitlements";
import { resolveGoogleSignInDisplay, formatPktTimestamp } from "@/lib/timezone-pkt";
import {
  Crown,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Clock,
  Globe,
  Sliders,
} from "lucide-react";

interface ConvertPreviewModalProps {
  client: any | null;
  onClose: () => void;
  onConverted: (convertedClient: any) => Promise<void> | void;
}

const CURRENCY_OPTIONS = ["USD", "PKR", "EUR", "GBP", "AED", "SAR", "CAD", "AUD", "USDT"];

export function ConvertPreviewModal({
  client,
  onClose,
  onConverted,
}: ConvertPreviewModalProps) {
  const [plan, setPlan] = useState<"BASIC" | "LIFETIME" | "CUSTOM">("BASIC");
  const [customPriceUsd, setCustomPriceUsd] = useState<string>("25");
  const [agreedCurrency, setAgreedCurrency] = useState<string>("USD");
  const [durationValue, setDurationValue] = useState<number>(30);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("days");
  const [explicitExpiryLocal, setExplicitExpiryLocal] = useState<string>("");
  const [dailyEmailLimit, setDailyEmailLimit] = useState<number>(BASIC_DAILY_EMAIL_LIMIT);
  const [features, setFeatures] = useState<FeatureMap>({ ...BASIC_FEATURES });
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [step, setStep] = useState<"configure" | "review">("configure");

  const signInMeta = useMemo(() => {
    if (!client) return null;
    return resolveGoogleSignInDisplay(client);
  }, [client]);

  const handlePlanTab = (nextPlan: "BASIC" | "LIFETIME" | "CUSTOM") => {
    setPlan(nextPlan);
    setErrorMsg(null);
    if (nextPlan === "BASIC") {
      setCustomPriceUsd("25");
      setDurationValue(30);
      setDurationUnit("days");
      setExplicitExpiryLocal("");
      setDailyEmailLimit(BASIC_DAILY_EMAIL_LIMIT);
      setFeatures({ ...BASIC_FEATURES });
    } else if (nextPlan === "LIFETIME") {
      setCustomPriceUsd("100");
      setDurationUnit("lifetime");
      setExplicitExpiryLocal("");
      setDailyEmailLimit(LIFETIME_GMAIL_DAILY_SAFE_CAP);
      setFeatures({ ...ALL_FEATURES_ENABLED });
    } else {
      const calc = calculateSuggestedCustomPrice({
        features,
        durationValue,
        durationUnit,
        dailyEmailLimit,
      });
      setCustomPriceUsd(String(calc.suggestedPriceUsd));
    }
  };

  const toggleFeature = (key: FeatureKey) => {
    setFeatures((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.google_maps) next.multi_country_maps = false;
      if (next.multi_country_maps) next.google_maps = true;
      if (!next.find_leads) next.multi_country_search = false;
      if (next.multi_country_search) next.find_leads = true;
      return next;
    });
  };

  const computedExpiryIso = useMemo(() => {
    if (plan === "LIFETIME" || (plan === "CUSTOM" && durationUnit === "lifetime")) return null;
    if (explicitExpiryLocal) {
      const d = new Date(explicitExpiryLocal);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    const d = calculateCustomPlanExpiresAt(
      new Date(),
      plan === "BASIC" ? durationValue || 30 : durationValue || 1,
      plan === "BASIC" ? "days" : durationUnit
    );
    return d ? d.toISOString() : null;
  }, [plan, durationValue, durationUnit, explicitExpiryLocal]);

  const enabledFeaturesList = useMemo(
    () =>
      FEATURE_CATALOG.filter((f) => Boolean(normalizeFeatures(features, features.google_maps)[f.key])),
    [features]
  );

  if (!client) return null;

  const handleReviewContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (plan === "CUSTOM" && enabledFeaturesList.length === 0) {
      setErrorMsg("Enable at least one module for a Custom Plan.");
      return;
    }
    if (explicitExpiryLocal) {
      const d = new Date(explicitExpiryLocal);
      if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) {
        setErrorMsg("Custom expiry date & time must be a valid future timestamp.");
        return;
      }
    }
    setStep("review");
  };

  const handleConfirmConversion = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const numericPrice = customPriceUsd.trim() !== "" && !Number.isNaN(Number(customPriceUsd))
        ? Number(customPriceUsd)
        : undefined;

      const payload: any = {
        plan,
        agreed_currency: agreedCurrency,
        custom_price_usd: numericPrice,
        duration_value: plan === "LIFETIME" || durationUnit === "lifetime" ? null : durationValue,
        duration_unit: plan === "LIFETIME" ? "lifetime" : plan === "BASIC" ? "days" : durationUnit,
        expires_at: explicitExpiryLocal && plan !== "LIFETIME" ? new Date(explicitExpiryLocal).toISOString() : null,
        daily_email_limit: features.cold_email ? dailyEmailLimit : 0,
        google_maps_enabled: Boolean(features.google_maps),
        features,
        notes: notes.trim() || undefined,
      };

      const res = await api.post<any>(`/admin/clients/${client.id}/convert-to-paid`, payload);
      if (!res || res.status !== "success" || !res.client) {
        throw new Error(res?.detail || "Conversion response was incomplete.");
      }
      await onConverted(res.client);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to convert preview account to paid.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-emerald-500/35 bg-[#0c1017] p-6 shadow-2xl text-slate-100 space-y-5 my-8">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3.5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
              <Crown className="h-3.5 w-3.5" />
              <span>Owner-Only In-Place Account Conversion</span>
            </div>
            <h3 className="text-lg font-extrabold text-white">
              Convert Google Free Preview User to Paid Customer
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preserved Google Identity & Workspace Box */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-slate-400">Customer Name: </span>
              <strong className="text-white">{client.full_name || "Google Visitor"}</strong>
            </div>
            <span className="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-200 font-mono text-[10px]">
              User #{client.id} • Preserved Workspace #{client.workspace_id}
            </span>
          </div>
          <div className="font-mono text-emerald-300 break-all">
            Google Account Email (Unchanged): <strong>{client.email || client.username}</strong>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-slate-300">
            <div>
              <span className="text-slate-400">First Google Sign-in: </span>
              <span className="font-mono">{signInMeta?.firstSignInDisplay}</span>
            </div>
            <div>
              <span className="text-slate-400">Latest Sign-in: </span>
              <span className="font-mono">{signInMeta?.latestSignInDisplay}</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-white/[0.06] flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>
              Keeps exact Google sign-in identity, workspace #{client.workspace_id} ({client.total_leads ?? 0} leads, {client.total_searches ?? 0} searches), and Gmail links. No duplicate account is created.
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/35 text-xs text-rose-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === "configure" ? (
          <form onSubmit={handleReviewContinue} className="space-y-4 text-xs">
            {/* Plan Selection */}
            <div className="grid grid-cols-3 gap-2.5">
              {(["BASIC", "LIFETIME", "CUSTOM"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => handlePlanTab(tier)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    plan === tier
                      ? tier === "LIFETIME"
                        ? "border-amber-400 bg-amber-500/15 text-white"
                        : tier === "CUSTOM"
                        ? "border-purple-400 bg-purple-500/15 text-white"
                        : "border-blue-400 bg-blue-500/15 text-white"
                      : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/25"
                  }`}
                >
                  <div className="font-black text-xs">
                    {tier === "BASIC" ? "Basic ($25)" : tier === "LIFETIME" ? "Lifetime ($100)" : "Custom Plan"}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {tier === "BASIC"
                      ? "30 Days • Web Leads"
                      : tier === "LIFETIME"
                      ? "No Expiry • Full Maps"
                      : "Set price, expiry & tools"}
                  </div>
                </button>
              ))}
            </div>

            {/* Price, Currency, Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Actual Price (USD)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={customPriceUsd}
                  onChange={(e) => setCustomPriceUsd(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Agreed Payment Currency
                </label>
                <select
                  value={agreedCurrency}
                  onChange={(e) => setAgreedCurrency(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
                >
                  {CURRENCY_OPTIONS.map((cur) => (
                    <option key={cur} value={cur}>
                      {cur}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Daily Email Cap
                </label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  disabled={!features.cold_email}
                  value={features.cold_email ? dailyEmailLimit : 0}
                  onChange={(e) => setDailyEmailLimit(Math.max(0, Math.min(500, Number(e.target.value) || 0)))}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono disabled:opacity-40"
                />
              </div>
            </div>

            {plan !== "LIFETIME" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Duration Value
                  </label>
                  <input
                    type="number"
                    min={1}
                    disabled={durationUnit === "lifetime" || Boolean(explicitExpiryLocal)}
                    value={durationValue}
                    onChange={(e) => setDurationValue(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Duration Unit
                  </label>
                  <select
                    value={plan === "BASIC" ? "days" : durationUnit}
                    disabled={plan === "BASIC" || Boolean(explicitExpiryLocal)}
                    onChange={(e) => setDurationUnit(e.target.value as DurationUnit)}
                    className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono disabled:opacity-50"
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                    {plan === "CUSTOM" && <option value="lifetime">Lifetime (No Expiry)</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Or Exact Expiry (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={explicitExpiryLocal}
                    onChange={(e) => setExplicitExpiryLocal(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#121824] px-2.5 py-2 text-white font-mono text-[11px]"
                  />
                </div>
              </div>
            )}

            {/* Permitted Features */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-purple-400" />
                  <span>Permitted Modules ({enabledFeaturesList.length}/{FEATURE_CATALOG.length} active)</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FEATURE_CATALOG.map((f) => {
                  const checked = Boolean(features[f.key]);
                  return (
                    <label
                      key={f.key}
                      className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer text-[11px] ${
                        checked
                          ? "bg-emerald-500/10 border-emerald-500/30 text-white"
                          : "bg-white/[0.02] border-white/10 text-slate-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFeature(f.key)}
                        className="rounded border-white/20"
                      />
                      <span className="font-semibold truncate">{f.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Owner Activation Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Verified Easypaisa payment — Google user upgraded in-place"
                className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold cursor-pointer"
              >
                Review Conversion Details →
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/[0.06] space-y-2.5">
              <div className="font-extrabold text-sm text-white">Review Final Paid Activation Details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] font-mono">
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                  <span className="text-slate-400 block font-sans">Preserved Google Account</span>
                  <strong className="text-emerald-300 break-all">{client.email || client.username}</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                  <span className="text-slate-400 block font-sans">Preserved Workspace</span>
                  <strong className="text-white">Workspace #{client.workspace_id} (Same ID)</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                  <span className="text-slate-400 block font-sans">Selected Plan &amp; Price</span>
                  <strong className="text-white">
                    {plan} • ${customPriceUsd || 0} USD ({agreedCurrency})
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                  <span className="text-slate-400 block font-sans">Expiry / Duration (PKT)</span>
                  <strong className="text-amber-200">
                    {plan === "LIFETIME" || durationUnit === "lifetime"
                      ? "Permanent — Lifetime (No Expiry)"
                      : formatPktTimestamp(computedExpiryIso) || formatDurationLabel(durationValue, durationUnit)}
                  </strong>
                </div>
              </div>
              <div className="text-[11px] text-slate-300">
                <strong>Enabled Features ({enabledFeaturesList.length}):</strong>{" "}
                {enabledFeaturesList.map((f) => f.label).join(", ")}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setStep("configure")}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold cursor-pointer"
              >
                ← Back to Edit
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmConversion}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Converting Account In-Place...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm &amp; Activate Paid Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
