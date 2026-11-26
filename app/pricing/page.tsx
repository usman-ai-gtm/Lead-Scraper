"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import {
  Sparkles,
  MessageCircle,
  CreditCard,
  ArrowRight,
  UserPlus,
  LogIn,
} from "lucide-react";
import { CustomPlanBuilder, PlanSelectionValue } from "@/components/payments/CustomPlanBuilder";

export default function PricingPage() {
  const WHATSAPP_NUMBER = "+923174383702";
  const [selectedOrder, setSelectedOrder] = useState<PlanSelectionValue | null>(null);

  const buildOrderQuery = (sel: PlanSelectionValue) => {
    const params = new URLSearchParams({
      plan: sel.plan,
      currency: sel.currency,
    });
    if (sel.plan === "CUSTOM" && sel.durationUnit !== "lifetime" && sel.durationValue) {
      params.set("unit", sel.durationUnit);
      params.set("qty", String(sel.durationValue));
      params.set("maps", sel.includeGoogleMaps ? "1" : "0");
    }
    return `/app/subscription?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      <section className="py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>TRANSPARENT B2B SAAS PRICING &amp; CUSTOM BUILDER</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
              Choose Fixed Plans or Pay-As-You-Need Access
            </h1>

            <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              Start with Basic ($25 / 30 days, Google Maps excluded), unlock permanent Lifetime Access ($100 one-time, Google Maps included), or customize hourly, daily, weekly, or monthly access in your currency.
            </p>
          </div>

          <CustomPlanBuilder
            initialPlan="BASIC"
            onChange={(sel) => setSelectedOrder(sel)}
            ctaSlot={(sel) => {
              const targetUrl = buildOrderQuery(sel);
              const signupHref = `/signup?next=${encodeURIComponent(targetUrl)}`;
              const whatsappText = encodeURIComponent(
                `Hello Usman AI GTM, I selected ${sel.planLabel} (${sel.currency}) and created my account.`
              );
              return (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href={signupHref}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow-sm inline-flex items-center gap-2 transition-all"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Create Account &amp; Proceed to Payment</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>

                  <Link
                    href={`/login?next=${encodeURIComponent(targetUrl)}`}
                    className="px-4 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-200 font-semibold text-xs inline-flex items-center gap-2 transition-all"
                  >
                    <LogIn className="h-4 w-4 text-blue-400" />
                    <span>Existing Customer: Open Payment Page</span>
                  </Link>

                  <a
                    href={`https://wa.me/923174383702?text=${whatsappText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-300 font-semibold text-xs inline-flex items-center gap-2 transition-all"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Questions? WhatsApp ({WHATSAPP_NUMBER})</span>
                  </a>
                </div>
              );
            }}
          />

          {/* Transparent Activation Policy */}
          <div className="max-w-4xl mx-auto rounded-2xl border border-white/[0.08] bg-[#0c1017] p-8 text-left space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                <CreditCard className="h-4 w-4" />
                <span>How Purchase &amp; Same-Account Activation Works</span>
              </div>
              <h2 className="text-lg font-bold text-white">Simple 6-Step Owner-Verified Activation</h2>
              <p className="text-xs text-slate-400 mt-1">
                {selectedOrder
                  ? `Selected preview: ${selectedOrder.planLabel}. Sign up or sign in to view live Owner-configured bank/payment methods, copy exact transfer details, and upload payment proof cleanly.`
                  : "Sign up or sign in inside your customer dashboard to view Owner-configured payment details and upload proof."}
              </p>
            </div>

            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
              <li className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <strong className="text-white block mb-1">1. Register Your Account</strong>
                Create your isolated workspace with Username &amp; Password or Continue with Google.
              </li>
              <li className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <strong className="text-white block mb-1">2. Pick Plan &amp; Currency</strong>
                Choose Basic ($25), Lifetime ($100), or Custom Hourly ($1/hr, 50 leads/hr), Daily, Weekly, or Monthly access.
              </li>
              <li className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <strong className="text-white block mb-1">3. Copy Exact Transfer Details</strong>
                Inside Usage &amp; Subscription, select an active configured payment method (Bank Transfer, Payoneer, Binance, Trust Wallet, JazzCash, Easypaisa) and transfer the displayed amount.
              </li>
              <li className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <strong className="text-white block mb-1">4. Submit Proof &amp; Receive Activation</strong>
                Upload your transfer screenshot inside your account. The Owner verifies receipt of funds and activates your exact existing account with a notification.
              </li>
            </ol>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
