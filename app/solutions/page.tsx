"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Building2, Rocket, Briefcase, Users2, ArrowRight, Check } from "lucide-react";

export default function SolutionsPage() {
  const solutions = [
    {
      title: "B2B Agencies & Service Providers",
      badge: "Targeted Prospecting",
      icon: Building2,
      desc: "Discover niche businesses across target countries and cities, inspect public websites for decision-maker contacts, and track outreach cleanly.",
      benefits: [
        "Multi-country & specific-city campaign scoping",
        "Official Google OAuth 2.0 direct Gmail dispatch",
        "PBKDF2 password hashing and workspace-scoped database isolation",
        "Clear email syntax, DNS MX & phone status classification",
      ],
      href: "/app/leads",
    },
    {
      title: "Local Business & Map Lead Teams",
      badge: "Local Discovery",
      icon: Rocket,
      desc: "Target brick-and-mortar clinics, contractors, salons, and regional firms via Google Maps discovery on Lifetime and Maps-enabled plans.",
      benefits: [
        "Live Google Places extraction paired with website email crawling",
        "Mutual contact filters (Email & Phone, Email Only, Phone Only)",
        "Background batch processing with saved search snapshots",
        "Click-to-chat WhatsApp templates with workspace suppressions",
      ],
      href: "/app/google-maps",
    },
    {
      title: "Lead Generation Consultants",
      badge: "Client Deliverables",
      icon: Briefcase,
      desc: "Build clean, deduplicated prospect deliverables ready to share with clients or import into external CRM systems.",
      benefits: [
        "Workspace deduplication prevents saving identical domains/emails twice",
        "Multi-format exports in XLSX, Executive PDF, UTF-8 CSV & JSON",
        "Original source evidence URLs and UTC/PKT collection timestamps",
        "Spreadsheet formula-injection sanitization across XLSX & CSV",
      ],
      href: "/app/exports",
    },
    {
      title: "Founders & Lean Sales Teams",
      badge: "Affordable Outbound",
      icon: Users2,
      desc: "Run focused 1-to-1 cold email outreach without expensive per-seat enterprise lock-ins or complex external mail infrastructure.",
      benefits: [
        "Predictable $25/month Basic or $100 one-time Lifetime pricing",
        "Server-enforced daily sending caps & duplicate recipient checks",
        "Gemini AI email copy & research briefs per saved company",
        "Direct WhatsApp & Dashboard Owner support (+923174383702)",
      ],
      href: "/pricing",
    },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      <section className="py-20 lg:py-28 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-6">
            <span>PRACTICAL B2B WORKFLOWS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-6">
            Engineered For <span className="text-gradient">Outbound Teams</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-16">
            Whether prospecting locally via Google Maps or researching international web niches, USMAN AI GTM keeps workflows transparent and tenant-isolated.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            {solutions.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={idx} className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-8 flex flex-col justify-between hover:border-blue-500/30 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/5 px-2.5 py-1 rounded">
                        {s.badge}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                    <p className="text-sm text-slate-400 mb-6 leading-relaxed">{s.desc}</p>

                    <ul className="space-y-2.5 mb-8">
                      {s.benefits.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2 text-xs text-slate-300">
                          <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={s.href}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>Explore Workflow</span>
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
