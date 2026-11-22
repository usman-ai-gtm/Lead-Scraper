"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ALL_193_COUNTRIES } from "@/lib/countries";
import { getSuggestedCitiesForCountry } from "@/lib/cities";
import { normalizePhoneNumber, buildWhatsAppClickToChatUrl } from "@/lib/phone-utils";
import {
  MapPin, Download, CheckCircle2, RefreshCw, Mail, Phone, Globe,
  ShieldCheck, ExternalLink, Building2, Database, Sparkles, Search,
  FileSpreadsheet, AlertCircle, AlertTriangle, Check, HelpCircle,
  Crown, Star, Lock
} from "lucide-react";
import { AiLeadResearchModal } from "@/components/leads/AiLeadResearchModal";

interface MapLead {
  id?: number;
  business_name: string;
  website: string;
  domain: string;
  email: string;
  email_source_url: string;
  email_status: string;
  phone: string;
  phone_source_url: string;
  phone_status: string;
  country: string;
  city: string;
  address: string;
  industry: string;
  category: string;
  rating?: number;
  rating_count?: number;
  place_id?: string;
  source: string;
  source_platform: string;
  source_url: string;
}

function GoogleMapsLeadComponent() {
  const searchParams = useSearchParams();
  const { user, isLocked, refreshUser } = useAuth();

  const isOwner = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" || (user as any)?.account_type === "MASTER_OWNER" || [
    "transaction000501@gmail.com",
    "admin@usmanai.com",
    "mu0602503@gmail.com",
    "admin@usmangtm.com",
    "selftest_founder_2026@usmanai.com",
  ].includes(String(user?.email || "").toLowerCase());

  const planUpper = String(user?.plan || "BASIC").toUpperCase();
  const isLifetime = isOwner || planUpper === "LIFETIME" || planUpper === "OWNER_LIFETIME";

  // Form State
  const [keyword, setKeyword] = useState<string>("");
  const [country, setCountry] = useState<string>("United States");
  const [suggestedCities, setSuggestedCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("ALL_CITIES");
  const [requestedQuantity, setRequestedQuantity] = useState<number>(50);
  const [contactFilter, setContactFilter] = useState<"BOTH" | "EMAIL_ONLY" | "PHONE_ONLY">("BOTH");

  // Execution State
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [qualifiedLeads, setQualifiedLeads] = useState<MapLead[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState<boolean>(false);
  const [selectedResearchLead, setSelectedResearchLead] = useState<any | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Initialize Suggested Cities
  useEffect(() => {
    const cities = getSuggestedCitiesForCountry(country);
    setSuggestedCities(cities);
    setSelectedCity("ALL_CITIES");
  }, [country]);

  // Handle Maps Extraction
  const handleStartExtraction = async () => {
    const isPreview = (user as any)?.account_type === "FREE_PREVIEW" || user?.status === "PREVIEW_ONLY";
    if (isPreview) {
      setToastMsg("FREE PREVIEW ACCOUNT — Explore the software before purchasing. Contact the Owner to get your fully activated account.");
      return;
    }

    if (isLocked) {
      setToastMsg("Your account is currently locked or expired. Please contact the Owner for activation (+923174383702).");
      return;
    }

    if (!isLifetime) {
      setToastMsg("⭐ Google Maps Lead Generator is exclusive to the $100 Lifetime Plan. Please upgrade via WhatsApp (+923174383702).");
      return;
    }

    if (!keyword.trim()) {
      setToastMsg("Please enter a target business niche (e.g. Dentists, Real Estate Agencies, Luxury Car Dealerships).");
      return;
    }

    setIsExtracting(true);
    setStatusMessage(`Scraping Google Maps & Places for "${keyword.trim()}" in ${selectedCity !== "ALL_CITIES" ? selectedCity + ", " : ""}${country} (Target: ${requestedQuantity} leads, Criteria: ${contactFilter})...`);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch("/api/leads/maps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          keyword: keyword.trim(),
          country,
          city: selectedCity !== "ALL_CITIES" ? selectedCity : "",
          requested_quantity: requestedQuantity,
          contact_filter: contactFilter,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Failed to extract Google Maps leads.");
      }

      const fresh: MapLead[] = data.leads || [];
      setQualifiedLeads(fresh);
      setStatusMessage(data.message || `Discovered ${fresh.length} leads.`);
      setToastMsg(`Successfully found ${fresh.length} verified Google Maps leads!`);
    } catch (err: any) {
      setToastMsg(`Extraction error: ${err?.message || "Unknown error"}`);
      setStatusMessage(`Error: ${err?.message || "Extraction failed"}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Export dataset
  const handleExport = async (format: "xlsx" | "pdf") => {
    if (qualifiedLeads.length === 0) {
      setToastMsg("No leads available to export. Run an extraction first.");
      return;
    }

    setExportLoading(true);
    setToastMsg(`Generating ${format.toUpperCase()} export...`);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch("/api/leads/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          format,
          leads: qualifiedLeads,
          metadata: {
            title: `Google Maps Leads - ${keyword.trim()} (${country})`,
            total_records: qualifiedLeads.length,
            export_target: `Google Maps: ${keyword.trim()}`,
          },
        }),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GoogleMaps_Leads_${keyword.replace(/\s+/g, "_")}_${Date.now()}.${format === "xlsx" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setToastMsg(`Export complete!`);
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

  return (
    <div className="space-y-6">
      {/* HEADER STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1.5">
              <Crown className="h-3 w-3 text-amber-400" />
              $100 Lifetime Exclusive Engine
            </span>
            <span className="text-[10px] font-semibold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/10">
              Google Places API • Direct Web Crawl
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <MapPin className="h-6 w-6 text-amber-400" />
            Google Maps Business Lead Generator
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Extract verified local businesses directly from Google Maps with real-time website contact discovery.
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

      {/* PLAN RESTRICTION NOTICE (IF ON BASIC PLAN) */}
      {!isLifetime && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <span>Google Maps Lead Generator is Reserved for $100 Lifetime Plan</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Your account is currently on the <strong>Basic Plan ($25/30 Days)</strong>. Upgrade to <strong>Lifetime ($100 One-Time)</strong> for permanent access, Google Maps local business intelligence, and AI Research!
              </p>
            </div>
          </div>
          <a
            href="https://wa.me/923174383702?text=Hi%20Usman%2C%20I%20want%20to%20upgrade%20to%20the%20%24100%20Lifetime%20Plan%20for%20Google%20Maps%20Lead%20Generator"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-bold text-xs shadow-md shrink-0 transition-all flex items-center gap-2"
          >
            <Crown className="h-4 w-4" />
            <span>Upgrade to Lifetime ($100)</span>
          </a>
        </div>
      )}

      {/* TOAST MESSAGE */}
      {toastMsg && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center justify-between">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* SEARCH CONFIGURATION PANEL */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Keyword Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Business Niche / Category <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. Dentists, Real Estate, Luxury Car Dealerships..."
                className="w-full bg-[#121824] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Country Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-[#121824] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
            >
              {ALL_193_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Searchable City Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target City / State</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-[#121824] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="ALL_CITIES">All Cities in {country}</option>
              {suggestedCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MUTUALLY EXCLUSIVE CONTACT FILTER SELECTOR */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Mutually Exclusive Contact Filter Criteria
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Both Email & Phone */}
            <div
              onClick={() => setContactFilter("BOTH")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                contactFilter === "BOTH"
                  ? "bg-amber-500/10 border-amber-500/50 shadow-glow-sm"
                  : "bg-white/[0.02] border-white/10 hover:border-white/20"
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                  contactFilter === "BOTH" ? "border-amber-400 bg-amber-400 text-black" : "border-slate-500"
                }`}
              >
                {contactFilter === "BOTH" && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-400" />
                  <span>+</span>
                  <Phone className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Both Email & Phone</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Returns businesses with verified email AND valid phone. Strict dual contact criteria.
                </p>
              </div>
            </div>

            {/* Email Only */}
            <div
              onClick={() => setContactFilter("EMAIL_ONLY")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                contactFilter === "EMAIL_ONLY"
                  ? "bg-blue-500/10 border-blue-500/50 shadow-glow-sm"
                  : "bg-white/[0.02] border-white/10 hover:border-white/20"
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                  contactFilter === "EMAIL_ONLY" ? "border-blue-400 bg-blue-400 text-black" : "border-slate-500"
                }`}
              >
                {contactFilter === "EMAIL_ONLY" && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-400" />
                  <span>Email Only</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Returns ONLY businesses with genuine public email discovered from official website crawl.
                </p>
              </div>
            </div>

            {/* Phone Only */}
            <div
              onClick={() => setContactFilter("PHONE_ONLY")}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                contactFilter === "PHONE_ONLY"
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-glow-sm"
                  : "bg-white/[0.02] border-white/10 hover:border-white/20"
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                  contactFilter === "PHONE_ONLY" ? "border-emerald-400 bg-emerald-400 text-black" : "border-slate-500"
                }`}
              >
                {contactFilter === "PHONE_ONLY" && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Phone Only</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Returns businesses with verified direct phone numbers listed on Google Maps.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* QUANTITY PRESETS & ACTION BUTTON */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Quantity Target:</span>
            {[50, 100, 500, 1000, 2000].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => setRequestedQuantity(qty)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  requestedQuantity === qty
                    ? "bg-amber-400 text-black shadow-sm"
                    : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                }`}
              >
                {qty}
              </button>
            ))}
          </div>

          <button
            onClick={handleStartExtraction}
            disabled={isExtracting || !keyword.trim() || !isLifetime}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-bold text-xs shadow-glow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isExtracting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-black" />
                <span>Extracting Google Maps Leads...</span>
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

      {/* STATUS BANNER */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-2">
          {isExtracting ? (
            <RefreshCw className="h-4 w-4 animate-spin shrink-0 text-amber-400" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* QUALIFIED LEADS RESULTS TABLE */}
      {qualifiedLeads.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-400" />
              <span>Extracted Google Maps Leads ({qualifiedLeads.length})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Filter: {contactFilter} • 100% Verified
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-white/[0.08] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Business Name & Maps Link</th>
                  <th className="py-3 px-3">Location & Address</th>
                  <th className="py-3 px-3">Rating</th>
                  <th className="py-3 px-3">Verified Email</th>
                  <th className="py-3 px-3">Phone & WhatsApp</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {qualifiedLeads.map((lead, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    {/* Business Name */}
                    <td className="py-3 px-3 text-xs">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{lead.business_name}</span>
                        {lead.source_url && (
                          <a
                            href={lead.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:text-amber-300"
                            title="View on Google Maps"
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
                    </td>

                    {/* Location */}
                    <td className="py-3 px-3 text-[11px] text-slate-300">
                      <div>{lead.city ? `${lead.city}, ${lead.country}` : lead.country}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[200px]" title={lead.address}>
                        {lead.address || "Address listed on Maps"}
                      </div>
                    </td>

                    {/* Rating */}
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

                    {/* Email */}
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
                              <span>Source: Website crawl</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No email discovered</span>
                      )}
                    </td>

                    {/* Phone & WhatsApp */}
                    <td className="py-3 px-3 text-xs font-mono">
                      {lead.phone ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300">{lead.phone}</span>
                          <a
                            href={buildWhatsAppClickToChatUrl(lead.phone, `Hello ${lead.business_name}, I saw your business on Google Maps.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors shrink-0"
                            title="Chat on WhatsApp"
                          >
                            WhatsApp
                          </a>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No phone listed</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedResearchLead(lead);
                          setIsResearchModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 rounded-lg transition-all"
                        title="AI Lead Research Agent"
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

      {/* AI RESEARCH MODAL */}
      <AiLeadResearchModal
        lead={selectedResearchLead}
        isOpen={isResearchModalOpen}
        onClose={() => {
          setIsResearchModalOpen(false);
          setSelectedResearchLead(null);
        }}
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
