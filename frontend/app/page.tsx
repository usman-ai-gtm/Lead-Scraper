"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import {
  Sparkles, ArrowRight, CheckCircle2, Search, Target, Mail, MessageSquare,
  BarChart3, Zap, Shield, ChevronRight, Layers, Bot, Cpu, LineChart,
  UserCheck, Database, Award, ArrowUpRight, Flame, PieChart, Users, Building
} from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<number>(0);

  const capabilities = [
    { name: "AI Lead Intelligence", icon: Target },
    { name: "Web Research", icon: Search },
    { name: "Enterprise CRM", icon: Database },
    { name: "Cold Email Cadence", icon: Mail },
    { name: "WhatsApp Business API", icon: MessageSquare },
    { name: "Autonomous Workflows", icon: Zap },
    { name: "Revenue Intelligence", icon: LineChart },
    { name: "Customer Success", icon: UserCheck },
  ];

  const whatItDoes = [
    { title: "Find the right companies", desc: "Filter by 193 countries, cities, industries, and headcount.", href: "/app/leads", icon: Search, badge: "Discovery" },
    { title: "Research every prospect", desc: "Synthesize business model, products, and tech stack in seconds.", href: "/app/research", icon: Bot, badge: "Deep AI" },
    { title: "Enrich lead intelligence", desc: "Append verified corporate decision maker emails and phone numbers.", href: "/app/leads", icon: Database, badge: "Enrichment" },
    { title: "Validate business data", desc: "Verify active domain, DNS TXT, and MX deliverability records.", href: "/app/leads", icon: CheckCircle2, badge: "Validation" },
    { title: "Score opportunities", desc: "Multi-variate 0–100 scoring based on ICP fit and purchase readiness.", href: "/app/leads", icon: Award, badge: "AI Scoring" },
    { title: "Personalize outreach", desc: "Generate hyper-personalized emails and WhatsApp copy dynamically.", href: "/app/outreach", icon: Sparkles, badge: "Copywriting" },
    { title: "Automate follow-ups", desc: "Multi-channel cadence across Day 1, 2, 4, 7 with smart reply pauses.", href: "/app/outreach", icon: Zap, badge: "Cadence" },
    { title: "Track conversations", desc: "Unified omnichannel timeline aggregating all email and WhatsApp events.", href: "/app/crm", icon: MessageSquare, badge: "Omnichannel" },
    { title: "Manage pipeline", desc: "Visual 9-stage Kanban CRM with drag/drop deal movement and stage velocity.", href: "/app/crm", icon: Layers, badge: "Deals" },
    { title: "Forecast revenue", desc: "Predictive win rates, churn indicators, and quarterly revenue simulation.", href: "/app/revenue", icon: LineChart, badge: "Forecasting" },
  ];

  const howItWorksSteps = [
    { step: "01", name: "Search", desc: "Discover high-intent accounts" },
    { step: "02", name: "Enrich", desc: "Append emails & phone numbers" },
    { step: "03", name: "Validate", desc: "Verify MX deliverability & DNS" },
    { step: "04", name: "Score", desc: "Explainable 0–100 ICP fit" },
    { step: "05", name: "Research", desc: "Extract business signals & needs" },
    { step: "06", name: "Personalize", desc: "Synthesize bespoke value pitch" },
    { step: "07", name: "Outreach", desc: "Multi-channel email & WhatsApp" },
    { step: "08", name: "Track", desc: "Live open, click & reply events" },
    { step: "09", name: "Follow-Up", desc: "Automated sequence cadence" },
    { step: "10", name: "Revenue", desc: "Close deals and track expansion" },
  ];

  const productShowcases = [
    {
      id: "leads",
      title: "AI Lead Intelligence Studio",
      subtitle: "Pinpoint High-Probability Accounts",
      desc: "Stop spraying and praying. Target verified enterprise prospects with algorithmic accuracy. Filter across 193 countries, millions of verified contacts, and live web evidence.",
      bullets: [
        "193 countries & top global cities location database",
        "Multi-platform discovery: Google, LinkedIn, Directories, Reddit",
        "Deterministic explainable scoring model (Fit, Readiness, Opportunity)",
        "Zero duplicate records with normalized domain matching"
      ],
      ctaText: "Launch Lead Discovery",
      ctaHref: "/app/leads",
      badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20"
    },
    {
      id: "research",
      title: "Deep AI Research Engine",
      subtitle: "Know Their Business Better Than They Do",
      desc: "Instant synthesized intelligence on any target domain. USMAN AI reads public records, inspects tech stacks, identifies active pain points, and extracts economic buyers.",
      bullets: [
        "Automated tech stack detection (CMS, CDN, Analytics, Frameworks)",
        "Executive buying committee identification",
        "Synthesized commercial pain points & customized angle of entry",
        "Generates tailored Cold Email and WhatsApp copy automatically"
      ],
      ctaText: "Explore AI Research",
      ctaHref: "/app/research",
      badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/20"
    },
    {
      id: "email",
      title: "Cold Email Command Center",
      subtitle: "Official Gmail OAuth & SMTP Engine",
      desc: "Zero password exposure. Built on official Google OAuth 2.0 protocols and multi-account sending pools. Protect your sender reputation with automated warm-up and suppression gating.",
      bullets: [
        "Official Google OAuth 2.0 multi-account sender pooling",
        "Dynamic multi-step cadence sequence builder (Day 1, Day 3, Day 7)",
        "Automated reply detection with immediate follow-up cessation",
        "Hard bounce protection and CAN-SPAM suppression ledger"
      ],
      ctaText: "Open Email Studio",
      ctaHref: "/app/outreach",
      badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
    },
    {
      id: "whatsapp",
      title: "Meta WhatsApp Business Cloud API",
      subtitle: "Compliant High-Engagement Outbound",
      desc: "Official Meta Cloud API architecture. Send pre-approved interactive templates, manage two-way customer conversations, and respect 24-hour messaging windows with zero account bans.",
      bullets: [
        "100% Official Meta Cloud API (No unapproved web scraping)",
        "Two-way customer inbox with instant push notifications",
        "Pre-approved template broadcasts with rich media & quick replies",
        "Complete automated opt-out and suppression management"
      ],
      ctaText: "Open WhatsApp Center",
      ctaHref: "/app/whatsapp",
      badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    },
    {
      id: "crm",
      title: "Enterprise CRM & Pipeline Kanban",
      subtitle: "Visual Deal Acceleration",
      desc: "A responsive, purpose-built B2B CRM designed for fast-moving sales teams. Drag deals across 9 standardized revenue stages with instant value roll-ups and win-loss intelligence.",
      bullets: [
        "9-stage revenue Kanban board (New to Closed-Won)",
        "Deal win-probability modeling and expected value forecasting",
        "Linked companies, decision maker contacts, and activity logs",
        "Zero external CRM dependency required"
      ],
      ctaText: "Access Enterprise CRM",
      ctaHref: "/app/crm",
      badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20"
    },
    {
      id: "revenue",
      title: "Revenue Intelligence & CS",
      subtitle: "Predictive Analytics & Churn Shield",
      desc: "Harness machine learning models to forecast ARR, detect anomalous pipeline drops, calculate rep sales velocity, and trigger automated retention playbooks before accounts churn.",
      bullets: [
        "Predictive deal win-probability and sales cycle duration",
        "Customer health scoring and automated QBR slide builder",
        "Cohort revenue retention matrix and net revenue expansion tracking",
        "Forecast scenario simulator (Conservative, Expected, Best Case)"
      ],
      ctaText: "View Revenue Intelligence",
      ctaHref: "/app/revenue",
      badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/20"
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      {/* SECTION 2: HERO */}
      <section className="relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
        <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 shadow-glow-sm mb-8 animate-pulse-slow">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI-POWERED B2B GROWTH PLATFORM</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.1] mb-6">
            Find. Engage. Convert. <span className="text-gradient">Grow.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
            Discover high-value prospects, understand their business, personalize outreach, manage relationships, and turn pipeline into revenue — from one intelligent platform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-4 text-base font-bold text-white shadow-glow-md transition-all hover:scale-105 hover:shadow-glow-purple"
            >
              <span>Create an account</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/#platform"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition-all hover:bg-white/[0.08] hover:border-blue-500/40"
            >
              <span>EXPLORE PLATFORM</span>
              <ArrowUpRight className="h-5 w-5 text-blue-400" />
            </Link>
          </div>

          {/* ORIGINAL ANIMATED PRODUCT HERO SHOWCASE */}
          <div id="platform" className="relative mx-auto max-w-6xl rounded-2xl border border-white/15 bg-gradient-to-b from-[#0f172a]/90 to-[#07090e]/95 p-3 sm:p-5 shadow-glass backdrop-blur-2xl">
            {/* Top Browser Bar */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs text-slate-400 font-mono hidden sm:inline">
                  https://app.usmanai.com/command-center
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync
                </span>
                <span className="text-xs text-slate-400 px-2 py-0.5 rounded bg-white/5 font-mono">29 AI Models</span>
              </div>
            </div>

            {/* Interactive Mock Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-left">
              {/* Col 1: Lead Intelligence & Scoring */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0c121e]/80 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-blue-400" /> Lead Intelligence
                  </span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">94/100 ICP</span>
                </div>
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm text-white">Apex Global Tech</span>
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">HOT LEAD</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1.5">Enterprise Cloud Architecture • New York, US</p>
                    <div className="flex gap-2 text-[10px] text-slate-300">
                      <span className="bg-white/5 px-2 py-0.5 rounded">Email: Verified</span>
                      <span className="bg-white/5 px-2 py-0.5 rounded">DNS: MX Pass</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm text-white">Nexus Logistics Co</span>
                      <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">WARM</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1.5">Freight & Automated Routing • Chicago, US</p>
                    <div className="flex gap-2 text-[10px] text-slate-300">
                      <span className="bg-white/5 px-2 py-0.5 rounded">CEO Contacted</span>
                      <span className="bg-white/5 px-2 py-0.5 rounded">Score: 86</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Col 2: CRM Pipeline & Revenue Metrics */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0c121e]/80 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <LineChart className="h-3.5 w-3.5 text-purple-400" /> Pipeline & Revenue
                  </span>
                  <span className="text-xs font-bold text-white">$286,500 Total</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-slate-400">Won Revenue</div>
                    <div className="text-base font-bold text-emerald-400">$74,000</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-slate-400">Reply Rate</div>
                    <div className="text-base font-bold text-blue-400">42.1%</div>
                  </div>
                </div>
                {/* Visual Pipeline Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Negotiation ($95K)</span>
                    <span className="text-purple-400 font-semibold">90% Win Prob</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-[78%]" />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 pt-1">
                    <span>Proposal ($45K)</span>
                    <span className="text-blue-400 font-semibold">65% Win Prob</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-blue-500 w-[55%]" />
                  </div>
                </div>
              </div>

              {/* Col 3: AI Copilot & Cadence Stream */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0c121e]/80 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5 text-cyan-400" /> AI Sales Copilot
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Agent Active</span>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-slate-200 mb-2">
                    <div className="font-semibold text-blue-400 mb-1">Autonomous Opportunity Alert</div>
                    Detected buying signal on Vanguard Health Systems. Suggested entry angle: AI Clinical Compliance automation.
                  </div>
                </div>
                <Link
                  href="/app"
                  className="w-full text-center py-2 text-xs font-bold text-white bg-blue-600/80 hover:bg-blue-600 rounded-lg transition-all"
                >
                  Enter SaaS Dashboard →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: TRUST / CAPABILITY STRIP */}
      <section className="border-y border-white/[0.08] bg-[#06080d] py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">
            Integrated Enterprise Capabilities
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 text-center">
            {capabilities.map((c, i) => {
              const Icon = c.icon;
              return (
                <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-blue-500/30 transition-all">
                  <Icon className="h-5 w-5 text-blue-400" />
                  <span className="text-xs font-medium text-slate-300">{c.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4: WHAT THE PLATFORM DOES (10 Cards linking to real application) */}
      <section className="py-24 bg-[#07090e]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              End-To-End Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-4 mb-4">
              What The Platform Does
            </h2>
            <p className="text-base text-slate-400">
              A comprehensive system uniting intelligence, automated prospecting, cold channels, and revenue governance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whatItDoes.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  href={item.href}
                  className="group relative rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-glow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-md border border-white/[0.06]">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors flex items-center justify-between">
                    {item.title}
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-blue-400" />
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 5: HOW IT WORKS (Animated Step Flow) */}
      <section className="py-24 border-y border-white/[0.08] bg-[#06090f]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              10-Stage Pipeline
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-4 mb-4">
              How It Works
            </h2>
            <p className="text-base text-slate-400">
              From cold web footprint to executed revenue contract through a continuous intelligent flow.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3 text-center">
            {howItWorksSteps.map((s, i) => (
              <div key={i} className="flex flex-col items-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/40 transition-all">
                <span className="text-xs font-mono text-purple-400 mb-1">{s.step}</span>
                <span className="text-sm font-bold text-white mb-1">{s.name}</span>
                <span className="text-[11px] text-slate-400 leading-tight">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: PRODUCT SHOWCASE */}
      <section className="py-24 bg-[#07090e]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
              Deep Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-4 mb-4">
              Enterprise Product Showcase
            </h2>
            <p className="text-base text-slate-400">
              Explore the dedicated engines running inside USMAN AI GTM.
            </p>
          </div>

          <div className="space-y-12">
            {productShowcases.map((showcase, i) => (
              <div
                key={showcase.id}
                className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-8 lg:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 hover:border-blue-500/30 transition-all"
              >
                <div className="max-w-2xl text-left">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-4 ${showcase.badgeColor}`}>
                    {showcase.subtitle}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
                    {showcase.title}
                  </h3>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                    {showcase.desc}
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                    {showcase.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={showcase.ctaHref}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500 transition-colors shadow-glow-sm"
                  >
                    <span>{showcase.ctaText}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="w-full lg:w-1/3 rounded-xl border border-white/10 bg-[#080d16] p-5 text-left font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3 text-slate-400">
                    <span>Engine Telemetry</span>
                    <span className="text-emerald-400 font-bold">ONLINE</span>
                  </div>
                  <div className="space-y-2 text-slate-300">
                    <div>Module: <span className="text-blue-400">{showcase.id.toUpperCase()}</span></div>
                    <div>Accuracy: <span className="text-emerald-400">99.8%</span></div>
                    <div>Latency: <span className="text-purple-400">&lt; 45ms</span></div>
                    <div>Isolation: <span className="text-white">Workspace Encrypted</span></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="relative overflow-hidden py-20 border-t border-white/[0.08] bg-gradient-to-b from-[#090e18] to-[#05070a]">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-6">
            Ready to Automate Your Revenue Pipeline?
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10">
            Join enterprise sales and RevOps teams discovering high-value accounts and closing deals faster.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-glow-md hover:bg-blue-500 hover:scale-105 transition-all"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all"
            >
              <span>Book Enterprise Demo</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
