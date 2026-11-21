"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import {
  Check, Sparkles, MessageCircle, ShieldCheck, Mail, Database,
  Search, ArrowRight, Zap, CreditCard, Lock, CheckCircle2, Crown
} from "lucide-react";

export default function PricingPage() {
  const WHATSAPP_NUMBER = "+923174383702";
  const WHATSAPP_LINK = "https://wa.me/923174383702?text=Hello%20Usman%20AI%20GTM,%20I%20want%20to%20activate%20my%20subscription%20($25/mo%20or%20$100%20Lifetime)%20for%20my%20registered%20email:";

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      <section className="py-16 sm:py-24 relative overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>TRANSPARENT, AFFORDABLE B2B SAAS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Scale Verified Lead Generation & Outreach
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto mb-12">
            No expensive enterprise lock-ins or hidden credit markups. Connect your official Google account, extract verified leads across 193 countries, and send individualized cold emails with Gemini AI.
          </p>

          {/* TWO PRICING CARDS: $25/MO & $100 LIFETIME */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
            {/* MONTHLY STARTER PLAN: $25/MO */}
            <div className="rounded-3xl border border-blue-500/40 bg-gradient-to-b from-[#0e1628] to-[#090d16] p-8 shadow-2xl relative flex flex-col justify-between">
              <div className="absolute -top-3.5 left-8 bg-blue-600 text-white text-[11px] font-extrabold uppercase tracking-wider py-1 px-3.5 rounded-full shadow-lg">
                Monthly Subscription
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-4 mb-4 border-b border-white/[0.08] pb-5 pt-2">
                  <div>
                    <h3 className="text-2xl font-black text-white">Starter Monthly</h3>
                    <p className="text-xs text-slate-400 mt-1">Flexible monthly subscription</p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-black text-white">$25</span>
                    <span className="text-xs text-slate-400 font-medium block">/ month (~7,000 PKR)</span>
                  </div>
                </div>

                {/* Quota Highlights */}
                <div className="grid grid-cols-2 gap-2.5 mb-6">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Leads Quota</div>
                    <div className="text-sm font-extrabold text-white">5,000 / mo</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Search Engine</div>
                    <div className="text-sm font-extrabold text-blue-400">Unlimited</div>
                  </div>
                </div>

                {/* Feature List */}
                <div className="space-y-2.5 text-xs text-slate-300 mb-8">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>5,000 Verified B2B Leads per Month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Public Business Email Extraction</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Individual 1-to-1 Gmail Outreach</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Gemini AI Email Personalization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Excel (.xlsx) & Landscape PDF Exports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Search History & Snapshots (PKT Time)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Private Workspace Tenant Isolation</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-white/[0.08]">
                <a
                  href="https://wa.me/923174383702?text=Assalamualaikum.%20I%20want%20to%20buy%20the%20$25%20Basic%20Plan%20(30%20Days)%20for%20my%20registered%20email%3A"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Choose Basic ($25 / 30 Days)</span>
                </a>
              </div>
            </div>

            {/* LIFETIME ACCESS PLAN: $100 */}
            <div className="rounded-3xl border border-amber-500/50 bg-gradient-to-b from-[#191508] via-[#0f1118] to-[#090d16] p-8 shadow-2xl relative flex flex-col justify-between">
              <div className="absolute -top-3.5 left-8 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[11px] font-black uppercase tracking-wider py-1 px-3.5 rounded-full shadow-lg flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5" />
                <span>Best Value — Lifetime Deal</span>
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-4 mb-4 border-b border-white/[0.08] pb-5 pt-2">
                  <div>
                    <h3 className="text-2xl font-black text-amber-200">Lifetime Access</h3>
                    <p className="text-xs text-slate-400 mt-1">Pay once, keep forever</p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-black text-amber-300">$100</span>
                    <span className="text-xs text-slate-400 font-medium block">One-time (~28,000 PKR)</span>
                  </div>
                </div>

                {/* Quota Highlights */}
                <div className="grid grid-cols-2 gap-2.5 mb-6">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="text-[10px] uppercase font-bold text-amber-300 mb-0.5">Recurring Fees</div>
                    <div className="text-sm font-extrabold text-white">$0 / Month</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="text-[10px] uppercase font-bold text-amber-300 mb-0.5">Access Duration</div>
                    <div className="text-sm font-extrabold text-amber-300">Lifetime</div>
                  </div>
                </div>

                {/* Feature List */}
                <div className="space-y-2.5 text-xs text-slate-300 mb-8">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="font-semibold text-white">All Monthly Features Included Forever</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="font-semibold text-amber-300">Exclusive AI Lead Research Agent (Company Analysis & Custom Proposals)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Permanent Isolated Workspace Access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Unlimited Historical Snapshots & Reopens</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Individual Cold Outreach with Gemini AI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Priority WhatsApp Owner Support (+923174383702)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Zero Monthly Renewals or Credit Expirations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Early Access to All Future Platform Upgrades</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-white/[0.08]">
                <a
                  href="https://wa.me/923174383702?text=Assalamualaikum.%20I%20want%20to%20buy%20the%20$100%20Lifetime%20Plan%20for%20my%20registered%20email%3A"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs shadow-lg shadow-amber-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Crown className="h-4 w-4" />
                  <span>Choose Lifetime ($100 One-Time)</span>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white font-semibold text-xs border border-white/10 transition-all"
            >
              <span>Sign In with Google (Free Preview Mode)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* PAYMENT METHODS & ACTIVATION WORKFLOW */}
          <div className="mt-16 max-w-4xl mx-auto rounded-2xl border border-white/[0.08] bg-[#0c1017] p-8 text-left space-y-6">
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
                  <span>Share your registered Google email and choose either the <strong>$25/mo Monthly Plan</strong> or <strong>$100 Lifetime Access Deal</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-blue-400">4.</span>
                  <span>Transfer the chosen fee ($25 or $100) using your preferred method (Raast, Bank, JazzCash, Easypaisa, or Card).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-blue-400">5.</span>
                  <span>Share your payment confirmation or transaction ID on WhatsApp.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-blue-400">6.</span>
                  <span>The owner immediately verifies the transfer and unlocks your account in the system. All paid features become active immediately.</span>
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
