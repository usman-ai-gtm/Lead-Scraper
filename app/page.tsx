"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import {
  Sparkles, ArrowRight, CheckCircle2, Search, Target, Mail, MessageSquare,
  BarChart3, Zap, Shield, ChevronRight, Layers, Bot, Cpu, LineChart,
  UserCheck, Database, Award, ArrowUpRight, Flame, PieChart, Users, Building, Download
} from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<number>(0);

  const capabilities = [
    { name: "Web Lead Discovery", icon: Target },
    { name: "Google Maps Search", icon: Search },
    { name: "Workspace CRM", icon: Database },
    { name: "Gmail OAuth Outreach", icon: Mail },
    { name: "WhatsApp Templates", icon: MessageSquare },
    { name: "Contact Validation", icon: Shield },
    { name: "Multi-Format Exports", icon: Download },
    { name: "AI Lead Briefs", icon: Bot },
  ];

  const whatItDoes = [
    { title: "Find commercial websites", desc: "Filter by country, city, and business keywords across live public web indexes.", href: "/app/leads", icon: Search, badge: "Discovery" },
    { title: "Local Maps discovery", desc: "Search local Google Places listings and crawl business sites (Lifetime / enabled plans).", href: "/app/google-maps", icon: Bot, badge: "Maps" },
    { title: "Extract public contacts", desc: "Parse publicly displayed corporate email addresses and phone numbers with source URLs.", href: "/app/leads", icon: Database, badge: "Contacts" },
    { title: "Validate contact syntax & MX", desc: "Distinguish email syntax checks, domain DNS MX records, risky patterns, and invalid inputs.", href: "/app/leads", icon: CheckCircle2, badge: "Validation" },
    { title: "Score contact readiness", desc: "Transparent 0–100 completeness rating based on observed email, phone, website, and source links.", href: "/app/leads", icon: Award, badge: "Readiness" },
    { title: "Draft personalized outreach", desc: "Generate concise 1-to-1 cold email and WhatsApp drafts tailored to saved company details.", href: "/app/outreach", icon: Sparkles, badge: "AI Drafts" },
    { title: "Protect workspace compliance", desc: "Enforce per-workspace suppression lists, 30-day duplicate guards, and daily sending caps.", href: "/app/outreach", icon: Zap, badge: "Safety" },
    { title: "Track prospect replies", desc: "Schedule manual follow-ups and organize lead outreach history in one workspace view.", href: "/app/saved-leads", icon: MessageSquare, badge: "Tracking" },
    { title: "Manage pipeline stages", desc: "Organize deals from New Lead to Won/Lost inside your isolated workspace Kanban board.", href: "/app/crm", icon: Layers, badge: "CRM" },
    { title: "Export lead intelligence", desc: "Download workspace leads in formula-safe Excel XLSX, Landscape PDF, UTF-8 CSV, and JSON.", href: "/app/exports", icon: Download, badge: "Exports" },
  ];

  const howItWorksSteps = [
    { step: "01", name: "Search", desc: "Query live web & Places" },
    { step: "02", name: "Crawl", desc: "Inspect public sites" },
    { step: "03", name: "Validate", desc: "Check syntax & DNS MX" },
    { step: "04", name: "Deduplicate", desc: "Skip workspace duplicates" },
    { step: "05", name: "Save", desc: "Store search snapshots" },
    { step: "06", name: "Research", desc: "Summarize business fit" },
    { step: "07", name: "Draft", desc: "Personalize cold message" },
    { step: "08", name: "Outreach", desc: "Send via Gmail OAuth" },
    { step: "09", name: "Suppress", desc: "Honor opt-out lists" },
    { step: "10", name: "Export", desc: "XLSX, PDF, CSV & JSON" },
  ];

  const productShowcases = [
    {
      id: "leads",
      title: "Live Web & Maps Lead Discovery",
      subtitle: "Source-Backed Prospect Extraction",
      desc: "Run multi-country or city-specific campaigns with live website contact extraction. Every qualifying business includes source URLs, UTC/PKT collection timestamps, and clear validation status.",
      bullets: [
        "Multi-country & specific-city campaign targeting",
        "Direct HTML & search snippet extraction for public emails and phones",
        "Deterministic readiness score & DNS MX domain lookup",
        "Workspace-level domain, email & phone deduplication"
      ],
      ctaText: "Launch Lead Discovery",
      ctaHref: "/app/leads",
      badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20"
    },
    {
      id: "research",
      title: "AI Lead Research & Pitch Briefs",
      subtitle: "Tailored Outreach Preparation",
      desc: "Generate practical commercial summaries, opportunity angles, and personalized email or WhatsApp entry drafts based on a prospect's saved industry, location, and domain.",
      bullets: [
        "Executive commercial opportunity brief per saved lead",
        "Industry-aware pain-point & value-angle framing",
        "Generates tailored Cold Email & WhatsApp draft copy",
        "Included on Lifetime & AI Research custom plans"
      ],
      ctaText: "Explore Lead Search",
      ctaHref: "/app/leads",
      badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/20"
    },
    {
      id: "email",
      title: "Cold Email Command Center",
      subtitle: "Official Gmail OAuth 2.0 Integration",
      desc: "Connect your own Google mailbox with minimal gmail.send scope and AES-256-GCM token encryption. Enforce daily plan quotas (10/day Basic, up to 500/day Lifetime) and suppression checks automatically.",
      bullets: [
        "Official Google OAuth 2.0 multi-account sender pooling",
        "Plan-enforced daily sending quotas per workspace",
        "30-day duplicate outreach protection & manual follow-ups",
        "Per-workspace Do-Not-Contact & email suppression gating"
      ],
      ctaText: "Open Email Studio",
      ctaHref: "/app/outreach",
      badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
    },
    {
      id: "whatsapp",
      title: "WhatsApp Outreach Companion",
      subtitle: "Structured Click-to-Chat Workflows",
      desc: "Organize phone-qualified leads, draft AI-assisted WhatsApp introductions, track outreach notes, and enforce per-workspace phone suppressions cleanly.",
      bullets: [
        "E.164 phone normalization with manual WhatsApp check status",
        "Reusable workspace message templates & AI draft helper",
        "Click-to-chat launch without unauthorized account automation",
        "Per-workspace phone suppression & Do-Not-Contact ledger"
      ],
      ctaText: "Open Saved Leads",
      ctaHref: "/app/saved-leads",
      badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    },
    {
      id: "crm",
      title: "Workspace CRM & Pipeline Kanban",
      subtitle: "Visual Deal Stage Tracking",
      desc: "Keep qualified prospects organized in one workspace pipeline from New Lead to Won or Lost, backed directly by your isolated PostgreSQL workspace.",
      bullets: [
        "Visual deal Kanban & tabular pipeline views",
        "Stage updates saved cleanly to your workspace database",
        "Connected lead email, phone & website quick actions",
        "Zero unverified third-party tracking lock-ins"
      ],
      ctaText: "Access Workspace CRM",
      ctaHref: "/app/crm",
      badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20"
    },
    {
      id: "exports",
      title: "Multi-Format Formula-Safe Exports",
      subtitle: "XLSX, PDF, CSV & JSON Portability",
      desc: "Download complete workspace leads or archived search snapshots anytime with full source URLs, contact statuses, UTC/PKT timestamps, and spreadsheet formula neutralization.",
      bullets: [
        "Native Excel (.xlsx) & Executive Landscape PDF (.pdf)",
        "UTF-8 BOM, RFC 4180 CSV (.csv) & Structured JSON (.json)",
        "CWE-1236 spreadsheet formula-injection sanitization",
        "Workspace audit log tracking export history"
      ],
      ctaText: "Explore Export Center",
      ctaHref: "/app/exports",
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
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-4 text-base font-bold text-white shadow-glow-md transition-all hover:scale-105 hover:shadow-glow-purple"
            >
              <span>Sign In to Dashboard</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/features"
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
                <span className="ml-1 text-xs text-slate-400 font-mono">
                  Illustrative Workspace Preview (Sample Data)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 font-medium">
                  Live Workspace Demo Layout
                </span>
                <span className="text-xs text-slate-400 px-2 py-0.5 rounded bg-white/5 font-mono">Multi-Source Discovery</span>
              </div>
            </div>

            {/* Sample UI Preview Grid (Illustrative only) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-left">
              {/* Col 1: Lead Intelligence & Scoring */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0c121e]/80 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-blue-400" /> Lead Intelligence (Sample)
                  </span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Complete Contact</span>
                </div>
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm text-white">Example Dental Clinic</span>
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">MX VALID</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1.5">Healthcare Clinic • Sample Record</p>
                    <div className="flex gap-2 text-[10px] text-slate-300">
                      <span className="bg-white/5 px-2 py-0.5 rounded">Website: Listed</span>
                      <span className="bg-white/5 px-2 py-0.5 rounded">Source URL Stored</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm text-white">Example Logistics Co.</span>
                      <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">SYNTAX VALID</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1.5">Commercial Freight • Sample Record</p>
                    <div className="flex gap-2 text-[10px] text-slate-300">
                      <span className="bg-white/5 px-2 py-0.5 rounded">Phone: E.164 Check</span>
                      <span className="bg-white/5 px-2 py-0.5 rounded">Deduplicated</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Col 2: Outreach & Export Capabilities */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0c121e]/80 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <LineChart className="h-3.5 w-3.5 text-purple-400" /> Pipeline &amp; Exports
                  </span>
                  <span className="text-xs font-bold text-white">Workspace Controls</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-slate-400">Export Formats</div>
                    <div className="text-base font-bold text-emerald-400">XLSX / CSV</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-slate-400">Report &amp; API</div>
                    <div className="text-base font-bold text-blue-400">PDF / JSON</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Basic Plan Daily Gmail Cap</span>
                    <span className="text-purple-400 font-semibold">10 / UTC day</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-[40%]" />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 pt-1">
                    <span>Lifetime Plan Gmail Cap</span>
                    <span className="text-blue-400 font-semibold">Up to 500 / day</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-blue-500 w-[85%]" />
                  </div>
                </div>
              </div>

              {/* Col 3: AI Drafts & Suppression Guard */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0c121e]/80 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Bot className="h-3.5 w-3.5 text-cyan-400" /> AI Outreach Helper
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Gemini Powered</span>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-slate-200 mb-2">
                    <div className="font-semibold text-blue-400 mb-1">Safe 1-to-1 Dispatch</div>
                    Generate personalized email copy and enforce workspace suppression and 30-day duplicate outreach checks before sending.
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
                    <span>Engine Specifications</span>
                    <span className="text-emerald-400 font-bold">OPERATIONAL</span>
                  </div>
                  <div className="space-y-2 text-slate-300">
                    <div>Module: <span className="text-blue-400">{showcase.id.toUpperCase()}</span></div>
                    <div>Verification: <span className="text-emerald-400">Source-Backed</span></div>
                    <div>Security: <span className="text-purple-400">PBKDF2-SHA256 / AES-256-GCM</span></div>
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
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-glow-md hover:bg-blue-500 hover:scale-105 transition-all"
            >
              <span>Sign In to Dashboard</span>
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
