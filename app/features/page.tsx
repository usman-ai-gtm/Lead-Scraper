"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import {
  Target, Search, Mail, MessageSquare, Database, LineChart,
  UserCheck, ShieldCheck, Cpu, Bot, ArrowRight, Zap, CheckCircle2
} from "lucide-react";

export default function FeaturesPage() {
  const domains = [
    {
      title: "Global Lead Discovery & Web Evidence",
      desc: "Search millions of verified commercial entities across 193 countries. Target by niche, industry, revenue, and platform signals.",
      icon: Target,
      href: "/app/leads",
      items: ["193 Countries & Global Cities", "Real-Time Google Business & Maps Crawls", "LinkedIn Company & Decision Maker Filter", "Normalized Domain Deduplication"]
    },
    {
      title: "Deep AI Research & Tech Stack Extraction",
      desc: "Synthesize full business profile, commercial pain points, buying signals, and custom entry pitches in seconds.",
      icon: Search,
      href: "/app/research",
      items: ["Website DOM & Meta Telemetry Analysis", "Automated Tech Stack Fingerprinting", "Buying Signal Detection", "Tailored Value Proposition Synthesis"]
    },
    {
      title: "Cold Email Command Center",
      desc: "Official Google OAuth 2.0 multi-account sender pooling. Automated Day 1 to Day 7 sequence execution with smart reply pauses.",
      icon: Mail,
      href: "/app/outreach",
      items: ["Official Google OAuth 2.0 (Zero Password Risk)", "Multi-Account Sending & Load Balancing", "Dynamic Personalization Tags", "CAN-SPAM Suppression & Hard Bounce Gating"]
    },
    {
      title: "Official Meta WhatsApp Business Cloud API",
      desc: "Enterprise two-way messaging on the official Meta Cloud API platform. High-open interactive templates without phone bans.",
      icon: MessageSquare,
      href: "/app/whatsapp",
      items: ["Official Cloud API Integration", "Two-Way Inbox & Conversation Threads", "Pre-Approved Broadcast Templates", "24-Hour Messaging Window Compliance"]
    },
    {
      title: "Enterprise CRM & Revenue Kanban",
      desc: "Purpose-built 9-stage revenue Kanban board. Track deal value, expected close dates, win probabilities, and connected accounts.",
      icon: Database,
      href: "/app/crm",
      items: ["9-Stage Visual Pipeline (New to Closed-Won)", "Deal Win-Probability Modeling", "Connected Companies & Contacts", "Unified Omnichannel Activity Timeline"]
    },
    {
      title: "Revenue Intelligence & Churn Shield",
      desc: "Predictive analytics for ARR growth. Scenario simulation, cohort retention matrices, sales velocity, and churn mitigation.",
      icon: LineChart,
      href: "/app/revenue",
      items: ["Monte Carlo Forecast Simulator", "Predictive Churn Early-Warning Score", "Sales Velocity Index", "Net Revenue Retention Grouping"]
    },
    {
      title: "Sales Enablement & Battlecards",
      desc: "Equip reps with dynamic competitor battlecards, automated call scoring, roleplay simulations, and tailored proposal generators.",
      icon: UserCheck,
      href: "/app/features-lab",
      items: ["Interactive Competitor Battlecards", "AI Rep Call Coaching & Scoring", "Automated SOW & Proposal Generator", "Commission & SPIF Real-Time Calculator"]
    },
    {
      title: "Enterprise Security & Compliance",
      desc: "SOC 2 Type II continuous evidence collector, GDPR/CCPA data subject request (DSAR) portal, and granular consent ledgers.",
      icon: ShieldCheck,
      href: "/app/admin",
      items: ["SOC 2 Type II Telemetry Logger", "GDPR One-Click DSAR Portal", "Data Residency Routing (US/EU/APAC)", "Zero Plaintext Secret Storage"]
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      <section className="py-20 lg:py-28 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-6">
            <Zap className="h-3.5 w-3.5" />
            <span>FULL ARCHITECTURE MATRIX</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-6">
            Complete Feature <span className="text-gradient">Capabilities</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-3xl mx-auto mb-16">
            Explore the complete suite of sales intelligence, automated prospecting, cold channels, and revenue automation engines.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            {domains.map((d, idx) => {
              const Icon = d.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-8 hover:border-blue-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-xl font-bold text-white">{d.title}</h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-6 leading-relaxed">{d.desc}</p>
                    <ul className="space-y-2 mb-8">
                      {d.items.map((item, iIdx) => (
                        <li key={iIdx} className="flex items-center gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={d.href}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>Launch in Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
