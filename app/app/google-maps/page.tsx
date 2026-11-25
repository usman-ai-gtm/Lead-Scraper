"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMapsJob } from "@/lib/maps-job-context";
import { ALL_193_COUNTRIES } from "@/lib/countries";
import {
  MapPin, Download, CheckCircle2, RefreshCw, Mail, Phone, Globe,
  ExternalLink, Building2, Sparkles, Search, FileSpreadsheet,
  AlertTriangle, Check, Crown, Star, Lock, MessageSquare, StopCircle
} from "lucide-react";
import { AiLeadResearchModal } from "@/components/leads/AiLeadResearchModal";
import { MultiCountrySelector } from "@/components/leads/MultiCountrySelector";
import { MultiCitySelector, SelectedCityTarget } from "@/components/leads/MultiCitySelector";
import { WhatsAppModal } from "@/components/leads/WhatsAppModal";
import { LeadQualityBadge } from "@/components/leads/LeadQualityBadge";

function GoogleMapsLeadComponent() {
  const { user, isLocked } = useAuth();
  const { job, isRunning, actionError, clearError, startJob, cancelJob } = useMapsJob();

  const isOwner =
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    user?.account_type === "MASTER_OWNER";

  const planUpper = String(user?.plan || "BASIC").toUpperCase();
  const hasMapsAccess = Boolean(
    isOwner ||
      user?.google_maps_enabled ||
      user?.features?.google_maps ||
      planUpper === "LIFETIME" ||
      planUpper === "OWNER_LIFETIME"
  );
  const canMultiCountryMaps = Boolean(
    isOwner ||
      planUpper === "LIFETIME" ||
      planUpper === "OWNER_LIFETIME" ||
      (user?.features ? user.features.multi_country_maps : hasMapsAccess)
  );

  // Form State
  const [keyword, setKeyword] = useState<string>("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["United States"]);
  const [specificCitiesEnabled, setSpecificCitiesEnabled] = useState<boolean>(false);
  const [selectedCities, setSelectedCities] = useState<SelectedCityTarget[]>([]);
  const [requestedQuantity, setRequestedQuantity] = useState<number>(50);
  const [contactFilter, setContactFilter] = useState<
    "EMAIL_AND_PHONE" | "EMAIL_ONLY" | "PHONE_ONLY" | "EMAIL_OR_PHONE"
  >("EMAIL_OR_PHONE");

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [starting, setStarting] = useState<boolean>(false);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState<boolean>(false);
  const [selectedResearchLead, setSelectedResearchLead] = useState<any | null>(null);
  const [whatsAppLead, setWhatsAppLead] = useState<any | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Pre-fill form fields if a job is currently active or restored from session
  useEffect(() => {
    if (job && !keyword && job.keyword) {
      setKeyword(job.keyword);
      if (Array.isArray(job.countries) && job.countries.length > 0) {
        setSelectedCountries(job.countries);
      }
      setSpecificCitiesEnabled(Boolean(job.specific_cities_enabled));
      if (Array.isArray(job.cities) && job.cities.length > 0) {
        setSelectedCities(
          job.cities.map((c) => ({
            city: c.city,
            country: c.country,
            key: `${c.city}||${c.country}`,
          }))
        );
      }
    }
  }, [job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (actionError) {
      setToastMsg(actionError);
    }
  }, [actionError]);

  const qualifiedLeads = job?.live_leads || [];
  const countryStats = job?.country_stats || null;

  const scopeSummary = React.useMemo(() => {
    if (selectedCountries.length === 0) {
      return "No countries selected — please pick at least 1 target market.";
    }
    const countryPart =
      selectedCountries.length >= ALL_193_COUNTRIES.length
        ? `All ${ALL_193_COUNTRIES.length} Countries`
        : selectedCountries.length <= 3
        ? selectedCountries.join(", ")
        : `${selectedCountries.slice(0, 3).join(", ")} +${selectedCountries.length - 3} more`;

    if (!specificCitiesEnabled) {
      return `Whole Country Scope: ${countryPart} (All cities & nationwide coverage)`;
    }
    if (selectedCities.length === 0) {
      return `Specific Cities Mode ON for ${countryPart} — select 1 or more cities below.`;
    }
    const cityList =
      selectedCities.length <= 4
        ? selectedCities.map((c) => `${c.city} (${c.country})`).join(", ")
        : `${selectedCities.slice(0, 4).map((c) => c.city).join(", ")} +${selectedCities.length - 4} more cities`;
    return `Specific Cities (${selectedCities.length}): ${cityList}`;
  }, [selectedCountries, specificCitiesEnabled, selectedCities]);

  const handleStartExtraction = async () => {
    clearError();
    const isPreview = user?.account_type === "FREE_PREVIEW" || user?.status === "PREVIEW_ONLY";
    if (isPreview) {
      setToastMsg("FREE PREVIEW ACCOUNT — Explore the software before purchasing. Contact the Owner (+923174383702) to activate.");
      return;
    }

    if (isLocked) {
      setToastMsg("Your account is currently locked or expired. Please contact the Owner (+923174383702) to renew.");
      return;
    }

    if (!hasMapsAccess) {
      setToastMsg(`Google Maps Lead Generator is not included in your current ${user?.plan_label || "plan"}. Upgrade to Lifetime ($100) or request a Custom Plan with Google Maps.`);
      return;
    }

    if (!keyword.trim()) {
      setToastMsg("Please enter a target business niche or keyword (e.g. Dentists, Auto Repair, Freight Brokers).");
      return;
    }

    if (selectedCountries.length === 0) {
      setToastMsg("Please select at least 1 target country.");
      return;
    }

    if (selectedCountries.length > 1 && !canMultiCountryMaps) {
      setToastMsg(`Multi-country Google Maps search is disabled on your ${user?.plan_label || "Custom Plan"}. Select a single country or ask the Owner to enable Multi-Country Google Maps.`);
      return;
    }

    if (specificCitiesEnabled && selectedCities.length === 0) {
      setToastMsg("Select at least 1 specific city, or uncheck 'Select Specific Cities' for whole-country search.");
      return;
    }

    setStarting(true);
    try {
      await startJob({
        keyword: keyword.trim(),
        countries: selectedCountries,
        specific_cities_enabled: specificCitiesEnabled,
        cities: selectedCities,
        requested_quantity: requestedQuantity,
        contact_requirement: contactFilter,
      });
      setToastMsg("Live Google Maps research started! Leads auto-save as batches complete.");
    } catch (err: any) {
      setToastMsg(err?.message || "Failed to start Google Maps extraction.");
    } finally {
      setStarting(false);
    }
  };

  const handleExport = async (format: "xlsx" | "pdf") => {
    if (qualifiedLeads.length === 0) {
      setToastMsg("No leads available to export yet.");
      return;
    }

    setExportLoading(true);
    setToastMsg(`Generating ${format.toUpperCase()} export...`);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch("/api/leads/export", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token && token !== "null" ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          format,
          leads: qualifiedLeads,
          meta: {
            keyword: job?.keyword || keyword.trim(),
            country: selectedCountries.join(", "),
            total_records: qualifiedLeads.length,
            export_target: `Google Maps: ${job?.keyword || keyword.trim()}`,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = "Export failed";
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.detail || parsed.error || parsed.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GoogleMaps_Leads_${(job?.keyword || keyword || "Export").replace(/[^a-zA-Z0-9]+/g, "_")}_${Date.now()}.${format === "xlsx" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setToastMsg(`Export complete (${qualifiedLeads.length} leads)!`);
    } catch (err: any) {
      setToastMsg(`Export failed: ${err?.message || "Error"}`);
    } finally {
      setExportLoading(false);
    }
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const progressPct =
    job && job.target_count > 0
      ? Math.min(100, Math.round(((job.eligible_count || 0) / job.target_count) * 100))
      : 0;

  return (
    <div className="space-y-6">
      {/* HEADER STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1.5">
              <Crown className="h-3 w-3 text-amber-400" />
              {user?.plan_label || (hasMapsAccess ? "Maps Enabled Plan" : "Maps Upgrade Required")}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/10">
              Serper Places Engine • Direct Web Contact Discovery
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <MapPin className="h-6 w-6 text-amber-400" />
            Google Maps Business Lead Generator
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Live local business discovery across selected countries or specific cities with real-time website email &amp; phone extraction.
          </p>
        </div>

        {qualifiedLeads.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleExport("pdf")}
              disabled={exportLoading}
              className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-rose-400" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={() => handleExport("xlsx")}
              disabled={exportLoading}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Excel</span>
            </button>
          </div>
        )}
      </div>

      {/* ENTITLEMENT RESTRICTION BANNER */}
      {!hasMapsAccess && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-300">
                Google Maps Lead Generator Is Locked on Your Current Plan
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Your account is currently on <strong>{user?.plan_label || "Basic Plan"}</strong> without Google Maps access. Upgrade to the <strong>$100 Lifetime Plan</strong> or request a <strong>Custom Plan with Google Maps</strong> via WhatsApp.
              </p>
            </div>
          </div>
          <a
            href="https://wa.me/923174383702?text=Hi%20Usman%2C%20I%20want%20to%20unlock%20Google%20Maps%20Lead%20Generator%20($100%20Lifetime%20or%20Custom%20Plan)"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-bold text-xs shadow-md shrink-0 transition-all flex items-center gap-2"
          >
            <Crown className="h-4 w-4" />
            <span>Unlock Maps Access</span>
          </a>
        </div>
      )}

      {/* TOAST MESSAGE */}
      {toastMsg && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center justify-between gap-2">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white text-xs underline shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* SEARCH CONFIGURATION PANEL */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Keyword Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Business Niche / Keyword <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={keyword}
                disabled={isRunning}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. Dentists, Cafés, B2B Logistics, Solar..."
                className="w-full bg-[#121824] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {/* Multi-Country Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Target Country / Countries {!canMultiCountryMaps && "(Single Country Only on Plan)"}
            </label>
            <MultiCountrySelector
              selectedCountries={selectedCountries}
              singleSelect={!canMultiCountryMaps}
              onChange={(newCountries) => setSelectedCountries(newCountries)}
            />
          </div>

          {/* Multi-City Optional Toggle Selector */}
          <div>
            <MultiCitySelector
              selectedCountries={selectedCountries}
              specificCitiesEnabled={specificCitiesEnabled}
              onToggleSpecificCities={setSpecificCitiesEnabled}
              selectedCities={selectedCities}
              onChangeCities={setSelectedCities}
            />
          </div>
        </div>

        {/* SELECTED GEOGRAPHIC SCOPE SUMMARY */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5 text-[11px] text-slate-300 flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="font-semibold text-white">Geographic Scope:</span>
          <span>{scopeSummary}</span>
        </div>

        {/* MUTUALLY EXCLUSIVE CONTACT FILTER SELECTOR */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Contact Channel Filter Criteria
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              {
                id: "EMAIL_OR_PHONE",
                label: "Email OR Phone",
                desc: "Matches businesses with either a syntax-checked email or valid phone.",
                color: "purple",
              },
              {
                id: "EMAIL_AND_PHONE",
                label: "Email AND Phone",
                desc: "Requires BOTH syntax-checked website email AND phone number.",
                color: "amber",
              },
              {
                id: "EMAIL_ONLY",
                label: "Email Only",
                desc: "Returns only businesses where a real email was found on their site/index.",
                color: "blue",
              },
              {
                id: "PHONE_ONLY",
                label: "Phone Only",
                desc: "Returns businesses with a valid phone listed (ideal for local Maps volume).",
                color: "emerald",
              },
            ].map((opt) => {
              const active = contactFilter === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => !isRunning && setContactFilter(opt.id as any)}
                  className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                    isRunning ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                  } ${
                    active
                      ? "bg-amber-500/10 border-amber-500/50 shadow-glow-sm"
                      : "bg-white/[0.02] border-white/10 hover:border-white/20"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      active ? "border-amber-400 bg-amber-400 text-black" : "border-slate-500"
                    }`}
                  >
                    {active && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{opt.label}</div>
                    <p className="text-[10px] text-slate-400 mt-1">{opt.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* QUANTITY PRESETS & ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-semibold">Quantity Target:</span>
            {[25, 50, 100, 250, 500, 1000].map((qty) => (
              <button
                key={qty}
                type="button"
                disabled={isRunning}
                onClick={() => setRequestedQuantity(qty)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                  requestedQuantity === qty
                    ? "bg-amber-400 text-black shadow-sm"
                    : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                }`}
              >
                {qty}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            {isRunning && (
              <button
                type="button"
                onClick={cancelJob}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <StopCircle className="h-4 w-4" />
                <span>Stop &amp; Keep Leads</span>
              </button>
            )}

            <button
              onClick={handleStartExtraction}
              disabled={isRunning || starting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-bold text-xs shadow-glow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isRunning || starting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-black" />
                  <span>Live Research Running...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-black" />
                  <span>Start Google Maps Extraction</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* LIVE PROGRESS & JOB TELEMETRY PANEL */}
      {job && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {job.status === "RUNNING" ? (
                <RefreshCw className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
              ) : job.status === "CANCELLED" ? (
                <StopCircle className="h-4 w-4 text-amber-400 shrink-0" />
              ) : job.status === "FAILED" ? (
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              )}
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>{job.keyword}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-slate-300">
                    {job.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">{job.progress_message}</p>
              </div>
            </div>

            {job.status === "RUNNING" && (
              <div className="text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                Continues running while you browse other pages in this session
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>
                Progress: {job.eligible_count} / {job.target_count} target ({progressPct}%)
              </span>
              <span>
                Batches: {job.queue_cursor || 0} / {job.queue_total || 1}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${Math.max(4, progressPct)}%` }}
              />
            </div>
          </div>

          {/* Live Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[10px] text-slate-400">Listings Scanned</div>
              <div className="font-mono font-bold text-white text-sm">{job.candidates_processed || 0}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-[10px] text-emerald-300">Qualified &amp; Saved</div>
              <div className="font-mono font-bold text-emerald-400 text-sm">{job.eligible_count || 0}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="text-[10px] text-amber-300">Duplicates Excluded</div>
              <div className="font-mono font-bold text-amber-400 text-sm">{job.duplicates_skipped || 0}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[10px] text-slate-400">Missing Contact</div>
              <div className="font-mono font-bold text-slate-200 text-sm">{job.missing_contact_skipped || 0}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[10px] text-slate-400">Provider Errors</div>
              <div className={`font-mono font-bold text-sm ${(job.errors_count || 0) > 0 ? "text-rose-400" : "text-slate-300"}`}>
                {job.errors_count || 0}
              </div>
            </div>
          </div>

          {job.shortfall_reason && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
              <strong>Result Summary:</strong> {job.shortfall_reason}
            </div>
          )}

          {Array.isArray(job.provider_errors) && job.provider_errors.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-[11px] text-rose-200 space-y-1">
              <div className="font-bold">Provider Diagnostics:</div>
              {job.provider_errors.map((err, i) => (
                <div key={i} className="font-mono text-[10px]">• {err}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COUNTRY LEVEL PROGRESS & STATS BREAKDOWN */}
      {countryStats && Object.keys(countryStats).length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-400" />
              <span>Country Metrics Breakdown</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              {Object.keys(countryStats).length} Markets Scanned
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(countryStats).map(([cntry, stats]) => (
              <div key={cntry} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1.5 text-xs">
                <div className="font-bold text-white truncate">{cntry}</div>
                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                  <div className="text-slate-400">Found: <span className="text-white font-bold">{stats.discovered}</span></div>
                  <div className="text-slate-400">Saved: <span className="text-emerald-400 font-bold">{stats.eligible}</span></div>
                  <div className="text-slate-400">Duplicates: <span className="text-amber-400">{stats.duplicates}</span></div>
                  <div className="text-slate-400">Skipped: <span className="text-slate-300">{stats.missing_contact}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUALIFIED LEADS RESULTS TABLE */}
      {qualifiedLeads.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-400" />
              <span>Discovered Google Maps Leads ({qualifiedLeads.length})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Auto-saved to Workspace
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-white/[0.08] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Business Name &amp; Maps Link</th>
                  <th className="py-3 px-3">Location &amp; Address</th>
                  <th className="py-3 px-3">Rating</th>
                  <th className="py-3 px-3">Email (Syntax Checked)</th>
                  <th className="py-3 px-3">Phone &amp; WhatsApp</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {qualifiedLeads.map((lead: any, idx: number) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 text-xs">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{lead.business_name}</span>
                        {lead.source_url && (
                          <a
                            href={lead.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:text-amber-300"
                            title="Open Google Maps search link"
                          >
                            <ExternalLink className="h-3 w-3 inline" />
                          </a>
                        )}
                      </div>
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Globe className="h-3 w-3 inline" />
                          <span>{lead.domain || lead.website}</span>
                        </a>
                      )}
                      <div className="mt-1">
                        <LeadQualityBadge lead={lead} />
                      </div>
                    </td>

                    <td className="py-3 px-3 text-[11px] text-slate-300">
                      <div>{lead.city ? `${lead.city}, ${lead.country}` : lead.country}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[200px]" title={lead.address}>
                        {lead.address || "Address listed in Places data"}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-xs">
                      {lead.rating ? (
                        <div className="flex items-center gap-1 text-amber-400 font-bold">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{lead.rating}</span>
                          {lead.rating_count && (
                            <span className="text-[10px] text-slate-500 font-normal">({lead.rating_count})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">Unrated</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-xs">
                      {lead.email ? (
                        <div>
                          <div className="flex items-center gap-1.5 font-mono text-emerald-400">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span>{lead.email}</span>
                            <button
                              onClick={() => copyEmail(lead.email)}
                              className="text-[10px] text-slate-400 hover:text-white underline ml-1"
                            >
                              {copiedEmail === lead.email ? "Copied" : "Copy"}
                            </button>
                          </div>
                          {lead.email_source_url && (
                            <a
                              href={lead.email_source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-slate-500 hover:text-blue-400 flex items-center gap-0.5 mt-0.5 truncate max-w-[180px]"
                              title={lead.email_source_url}
                            >
                              <ExternalLink className="h-2.5 w-2.5 inline" />
                              <span>Source: Public website</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No email found</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-xs font-mono">
                      {lead.phone ? (
                        <div className="space-y-1">
                          <span className="text-slate-300 block">{lead.phone}</span>
                          <button
                            type="button"
                            onClick={() => setWhatsAppLead(lead)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Open WhatsApp Draft"
                          >
                            <MessageSquare className="h-2.5 w-2.5" />
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No phone listed</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedResearchLead(lead);
                          setIsResearchModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 rounded-lg transition-all"
                      >
                        AI Research
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AiLeadResearchModal
        lead={selectedResearchLead}
        isOpen={isResearchModalOpen}
        onClose={() => {
          setIsResearchModalOpen(false);
          setSelectedResearchLead(null);
        }}
      />

      <WhatsAppModal
        isOpen={!!whatsAppLead}
        onClose={() => setWhatsAppLead(null)}
        lead={whatsAppLead}
      />
    </div>
  );
}

export default function GoogleMapsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Google Maps Lead Generator...</div>}>
      <GoogleMapsLeadComponent />
    </Suspense>
  );
}
