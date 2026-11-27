"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import {
  Target, Search, Mail, MessageSquare, Database,
  UserCheck, ShieldCheck, ArrowRight, Zap, CheckCircle2, Download
} from "lucide-react";

export default function FeaturesPage() {
  const domains = [
    {
      title: "Global Web Lead Discovery & Evidence",
      desc: "Search public company websites and business profiles by country, city, and niche with normalized workspace deduplication.",
      icon: Target,
      href: "/app/leads",
      items: [
        "Multi-country & multi-city campaign targeting",
        "Direct website HTML inspection for public emails & phones",
        "DNS MX lookup & email syntax validation",
        "Workspace-level domain, email & phone deduplication",
      ],
    },
    {
      title: "Google Maps Business Lead Generator",
      desc: "Available on Lifetime & custom Maps-enabled plans. Discover local commercial listings with website crawling and mutual contact filtering.",
      icon: Search,
      href: "/app/google-maps",
      items: [
        "Global Places discovery via Live Intelligence",
        "Email Only, Phone Only, Email & Phone, or Either filter",
        "Background batch processing with live progress & stop control",
        "Maps listing & contact source URL preservation",
      ],
    },
    {
      title: "1-to-1 Gmail OAuth 2.0 Outreach",
      desc: "Send personalized individual outreach emails through your connected Google mailbox without sharing account passwords.",
      icon: Mail,
      href: "/app/outreach",
      items: [
        "Least-privilege gmail.send + userinfo.email OAuth scope",
        "Plan-enforced daily sending caps (10/day Basic, up to 500/day Lifetime)",
        "Workspace suppression list & Do-Not-Contact gating",
        "30-day duplicate outreach prevention",
      ],
    },
    {
      title: "AI Lead Research & Copy Assistant",
      desc: "Generate practical outreach drafts, company summaries, and conversational B2B targeting guidance automatically.",
      icon: Zap,
      href: "/app/assistant",
      items: [
        "Company research modal for saved prospects (Lifetime / enabled plans)",
        "Custom subject & body drafts for Cold Email",
        "Multilingual AI growth assistant inside dashboard",
        "ICP Business Profile tailoring",
      ],
    },
    {
      title: "Multi-Format Formula-Safe Exports",
      desc: "Export filtered workspace leads or individual search snapshots cleanly with full verification statuses and source URLs.",
      icon: Download,
      href: "/app/exports",
      items: [
        "Native Microsoft Excel (.xlsx) workbooks",
        "Landscape Executive PDF (.pdf) reports",
        "UTF-8 BOM, RFC 4180 CSV (.csv) exports",
        "Structured JSON (.json) + CWE-1236 formula sanitization",
      ],
    },
    {
      title: "Workspace CRM & WhatsApp Companion",
      desc: "Organize prospect stages, track email & WhatsApp click-to-chat outreach, and maintain per-workspace suppression lists.",
      icon: MessageSquare,
      href: "/app/saved-leads",
      items: [
        "Lead pipeline stages (New Lead through Won/Lost)",
        "WhatsApp click-to-chat templates & draft helpers",
        "Per-workspace phone & email suppression tables",
        "Permanent search snapshots & history reopen",
      ],
    },
    {
      title: "Manual Payment & Plan Governance",
      desc: "Clear monthly ($25/30 days) and Lifetime ($100 one-time) plans with payment proof uploads and owner verification.",
      icon: UserCheck,
      href: "/app/subscription",
      items: [
        "DB-authoritative UTC subscription expiration locking",
        "Proof of payment upload for Bank, Raast, Wallet & Card",
        "Live Owner client management & custom plan quotas",
        "Full audit trail on account activation and status changes",
      ],
    },
    {
      title: "Security, Rate Limiting & Privacy Controls",
      desc: "Built for multi-tenant isolation, abuse throttling, and straightforward GDPR/CCPA data subject workflows.",
      icon: ShieldCheck,
      href: "/privacy#dsr",
      items: [
        "PBKDF2-SHA256 salted password hashing & session versioning",
        "AES-256-GCM encrypted Gmail OAuth token storage",
        "PostgreSQL-backed distributed rate limiting (429 Retry-After)",
        "Self-service GDPR/CCPA Data Subject Request workflow",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      <section className="py-20 lg:py-28 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-6">
            <Database className="h-3.5 w-3.5" />
            <span>VERIFIED PLATFORM CAPABILITIES</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-6">
            Complete Feature <span className="text-gradient">Capabilities</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-3xl mx-auto mb-16">
            Every feature listed below reflects live, tested functionality across lead discovery, contact validation, exports, outreach, and workspace security.
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
                    <span>Explore Module</span>
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
