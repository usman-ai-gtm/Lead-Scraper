"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { ShieldCheck, Lock, Globe2, Sparkles, Server } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      <section className="py-20 lg:py-28 relative">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>MISSION &amp; PLATFORM ARCHITECTURE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-6">
            Built for Focused <span className="text-gradient">B2B Prospecting &amp; Outreach</span>
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed mb-12 max-w-3xl mx-auto">
            USMAN AI GTM unifies real-time web and Google Maps business discovery, direct website contact extraction, DNS domain MX checks, isolated lead storage, structured multi-format exports, and 1-to-1 Gmail OAuth outreach into one streamlined workspace.
          </p>

          {/* Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-16">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6">
              <ShieldCheck className="h-8 w-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Official OAuth &amp; Encryption</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Uses official Google OAuth 2.0 with minimal <code className="text-xs text-slate-300">gmail.send</code> scope for 1-to-1 user-initiated sending, with AES-256-GCM encrypted token storage and PBKDF2-SHA256 salted password hashes.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6">
              <Server className="h-8 w-8 text-blue-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Live Search &amp; Gemini AI</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Pairs Serper live web/Places queries and direct website crawling with Google Gemini AI for search strategy parsing, company research briefs, and outreach copy assistance.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6">
              <Globe2 className="h-8 w-8 text-purple-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Honest Verification Status</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Distinguishes syntax validation, domain MX record detection, and source URL evidence without fabricating mailbox delivery guarantees or synthetic contacts.
              </p>
            </div>
          </div>

          {/* Compliance & Trust Section */}
          <div id="security" className="rounded-2xl border border-white/[0.08] bg-[#0c121e] p-8 text-left">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="h-6 w-6 text-blue-400" /> Workspace Isolation &amp; Privacy Controls
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Every customer workspace is logically isolated in Neon PostgreSQL using workspace-scoped queries, session version enforcement, distributed database rate limiting, spreadsheet formula-injection protection on exports, and explicit GDPR/CCPA data subject request handling.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono text-slate-300">
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-emerald-400 font-bold">Workspace Isolation</span> Queries
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-blue-400 font-bold">PBKDF2 / AES-256-GCM</span> Secrets
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <span className="text-purple-400 font-bold">DB Rate Limiting</span> Protection
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <Link href="/privacy#dsr" className="text-amber-400 font-bold hover:underline">
                  DSR &amp; Suppression
                </Link>{" "}
                Workflow
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
