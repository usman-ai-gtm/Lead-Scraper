"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { ShieldCheck, Lock, Globe2, Sparkles, Server, CheckCircle2 } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      <section className="py-20 lg:py-28 relative">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>MISSION & ENTERPRISE ARCHITECTURE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-6">
            Built for Serious <span className="text-gradient">B2B Revenue Teams</span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-12 max-w-3xl mx-auto">
            USMAN AI GTM was founded to solve the fragmentation of modern sales technology. Instead of stitching together 12 separate tools for scraping, enrichment, validation, warm-up, sequencing, and CRM, we built a single unified AI engine that orchestrates the entire journey from discovery to closed revenue.
          </p>

          {/* Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-16">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6">
              <ShieldCheck className="h-8 w-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Zero-Compromise Security</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Official Google OAuth 2.0 and Meta WhatsApp Cloud API integrations. No credential scraping, no reverse-engineered unofficial web hooks, and zero plaintext secret storage.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6">
              <Server className="h-8 w-8 text-blue-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">29-Model Multi-AI Engine</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Autonomous failover across 29 specialized AI providers. If one provider experiences latency or rate limits, tasks automatically reroute seamlessly without disrupting campaigns.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6">
              <Globe2 className="h-8 w-8 text-purple-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Global Data Coverage</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Indexed coverage across 193 countries, hundreds of localized metropolitan areas, and cross-platform verification to ensure your SDRs target actual commercial entities.
              </p>
            </div>
          </div>

          {/* Compliance & Trust Section */}
          <div id="security" className="rounded-2xl border border-white/[0.08] bg-[#0c121e] p-8 text-left">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="h-6 w-6 text-blue-400" /> Enterprise Compliance & Data Residency
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              USMAN AI GTM adheres strictly to international privacy regulations, including GDPR, CCPA, and CAN-SPAM. Every workspace is logically isolated, encrypted at rest using AES-256-GCM, and backed up with point-in-time recovery.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono text-slate-300">
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-emerald-400 font-bold">SOC 2 Type II</span> Ready
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-blue-400 font-bold">GDPR & CCPA</span> Compliant
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-purple-400 font-bold">TLS 1.3 / AES-256</span> Encryption
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-amber-400 font-bold">99.99%</span> Uptime Target
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
