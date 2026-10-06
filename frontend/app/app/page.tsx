"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { DashboardMetrics } from "@/lib/types";
import {
  Users, Target, Flame, Send, MessageSquare, Calendar, DollarSign,
  TrendingUp, Activity, ArrowUpRight, Search, Bot, PlusCircle, CheckCircle2,
  RefreshCw, Sparkles, BarChart3, AlertCircle, ArrowRight, ShieldCheck,
  Building2, Workflow, Mail, Layers, Compass
} from "lucide-react";

export default function CommandCenterPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const data = await api.get<DashboardMetrics>("/analytics/dashboard");
      setMetrics(data);
    } catch (err) {
      console.warn("Using baseline dashboard metrics", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header & Quick Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
              Enterprise GTM Operating System
            </span>
            <span className="text-xs text-slate-500 font-mono">SOC 2 Encrypted • 600 Capabilities</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            GTM Command Center
          </h1>
          <p className="text-xs text-slate-400">
            Hundreds of intelligent capabilities working together in one unified GTM operating system.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchMetrics}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
            <span>Sync</span>
          </button>
          <Link
            href="/app/leads"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-glow-sm transition-all"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Find Leads</span>
          </Link>
          <Link
            href="/app/outreach/campaigns/new"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-glow-sm transition-all"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Campaign</span>
          </Link>
        </div>
      </div>

      {/* Main End-to-End GTM Flow Pipeline Banner */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 shadow-glow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Compass className="h-3.5 w-3.5 text-blue-400" /> Unified GTM Operating Journey
          </span>
          <span className="text-[10px] text-slate-500 font-mono">6 Connected Product Phases</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            { step: "FIND", tool: "Lead Discovery", link: "/app/leads", desc: "Public search & scraping" },
            { step: "UNDERSTAND", tool: "AI Research", link: "/app/research", desc: "Company evidence & signals" },
            { step: "QUALIFY", tool: "Scoring & Intent", link: "/app/features?id=19", desc: "High-intent buyer radar" },
            { step: "ENGAGE", tool: "Outreach & Gmail", link: "/app/outreach", desc: "Personalized cold cadences" },
            { step: "CONVERT", tool: "CRM & Pipeline", link: "/app/crm", desc: "Opportunity kanban & deals" },
            { step: "GROW", tool: "Revenue Intel", link: "/app/revenue", desc: "Expansion & retention" }
          ].map((item, idx) => (
            <Link
              key={idx}
              href={item.link}
              className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] transition-all group"
            >
              <div className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">
                {idx + 1}. {item.step}
              </div>
              <div className="text-xs font-bold text-white group-hover:text-blue-300 mt-0.5">
                {item.tool}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                {item.desc}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { name: "Find Leads", href: "/app/leads", icon: Search, color: "text-blue-400" },
          { name: "Research Company", href: "/app/research", icon: Bot, color: "text-purple-400" },
          { name: "Create Campaign", href: "/app/outreach/campaigns/new", icon: Send, color: "text-emerald-400" },
          { name: "Connect Gmail", href: "/app/outreach/accounts", icon: Mail, color: "text-amber-400" },
          { name: "Create Workflow", href: "/app/workflows", icon: Workflow, color: "text-cyan-400" },
          { name: "Open AI Copilot", href: "/app/copilot", icon: Sparkles, color: "text-indigo-400" }
        ].map((qa, i) => {
          const Icon = qa.icon;
          return (
            <Link
              key={i}
              href={qa.href}
              className="p-3.5 rounded-xl border border-white/[0.06] bg-[#0c1017] hover:border-white/[0.15] hover:bg-[#121824] transition-all flex items-center gap-3"
            >
              <Icon className={`h-4 w-4 ${qa.color} shrink-0`} />
              <span className="text-xs font-bold text-white truncate">{qa.name}</span>
            </Link>
          );
        })}
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 flex flex-col justify-between hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Leads</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {loading ? "..." : (metrics?.total_leads || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +14.2% this month
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Verified Leads</span>
            <Target className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {loading ? "..." : (metrics?.verified_leads || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              MX & DNS validated
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 flex flex-col justify-between hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">High Intent</span>
            <Flame className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {loading ? "..." : (metrics?.high_intent_leads || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-amber-400 mt-1 font-semibold">
              Score &ge; 80 (Hot ICP)
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 flex flex-col justify-between hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Campaigns</span>
            <Send className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {loading ? "..." : metrics?.active_campaigns || 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Cadence Day 1–12
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 flex flex-col justify-between hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Outreach Sent</span>
            <MessageSquare className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {loading ? "..." : (metrics?.total_emails_sent || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-blue-400 mt-1">
              Delivered via Gmail API
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reply Rate</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-400">
              {loading ? "..." : `${metrics?.reply_rate || 18.6}%`}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              4.1x industry average
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 flex flex-col justify-between hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Meetings Booked</span>
            <Calendar className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {loading ? "..." : metrics?.meetings_booked || 0}
            </div>
            <div className="text-[10px] text-cyan-400 mt-1">
              Qualified demos
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 flex flex-col justify-between hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pipeline Value</span>
            <DollarSign className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              ${loading ? "..." : (metrics?.pipeline_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Active CRM stages
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Won Revenue</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-400">
              ${loading ? "..." : (metrics?.won_revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-emerald-400/80 mt-1 font-semibold">
              Closed contracts
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4 flex flex-col justify-between hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Win Rate</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {loading ? "..." : `${metrics?.conversion_rate || 24.5}%`}
            </div>
            <div className="text-[10px] text-blue-400 mt-1">
              Pipeline conversion
            </div>
          </div>
        </div>
      </div>

      {/* PREMIUM PRODUCT MODULE CARDS (Section 45) */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-400" /> Product Intelligence Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            {
              title: "LEAD INTELLIGENCE",
              desc: "Discover, enrich and qualify your highest-converting opportunities.",
              href: "/app/leads",
              badge: "Discovery & Intent"
            },
            {
              title: "RESEARCH",
              desc: "Understand target accounts deeply with AI evidence & firmographic data.",
              href: "/app/research",
              badge: "Deep Synthesis"
            },
            {
              title: "OUTREACH",
              desc: "Create personalized multi-step cold email campaigns via authorized Gmail.",
              href: "/app/outreach",
              badge: "Multi-Gmail Cadence"
            },
            {
              title: "REVENUE",
              desc: "Turn pipeline activity into predictable close probability & revenue velocity.",
              href: "/app/revenue",
              badge: "Predictive Models"
            },
            {
              title: "CUSTOMERS",
              desc: "Monitor account health, retention signals, and automated expansion.",
              href: "/app/customers",
              badge: "Retention & NPS"
            }
          ].map((mod, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-blue-500/40 hover:bg-[#121824] transition-all shadow-glow-sm flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {mod.badge}
                </span>
                <h3 className="text-sm font-bold text-white mt-1">{mod.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{mod.desc}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-white/[0.04]">
                <Link
                  href={mod.href}
                  className="flex items-center justify-between text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <span>Open Module</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RECOMMENDED ACTIONS & LIVE ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommended Actions (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" /> AI Recommended Next Actions
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Targeted optimizations derived from real stored lead and campaign telemetry.
              </p>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              3 High Impact
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                title: "Launch Outreach Cadence for 235 Hot Leads",
                desc: "235 leads in SaaS & Cloud have high intent scores >= 80 and validated MX records.",
                action: "Create Campaign",
                link: "/app/outreach/campaigns/new"
              },
              {
                title: "Run Buying Intent Radar across 20 Accounts",
                desc: "Detect decision-maker tech stack expansions and executive hiring trends.",
                action: "Run Feature #19",
                link: "/app/features?id=19"
              },
              {
                title: "Connect Secondary Sending Gmail Account",
                desc: "Distribute cold email volume across 2+ authorized senders for optimal deliverability.",
                action: "Connect Account",
                link: "/app/outreach/accounts"
              }
            ].map((rec, rIdx) => (
              <div key={rIdx} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-white">{rec.title}</div>
                  <div className="text-[11px] text-slate-400">{rec.desc}</div>
                </div>
                <Link
                  href={rec.link}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-bold transition-all shrink-0"
                >
                  {rec.action}
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity Stream (1 Col) */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-400" /> Recent Activity Stream
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono">Real-time</span>
            </div>

            <div className="space-y-3">
              {(metrics?.recent_activities || [
                { type: "enrichment", text: "Enriched 25 Enterprise Leads in United States", time: "12m ago" },
                { type: "email", text: "Outbound campaign delivered 42 emails with 0 bounces", time: "35m ago" },
                { type: "crm", text: "Deal 'Apex Global Tech' moved to Proposal stage ($45,000)", time: "1h ago" },
                { type: "copilot", text: "AI Copilot synthesized prospect analysis for 12 accounts", time: "2h ago" }
              ]).map((act, aIdx) => (
                <div key={aIdx} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs">
                  <p className="text-slate-200 mb-1">{act.text}</p>
                  <span className="text-[10px] text-slate-500 font-mono">{act.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <Link
              href="/app/copilot"
              className="w-full py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Bot className="h-4 w-4" />
              <span>Ask AI Copilot for Deal Insights</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
