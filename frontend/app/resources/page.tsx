"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { BookOpen, Code, FileText, ArrowRight, Sparkles, Terminal } from "lucide-react";

export default function ResourcesPage() {
  const resources = [
    {
      title: "Enterprise GTM Playbook 2026",
      category: "Playbook",
      desc: "How leading SaaS companies orchestrate cold email and WhatsApp Business Cloud API to scale qualified meetings.",
      icon: BookOpen,
      href: "/app/leads"
    },
    {
      title: "FastAPI REST API Reference",
      category: "Developer Documentation",
      desc: "Complete documentation of the USMAN AI GTM REST API endpoints, schemas, authentication, and WebSocket streams.",
      icon: Code,
      href: "http://127.0.0.1:8000/docs"
    },
    {
      title: "Deliverability & Reputation Architecture",
      category: "Whitepaper",
      desc: "Best practices for Google OAuth multi-sender rotation, SPF/DKIM/DMARC alignment, and hard bounce suppression.",
      icon: FileText,
      href: "/app/accounts"
    },
    {
      title: "Features 501–600 Master Reference",
      category: "Advanced Intelligence",
      desc: "Technical specification for all 100 enterprise engines including Monte Carlo revenue forecasting and predictive churn.",
      icon: Terminal,
      href: "/app/features-lab"
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      <section className="py-20 lg:py-28 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>KNOWLEDGE BASE & DEVELOPER PORTAL</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-6">
            Guides, API Docs & <span className="text-gradient">Playbooks</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-16">
            Everything your revenue operations, engineering, and sales leaders need to maximize pipeline generation.
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
                    <span>Access Resource</span>
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
