"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Crown,
  Zap,
  Sliders,
  Check,
  XCircle,
  Clock,
  RefreshCw,
  DollarSign,
  Database,
  MapPin,
  AlertCircle,
} from "lucide-react";
import {
  FixedOrCustomPlan,
  BuilderDurationUnit,
  FIXED_PLAN_SPECS,
  CUSTOM_UNIT_PRICING,
} from "@/lib/custom-plans";

export interface FxRateItem {
  currency: string;
  rateFromUsd: number;
  source: string;
  isManualOverride: boolean;
  updatedAt: string;
}

export interface PlanSelectionValue {
  plan: FixedOrCustomPlan;
  durationUnit: BuilderDurationUnit | "lifetime";
  durationValue: number | null;
  includeGoogleMaps: boolean;
  priceUsd: number;
  leadAllowance: number;
  dailyEmailLimit: number;
  planLabel: string;
  currency: string;
  exchangeRate: number;
  convertedAmount: number;
  fxAvailable: boolean;
  fxSource: string;
  fxUpdatedAt?: string;
}

const CURRENCY_CHOICES = [
  { code: "USD", label: "USD ($)", decimals: 2, symbol: "$" },
  { code: "PKR", label: "PKR (Rs)", decimals: 0, symbol: "Rs " },
  { code: "INR", label: "INR (₹)", decimals: 0, symbol: "₹" },
  { code: "GBP", label: "GBP (£)", decimals: 2, symbol: "£" },
  { code: "EUR", label: "EUR (€)", decimals: 2, symbol: "€" },
  { code: "AED", label: "AED", decimals: 2, symbol: "AED " },
  { code: "CAD", label: "CAD (C$)", decimals: 2, symbol: "C$" },
  { code: "AUD", label: "AUD (A$)", decimals: 2, symbol: "A$" },
];

export function CustomPlanBuilder({
  initialPlan = "BASIC",
  initialUnit = "hours",
  initialQty = 1,
  initialCurrency = "USD",
  activePlanType,
  onChange,
  onPlanCommitted,
  ctaSlot,
}: {
  initialPlan?: FixedOrCustomPlan;
  initialUnit?: BuilderDurationUnit;
  initialQty?: number;
  initialCurrency?: string;
  activePlanType?: string | null;
  onChange?: (selection: PlanSelectionValue) => void;
  onPlanCommitted?: (selection: PlanSelectionValue) => void;
  ctaSlot?: (selection: PlanSelectionValue) => React.ReactNode;
}) {
  const [selectedPlan, setSelectedPlan] = useState<FixedOrCustomPlan>(initialPlan);
  const [durationUnit, setDurationUnit] = useState<BuilderDurationUnit>(initialUnit);
  const [quantity, setQuantity] = useState<number>(Math.max(1, initialQty || 1));
  const [includeMaps, setIncludeMaps] = useState<boolean>(true);
  const [currency, setCurrency] = useState<string>(initialCurrency || "USD");

  const [rates, setRates] = useState<Record<string, FxRateItem>>({});
  const [fxLoading, setFxLoading] = useState<boolean>(true);
  const [fxError, setFxError] = useState<string | null>(null);

  const loadRates = async () => {
    setFxLoading(true);
    setFxError(null);
    try {
      const res = await fetch("/api/payments/fx", { cache: "no-store" });
      if (!res.ok) throw new Error("Unable to load exchange rates");
      const data = await res.json();
      const map: Record<string, FxRateItem> = {};
      for (const r of data.rates || []) {
        map[String(r.currency).toUpperCase()] = r;
      }
      setRates(map);
    } catch {
      setFxError("Live currency conversion temporarily unavailable — showing base USD amounts cleanly.");
    } finally {
      setFxLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  const unitConfig = CUSTOM_UNIT_PRICING[durationUnit];
  const clampedQty = Math.min(unitConfig.maxQty, Math.max(unitConfig.minQty, Math.floor(Number(quantity) || 1)));

  const handleUnitChange = (u: BuilderDurationUnit) => {
    setDurationUnit(u);
    const maxForUnit = CUSTOM_UNIT_PRICING[u].maxQty;
    if (clampedQty > maxForUnit) setQuantity(maxForUnit);
    if (selectedPlan !== "CUSTOM") setSelectedPlan("CUSTOM");
  };

  const buildSelectionFor = (planOverride: FixedOrCustomPlan): PlanSelectionValue => {
    let priceUsd = FIXED_PLAN_SPECS.BASIC.priceUsd;
    let leadAllowance = FIXED_PLAN_SPECS.BASIC.leadAllowance;
    let dailyEmailLimit = FIXED_PLAN_SPECS.BASIC.dailyEmailLimit;
    let planLabel = "Basic Plan ($25 / 30 Days)";
    let durUnitOut: BuilderDurationUnit | "lifetime" = "days";
    let durValOut: number | null = 30;
    let mapsOut = false;

    if (planOverride === "LIFETIME") {
      priceUsd = FIXED_PLAN_SPECS.LIFETIME.priceUsd;
      leadAllowance = FIXED_PLAN_SPECS.LIFETIME.leadAllowance;
      dailyEmailLimit = FIXED_PLAN_SPECS.LIFETIME.dailyEmailLimit;
      planLabel = "Lifetime Access ($100 One-Time)";
      durUnitOut = "lifetime";
      durValOut = null;
      mapsOut = true;
    } else if (planOverride === "CUSTOM") {
      const rule = CUSTOM_UNIT_PRICING[durationUnit];
      priceUsd = Number((clampedQty * rule.usdPerUnit).toFixed(2));
      leadAllowance = clampedQty * rule.leadsPerUnit;
      dailyEmailLimit = rule.dailyEmailLimit;
      durUnitOut = durationUnit;
      durValOut = clampedQty;
      mapsOut = includeMaps;
      const unitWord = clampedQty === 1 ? rule.unitLabelSingular : rule.unitLabelPlural;
      planLabel = `Custom (${clampedQty} ${unitWord} • $${priceUsd} • ${leadAllowance.toLocaleString()} Leads)`;
    }

    const curMeta = CURRENCY_CHOICES.find((c) => c.code === currency) || CURRENCY_CHOICES[0];
    if (curMeta.code === "USD") {
      return {
        plan: planOverride,
        durationUnit: durUnitOut,
        durationValue: durValOut,
        includeGoogleMaps: mapsOut,
        priceUsd,
        leadAllowance,
        dailyEmailLimit,
        planLabel,
        currency: "USD",
        exchangeRate: 1,
        convertedAmount: priceUsd,
        fxAvailable: true,
        fxSource: "Base Pricing Currency",
      };
    }

    const fxItem = rates[curMeta.code];
    if (!fxItem || !Number.isFinite(Number(fxItem.rateFromUsd)) || Number(fxItem.rateFromUsd) <= 0) {
      return {
        plan: planOverride,
        durationUnit: durUnitOut,
        durationValue: durValOut,
        includeGoogleMaps: mapsOut,
        priceUsd,
        leadAllowance,
        dailyEmailLimit,
        planLabel,
        currency: "USD",
        exchangeRate: 1,
        convertedAmount: priceUsd,
        fxAvailable: false,
        fxSource: fxLoading ? "Loading exchange rates..." : "Conversion unavailable — pay USD",
      };
    }

    const rate = Number(fxItem.rateFromUsd);
    const rawConv = priceUsd * rate;
    const convertedAmount =
      curMeta.decimals === 0 ? Math.round(rawConv) : Number(rawConv.toFixed(curMeta.decimals));

    return {
      plan: planOverride,
      durationUnit: durUnitOut,
      durationValue: durValOut,
      includeGoogleMaps: mapsOut,
      priceUsd,
      leadAllowance,
      dailyEmailLimit,
      planLabel,
      currency: curMeta.code,
      exchangeRate: Number(rate.toFixed(4)),
      convertedAmount,
      fxAvailable: true,
      fxSource: fxItem.source,
      fxUpdatedAt: fxItem.updatedAt,
    };
  };

  const selection: PlanSelectionValue = useMemo(
    () => buildSelectionFor(selectedPlan),
    [selectedPlan, durationUnit, clampedQty, includeMaps, currency, rates, fxLoading]
  );

  const handleCommitPlan = (planToSelect: FixedOrCustomPlan) => {
    setSelectedPlan(planToSelect);
    const nextSel = buildSelectionFor(planToSelect);
    if (onChange) onChange(nextSel);
    if (onPlanCommitted) onPlanCommitted(nextSel);
  };

  useEffect(() => {
    if (onChange) onChange(selection);
  }, [selection]);

  const formatTargetAmount = (usdAmount: number) => {
    const meta = CURRENCY_CHOICES.find((c) => c.code === selection.currency) || CURRENCY_CHOICES[0];
    if (selection.currency === "USD" || !selection.fxAvailable) return `$${usdAmount.toFixed(2)} USD`;
    const conv =
      meta.decimals === 0
        ? Math.round(usdAmount * selection.exchangeRate)
        : Number((usdAmount * selection.exchangeRate).toFixed(meta.decimals));
    return `${meta.symbol}${conv.toLocaleString()} ${meta.code}`;
  };

  return (
    <div className="space-y-6">
      {/* Currency Selector Header */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            <span>Payment Currency Selector (USD Base)</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            All plans are priced strictly in USD and automatically converted using live or Owner-verified exchange rates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {CURRENCY_CHOICES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCurrency(c.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                currency === c.code
                  ? "bg-emerald-600 text-white border-emerald-400 shadow-sm"
                  : "bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.07]"
              }`}
            >
              {c.code}
            </button>
          ))}
          <button
            type="button"
            onClick={loadRates}
            disabled={fxLoading}
            title="Refresh exchange rates"
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${fxLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {(fxError || (!selection.fxAvailable && currency !== "USD")) && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            {fxError ||
              `Live conversion for ${currency} is temporarily unavailable. USD amount ($${selection.priceUsd.toFixed(2)} USD) applies cleanly without estimated rates.`}
          </span>
        </div>
      )}

      {/* 3 Plan Options Grid: Basic ($25), Lifetime ($100), Custom Plan Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* FIXED 1: BASIC $25 */}
        <div
          className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
            selectedPlan === "BASIC"
              ? "border-blue-500 bg-[#0e172a] shadow-lg shadow-blue-900/20"
              : "border-white/[0.08] bg-[#0c1017] hover:border-white/20"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                Fixed • 30 Days
              </span>
              {activePlanType === "BASIC" && (
                <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  YOUR ACTIVE PLAN
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-lg font-extrabold text-white">Basic</h3>
              <div className="text-right">
                <div className="text-2xl font-black text-white">$25 USD</div>
                {selection.currency !== "USD" && selection.fxAvailable && (
                  <div className="text-[11px] font-mono text-emerald-300">≈ {formatTargetAmount(25)}</div>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">30 consecutive days • Standard web lead generation</p>

            <ul className="space-y-1.5 text-xs text-slate-200 mb-4">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>2,500 leads / 30-day cycle</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>10 Gmail outreach emails / UTC day</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>XLSX, PDF, CSV &amp; JSON Exports</span>
              </li>
              <li className="flex items-center gap-2 text-rose-300">
                <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <span className="font-semibold">Google Maps Lead Generation NOT Included</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleCommitPlan("BASIC")}
            className={`w-full py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
              selectedPlan === "BASIC"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white/[0.06] hover:bg-blue-600/30 text-slate-200 border border-white/10"
            }`}
          >
            {selectedPlan === "BASIC" ? "Choose Basic ($25 USD) ✓" : "Choose Basic ($25 USD)"}
          </button>
        </div>

        {/* FIXED 2: LIFETIME $100 */}
        <div
          className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
            selectedPlan === "LIFETIME"
              ? "border-amber-400 bg-[#1a1508] shadow-lg shadow-amber-900/20"
              : "border-amber-500/30 bg-gradient-to-b from-[#151208] to-[#0c1017] hover:border-amber-400/60"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                <Crown className="h-3 w-3" />
                <span>One-Time • No Expiry</span>
              </span>
              {activePlanType === "LIFETIME" && (
                <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  YOUR ACTIVE PLAN
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-lg font-extrabold text-amber-200">Lifetime Access</h3>
              <div className="text-right">
                <div className="text-2xl font-black text-amber-300">$100 USD</div>
                {selection.currency !== "USD" && selection.fxAvailable && (
                  <div className="text-[11px] font-mono text-emerald-300">≈ {formatTargetAmount(100)}</div>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">One-time payment • Subject to acceptable-use &amp; security policy</p>

            <ul className="space-y-1.5 text-xs text-slate-200 mb-4">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold text-amber-200">Google Maps Lead Generation INCLUDED</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>50,000 leads fair-use workspace allowance</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>AI Lead Research Briefs &amp; Proposals</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Up to 500 Gmail outreach emails / UTC day</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleCommitPlan("LIFETIME")}
            className={`w-full py-2.5 rounded-xl font-black text-xs cursor-pointer transition-all ${
              selectedPlan === "LIFETIME"
                ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md"
                : "bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-500/40"
            }`}
          >
            {selectedPlan === "LIFETIME" ? "Choose Lifetime ($100 USD) ✓" : "Choose Lifetime ($100 USD)"}
          </button>
        </div>

        {/* INTERACTIVE 3: CUSTOM PLAN BUILDER */}
        <div
          className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
            selectedPlan === "CUSTOM"
              ? "border-purple-500 bg-[#150f26] shadow-lg shadow-purple-900/25"
              : "border-purple-500/30 bg-[#0c1017] hover:border-purple-400/60"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1">
                <Sliders className="h-3 w-3" />
                <span>Custom Plan Builder</span>
              </span>
              {activePlanType === "CUSTOM" && (
                <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  YOUR ACTIVE PLAN
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-extrabold text-white">Pay-As-You-Need</h3>
              <div className="text-right">
                <div className="text-2xl font-black text-purple-300">
                  ${(clampedQty * unitConfig.usdPerUnit).toFixed(0)} USD
                </div>
                {selection.currency !== "USD" && selection.fxAvailable && (
                  <div className="text-[11px] font-mono text-emerald-300">
                    ≈ {formatTargetAmount(clampedQty * unitConfig.usdPerUnit)}
                  </div>
                )}
              </div>
            </div>

            {/* Duration Unit Selector */}
            <div className="grid grid-cols-4 gap-1.5">
              {(["hours", "days", "weeks", "months"] as BuilderDurationUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => handleUnitChange(u)}
                  className={`py-1.5 rounded-lg text-[11px] font-bold capitalize border cursor-pointer transition-all ${
                    durationUnit === u
                      ? "bg-purple-600 text-white border-purple-400"
                      : "bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>

            {/* Quantity Picker + Rates Table */}
            <div className="flex items-center justify-between gap-2 bg-black/30 p-2.5 rounded-xl border border-white/10">
              <div className="text-xs text-slate-300">
                Quantity ({unitConfig.unitLabelPlural}):
                <div className="text-[10px] text-slate-400">
                  ${unitConfig.usdPerUnit}/{unitConfig.unitLabelSingular.toLowerCase()} • {unitConfig.leadsPerUnit.toLocaleString()} leads/unit
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan("CUSTOM");
                    setQuantity(Math.max(1, clampedQty - 1));
                  }}
                  className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min={unitConfig.minQty}
                  max={unitConfig.maxQty}
                  value={clampedQty}
                  onChange={(e) => {
                    setSelectedPlan("CUSTOM");
                    setQuantity(Math.max(1, parseInt(e.target.value || "1", 10) || 1));
                  }}
                  className="w-14 text-center rounded-lg bg-[#0a0f1a] border border-white/15 py-1 text-xs font-bold text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan("CUSTOM");
                    setQuantity(Math.min(unitConfig.maxQty, clampedQty + 1));
                  }}
                  className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Toggle Google Maps inside Custom Plan */}
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-black/25 border border-white/10 text-xs cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200 font-semibold">
                <MapPin className="h-3.5 w-3.5 text-amber-400" />
                <span>Include Google Maps Lead Search</span>
              </span>
              <input
                type="checkbox"
                checked={includeMaps}
                onChange={(e) => {
                  setSelectedPlan("CUSTOM");
                  setIncludeMaps(e.target.checked);
                }}
                className="accent-purple-500 h-4 w-4"
              />
            </label>

            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-[11px] text-purple-200 space-y-1">
              <div className="flex justify-between">
                <span>Lead Allowance (Server Enforced):</span>
                <strong className="text-white">{(clampedQty * unitConfig.leadsPerUnit).toLocaleString()} leads</strong>
              </div>
              <div className="flex justify-between">
                <span>Daily Cold Email Cap:</span>
                <strong className="text-white">{unitConfig.dailyEmailLimit}/day</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCommitPlan("CUSTOM")}
            className={`w-full py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all mt-4 ${
              selectedPlan === "CUSTOM"
                ? "bg-purple-600 text-white shadow-md"
                : "bg-purple-600/25 hover:bg-purple-600/45 text-purple-200 border border-purple-500/40"
            }`}
          >
            {selectedPlan === "CUSTOM"
              ? `Use This Custom (${clampedQty} ${clampedQty === 1 ? unitConfig.unitLabelSingular : unitConfig.unitLabelPlural} • $${clampedQty * unitConfig.usdPerUnit}) ✓`
              : `Use This Custom ($${clampedQty * unitConfig.usdPerUnit} USD)`}
          </button>
        </div>
      </div>

      {/* Live Selected Order Summary Strip */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
            <Zap className="h-4 w-4" />
            <span>Selected Package Breakdown (Server-Verified Pricing)</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Rate Source: <span className="text-slate-200 font-medium">{selection.fxSource}</span>
            {selection.currency !== "USD" && selection.fxAvailable && (
              <span> (1 USD = {selection.exchangeRate} {selection.currency})</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
            <div className="text-[10px] text-slate-400">Selected Package</div>
            <div className="font-bold text-white truncate" title={selection.planLabel}>
              {selection.planLabel}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-400" />
              <span>Duration</span>
            </div>
            <div className="font-bold text-blue-300">
              {selection.durationUnit === "lifetime"
                ? "Lifetime (No Expiry)"
                : `${selection.durationValue} ${selection.durationUnit}`}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <Database className="h-3 w-3 text-purple-400" />
              <span>Lead Allowance</span>
            </div>
            <div className="font-bold text-purple-300">{selection.leadAllowance.toLocaleString()} leads</div>
          </div>
          <div className="p-2.5 rounded-xl bg-black/30 border border-white/10">
            <div className="text-[10px] text-slate-400">Google Maps</div>
            <div className={`font-bold ${selection.includeGoogleMaps ? "text-emerald-300" : "text-rose-300"}`}>
              {selection.includeGoogleMaps ? "Included" : "Not Included"}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35">
            <div className="text-[10px] text-emerald-200 font-semibold">Exact Payment Due</div>
            <div className="font-black text-white text-sm">
              {selection.currency === "USD" || !selection.fxAvailable
                ? `$${selection.priceUsd.toFixed(2)} USD`
                : `${formatTargetAmount(selection.priceUsd)} ($${selection.priceUsd} USD)`}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-amber-200/90">
          Your transfer must match the exact displayed amount above. Custom rate table: $1/hour (50 leads/hr) • $15/day (250 leads/day) • $50/week (1,000 leads/wk) • $75/month (5,000 leads/mo).
        </p>

        {ctaSlot && <div className="pt-2">{ctaSlot(selection)}</div>}
      </div>
    </div>
  );
}
