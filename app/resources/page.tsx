"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { BookOpen, ShieldCheck, FileText, ArrowRight, Sparkles, Database } from "lucide-react";

export default function ResourcesPage() {
  const resources = [
    {
      title: "Multi-Country & Local Lead Discovery Guide",
      category: "Product Guide",
      desc: "How to structure country/city searches, choose strict contact filters, and interpret DNS MX vs syntax verification statuses.",
      icon: BookOpen,
      href: "/features",
    },
    {
      title: "Gmail OAuth 2.0 & Deliverability Hygiene",
      category: "Outreach Guide",
      desc: "Best practices for connecting personal Google mailboxes, staying within daily sending limits, and managing workspace suppression lists.",
      icon: FileText,
      href: "/app/accounts",
    },
    {
      title: "Multi-Format Data Exports (XLSX, PDF, CSV, JSON)",
      category: "Data Portability",
      desc: "Details on normalized export columns, collection timestamps, UTF-8 CSV encoding, and spreadsheet formula-injection protection.",
      icon: Database,
      href: "/app/exports",
    },
    {
      title: "Privacy Policy, Data Retention & DSR Portal",
      category: "Trust & Compliance",
      desc: "Review Google API Limited Use commitments, data retention schedules, and submit GDPR/CCPA access, deletion, or opt-out requests.",
      icon: ShieldCheck,
      href: "/privacy#dsr",
    },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      <section className="py-20 lg:py-28 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>GUIDES &amp; COMPLIANCE RESOURCES</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-6">
            Guides, Architecture &amp; <span className="text-gradient">Compliance</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-16">
            Practical documentation on lead generation workflows, honest verification statuses, cold outreach safety caps, and privacy rights.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-5xl mx-auto">
            {resources.map((r, idx) => {
              const Icon = r.icon;
              return (
                <div key={idx} className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-8 flex flex-col justify-between hover:border-blue-500/30 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/5 px-2.5 py-1 rounded">
                        {r.category}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3">{r.title}</h3>
                    <p className="text-sm text-slate-400 mb-6 leading-relaxed">{r.desc}</p>
                  </div>

                  <Link
                    href={r.href}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>Open Resource</span>
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
