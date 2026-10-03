"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Check, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  const plans = [
    {
      name: "Starter",
      badge: "Independents & Founders",
      monthlyPrice: 129,
      annualPrice: 99,
      credits: "5,000 Verified Leads / mo",
      aiCredits: "25,000 Multi-AI Tokens",
      seats: "1 Seat",
      campaigns: "3 Active Campaigns",
      features: [
        "Global Lead Discovery (193 Countries)",
        "Deep AI Web Research",
        "Explainable Lead Scoring (0–100)",
        "Gmail & SMTP Integration (1 Account)",
        "Basic Pipeline Kanban CRM",
        "Standard Email Support"
      ],
      ctaText: "Start Starter Plan",
      highlight: false,
    },
    {
      name: "Growth",
      badge: "High-Velocity Sales Teams",
      monthlyPrice: 299,
      annualPrice: 249,
      credits: "20,000 Verified Leads / mo",
      aiCredits: "100,000 Multi-AI Tokens",
      seats: "5 Seats",
      campaigns: "15 Active Campaigns",
      features: [
        "Everything in Starter",
        "Meta WhatsApp Business Cloud API",
        "Official Multi-Account Gmail OAuth",
        "Automated Multi-Step Sequences (Day 1, 2, 4, 7)",
        "Smart Reply Detection & Suppression",
        "Revenue Win Probability Modeling",
        "Priority Slack & Email Support"
      ],
      ctaText: "Start Growth Plan",
      highlight: true,
    },
    {
      name: "Professional",
      badge: "Scaleups & Growth Agencies",
      monthlyPrice: 699,
      annualPrice: 599,
      credits: "75,000 Verified Leads / mo",
      aiCredits: "500,000 Multi-AI Tokens",
      seats: "15 Seats",
      campaigns: "Unlimited Campaigns",
      features: [
        "Everything in Growth",
        "ABM Studio & Intent Surges",
        "Customer Success & Churn Predictor",
        "Sales Enablement Battlecards & Coaching",
        "29-AI Multi-Provider Fallback",
        "Custom Webhook & CRM Export Sync",
        "Dedicated Account Strategist"
      ],
      ctaText: "Start Professional",
      highlight: false,
    },
    {
      name: "Enterprise",
      badge: "Global Revenue Organizations",
      monthlyPrice: 1499,
      annualPrice: 1299,
      credits: "Unlimited Leads & Crawls",
      aiCredits: "Custom Dedicated LLM Cluster",
      seats: "Unlimited Seats & Workspaces",
      campaigns: "Unlimited Omnichannel",
      features: [
        "Everything in Professional",
        "Features 501–600 Master Suite",
        "Dedicated IP Warmup & Reputational Shield",
        "Custom Data Residency (US/EU/APAC)",
        "SOC 2 Type II Compliance Evidence",
        "99.99% Uptime SLA Guarantee",
        "24/7 Dedicated Technical Engineer"
      ],
      ctaText: "Contact Enterprise Sales",
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      <section className="py-20 lg:py-28 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>TRANSPARENT CONFIGURATION-DRIVEN PRICING</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-6">
            Predictable Plans for <span className="text-gradient">Every Growth Stage</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
            Select the plan that matches your revenue goals. Upgrade, downgrade, or cancel anytime.
          </p>

          {/* Billing Switch */}
          <div className="flex items-center justify-center gap-4 mb-16">
            <span className={`text-sm font-medium ${!annual ? "text-white" : "text-slate-400"}`}>
              Monthly Billing
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative inline-flex h-7 w-14 items-center rounded-full bg-blue-600/30 border border-blue-500/40 p-1 transition-colors"
              aria-label="Toggle annual billing"
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-blue-500 shadow-md transform transition-transform ${
                  annual ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${annual ? "text-white" : "text-slate-400"} flex items-center gap-1.5`}>
              Annual Billing <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">Save 20%</span>
            </span>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
            {plans.map((p, idx) => {
              const price = annual ? p.annualPrice : p.monthlyPrice;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                    p.highlight
                      ? "border-blue-500 bg-[#0d1424] shadow-glow-md relative"
                      : "border-white/[0.08] bg-[#0c1017] hover:border-white/20"
                  }`}
                >
                  {p.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-glow-sm">
                      Most Popular
                    </div>
                  )}

                  <div>
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-white">{p.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{p.badge}</p>
                    </div>

                    <div className="mb-6 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-white">${price}</span>
                      <span className="text-xs text-slate-400">/ month</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs space-y-1.5 mb-6 text-slate-300">
                      <div>• <span className="text-white font-medium">{p.credits}</span></div>
                      <div>• <span className="text-blue-400 font-medium">{p.aiCredits}</span></div>
                      <div>• <span className="text-white">{p.seats}</span></div>
                      <div>• <span className="text-white">{p.campaigns}</span></div>
                    </div>

                    <div className="border-t border-white/[0.08] pt-4 mb-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Included Capabilities</p>
                      <ul className="space-y-2.5">
                        {p.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2 text-xs text-slate-300">
                            <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Link
                    href="/signup"
                    className={`w-full py-3 rounded-xl text-center text-sm font-bold transition-all ${
                      p.highlight
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-glow-sm"
                        : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                    }`}
                  >
                    {p.ctaText}
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
