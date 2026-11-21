"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { ShieldCheck, Lock, EyeOff, KeyRound, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400 mb-4">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>DATA PRIVACY & COMPLIANCE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-400 mb-12">
            Last updated: November 2026 • Strict Google User Data Policy & Multi-Tenant Isolation Compliance.
          </p>

          <div className="space-y-10 text-sm text-slate-300 leading-relaxed">
            {/* Section 1 */}
            <section className="p-6 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-400" />
                <span>1. Google OAuth & User Data Privacy</span>
              </h2>
              <p>
                USMAN AI GTM uses Google OAuth 2.0 to authenticate users and allow users to connect their own Gmail accounts for 1-to-1 cold business outreach.
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
                <li><strong className="text-white">No Selling of Google Data:</strong> We never sell, rent, or monetize your Google account data or email contacts to third parties or advertising brokers.</li>
                <li><strong className="text-white">Restricted Scope:</strong> We only request permissions necessary to send authorized outreach emails on your behalf (<code className="text-xs bg-white/10 px-1 py-0.5 rounded">https://www.googleapis.com/auth/gmail.send</code>).</li>
                <li><strong className="text-white">Token Encryption:</strong> OAuth tokens are encrypted at rest using AES-256-GCM authenticated encryption before being saved in our database.</li>
                <li><strong className="text-white">Strict Isolation:</strong> Your connected Gmail accounts are isolated strictly to your assigned workspace. No other client, user, or organization can send from or access your credentials.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="p-6 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <EyeOff className="h-5 w-5 text-blue-400" />
                <span>2. B2B Public Directory Data</span>
              </h2>
              <p>
                Lead information surfaced by our search engine represents publicly available commercial business data (such as company names, official business domains, corporate phone numbers, and public email addresses). We do not collect or store private non-business consumer communications.
              </p>
            </section>

            {/* Section 3 */}
            <section className="p-6 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-purple-400" />
                <span>3. Data Retention & Disconnection</span>
              </h2>
              <p>
                You may disconnect your Google Gmail account at any time directly through the Settings dashboard. Upon disconnection, your OAuth tokens are permanently scrubbed from our active database. You may also request deletion of your entire workspace by messaging our data privacy team on WhatsApp (+923174383702).
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
