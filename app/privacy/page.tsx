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
                <span>1. Google OAuth, Gmail API Data Usage &amp; Limited Use Compliance</span>
              </h2>
              <p>
                USMAN AI GTM (Lead Scraper) uses Google OAuth 2.0 both for account sign-in (<code className="text-xs bg-white/10 px-1 py-0.5 rounded">openid</code>, <code className="text-xs bg-white/10 px-1 py-0.5 rounded">email</code>, <code className="text-xs bg-white/10 px-1 py-0.5 rounded">profile</code>) and to let authorized customers connect their own Gmail accounts for explicit 1-to-1 cold business outreach.
              </p>
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-200 leading-relaxed">
                <strong>Google API Services User Data Policy — Limited Use Disclosure:</strong> USMAN AI GTM&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold text-white"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
                <li><strong className="text-white">Least-Privileged Sending Scope Only:</strong> When you connect a sending mailbox, we request only <code className="text-xs bg-white/10 px-1 py-0.5 rounded">https://www.googleapis.com/auth/gmail.send</code> and <code className="text-xs bg-white/10 px-1 py-0.5 rounded">https://www.googleapis.com/auth/userinfo.email</code>. We never request permissions to read, modify, index, or delete emails in your Gmail inbox.</li>
                <li><strong className="text-white">Strictly User-Initiated Sending:</strong> The <code className="text-xs bg-white/10 px-1 py-0.5 rounded">gmail.send</code> permission is used solely to transmit emails you explicitly compose, review, and click to send from your workspace.</li>
                <li><strong className="text-white">No AI Training or Ad Broker Sharing:</strong> We never use Google Workspace / Gmail API data or tokens to train generalized AI/ML models, and we never sell, rent, or transfer Google user data to third-party advertisers or data brokers.</li>
                <li><strong className="text-white">Token Encryption &amp; Workspace Isolation:</strong> OAuth access and refresh tokens are encrypted at rest with AES-256-GCM authenticated encryption in PostgreSQL and isolated strictly to your authenticated workspace. Tokens are never exposed in frontend code or customer-facing APIs.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="p-6 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <EyeOff className="h-5 w-5 text-blue-400" />
                <span>2. B2B Public Business Directory Data</span>
              </h2>
              <p>
                Lead records surfaced by Find Leads and Google Maps discovery contain publicly listed commercial business information (company names, official domains, business phone numbers, and public corporate contact addresses).
              </p>
            </section>

            {/* Section 3 */}
            <section className="p-6 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-purple-400" />
                <span>3. Token Retention, Revocation &amp; Disconnection</span>
              </h2>
              <p>
                You may disconnect any connected Gmail account at any time from <strong className="text-white">Gmail Connections</strong> inside your dashboard (which also revokes the token with Google OAuth and removes stored encrypted credentials from our database), or directly from your{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Google Account Third-Party Permissions
                </a>
                . For workspace data deletion requests, contact{" "}
                <a href="mailto:telegramtiktokn1@gmail.com" className="text-blue-400 hover:underline">
                  telegramtiktokn1@gmail.com
                </a>{" "}
                or WhatsApp (+923174383702).
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
