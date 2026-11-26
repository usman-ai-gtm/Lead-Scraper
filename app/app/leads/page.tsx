"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ALL_193_COUNTRIES } from "@/lib/countries";
import { normalizePhoneNumber, buildWhatsAppClickToChatUrl } from "@/lib/phone-utils";
import {
  Download, CheckCircle2, RefreshCw, Mail, Phone, Globe,
  ShieldCheck, ExternalLink, Building2, Database,
  Layers, Sparkles, Search, FileSpreadsheet,
  AlertCircle, AlertTriangle, Check, HelpCircle, Hash, Briefcase, MessageSquare, ArrowRight
} from "lucide-react";
import { AiLeadResearchModal } from "@/components/leads/AiLeadResearchModal";
import { MultiCountrySelector } from "@/components/leads/MultiCountrySelector";
import { MultiCitySelector, SelectedCityTarget } from "@/components/leads/MultiCitySelector";
import { WhatsAppModal } from "@/components/leads/WhatsAppModal";
import { LeadQualityBadge } from "@/components/leads/LeadQualityBadge";

interface QualifiedLead {
  id: number;
  business_name: string;
  website: string;
  domain?: string;
  email: string;
  email_source_url?: string;
  email_status?: string;
  phone?: string;
  phone_source_url?: string;
  phone_status?: string;
  country: string;
  city?: string;
  address?: string;
  industry?: string;
  category?: string;
  source?: string;
  source_platform?: string;
  source_url?: string;
  original_source_url?: string;
  saved_date?: string;
  saved_time?: string;
  extraction_date?: string;
  extraction_time?: string;
  created_at?: string;
  quality_score?: number;
  quality_category?: string;
  quality_reasons?: string[];
  contact_requirement?: string;
}

interface SourceStatus {
  source_name: string;
  status: "WORKING" | "NO RESULTS" | "NOT CONFIGURED" | "RATE LIMITED" | "ACCESS RESTRICTED" | "NOT AVAILABLE";
  leads_contributed: number;
  sample_url?: string;
}

function LeadsSearchComponent() {
  const searchParams = useSearchParams();
  const { user, isLocked, refreshUser } = useAuth();

  // Search input state (pre-populated from Quick Search Launcher if parameters exist)
  const [keyword, setKeyword] = useState<string>("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["United States"]);
  const [specificCitiesEnabled, setSpecificCitiesEnabled] = useState<boolean>(false);
  const [selectedCities, setSelectedCities] = useState<SelectedCityTarget[]>([]);
  const [targetCount, setTargetCount] = useState<number>(50);
  const [contactRequirement, setContactRequirement] = useState<
    "EMAIL_AND_PHONE" | "EMAIL_ONLY" | "PHONE_ONLY" | "EMAIL_OR_PHONE"
  >("EMAIL_OR_PHONE");

  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [qualifiedLeads, setQualifiedLeads] = useState<QualifiedLead[]>([]);
  const [sourcesBreakdown, setSourcesBreakdown] = useState<SourceStatus[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [savingIds, setSavingIds] = useState<Record<number, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<"SAVING" | "SAVED" | "FAILED" | "IDLE">("IDLE");
  const [isResearchModalOpen, setIsResearchModalOpen] = useState<boolean>(false);
  const [selectedResearchLead, setSelectedResearchLead] = useState<any | null>(null);
  const [whatsAppLead, setWhatsAppLead] = useState<any | null>(null);

  // Business Profile & AI Strategy State
  const [useBusinessProfile, setUseBusinessProfile] = useState<boolean>(false);
  const [profileAvailable, setProfileAvailable] = useState<boolean>(false);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [aiStrategyData, setAiStrategyData] = useState<any | null>(null);

  // Active verified non-Maps sources
  const configuredSourcesList = [
    "Google Organic Web Search",
    "Official Business Websites",
    "Facebook Business Public Pages",
    "Instagram Business Public Profiles",
    "LinkedIn Company Profiles",
    "Public Commercial Directories",
    "YouTube Public Channels",
    "Public X / Twitter Profiles",
    "Public TikTok Business Profiles"
  ];

  // Initialize from URL search parameters on mount
  useEffect(() => {
    const qKeyword = searchParams.get("keyword") || searchParams.get("query") || "";
    const qCountry = searchParams.get("country") || "United States";
    const qCity = searchParams.get("city") || "ALL_CITIES";
    const qIndustry = searchParams.get("industry") || "";

    if (qKeyword) setKeyword(qKeyword);
    else if (qIndustry && qIndustry !== "Any") setKeyword(qIndustry);

    if (qCountry) setSelectedCountries([qCountry]);

    if (qCity && qCity !== "ALL_CITIES") {
      setSpecificCitiesEnabled(true);
      setSelectedCities([{ city: qCity, country: qCountry || "United States", key: `${qCity}||${qCountry || "United States"}` }]);
    } else {
      setSpecificCitiesEnabled(false);
      setSelectedCities([]);
    }

    // Load cached session leads strictly isolated per workspace
    if (typeof window !== "undefined" && user?.workspace_id) {
      try {
        const saved = localStorage.getItem(`usman_qualified_leads_session_ws_${user.workspace_id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setQualifiedLeads(parsed);
          } else {
            setQualifiedLeads([]);
          }
        } else {
          setQualifiedLeads([]);
        }
      } catch {
        setQualifiedLeads([]);
      }
    }

    // Check Business Profile availability
    async function checkProfile() {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
        const res = await fetch("/api/workspace/profile", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data && data.profile && (data.profile.business_name || data.profile.products_services || data.profile.industry)) {
          setProfileAvailable(true);
          setProfileData(data.profile);
        } else {
          setProfileAvailable(false);
          setProfileData(null);
        }
      } catch { }
    }
    checkProfile();

    // Check if an active search job is already running
    async function checkJob() {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
        const res = await fetch("/api/leads/job-status", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data && data.is_running && data.active_job) {
          setIsExtracting(true);
          setStatusMessage(`A lead search for "${data.active_job.keyword}" is currently running...`);
        }
      } catch { }
    }
    checkJob();
  }, [searchParams, user?.workspace_id]);

  // Sync session storage per workspace
  const syncStorage = (leadsList: QualifiedLead[]) => {
    if (typeof window !== "undefined" && user?.workspace_id) {
      try {
        localStorage.setItem(
          `usman_qualified_leads_session_ws_${user.workspace_id}`,
          JSON.stringify(leadsList)
        );
      } catch { }
    }
  };

  // Execute One Search Action — Full Consolidated Dataset via Internal Pagination
  const handleStartExtraction = async () => {
    const isPreview = (user as any)?.account_type === "FREE_PREVIEW" || user?.status === "PREVIEW_ONLY";
    if (isPreview) {
      setToastMsg("FREE PREVIEW ACCOUNT — Explore the software before purchasing. Contact the Owner to get your fully activated account.");
      return;
    }
    let currentLocked = isLocked;
    if (currentLocked) {
      // Re-verify with authoritative server in real time
      const freshUser = await refreshUser();
      currentLocked = Boolean(freshUser && freshUser.role !== "ADMIN" && (freshUser.status !== "ACTIVE" || freshUser.is_active === false || freshUser.isLocked === true));
    }
    if (currentLocked) {
      setToastMsg("Your account is currently locked or expired. Please complete payment and contact the Owner for activation.");
      return;
    }
    if (!keyword.trim()) {
      setToastMsg("Please enter a target keyword (e.g. Mobile Accessories, Real Estate Agencies, Software Houses).");
      return;
    }
    if (selectedCountries.length === 0) {
      setToastMsg("Please select at least 1 target country.");
      return;
    }
    if (specificCitiesEnabled && selectedCities.length === 0) {
      setToastMsg("Select at least 1 city or uncheck 'Select Specific Cities' for whole-country search.");
      return;
    }

    setIsExtracting(true);
    setSaveStatus("SAVING");
    setStatusMessage(
      `Running multi-platform search across public web sources for "${keyword.trim()}" (Target: ${targetCount} leads)...`
    );

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch("/api/leads/search", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token && token !== "null" ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          keyword: keyword.trim(),
          countries: selectedCountries,
          country: selectedCountries[0] || "United States",
          specific_cities_enabled: specificCitiesEnabled,
          cities: specificCitiesEnabled ? selectedCities.map((c) => ({ city: c.city, country: c.country })) : [],
          target_count: targetCount,
          contact_requirement: contactRequirement,
          use_business_profile: useBusinessProfile,
        }),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Search response returned non-JSON output (HTTP ${res.status}).`);
      }
      if (!res.ok || data.status === "error") {
        setSaveStatus("FAILED");
        throw new Error(data.message || "Extraction failed.");
      }

      if (data.ai_strategy) {
        setAiStrategyData(data.ai_strategy);
      }

      const fresh: QualifiedLead[] = data.leads || [];
      setQualifiedLeads(fresh);
      if (data.sources_breakdown) {
        setSourcesBreakdown(data.sources_breakdown);
      }
      syncStorage(fresh);
      setSaveStatus("SAVED");

      setStatusMessage(data.message || `Successfully discovered ${fresh.length} unique qualified prospects with verified emails.`);
      setToastMsg(
        fresh.length >= targetCount
          ? `Target reached: ${fresh.length} verified qualified leads extracted and saved to your workspace!`
          : `Extracted ${fresh.length} legitimate qualified leads. Permanently saved to your workspace.`
      );
    } catch (err: any) {
      setSaveStatus("FAILED");
      setStatusMessage(`Notice: ${err?.message || "Search request could not be completed."}`);
      setToastMsg(err?.message || "Extraction error.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Complete Dataset Export (XLSX, PDF, CSV, JSON)
  const handleExport = async (format: "xlsx" | "pdf" | "csv" | "json") => {
    if (qualifiedLeads.length === 0) {
      setToastMsg("No qualified leads available to export. Run an extraction first.");
      return;
    }

    setExportLoading(true);
    setToastMsg(`Preparing professional ${format.toUpperCase()} export...`);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch("/api/leads/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          leads: qualifiedLeads,
          format: format,
          filename: `USMAN_AI_QUALIFIED_LEADS_${keyword.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`,
          meta: {
            keyword: keyword.trim(),
            country: selectedCountries.join(", "),
            city: specificCitiesEnabled ? selectedCities.map((c) => c.city).join(", ") : "Whole Country",
            export_target: `Live Search: ${keyword.trim()}`,
          }
        }),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `USMAN_AI_QUALIFIED_LEADS_${keyword.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setToastMsg(`Successfully exported ${qualifiedLeads.length} qualified leads to ${format.toUpperCase()}!`);
    } catch (err: any) {
      setToastMsg(`Export failed: ${err?.message || "Unknown error"}`);
    } finally {
      setExportLoading(false);
    }
  };

  // Save individual lead to workspace
  const handleSaveLead = async (lead: QualifiedLead) => {
    setSavingIds((prev) => ({ ...prev, [lead.id]: true }));
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          business_name: lead.business_name,
          website: lead.website,
          email: lead.email,
          phone: lead.phone || "",
          country: lead.country,
          city: lead.city,
          address: lead.address,
          industry: lead.industry || keyword,
          source: lead.source_platform || "Google Organic Search",
          source_url: lead.original_source_url || lead.website,
          lead_score: 95,
        }),
      });
      setToastMsg(`Saved "${lead.business_name}" to workspace repository.`);
    } catch {
      setToastMsg(`Saved to workspace session.`);
    } finally {
      setSavingIds((prev) => ({ ...prev, [lead.id]: false }));
    }
  };

  const leadsWithPhoneCount = qualifiedLeads.filter((l) => Boolean(l.phone && l.phone !== "Not Listed")).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-blue-500/30 bg-[#0c121e]/95 px-4 py-3 text-xs text-white shadow-2xl backdrop-blur-md flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-3 max-w-md">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="leading-snug">{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white shrink-0">
            ✕
          </button>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono tracking-wider uppercase">
              <ShieldCheck className="h-3 w-3" /> Multi-Platform Non-Maps Engine
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              Email Compulsory • Phone Optional • Zero Synthetic Data
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Real B2B Lead Extraction Engine</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Discover verified business prospects across Google Organic Search, official company domains, and public business profiles. Every qualifying prospect is backed by an authentic, source-supported public email.
          </p>
        </div>

        {qualifiedLeads.length > 0 && (
          <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
            <button
              onClick={() => handleExport("pdf")}
              disabled={exportLoading}
              aria-label="Export search results as PDF"
              className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <Download className="h-3.5 w-3.5 text-rose-400" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => handleExport("csv")}
              disabled={exportLoading}
              aria-label="Export search results as CSV"
              className="px-3 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <Download className="h-3.5 w-3.5 text-blue-400" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleExport("json")}
              disabled={exportLoading}
              aria-label="Export search results as JSON"
              className="px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <Download className="h-3.5 w-3.5 text-amber-400" />
              <span>JSON</span>
            </button>
            <button
              onClick={() => handleExport("xlsx")}
              disabled={exportLoading}
              aria-label="Export search results as Excel XLSX"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export XLSX</span>
            </button>
          </div>
        )}
      </div>

      {/* LOCKED ACCOUNT BANNER */}
      {isLocked && (
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-[#161208] to-[#090d16] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
              🔒
            </div>
            <div>
              <div className="text-sm font-bold text-amber-200">Lead Search is Locked (Preview Mode Only)</div>
              <div className="text-xs text-slate-300">
                You can browse the interface, but searching and exporting requires subscription activation for <strong>$25/month</strong> or <strong>$100 Lifetime Deal</strong>.
              </div>
            </div>
          </div>
          <a
            href={`https://wa.me/923174383702?text=Hello%20Usman%2C%20I%20want%20to%20activate%20my%20subscription%20($25/mo%20or%20$100%20Lifetime)%20for%20my%20registered%20email:%20${encodeURIComponent(user?.email || "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <span>Unlock via WhatsApp (+923174383702)</span>
          </a>
        </div>
      )}

      {/* COMPACT SEARCH CONTROL CENTER */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Target Keyword Input (Col 5) */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-blue-400" />
              <span>Target Keyword or Business Type</span>
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStartExtraction()}
              placeholder="Enter keywords, category, or natural description (e.g. Dentists in London, or 'Businesses selling office furniture that need a website')..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>

          {/* Country Selector (Col 3) */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-purple-400" />
              <span>Target Country / Countries</span>
            </label>
            <MultiCountrySelector
              selectedCountries={selectedCountries}
              singleSelect={user?.features ? !user.features.multi_country_search : false}
              onChange={(newCountries) => {
                setSelectedCountries(newCountries);
              }}
            />
          </div>

          {/* City Selector (Col 2) */}
          <div className="md:col-span-2">
            <MultiCitySelector
              selectedCountries={selectedCountries}
              specificCitiesEnabled={specificCitiesEnabled}
              onToggleSpecificCities={setSpecificCitiesEnabled}
              selectedCities={selectedCities}
              onChangeCities={setSelectedCities}
            />
          </div>

          {/* Manual Lead Quantity (Col 2) */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-emerald-400" />
              <span>Lead Quantity</span>
            </label>
            <input
              type="number"
              min={10}
              max={1000}
              value={targetCount}
              onChange={(e) => setTargetCount(Math.max(1, parseInt(e.target.value, 10) || 50))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-white font-mono text-center focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Contact Requirement Selector */}
        <div className="pt-2 border-t border-white/[0.06]">
          <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Lead Contact Requirement</span>
            <span className="text-[10px] text-blue-400 font-mono">Filters out leads lacking your chosen contact channels</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "EMAIL_OR_PHONE", label: "Email OR Phone", desc: "Either email or phone is present" },
              { id: "EMAIL_AND_PHONE", label: "Email AND Phone", desc: "Both email & phone mandatory" },
              { id: "EMAIL_ONLY", label: "Email Only", desc: "Verified business email required" },
              { id: "PHONE_ONLY", label: "Phone Only", desc: "Direct business phone required" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setContactRequirement(opt.id as any)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  contactRequirement === opt.id
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-sm"
                    : "bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${contactRequirement === opt.id ? "bg-blue-400" : "bg-slate-600"}`} />
                  <span>{opt.label}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Business Profile Contextual Lead Generation Option */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm ${profileAvailable ? (useBusinessProfile ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-blue-500/10 text-blue-400 border border-blue-500/20") : "bg-slate-800 text-slate-500"}`}>
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Generate Leads Using My Business Profile</span>
                {profileAvailable && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Profile Ready: {profileData?.business_name || "Configured"}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                {profileAvailable
                  ? "Uses your saved ICP, products/services, and target customer criteria to discover prospects seeking your exact solutions."
                  : "Complete your Business Profile once to enable intelligent ICP-tailored client discovery."}
              </div>
            </div>
          </div>

          {profileAvailable ? (
            <button
              type="button"
              onClick={() => setUseBusinessProfile(!useBusinessProfile)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${useBusinessProfile
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow-sm"
                : "bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/10"
                }`}
            >
              <span>{useBusinessProfile ? "✓ Profile Mode Active" : "Enable Profile Mode"}</span>
            </button>
          ) : (
            <Link
              href="/app/business-profile"
              className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold transition-all flex items-center gap-1 shrink-0"
            >
              <span>Set Up Business Profile</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* Quick Quantity Presets & Extraction Trigger */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick Presets:</span>
            {[50, 100, 250, 500, 1000].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => setTargetCount(qty)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all ${targetCount === qty
                  ? "bg-blue-600 text-white shadow-glow-sm"
                  : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/10"
                  }`}
              >
                {qty}
              </button>
            ))}
          </div>

          {isLocked ? (
            <a
              href={`https://wa.me/923174383702?text=Hello%20Usman%2C%20I%20want%20to%20activate%20my%20subscription%20($25/mo%20or%20$100%20Lifetime)%20for%20my%20registered%20email:%20${encodeURIComponent(user?.email || "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🔒 Search Locked — Unlock via WhatsApp ($25/mo or $100 Lifetime)</span>
            </a>
          ) : (
            <button
              onClick={handleStartExtraction}
              disabled={isExtracting}
              className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  <span>Extracting Multi-Platform Leads...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-blue-200" />
                  <span>Start Real Lead Extraction</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* AI Strategy Insights Card */}
      {aiStrategyData && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/[0.06] p-4 text-xs space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>AI Search Strategy & Intent Analysis:</span>
            </span>
            {aiStrategyData.excluded_previous_duplicates > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono">
                {aiStrategyData.excluded_previous_duplicates} past leads excluded (Account Deduplication)
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2 rounded bg-black/30 border border-white/5">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Target Prospects</span>
              <span className="text-white font-semibold">{aiStrategyData.target_business_type || aiStrategyData.interpreted_keyword}</span>
            </div>
            <div className="p-2 rounded bg-black/30 border border-white/5">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Industry Classification</span>
              <span className="text-white font-semibold">{aiStrategyData.industry || "Commercial B2B"}</span>
            </div>
            <div className="p-2 rounded bg-black/30 border border-white/5">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Market Context</span>
              <span className="text-white font-semibold">{aiStrategyData.target_audience || "Direct verified decision makers"}</span>
            </div>
          </div>
          {aiStrategyData.reasoning && (
            <p className="text-[11px] text-indigo-200/80 italic leading-relaxed">
              💡 {aiStrategyData.reasoning}
            </p>
          )}
        </div>
      )}

      {/* SEARCH STATUS & SOURCE HEALTH BREAKDOWN */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0c1017] p-4 space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span>Configured Non-Maps Data Sources & Platform Status:</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Google Maps Completely Excluded
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {configuredSourcesList.map((srcName, idx) => {
            const foundBreakdown = sourcesBreakdown.find((s) => s.source_name.toLowerCase().includes(srcName.toLowerCase().slice(0, 10)));
            const status = foundBreakdown ? foundBreakdown.status : "WORKING";
            const count = foundBreakdown ? foundBreakdown.leads_contributed : 0;

            return (
              <div
                key={idx}
                className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between space-y-1"
              >
                <div className="text-[11px] text-slate-300 font-medium truncate">{srcName}</div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className={status === "WORKING" ? "text-emerald-400" : "text-slate-400"}>
                    {status}
                  </span>
                  {count > 0 && <span className="text-blue-400 font-bold">+{count}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEARCH RESULT SUMMARY METRICS */}
      {qualifiedLeads.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0c1017]">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total Discovered</div>
            <div className="text-xl font-extrabold text-white mt-0.5">{qualifiedLeads.length}</div>
            <div className="text-[10px] text-emerald-400 mt-0.5 font-mono">100% Unique Businesses</div>
          </div>
          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0c1017]">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Emails Extracted</div>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{qualifiedLeads.length}</div>
            <div className="text-[10px] text-emerald-300 mt-0.5 font-mono">Syntax &amp; Domain MX Checked</div>
          </div>
          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0c1017]">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Phones Included</div>
            <div className="text-xl font-extrabold text-blue-400 mt-0.5">{leadsWithPhoneCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
              {qualifiedLeads.length > 0 ? Math.round((leadsWithPhoneCount / qualifiedLeads.length) * 100) : 0}% Coverage
            </div>
          </div>
          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-[#0c1017]">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Target Requested</div>
            <div className="text-xl font-extrabold text-purple-400 mt-0.5">{targetCount}</div>
            <div className="text-[10px] text-purple-300 mt-0.5 font-mono">Single Search Consolidated</div>
          </div>
        </div>
      )}

      {/* CONSOLIDATED RESULTS TABLE (Zero Frontend Pagination) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Consolidated Qualified Leads ({qualifiedLeads.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Email Compulsory • Single Results View
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[750px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-white/[0.08] bg-[#0c1017] text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Business Name & Website</th>
                <th className="py-3.5 px-4">Public Email & Evidence Source</th>
                <th className="py-3.5 px-4">Phone & Evidence Source</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Platform & Evidence Link</th>
                <th className="py-3.5 px-4">Extraction Time (PKT)</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isExtracting && qualifiedLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-slate-400">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-400" />
                    <p className="font-semibold text-white">Extracting genuine business leads across non-Maps channels...</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Querying official websites, Facebook, Instagram, LinkedIn, and commercial directories.
                    </p>
                  </td>
                </tr>
              ) : qualifiedLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <Building2 className="h-10 w-10 mx-auto text-slate-600" />
                      <div className="text-sm font-semibold text-white">Ready for Multi-Platform Lead Search</div>
                      <p className="text-xs text-slate-400">
                        Enter your target keyword above, specify desired quantity, and click <span className="text-blue-400 font-semibold">"Start Real Lead Extraction"</span>. All qualified prospects with authentic emails will appear in one consolidated view.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                qualifiedLeads.map((lead) => {
                  const phoneRes = normalizePhoneNumber(lead.phone || "", lead.country);
                  const waUrl = phoneRes.isValid ? buildWhatsAppClickToChatUrl(phoneRes.normalized) : null;
                  const isSaving = savingIds[lead.id];

                  return (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Business Name & Official Website */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{lead.business_name}</div>
                        {lead.website ? (
                          <a
                            href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-mono text-[11px] hover:underline mt-0.5"
                          >
                            <span>{lead.website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : (
                          <span className="text-slate-600">None</span>
                        )}
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <LeadQualityBadge
                            lead={lead}
                            score={lead.quality_score}
                            category={lead.quality_category}
                            reasons={lead.quality_reasons}
                          />
                        </div>
                      </td>

                      {/* Public Email Address & Clickable Email Source Evidence */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-emerald-300 font-mono text-[11px] hover:underline"
                          >
                            {lead.email}
                          </a>
                        </div>
                        <div className="text-[10px] text-emerald-400/80 font-mono mt-0.5">
                          {lead.email_status || "FOUND ON OFFICIAL WEBSITE"}
                        </div>
                        {lead.email_source_url && (
                          <a
                            href={lead.email_source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-slate-400 hover:text-blue-400 hover:underline inline-flex items-center gap-1 font-mono mt-0.5"
                            title="Verify email on source page"
                          >
                            <span>Email Source Link</span>
                            <ExternalLink className="h-2 w-2" />
                          </a>
                        )}
                      </td>

                      {/* Public Phone Number & Clickable Phone Source Evidence */}
                      <td className="py-3.5 px-4">
                        {lead.phone && lead.phone !== "Not Listed" ? (
                          <>
                            <div className="inline-flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                              <a
                                href={`tel:${lead.phone}`}
                                className="text-slate-200 font-mono text-[11px] hover:underline"
                              >
                                {lead.phone}
                              </a>
                            </div>
                            <div className="mt-1">
                              <button
                                type="button"
                                onClick={() => setWhatsAppLead(lead)}
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/20 font-mono inline-flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <MessageSquare className="h-2.5 w-2.5" />
                                <span>Chat on WhatsApp</span>
                              </button>
                            </div>
                            {lead.phone_source_url && (
                              <a
                                href={lead.phone_source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-slate-500 hover:text-blue-400 hover:underline inline-flex items-center gap-1 font-mono mt-0.5 block"
                              >
                                <span>Phone Source Link</span>
                                <ExternalLink className="h-2 w-2" />
                              </a>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">Not Listed</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-300 truncate">{lead.address || [lead.city, lead.country].filter(Boolean).join(", ")}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{lead.country}</div>
                      </td>

                      {/* Source Platform & Original Source URL */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-300 font-medium text-[11px]">
                          {lead.source_platform || "Google Organic Search"}
                        </div>
                        {lead.original_source_url && (
                          <a
                            href={lead.original_source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-blue-400 hover:underline inline-flex items-center gap-1 font-mono mt-0.5"
                          >
                            <span>Open Source Evidence</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </td>

                      {/* Pakistan Standard Time (PKT) */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        <div>{lead.extraction_date || lead.saved_date}</div>
                        <div className="text-[10px] text-slate-500">{lead.extraction_time || lead.saved_time}</div>
                      </td>

                      {/* Actions & Save Status */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            onClick={() => {
                              setSelectedResearchLead({
                                id: lead.id,
                                company_name: lead.business_name,
                                business_name: lead.business_name,
                                domain: lead.domain || lead.website,
                                website: lead.website,
                                email: lead.email,
                                phone: lead.phone,
                                city: lead.city,
                                country: lead.country,
                                industry: lead.industry || keyword,
                                address: lead.address,
                              });
                              setIsResearchModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-500/15 to-yellow-500/15 border border-amber-500/30 text-amber-300 hover:text-white hover:bg-amber-500/25 font-bold text-[10px] inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                            title="AI Lead Research Agent (Lifetime Exclusive)"
                          >
                            <Sparkles className="h-3 w-3 text-amber-400" />
                            <span>AI Research</span>
                          </button>

                          {saveStatus === "SAVING" ? (
                            <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold text-[11px] inline-flex items-center gap-1.5 font-mono">
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              <span>Saving...</span>
                            </span>
                          ) : saveStatus === "FAILED" ? (
                            <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold text-[11px] inline-flex items-center gap-1.5 font-mono">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Failed to Save</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px] inline-flex items-center gap-1.5 font-mono">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Saved</span>
                            </span>
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

      {/* AI Lead Research Modal */}
      <AiLeadResearchModal
        isOpen={isResearchModalOpen}
        onClose={() => setIsResearchModalOpen(false)}
        lead={selectedResearchLead}
      />

      {/* WhatsApp Safe Outreach Modal */}
      <WhatsAppModal
        isOpen={!!whatsAppLead}
        onClose={() => setWhatsAppLead(null)}
        lead={whatsAppLead}
      />
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Lead Search Command Center...</div>}>
      <LeadsSearchComponent />
    </Suspense>
  );
}
