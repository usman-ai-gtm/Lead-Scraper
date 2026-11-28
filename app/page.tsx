"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Search,
  Mail,
  MessageSquare,
  Shield,
  Database,
  Mic,
  MapPin,
  Download,
  Globe,
  Crown,
  Zap,
  Bot,
  Sliders,
  Briefcase,
} from "lucide-react";

export default function HomePage() {
  const threeSteps = [
    {
      step: "01",
      title: "Describe Your Business",
      desc: "Prepare your description in ChatGPT Voice or type naturally in Urdu, English, Arabic, German, Hindi, or 25+ other languages. We structure your ideal customer profile automatically.",
      icon: Sparkles,
      href: "/app/business-profile",
      accent: "text-amber-300 border-amber-500/30 bg-amber-500/10",
    },
    {
      step: "02",
      title: "Discover & Verify Leads",
      desc: "Search commercial companies globally across web indexes and Google Maps. Inspect company websites, social links, DNS MX domain checks, and source evidence.",
      icon: Globe,
      href: "/app/leads",
      accent: "text-blue-300 border-blue-500/30 bg-blue-500/10",
    },
    {
      step: "03",
      title: "Personalize & Connect",
      desc: "Generate individualized cold emails grounded in real company details and your business offer, then send 1-to-1 from your own Gmail OAuth workspace.",
      icon: Mail,
      href: "/app/outreach",
      accent: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
    },
  ];

  const capabilities = [
    {
      title: "Global Web Lead Discovery",
      desc: "Multi-country B2B search with vertical intelligence, direct site crawling, and workspace deduplication.",
      href: "/app/leads",
      icon: Search,
      tag: "Discovery",
    },
    {
      title: "Local Service Prospect & Google Maps",
      desc: "Extract local business listings, phone numbers, and company sites across cities worldwide.",
      href: "/app/google-maps?keyword=local+services",
      icon: MapPin,
      tag: "Local Maps",
    },
    {
      title: "Multilingual Business Profile",
      desc: "Describe or translate your offer via ChatGPT Voice or text with RTL/LTR editing and tailored search targeting.",
      href: "/app/business-profile",
      icon: Briefcase,
      tag: "ICP Profile",
    },
    {
      title: "Personalized Cold Email Studio",
      desc: "1-to-1 Gmail OAuth 2.0 sending, 6 structured templates, batch per-lead draft personalization, and suppression guards.",
      href: "/app/outreach",
      icon: Mail,
      tag: "Outreach",
    },
    {
      title: "Context-Aware Business Assistant",
      desc: "Chat or speak inside your workspace with full visibility into your business offer, saved leads, and next steps.",
      href: "/app/assistant",
      icon: Bot,
      tag: "Assistant",
    },
    {
      title: "CRM Pipeline & Safe Exports",
      desc: "Organize deals on your Kanban pipeline and export formula-safe XLSX, Landscape PDF, CSV, and JSON reports.",
      href: "/app/exports",
      icon: Download,
      tag: "CRM & Export",
    },
  ];

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-white">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
        <div className="absolute top-0 left-1/2 w-[720px] h-[360px] bg-amber-500/[0.06] rounded-full blur-[140px] pointer-events-none animate-ambient-drift" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/[0.08] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200 mb-8">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>USMAN AI GTM • B2B Lead Intelligence &amp; Outreach</span>
          </div>

          <h1 className="animate-fade-up-delay-1 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.12] mb-6">
            Find Business Leads. Understand Companies.{" "}
            <span className="animate-text-shimmer bg-gradient-to-r from-amber-200 via-white to-blue-300 bg-clip-text text-transparent">
              Reach the Right Customers.
            </span>
          </h1>

          <p className="animate-fade-up-delay-2 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Describe what you sell using ChatGPT Voice or text in your own language, discover real business prospects with source links and domain MX checks, write personalized outreach, and send directly through Gmail.
          </p>

          <div className="animate-fade-up-delay-2 flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 px-8 py-3.5 text-sm font-bold text-slate-950 shadow-[0_12px_36px_-10px_rgba(245,158,11,0.55)] transition-all duration-300 hover:brightness-105 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-10px_rgba(245,158,11,0.7)]"
            >
              <span>Sign In to Workspace</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/[0.07] hover:border-amber-400/40 hover:-translate-y-0.5"
            >
              <span>Explore Plans &amp; Global Currency</span>
            </Link>
          </div>

          {/* RESTRAINED INTERACTIVE WORKSPACE PREVIEW (ILLUSTRATIVE LAYOUT) */}
          <div
            id="platform"
            className="animate-fade-up-delay-3 relative mx-auto max-w-5xl rounded-2xl border border-white/[0.1] bg-gradient-to-b from-[#0d121c] to-[#080b11] p-4 sm:p-6 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)] text-left"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] pb-3.5 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80 animate-pulse" />
                <span className="text-xs font-mono text-slate-400">
                  Illustrative Workspace Preview (Sample Demonstration Layout)
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  Workspace Isolated
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-slate-300">
                  Source-Backed Data
                </span>
              </div>
            </div>

            {/* Subtle Decorative Search Interface Bar (Illustrative Visual Only) */}
            <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#070a10] px-4 py-2.5 mb-4 flex items-center justify-between gap-3">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-amber-400/[0.07] to-transparent animate-search-scan" />
              <div className="relative flex items-center gap-2.5 min-w-0">
                <Search className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                <span className="text-xs text-slate-300 font-mono truncate">
                  &ldquo;Private dental clinics in United Kingdom &amp; UAE&rdquo;
                </span>
              </div>
              <span className="relative text-[10px] font-mono text-slate-500 shrink-0 hidden sm:inline">
                Sample Query Illustration
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Step Preview 1 */}
              <Link
                href="/app/business-profile"
                className="group rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3 hover:border-amber-400/35 hover:bg-white/[0.035] transition-all block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Business Profile Input
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-amber-200">25+ Languages →</span>
                </div>
                <div className="p-3 rounded-lg bg-[#07090e] border border-white/[0.06] text-xs text-slate-300 leading-relaxed">
                  &ldquo;We build modern dental websites and local SEO campaigns for private clinics in the UK and UAE.&rdquo;
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-white/[0.05] text-slate-300">ICP: Dental Clinics</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.05] text-slate-300">ChatGPT Voice / Text</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.05] text-slate-300">LTR &amp; RTL Ready</span>
                </div>
              </Link>

              {/* Step Preview 2 */}
              <Link
                href="/app/leads?keyword=dental+clinics&country=United+Kingdom"
                className="group rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3 hover:border-blue-400/35 hover:bg-white/[0.035] transition-all block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5" /> Prospect Discovery (Sample)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300">MX Checked →</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-[#07090e] border border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Example Dental Group</span>
                      <span className="text-[10px] font-mono text-emerald-300">Syntax + MX</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Website crawled • Public contact &amp; URL saved</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#07090e] border border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Example Freight Logistics</span>
                      <span className="text-[10px] font-mono text-blue-300">Source URL</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Workspace deduplication enabled</div>
                  </div>
                </div>
              </Link>

              {/* Step Preview 3 */}
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 flex flex-col justify-between space-y-3 hover:border-emerald-400/35 transition-colors">
                <Link href="/app/outreach" className="space-y-2.5 block group">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> Personalized Outreach
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-emerald-200">Workspace Engine →</span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 text-xs text-slate-200 leading-relaxed">
                    Tailors subject line and intro from real company context while checking opt-out suppression and 30-day duplicate guards before Gmail OAuth dispatch.
                  </div>
                </Link>
                <Link
                  href="/app"
                  className="w-full text-center py-2.5 text-xs font-bold text-white bg-white/[0.07] hover:bg-blue-600 rounded-lg border border-white/10 transition-colors"
                >
                  Open SaaS Workspace →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-STEP HOW IT WORKS */}
      <section className="py-20 border-y border-white/[0.07] bg-[#080b12]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              Three practical steps from offer to outreach
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {threeSteps.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.step}
                  href={s.href}
                  className="group rounded-2xl border border-white/[0.08] bg-[#0c1018] p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-400/35 hover:shadow-[0_18px_45px_-20px_rgba(245,158,11,0.3)]"
                >
                  <div className="flex items-center justify-between mb-6">
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105 ${s.accent}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-mono text-slate-500">STEP {s.step}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2.5 group-hover:text-amber-200 transition-colors">
                    {s.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CORE PLATFORM CAPABILITIES */}
      <section className="py-20 bg-[#06080d]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div className="max-w-2xl">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-400">
                Core Modules
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
                Everything inside your isolated workspace
              </h2>
            </div>
            <Link
              href="/features"
              className="text-xs font-semibold text-slate-300 hover:text-white inline-flex items-center gap-1.5"
            >
              <span>Inspect full feature directory</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-2xl border border-white/[0.08] bg-[#0b0f17] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/35"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-white/[0.03] px-2.5 py-1 rounded-md border border-white/[0.06]">
                      {item.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-blue-300 transition-colors flex items-center justify-between">
                    <span>{item.title}</span>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* TRANSPARENT PRICING PREVIEW */}
      <section className="py-20 border-t border-white/[0.07] bg-[#080b12]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-400">
              Clear USD Pricing &amp; Global FX Estimates
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-3">
              Start Fixed or Pay-As-You-Need
            </h2>
            <p className="text-sm text-slate-400">
              All subscriptions are verified manually before activation. View equivalents across global ISO 4217 currencies or USDT (TRC20 Only).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Basic Plan</span>
                  <Zap className="h-4 w-4 text-blue-400" />
                </div>
                <div className="text-3xl font-black text-white mb-1">$25 <span className="text-sm font-medium text-slate-400">USD / 30 days</span></div>
                <p className="text-xs text-slate-400 mb-4">2,500 web leads • 10 cold emails/day • Full CRM &amp; exports</p>
              </div>
              <Link href="/app/subscription?plan=BASIC" className="w-full text-center py-2.5 rounded-xl bg-white/[0.07] hover:bg-blue-600 text-xs font-bold text-white transition-colors">
                Select Basic Plan
              </Link>
            </div>

            <div className="rounded-2xl border border-amber-400/35 bg-gradient-to-b from-[#131926] to-[#0c1018] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Lifetime Access</span>
                  <Crown className="h-4 w-4 text-amber-300" />
                </div>
                <div className="text-3xl font-black text-white mb-1">$100 <span className="text-sm font-medium text-slate-400">USD one-time</span></div>
                <p className="text-xs text-slate-300 mb-4">Google Maps Search • AI Lead Briefs &amp; Personalized Emails • Up to 500 emails/day</p>
              </div>
              <Link href="/app/subscription?plan=LIFETIME" className="w-full text-center py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-colors">
                Select Lifetime Access
              </Link>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Custom Builder</span>
                  <Sliders className="h-4 w-4 text-purple-300" />
                </div>
                <div className="text-3xl font-black text-white mb-1">From $1 <span className="text-sm font-medium text-slate-400">USD / hour</span></div>
                <p className="text-xs text-slate-400 mb-4">$1/hr • $15/day • $50/wk • $75/mo with global ISO currency estimator</p>
              </div>
              <Link href="/pricing" className="w-full text-center py-2.5 rounded-xl bg-white/[0.07] hover:bg-purple-600 text-xs font-bold text-white transition-colors">
                Open Custom Calculator
              </Link>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-emerald-400" /> Official Google OAuth 2.0 (<code className="font-mono text-slate-300">gmail.send</code>)</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-blue-400" /> Neon PostgreSQL Workspace Isolation</span>
            <span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5 text-amber-300" /> Direct Owner WhatsApp Support (+923174383702)</span>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
