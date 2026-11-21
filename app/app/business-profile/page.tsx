"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Briefcase, Sparkles, Building2, Globe, MapPin, Target,
  CheckCircle2, AlertTriangle, RefreshCw, Save, ArrowRight,
  ShieldCheck, HelpCircle
} from "lucide-react";

export default function BusinessProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    business_name: "",
    website: "",
    country: "Pakistan",
    city: "",
    industry: "",
    products_services: "",
    target_customer_type: "",
    ideal_industries: "",
    target_business_size: "SMBs (10-100 employees)",
    preferred_locations: "",
    keywords: "",
    exclusions: "",
    additional_instructions: "",
    ai_summary: "",
  });

  // Load existing saved profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get<any>("/workspace/profile").catch(() => null);
        if (res && res.profile) {
          setForm({
            business_name: res.profile.business_name || "",
            website: res.profile.website || "",
            country: res.profile.country || "Pakistan",
            city: res.profile.city || "",
            industry: res.profile.industry || "",
            products_services: res.profile.products_services || "",
            target_customer_type: res.profile.target_customer_type || "",
            ideal_industries: res.profile.ideal_industries || "",
            target_business_size: res.profile.target_business_size || "SMBs (10-100 employees)",
            preferred_locations: res.profile.preferred_locations || "",
            keywords: res.profile.keywords || "",
            exclusions: res.profile.exclusions || "",
            additional_instructions: res.profile.additional_instructions || "",
            ai_summary: res.profile.ai_summary || "",
          });
        }
      } catch (e) {
        console.error("Failed to load profile:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setToastMsg(null);
    try {
      await api.post("/workspace/profile", form);
      setToastMsg({ text: "Business profile saved permanently to your workspace database!", type: "success" });
    } catch (err: any) {
      setToastMsg({ text: err?.message || "Failed to save profile", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleOptimizeWithGemini = async () => {
    if (!form.business_name.trim() && !form.industry.trim() && !form.products_services.trim()) {
      setToastMsg({ text: "Please enter your Business Name, Industry, or Products/Services before optimizing.", type: "error" });
      return;
    }

    setOptimizing(true);
    setToastMsg(null);
    try {
      const res = await api.post<any>("/workspace/profile/optimize", form);
      if (res && res.optimized) {
        const opt = res.optimized;
        setForm((prev) => ({
          ...prev,
          keywords: opt.recommended_keywords || prev.keywords,
          exclusions: opt.recommended_exclusions || prev.exclusions,
          ai_summary: opt.ai_summary || opt.value_proposition || prev.ai_summary,
        }));
        setToastMsg({
          text: `Organized by Gemini AI (${res.model || "Gemini"}). Search keywords and negative exclusions updated! Click 'Save Profile' to lock in.`,
          type: "success"
        });
      }
    } catch (err: any) {
      setToastMsg({ text: err?.message || "Gemini optimization failed", type: "error" });
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mb-3" />
        <p>Loading your workspace business profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
              One-Time Setup Wizard
            </span>
            <span className="text-xs text-slate-400 font-mono">Workspace ID: #{user?.workspace_id || 1}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Business Profile & ICP Engine</h1>
          <p className="text-xs text-slate-400">
            Define your company, target audience, and keyword exclusions. Gemini AI uses this profile to improve lead discovery and draft personalized outreach.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOptimizeWithGemini}
            disabled={optimizing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {optimizing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-purple-200" />
            )}
            <span>{optimizing ? "Optimizing with AI..." : "Optimize with Gemini AI"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-glow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Profile</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
          toastMsg.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            : "bg-rose-500/10 border-rose-500/20 text-rose-300"
        }`}>
          <div className="flex items-center gap-2">
            {toastMsg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="underline text-xs">Dismiss</button>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Business Overview */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
            <Building2 className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white">1. Company Overview</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Business Name *</label>
              <input
                type="text"
                required
                name="business_name"
                value={form.business_name}
                onChange={handleChange}
                placeholder="e.g. Apex Growth Solutions"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Company Website</label>
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="e.g. https://apexgrowth.com"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Primary Country *</label>
              <input
                type="text"
                required
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="e.g. Pakistan, United States, United Kingdom"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">City or Service Hub</label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="e.g. Lahore, Karachi, New York, London"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">Industry / Sector *</label>
              <input
                type="text"
                required
                name="industry"
                value={form.industry}
                onChange={handleChange}
                placeholder="e.g. Digital Marketing & SEO, Software Development, Real Estate Brokerage"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">Products or Services Offered</label>
              <textarea
                rows={2}
                name="products_services"
                value={form.products_services}
                onChange={handleChange}
                placeholder="Describe what you sell, key solutions, pricing structure, or core deliverables..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Ideal Customer Profile (ICP) */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
            <Target className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">2. Ideal Customer Profile (ICP)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Target Customer Type</label>
              <input
                type="text"
                name="target_customer_type"
                value={form.target_customer_type}
                onChange={handleChange}
                placeholder="e.g. Founders, Marketing Directors, Real Estate Agents, Hospital CEOs"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Target Business Size</label>
              <select
                name="target_business_size"
                value={form.target_business_size}
                onChange={handleChange}
                className="w-full bg-[#090d16] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Sole Proprietors / Independents">Sole Proprietors / Independents (1 person)</option>
                <option value="Small Businesses (2-10 employees)">Small Businesses (2-10 employees)</option>
                <option value="SMBs (10-100 employees)">SMBs (10-100 employees)</option>
                <option value="Mid-Market (100-500 employees)">Mid-Market (100-500 employees)</option>
                <option value="Enterprise (500+ employees)">Enterprise (500+ employees)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">Ideal Target Industries</label>
              <input
                type="text"
                name="ideal_industries"
                value={form.ideal_industries}
                onChange={handleChange}
                placeholder="e.g. Logistics Companies, Dental Clinics, E-commerce Brands, SaaS Providers"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-300 mb-1">Preferred Lead Discovery Locations</label>
              <input
                type="text"
                name="preferred_locations"
                value={form.preferred_locations}
                onChange={handleChange}
                placeholder="e.g. United States, United Kingdom, UAE, Saudi Arabia, Pakistan"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: AI Keywords, Negative Exclusions & Strategy */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white">3. Search Keywords & Negative Exclusions (Gemini Powered)</h3>
            </div>
            <button
              type="button"
              onClick={handleOptimizeWithGemini}
              disabled={optimizing}
              className="text-[11px] text-purple-400 hover:text-purple-300 underline font-semibold"
            >
              Auto-generate with AI
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Important Search Keywords (Comma-separated)
              </label>
              <input
                type="text"
                name="keywords"
                value={form.keywords}
                onChange={handleChange}
                placeholder="e.g. Commercial Real Estate, Property Brokers, SEO Agency, Freight Forwarders"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">These keywords will automatically populate your lead search suggestions.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Excluded Industries or Negative Terms (Avoid these leads)
              </label>
              <input
                type="text"
                name="exclusions"
                value={form.exclusions}
                onChange={handleChange}
                placeholder="e.g. Free courses, Students, Non-profit, Retail consumers, Dropshipping"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Prevents qualifying irrelevant contacts during web scraping.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Executive Value Proposition & AI Summary
              </label>
              <textarea
                rows={3}
                name="ai_summary"
                value={form.ai_summary}
                onChange={handleChange}
                placeholder="Summarize your core competitive edge in your own words, or let Gemini AI optimize it..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Additional Instructions or Constraints
              </label>
              <textarea
                rows={2}
                name="additional_instructions"
                value={form.additional_instructions}
                onChange={handleChange}
                placeholder="Any special guidelines (e.g. 'Never mention competitors', 'Always ask for a 10-minute discovery call', 'Focus on B2B suppliers only')..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Link
            href="/app/leads"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
          >
            <span>Proceed to Find Leads</span>
            <ArrowRight className="h-3 w-3" />
          </Link>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOptimizeWithGemini}
              disabled={optimizing}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              Optimize with Gemini AI
            </button>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save Business Profile</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
