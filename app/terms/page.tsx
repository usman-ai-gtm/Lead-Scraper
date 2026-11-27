"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Shield, FileText, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      <main className="flex-1 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-blue-400 mb-4">
            <FileText className="h-3.5 w-3.5" />
            <span>LEGAL AGREEMENT</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-400 mb-12">
            Last updated: November 2026 • Effective immediately for all registered users and clients.
          </p>

          <div className="space-y-10 text-sm text-slate-300 leading-relaxed">
            {/* Section 1 */}
            <section className="p-6 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-blue-400">1.</span> Platform Access & Subscriptions
              </h2>
              <p>
                USMAN AI GTM (Lead Scraper) is a proprietary B2B sales intelligence and outreach platform. Access is granted per isolated workspace under Admin-provisioned subscription tiers:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
                <li>
                  <strong className="text-white">Starter Basic Plan ($25 / 30 Days):</strong> Grants access to Find Leads, Saved Leads, Search History, XLSX/PDF exports, AI Assistant, and up to 10 cold emails per UTC day for 30 consecutive days (Google Maps excluded). Accounts lock automatically upon expiry until renewed.
                </li>
                <li>
                  <strong className="text-white">Lifetime Access Plan ($100 One-time):</strong> Grants permanent access to all platform modules including Google Maps Lead Generator and AI Lead Research (subject to fair Gmail daily safety caps of up to 500 emails/UTC day).
                </li>
                <li>
                  <strong className="text-white">Custom Subscription Plans:</strong> Configurable pay-as-you-need duration tiers billed in USD (or converted FX equivalents): Hourly ($1/hour, 50 leads per hour), Daily ($15/day, 250 leads/day), Weekly ($50/week, 1,000 leads/week), and Monthly ($75/month, 5,000 leads/month). Time spent completing verified Gmail setup may be compensated upon Owner approval via the in-app Gmail Setup Time Bonus request.
                </li>
              </ul>
              <p className="text-xs text-slate-400">
                All subscriptions are verified manually before activation. Payment proof uploads (Easypaisa, JazzCash, Meezan Bank, NayaPay, Binance USDT TRC20, Payoneer, or Owner-approved alternatives) remain PENDING until the Owner verifies receipt of funds. For crypto transfers via Binance, send solely over the TRC20 network — transfers over wrong networks risk permanent loss of funds. Need support? Contact WhatsApp (+923174383702).
              </p>
            </section>

            {/* Section 2 */}
            <section className="p-6 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-blue-400">2.</span> Acceptable Use & Email Outreach Compliance
              </h2>
              <p>
                Users agree to use USMAN AI GTM strictly for legitimate commercial B2B prospecting. When conducting cold email outreach through integrated Google Gmail accounts, users agree to:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
                <li>Comply with CAN-SPAM, GDPR, CASL, and all applicable telecommunications regulations.</li>
                <li>Honor recipient opt-out and unsubscribe requests immediately.</li>
                <li>Not engage in unlawful mass spamming, phishing, distribution of malware, or abusive harassment.</li>
                <li>Adhere to Google Gmail sending guidelines and daily quota limits (maximum 500 emails/day per connected account).</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="p-6 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-blue-400">3.</span> Multi-Tenant Data Isolation
              </h2>
              <p>
                Every workspace on USMAN AI GTM is cryptographically and logically isolated in our Authoritative Neon PostgreSQL database. Clients cannot access other tenants&apos; leads, search history, connected Gmail credentials, or export records under any circumstance.
              </p>
            </section>

            {/* Section 4 */}
            <section className="p-6 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-blue-400">4.</span> Cancellation & Suspension
              </h2>
              <p>
                Platform administrators reserve the right to lock or suspend accounts that violate acceptable use policies, exceed fair usage constraints, or engage in malicious activity. Suspended or locked accounts may request review by contacting WhatsApp (+923174383702).
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
