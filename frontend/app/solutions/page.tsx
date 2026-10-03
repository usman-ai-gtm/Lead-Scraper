"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Building2, Rocket, Briefcase, Users2, ArrowRight, Check } from "lucide-react";

export default function SolutionsPage() {
  const solutions = [
    {
      title: "Enterprise Sales & Global Accounts",
      badge: "Scale & Precision",
      icon: Building2,
      desc: "For enterprise sales leaders targeting Fortune 5,000 accounts with account-based orchestration and multi-touch cadences.",
      benefits: [
        "Buying committee mapping for complex stakeholder hierarchies",
        "Official Google & Meta multi-sender account pools",
        "Strict SOC 2 Type II and GDPR data residency compliance",
        "Predictive win-probability to optimize quarterly forecast"
      ],
      href: "/app/abm"
    },
    {
      title: "RevOps & Pipeline Acceleration",
      badge: "Efficiency & Automation",
      icon: Rocket,
      desc: "Eliminate manual SDR data entry, sync omnichannel timeline events into CRM, and forecast pipeline with ML models.",
      benefits: [
        "Unified pipeline telemetry across cold email, WhatsApp, and calls",
        "Automated lead scoring separating hot accounts from noise",
        "Monte Carlo simulation predicting commit vs best-case ARR",
        "Automated SLA monitoring on inbound lead response time"
      ],
      href: "/app/revenue"
    },
    {
      title: "Lead Generation & GTM Agencies",
      badge: "High Velocity & Multi-Client",
      icon: Briefcase,
      desc: "Run high-volume, multi-tenant prospecting campaigns for hundreds of clients from a single command center.",
      benefits: [
        "Workspace isolation keeping client data completely separated",
        "White-label exports and client-ready analytical slide summaries",
        "193 countries discovery accessing niche global markets",
        "Automated domain rotation and spam protection"
      ],
      href: "/app/leads"
    },
    {
      title: "Customer Success & Retention Teams",
      badge: "Mitigate Churn & Expand ARR",
      icon: Users2,
      desc: "Protect recurring revenue with real-time churn risk indicators, QBR automation, and expansion triggers.",
      benefits: [
        "360-degree customer health score based on product telemetry",
        "Automated QBR slide generation summarizing client ROI",
        "Executive sponsor turnover alerts via LinkedIn tracking",
        "Net revenue retention cohort matrices"
      ],
      href: "/app/customers"
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      <section className="py-20 lg:py-28 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-6">
            <span>TAILORED REVENUE WORKFLOWS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-6">
            Engineered For <span className="text-gradient">Every Growth Model</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-16">
            Whether scaling an enterprise sales force or operating a high-velocity B2B agency, USMAN AI GTM adapts to your revenue architecture.
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
                    <span>View Solution Workspace</span>
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
