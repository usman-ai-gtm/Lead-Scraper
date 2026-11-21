"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import {
  Check, Sparkles, MessageCircle, ShieldCheck, Mail, Database,
  Search, ArrowRight, Zap, CreditCard, Lock, CheckCircle2
} from "lucide-react";

export default function PricingPage() {
  const WHATSAPP_NUMBER = "+923174383702";
  const WHATSAPP_LINK = "https://wa.me/923174383702?text=Hello%20Usman%20AI%20GTM,%20I%20want%20to%20activate%20my%20subscription%20($10/mo)%20for%20my%20registered%20email:";

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      <section className="py-16 sm:py-24 relative overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>TRANSPARENT, AFFORDABLE B2B SAAS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Everything You Need to Scale Cold Outreach for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">$10/month</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mb-12">
            No expensive enterprise lock-ins or hidden credit markups. Connect your official Google account, extract verified leads across 193 countries, and send individualized cold emails with Gemini AI.
          </p>

          {/* MAIN $10/MO CARD */}
          <div className="max-w-2xl mx-auto rounded-3xl border border-blue-500/40 bg-gradient-to-b from-[#0e1628] to-[#090d16] p-8 sm:p-10 shadow-2xl text-left relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white text-[11px] font-extrabold uppercase tracking-wider py-1 px-4 rounded-full shadow-lg">
              Official Starter SaaS Subscription
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-6 border-b border-white/[0.08] pb-6">
              <div>
                <h3 className="text-2xl font-black text-white">Starter Growth Plan</h3>
                <p className="text-xs text-slate-400 mt-1">For Independent Founders, Sales Consultants & Agencies</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-white">$10</span>
                <span className="text-xs text-slate-400 font-medium">/ month (approx. 2,800 PKR)</span>
              </div>
            </div>

            {/* Quota Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Monthly Leads</div>
                <div className="text-sm font-extrabold text-white">5,000 Leads</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Search Engine</div>
                <div className="text-sm font-extrabold text-blue-400">Unlimited</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] col-span-2 sm:col-span-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Gmail Account</div>
                <div className="text-sm font-extrabold text-emerald-400">1 OAuth Account</div>
              </div>
            </div>

            {/* Feature List */}
            <div className="mb-8 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">What is Included:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>5,000 Verified Business Leads / mo</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Public Business Email Extraction</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Unlimited Google Organic Searches</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Personalized 1-to-1 Cold Outreach</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Gemini AI Business Profile Wizard</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Gemini AI Cold Email Personalization</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Unlimited Excel & Landscape PDF Exports</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Search History Snapshots (by PKT Time)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>SPF, DKIM, DMARC Deliverability Check</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Strict Workspace Data Isolation & Privacy</span>
                </div>
              </div>
            </div>

            {/* WhatsApp Call to Action Button */}
            <div className="space-y-3">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Contact Us on WhatsApp to Subscribe ({WHATSAPP_NUMBER})</span>
              </a>

              <Link
                href="/login"
                className="w-full py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white font-semibold text-xs border border-white/10 flex items-center justify-center gap-2 transition-all"
              >
                <span>Or Sign In with Google (Starts in Preview Mode)</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* PAYMENT METHODS & ACTIVATION WORKFLOW */}
          <div className="mt-16 max-w-3xl mx-auto rounded-2xl border border-white/[0.08] bg-[#0c1017] p-8 text-left space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                <CreditCard className="h-4 w-4" />
                <span>Transparent Payment Policy & Supported Methods</span>
              </div>
              <h4 className="text-lg font-bold text-white">How Account Activation Works</h4>
              <p className="text-xs text-slate-400 mt-1">
                To guarantee zero fake fees, zero unauthorized recurring debits, and full compatibility across Pakistan and international cards, we operate a direct, owner-verified activation workflow.
              </p>
            </div>

            {/* Supported Payment Channels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="font-bold text-white mb-1">🇵🇰 Pakistani Bank Transfer / Raast</div>
                <div className="text-slate-400">Instant direct transfer via Raast ID or IBAN with 0 transaction fees.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="font-bold text-white mb-1">📱 JazzCash & Easypaisa</div>
                <div className="text-slate-400">Fast mobile wallet payment with direct reference verification.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="font-bold text-white mb-1">💳 International Visa & Mastercard</div>
                <div className="text-slate-400">Direct wire or approved international payment link upon request.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="font-bold text-white mb-1">🔒 Super-Admin Verification</div>
                <div className="text-slate-400">The owner reviews payment and activates your account within minutes.</div>
              </div>
            </div>

            {/* 6-Step Workflow */}
            <div className="border-t border-white/[0.08] pt-6">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">6-Step Subscription Process:</div>
              <ol className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-blue-400">1.</span>
                  <span>Sign in to USMAN AI GTM using your official Google account. Your account starts in Preview Mode.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-blue-400">2.</span>
                  <span>Click <strong>Contact Us on WhatsApp ({WHATSAPP_NUMBER})</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-blue-400">3.</span>
                  <span>Share your registered Google email and mention the <strong>$10 Starter Plan</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-blue-400">4.</span>
                  <span>Transfer the $10 subscription fee (approx. 2,800 PKR) using your preferred method (Raast, Bank, JazzCash, Easypaisa).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-blue-400">5.</span>
                  <span>Share your payment confirmation or transaction ID on WhatsApp.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-blue-400">6.</span>
                  <span>The owner immediately verifies the transfer and activates your account in the system. All paid features unlock instantly.</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
