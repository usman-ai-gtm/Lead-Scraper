"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  SUPPORTED_VOICE_LANGUAGES,
  OUTREACH_LANGUAGES,
} from "@/lib/business-profile-ai";
import { VoiceCaptureButton, VoiceCaptureResult } from "@/components/voice/VoiceCaptureButton";
import { ChatGptVoiceFallback } from "@/components/voice/ChatGptVoiceFallback";
import {
  Briefcase, Sparkles, Building2, Globe, Target,
  CheckCircle2, AlertTriangle, RefreshCw, Save, ArrowRight,
  ShieldCheck, ChevronDown, ChevronUp, Languages, MessageSquare
} from "lucide-react";

export default function BusinessProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [understanding, setUnderstanding] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [voiceLangCode, setVoiceLangCode] = useState("auto");
  const [naturalText, setNaturalText] = useState("");
  const [detectedMeta, setDetectedMeta] = useState<{ language?: string; isRtl?: boolean } | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const [form, setForm] = useState({
    business_name: "",
    ai_summary: "", // Plain: What does your business do?
    products_services: "", // What products or services do you offer?
    target_customer_type: "", // Who are your ideal customers?
    preferred_locations: "", // Which countries do you want to target?
    differentiator: "", // What makes your business different?
    outreach_goal: "", // What do you want to achieve?
    preferred_outreach_language: "English",
    preferred_tone: "Professional",
    raw_description: "",
    source_language: "",
    is_rtl: false,
    // Optional advanced classification (auto-filled by AI, editable if desired)
    website: "",
    country: "",
    city: "",
    industry: "",
    ideal_industries: "",
    target_business_size: "SMBs & Growing Companies",
    keywords: "",
    exclusions: "",
    additional_instructions: "",
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get<any>("/workspace/profile").catch(() => null);
        if (res && res.profile) {
          const p = res.profile;
          setForm({
            business_name: p.business_name || "",
            ai_summary: p.ai_summary || p.products_services || "",
            products_services: p.products_services || "",
            target_customer_type: p.target_customer_type || "",
            preferred_locations: p.preferred_locations || p.country || "",
            differentiator: p.differentiator || p.additional_instructions || "",
            outreach_goal: p.outreach_goal || "",
            preferred_outreach_language: p.preferred_outreach_language || "English",
            preferred_tone: p.preferred_tone || "Professional",
            raw_description: p.raw_description || "",
            source_language: p.source_language || "",
            is_rtl: Boolean(p.is_rtl),
            website: p.website || "",
            country: p.country || "",
            city: p.city || "",
            industry: p.industry || "",
            ideal_industries: p.ideal_industries || "",
            target_business_size: p.target_business_size || "SMBs & Growing Companies",
            keywords: p.keywords || "",
            exclusions: p.exclusions || "",
            additional_instructions: p.additional_instructions || "",
          });
          if (p.raw_description) setNaturalText(p.raw_description);
          if (p.source_language || p.is_rtl) {
            setDetectedMeta({ language: p.source_language, isRtl: Boolean(p.is_rtl) });
          }
        }
      } catch (e) {
        console.error("Failed to load profile:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const selectedVoiceLang =
    SUPPORTED_VOICE_LANGUAGES.find((l) => l.code === voiceLangCode) || SUPPORTED_VOICE_LANGUAGES[0];

  const handleUnderstand = async (payload: { text?: string; audioBase64?: string; audioMime?: string }) => {
    setUnderstanding(true);
    setToastMsg(null);
    try {
      const res = await api.post<any>("/workspace/profile/understand", {
        text: payload.text || naturalText,
        audioBase64: payload.audioBase64,
        audioMime: payload.audioMime,
        languageHint: voiceLangCode === "auto" ? "auto" : selectedVoiceLang.label,
      });

      const ext = res?.extracted;
      if (!ext) throw new Error("Unable to parse response.");

      if (ext.transcript) {
        setNaturalText(ext.transcript);
      }

      if (!ext.recognized) {
        setToastMsg({
          text: ext.warning || "Speech did not describe a business clearly. You can edit the text and try again.",
          type: "info",
        });
        return;
      }

      setDetectedMeta({
        language: ext.detected_language,
        isRtl: Boolean(ext.is_rtl),
      });

      setForm((prev) => ({
        ...prev,
        business_name: ext.business_name || prev.business_name,
        ai_summary: ext.what_does_business_do || ext.ai_summary || prev.ai_summary,
        products_services: ext.products_services || prev.products_services,
        target_customer_type: ext.ideal_customers || prev.target_customer_type,
        preferred_locations: ext.target_countries || prev.preferred_locations,
        country: (ext.target_countries || "").split(",")[0]?.trim() || prev.country,
        differentiator: ext.differentiator || prev.differentiator,
        outreach_goal: ext.outreach_goal || prev.outreach_goal,
        preferred_outreach_language: ext.preferred_outreach_language || prev.preferred_outreach_language,
        preferred_tone: ext.preferred_tone || prev.preferred_tone,
        raw_description: ext.transcript || payload.text || naturalText,
        source_language: ext.detected_language || "",
        is_rtl: Boolean(ext.is_rtl),
        industry: ext.industry || ext.business_type || prev.industry,
        ideal_industries: ext.ideal_industries || ext.ideal_customers || prev.ideal_industries,
        keywords: ext.keywords || prev.keywords,
        exclusions: ext.exclusions || prev.exclusions,
      }));

      setToastMsg({
        text: `Understood ${ext.detected_language || "your"} description! Please review the fields below and click "Save Business Profile".`,
        type: "success",
      });
    } catch (err: any) {
      setToastMsg({
        text: err?.message || "Could not process your description. Please type directly in the fields below.",
        type: "error",
      });
    } finally {
      setUnderstanding(false);
    }
  };

  const handleVoiceComplete = async (cap: VoiceCaptureResult) => {
    if (cap.transcript) {
      setNaturalText(cap.transcript);
      await handleUnderstand({
        text: cap.transcript,
      });
      return;
    }
    await handleUnderstand({
      text: cap.transcript,
      audioBase64: cap.audioBase64,
      audioMime: cap.audioMime,
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setToastMsg(null);
    try {
      const payloadToSave = {
        ...form,
        country: form.country || form.preferred_locations.split(",")[0]?.trim() || "United States",
        additional_instructions: form.additional_instructions || form.differentiator || form.outreach_goal,
      };
      await api.post("/workspace/profile", payloadToSave);
      setToastMsg({
        text: "Business profile saved! Future lead searches, company matching, and personalized emails will automatically use these details.",
        type: "success",
      });
    } catch (err: any) {
      setToastMsg({ text: err?.message || "Failed to save business profile.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const rtlInputDir = detectedMeta?.isRtl || selectedVoiceLang.rtl ? "rtl" : "auto";

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-400" />
        Loading your Business Profile...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl border px-4 py-3 text-xs text-white shadow-2xl backdrop-blur-md flex items-center justify-between gap-4 max-w-md ${
            toastMsg.type === "error"
              ? "border-rose-500/40 bg-rose-950/90"
              : toastMsg.type === "info"
              ? "border-amber-500/40 bg-amber-950/90"
              : "border-emerald-500/40 bg-[#0c121e]/95"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === "error" ? (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white shrink-0">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono uppercase mb-1.5">
            <ShieldCheck className="h-3 w-3" /> Simple Worldwide Business Setup
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Tell Us About Your Business</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Explain what you do by speaking or typing in your own language (English, Urdu, Arabic, German, Hindi, Spanish, and more). No technical marketing jargon required — we organize everything for your lead discovery and personalized outreach.
          </p>
        </div>

        <Link
          href="/app/leads"
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-slate-200 flex items-center gap-1.5 self-start shrink-0"
        >
          <span>Find Leads</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* SPEAK OR TYPE INPUT CARD */}
      <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-[#0e1424] via-[#0c1017] to-[#0b0f18] p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>Describe Your Business in Your Own Words</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Speak into your microphone OR type naturally below, then review and save.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Languages className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={voiceLangCode}
              onChange={(e) => setVoiceLangCode(e.target.value)}
              aria-label="Spoken language selector"
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {SUPPORTED_VOICE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-[#0c1017]">
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          {/* A. Speak Box */}
          <div className="md:col-span-5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
            <div className="text-xs font-bold text-white">A. Speak about your business</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Press the button below, allow microphone permission, and speak naturally in your preferred language. You can stop, edit, or cancel anytime.
            </p>
            <VoiceCaptureButton
              label="Describe Your Business"
              applyButtonLabel="Apply & Organize Profile"
              languageHint={voiceLangCode === "auto" ? "auto" : selectedVoiceLang.label}
              languageBcp47={selectedVoiceLang.bcp47}
              disabled={understanding}
              onLiveTranscript={(txt) => setNaturalText(txt)}
              onCaptureComplete={handleVoiceComplete}
              onError={(msg) => setToastMsg({ text: msg, type: "info" })}
            />
            {detectedMeta?.language && (
              <div className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded inline-block">
                Recognized language: {detectedMeta.language}
              </div>
            )}
            <ChatGptVoiceFallback targetFieldLabel="the business description box on the right" />
          </div>

          {/* B. Type Box */}
          <div className="md:col-span-7 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
            <div className="text-xs font-bold text-white">B. Or type about your business</div>
            <textarea
              dir={rtlInputDir}
              value={naturalText}
              onChange={(e) => setNaturalText(e.target.value)}
              rows={4}
              placeholder='Tell us about your business in your own words... (e.g. "We build websites and manage SEO for local clinics in the US and UK" or "میری ایک ڈیجیٹل مارکیٹنگ ایجنسی ہے...")'
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none leading-relaxed"
            />
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[10px] text-slate-500">
                Supports right-to-left scripts (Urdu, Arabic, Persian) automatically.
              </span>
              <button
                type="button"
                disabled={understanding || !naturalText.trim()}
                onClick={() => handleUnderstand({ text: naturalText })}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                {understanding ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                    <span>Organizing Details...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Fill Profile From Description</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SIMPLE 9-FIELD STRUCTURED PROFILE */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-5">
          <div className="border-b border-white/[0.06] pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-400" />
              <span>Your Saved Business Details (Review &amp; Edit Before Saving)</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">1. Business name</label>
              <input
                type="text"
                dir="auto"
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                placeholder="e.g. Apex Digital Studio"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">5. Which countries do you want to target?</label>
              <input
                type="text"
                dir="auto"
                value={form.preferred_locations}
                onChange={(e) => setForm({ ...form, preferred_locations: e.target.value })}
                placeholder="e.g. United States, United Kingdom, Germany, UAE"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300">2. What does your business do?</label>
              <textarea
                dir="auto"
                rows={2}
                value={form.ai_summary}
                onChange={(e) => setForm({ ...form, ai_summary: e.target.value })}
                placeholder="Plain explanation — e.g. We help local clinics and small companies upgrade outdated websites and rank higher on Google."
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">3. What products or services do you offer?</label>
              <textarea
                dir="auto"
                rows={2}
                value={form.products_services}
                onChange={(e) => setForm({ ...form, products_services: e.target.value })}
                placeholder="e.g. Website Design, SEO Audits, Social Media Management"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">4. Who are your ideal customers?</label>
              <textarea
                dir="auto"
                rows={2}
                value={form.target_customer_type}
                onChange={(e) => setForm({ ...form, target_customer_type: e.target.value })}
                placeholder="e.g. Small business owners, dental clinics, or retail brands without modern websites"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">6. What makes your business different?</label>
              <input
                type="text"
                dir="auto"
                value={form.differentiator}
                onChange={(e) => setForm({ ...form, differentiator: e.target.value })}
                placeholder="e.g. Fast 7-day turnaround, bilingual support, no long-term contracts"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">7. What do you want to achieve?</label>
              <input
                type="text"
                dir="auto"
                value={form.outreach_goal}
                onChange={(e) => setForm({ ...form, outreach_goal: e.target.value })}
                placeholder="e.g. Book introductory discovery calls with new business owners"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">8. Preferred outreach language</label>
              <select
                value={form.preferred_outreach_language}
                onChange={(e) => setForm({ ...form, preferred_outreach_language: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-[#090d14] px-3.5 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                {OUTREACH_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">9. Preferred email tone</label>
              <div className="grid grid-cols-3 gap-2">
                {["Professional", "Friendly", "Concise"].map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setForm({ ...form, preferred_tone: tone })}
                    className={`py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      form.preferred_tone === tone
                        ? "bg-blue-600/25 border-blue-500 text-white"
                        : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Advanced Settings Accordion */}
          <div className="pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-slate-400 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span>Optional Advanced Search Settings (Website, Keywords &amp; Exclusions)</span>
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-3 border-t border-white/[0.04]">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400">Your Company Website</label>
                  <input
                    type="text"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://yourcompany.com"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400">Internal Category / Sector</label>
                  <input
                    type="text"
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    placeholder="e.g. Digital Marketing & Web Design"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400">Target Search Keywords (comma-separated)</label>
                  <input
                    type="text"
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                    placeholder="Auto-filled from your description"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-400">Negative Exclusions</label>
                  <input
                    type="text"
                    value={form.exclusions}
                    onChange={(e) => setForm({ ...form, exclusions: e.target.value })}
                    placeholder="Competitors or unwanted terms"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky / Bottom Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5">
          <div className="text-xs text-slate-400">
            Powers <strong className="text-slate-200">Find Leads</strong>, <strong className="text-slate-200">Google Maps Search</strong>, <strong className="text-slate-200">Personalized Emails</strong>, and <strong className="text-slate-200">AI Assistant</strong>.
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-glow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Saving Business Profile...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Business Profile</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
