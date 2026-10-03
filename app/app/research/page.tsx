"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  Bot, Search, Sparkles, Building, Globe, CheckCircle2,
  Mail, MessageSquare, Terminal, ExternalLink, RefreshCw,
  Cpu, Users, ShieldAlert, Zap
} from "lucide-react";

function ResearchContent() {
  const searchParams = useSearchParams();
  const leadIdParam = searchParams.get("lead_id");

  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const executeResearch = async (name?: string, site?: string, leadId?: number) => {
    setLoading(true);
    try {
      const res = await api.post<any>("/research", {
        company_name: name || companyName,
        website: site || website,
        lead_id: leadId,
      });
      setResult(res);
    } catch (err: any) {
      console.warn("Research error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadIdParam) {
      executeResearch(undefined, undefined, Number(leadIdParam));
    } else {
      // Default initial sample research
      executeResearch("Apex Global Tech", "https://apexglobal.tech");
    }
  }, [leadIdParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeResearch();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20">
            Multi-Source Synthesis
          </span>
          <span className="text-xs text-slate-500 font-mono">29-AI Grounded Engine</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">AI Research Studio</h1>
        <p className="text-xs text-slate-400">
          Synthesize deep prospect business models, tech stacks, buying committee, and bespoke outreach angles.
        </p>
      </div>

      {/* Input Box */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Building className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company Name (e.g. Apex Global Tech)"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="relative flex-1 w-full">
            <Globe className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="Website URL (e.g. https://apexglobal.tech)"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-glow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Generate Intelligence</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Intelligence Workspace Grid */}
      {result && (
        <div className="space-y-6">
          {/* Executive Overview Banner */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{result.company_name}</span>
                  {result.website && (
                    <a
                      href={result.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-mono"
                    >
                      <span>{result.domain}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </h2>
                <div className="text-xs text-slate-400 mt-1">
                  Model: <span className="text-slate-300 font-semibold">{result.business_model}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                  <div className="text-[10px] text-slate-400">Buying Intent</div>
                  <div className="text-base font-bold text-purple-400">{result.intent_score}/100</div>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {result.overview}
            </p>
          </div>

          {/* 3 Columns: Tech Stack, Pain Points, Buying Signals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tech Stack */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">
                <Cpu className="h-4 w-4" /> Detected Tech Stack
              </div>
              <ul className="space-y-2">
                {result.tech_stack?.map((t: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-300 p-2 rounded-lg bg-white/[0.02]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pain Points */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400 mb-3">
                <ShieldAlert className="h-4 w-4" /> Identified Commercial Pain Points
              </div>
              <ul className="space-y-2">
                {result.pain_points?.map((p: string, i: number) => (
                  <li key={i} className="text-xs text-slate-300 p-2.5 rounded-lg bg-rose-500/[0.04] border border-rose-500/10 leading-relaxed">
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Buying Signals */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
                <Zap className="h-4 w-4" /> Verified Buying Signals
              </div>
              <ul className="space-y-2">
                {result.buying_signals?.map((s: string, i: number) => (
                  <li key={i} className="text-xs text-slate-300 p-2.5 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10 leading-relaxed">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Decision Makers Table */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" /> Account Buying Committee Hierarchy
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {result.decision_makers?.map((dm: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="font-bold text-xs text-white mb-0.5">{dm.title}</div>
                  <div className="text-[11px] text-blue-400 mb-1">{dm.role}</div>
                  <div className="text-[10px] text-slate-400">Focus: {dm.focus}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Outreach Copy (Cold Email & WhatsApp) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Suggested Email */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5">
              <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider text-blue-400">
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Synthesized Cold Email Pitch
                </span>
                <span className="text-[10px] text-slate-500">Day 1 Sequence</span>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300 leading-relaxed p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                {result.suggested_email}
              </pre>
            </div>

            {/* Suggested WhatsApp */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5">
              <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> WhatsApp Business Template Pitch
                </span>
                <span className="text-[10px] text-slate-500">Cloud API Format</span>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-xs text-slate-300 leading-relaxed p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10">
                {result.suggested_whatsapp}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResearchPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">Loading AI Research Studio...</div>}>
      <ResearchContent />
    </React.Suspense>
  );
}
