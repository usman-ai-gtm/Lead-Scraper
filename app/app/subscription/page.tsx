"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  CreditCard, ShieldCheck, CheckCircle2, AlertTriangle,
  MessageCircle, ExternalLink, Zap, RefreshCw, Lock, Sparkles, Building2,
  Database, Search
} from "lucide-react";

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    leads_count: 0,
    searches_count: 0,
    connected_accounts: 0,
    max_leads: 5000,
  });

  const WHATSAPP_NUMBER = "+923174383702";
  const WHATSAPP_LINK = `https://wa.me/923174383702?text=Assalamualaikum.%20I%20want%20to%20activate%20my%20subscription%20($25/mo%20Basic%20or%20$100%20Lifetime)%20for%20my%20registered%20email:%20${encodeURIComponent(user?.email || "")}`;

  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, metricsRes] = await Promise.all([
          api.get<any>("/auth/me").catch(() => null),
          api.get<any>("/workspace/metrics").catch(() => null),
        ]);
        if (meRes) setProfile(meRes);
        if (metricsRes) {
          setStats({
            leads_count: metricsRes.saved_leads ?? metricsRes.total_leads_found ?? 0,
            searches_count: metricsRes.total_leads_found ?? 0,
            connected_accounts: metricsRes.connected_gmail_accounts ?? 0,
            max_leads: metricsRes.max_quota ?? 5000,
          });
        }
      } catch {}
      setLoading(false);
    }
    if (user?.id) {
      fetchData();
    }
  }, [user?.id, user?.workspace_id]);

  const currentStatus = profile?.status || user?.status || "LOCKED";
  const isLocked = currentStatus === "LOCKED" || currentStatus === "PENDING";
  const isExpired = currentStatus === "EXPIRED";
  const isActive = currentStatus === "ACTIVE";
  const planTypeUpper = String(profile?.plan_type || profile?.plan || user?.plan || "").toUpperCase();
  const isLifetime = planTypeUpper === "LIFETIME" || planTypeUpper === "OWNER_LIFETIME" || (planTypeUpper === "CUSTOM" && String(profile?.custom_duration_unit || "").toLowerCase() === "lifetime");
  const isCustom = planTypeUpper === "CUSTOM";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
              Workspace Billing & Quota
            </span>
            <span className="text-xs text-slate-400 font-mono">Workspace ID: #{user?.workspace_id || 1}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Subscription & Usage</h1>
          <p className="text-xs text-slate-400">
            Manage your subscription ($25/mo or $100 Lifetime), monitor lead quotas, and verify payment activation status.
          </p>
        </div>

        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow-sm transition-all cursor-pointer shrink-0"
        >
          <MessageCircle className="h-4 w-4" />
          <span>WhatsApp Support ({WHATSAPP_NUMBER})</span>
        </a>
      </div>

      {/* Account Status Card */}
      <div className={`rounded-2xl border p-6 ${
        isActive
          ? "border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-[#0e1628] to-[#090d16]"
          : isExpired
          ? "border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-[#0e1628] to-[#090d16]"
          : "border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#0e1628] to-[#090d16]"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${
              isActive
                ? "bg-emerald-500/20 text-emerald-400"
                : isExpired
                ? "bg-rose-500/20 text-rose-400"
                : "bg-amber-500/20 text-amber-400"
            }`}>
              {isActive ? <ShieldCheck className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs text-slate-400">Current Plan:</span>
                <span className="text-sm font-black text-white">
                  {profile?.plan_label ||
                    (isCustom
                      ? "Custom Plan"
                      : isLifetime
                      ? "Lifetime Access ($100)"
                      : isActive
                      ? "Basic Plan ($25 / 30 Days)"
                      : "Preview Mode (Locked)")}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  isActive
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : isExpired
                    ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                    : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                }`}>
                  {currentStatus}
                </span>
                {isActive && !isLifetime && (profile?.remaining_detailed || profile?.remaining_days !== undefined) && (
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                    {profile?.remaining_detailed || `${profile.remaining_days} left`}
                  </span>
                )}
                {isLifetime && (
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                    Permanent • No Expiry
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {isActive
                  ? `Your subscription is active. Google Maps: ${(profile?.google_maps_enabled || isLifetime) ? "Included" : "Excluded"} • Daily Cold Email Limit: ${profile?.daily_email_limit ?? (isLifetime ? 500 : 10)}/day (UTC). ${isLifetime ? "Permanent access without expiry." : `Valid until ${profile?.subscription_expires_at ? new Date(profile.subscription_expires_at).toUTCString() : "end of cycle"}.`}`
                  : isExpired
                  ? "Your subscription has expired. Lead searching and email features are locked. Please renew via WhatsApp (+923174383702)."
                  : "All features are currently locked with view-only preview access. Contact the Owner on WhatsApp (+923174383702) for activation."}
              </p>
            </div>
          </div>

          {(isLocked || isExpired) && (
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow transition-all shrink-0 cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Unlock Account ($25/mo or $100 Lifetime)</span>
            </a>
          )}
        </div>
      </div>

      {/* Usage & Quota Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Leads */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Verified Leads Quota</span>
            <Database className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats.leads_count} <span className="text-xs font-normal text-slate-500">/ 5,000</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(2, (stats.leads_count / 5000) * 100))}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400">Resets monthly with subscription</div>
        </div>

        {/* Searches */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Search Operations</span>
            <Search className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats.searches_count} <span className="text-xs font-normal text-emerald-400">Unlimited</span>
          </div>
          <div className="text-[10px] text-slate-400">Full Google Organic deep search included</div>
        </div>

        {/* Connected Gmail */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Connected Mailbox</span>
            <CreditCard className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats.connected_accounts} <span className="text-xs font-normal text-slate-500">/ 1 Account</span>
          </div>
          <div className="text-[10px] text-slate-400">Direct Gmail OAuth sending (No CC/BCC)</div>
        </div>

        {/* Exports */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Exports (Excel & PDF)</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            Unlimited
          </div>
          <div className="text-[10px] text-slate-400">Selected & Full dataset export supported</div>
        </div>
      </div>

      {/* PLAN COMPARISON GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* $25 BASIC */}
        <div className={`p-6 rounded-2xl border transition-all ${
          isActive && !isLifetime
            ? "border-blue-500/50 bg-[#0e1628]"
            : "border-white/[0.08] bg-[#0c1017]"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">30-Day Subscription</span>
            <span className="text-xl font-extrabold text-white">$25 <span className="text-xs text-slate-400 font-normal">/ mo</span></span>
          </div>
          <h3 className="text-base font-bold text-white mb-2">Basic Plan</h3>
          <ul className="space-y-1.5 text-xs text-slate-300 mb-4">
            <li className="flex items-center gap-2">✓ 5,000 Verified B2B Leads per month</li>
            <li className="flex items-center gap-2">✓ Real-time multi-provider search engine</li>
            <li className="flex items-center gap-2">✓ Gmail OAuth cold outreach integration</li>
            <li className="flex items-center gap-2">✓ Standard Gemini email personalization</li>
            <li className="flex items-center gap-2">✓ Auto-locks on expiration until renewed</li>
          </ul>
          <a
            href="https://wa.me/923174383702?text=Hi%20Usman%2C%20I%20want%20to%20activate%20the%20Basic%20Plan%20($25%20/%2030%20Days)"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Select Basic ($25 / 30 Days)</span>
          </a>
        </div>

        {/* $100 LIFETIME */}
        <div className={`p-6 rounded-2xl border transition-all ${
          isLifetime
            ? "border-amber-500/60 bg-[#191508]"
            : "border-amber-500/30 bg-gradient-to-b from-[#14120a] to-[#0c1017]"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Lifetime Deal</span>
            <span className="text-xl font-extrabold text-amber-300">$100 <span className="text-xs text-slate-400 font-normal">one-time</span></span>
          </div>
          <h3 className="text-base font-bold text-amber-200 mb-2">Lifetime Access Plan</h3>
          <ul className="space-y-1.5 text-xs text-slate-300 mb-4">
            <li className="flex items-center gap-2 font-semibold text-white">✓ Everything in Basic with NO EXPIRY</li>
            <li className="flex items-center gap-2 font-semibold text-amber-300">★ Exclusive AI Lead Research Agent</li>
            <li className="flex items-center gap-2">✓ Multi-account Gmail rotation</li>
            <li className="flex items-center gap-2">✓ Unlimited search operations & saved leads</li>
            <li className="flex items-center gap-2">✓ Priority WhatsApp Founder support</li>
          </ul>
          <a
            href="https://wa.me/923174383702?text=Hi%20Usman%2C%20I%20want%20to%20activate%20the%20Lifetime%20Plan%20($100)"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Select Lifetime ($100 One-Time)</span>
          </a>
        </div>
      </div>

      {/* Manual WhatsApp Payment Instructions Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Need Help or Want to Subscribe? Contact Us on WhatsApp</h3>
          </div>
          <span className="text-xs font-mono text-emerald-400">{WHATSAPP_NUMBER}</span>
        </div>

        <p className="text-xs text-slate-400">
          We support instant Pakistani payment methods (Raast, Bank Transfer, JazzCash, Easypaisa) as well as international cards. No unexpected recurring charges.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="font-bold text-white mb-1">Step 1: Contact Owner</div>
            <div className="text-slate-400">
              Click the WhatsApp button and share your registered email: <span className="text-white font-mono">{user?.email}</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="font-bold text-white mb-1">Step 2: Choose Plan & Transfer</div>
            <div className="text-slate-400">
              Pay $25/mo (~7,000 PKR) or $100 Lifetime (~28,000 PKR) via Raast, Bank Transfer, JazzCash, or Easypaisa.
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="font-bold text-white mb-1">Step 3: Instant Activation</div>
            <div className="text-slate-400">
              The owner verifies transaction details and unlocks your account in the live database immediately.
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Open Official WhatsApp Chat ({WHATSAPP_NUMBER})</span>
          </a>

          <Link
            href="/pricing"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 font-semibold text-xs border border-white/10 flex items-center justify-center gap-1.5 transition-all"
          >
            <span>View Full Pricing Plan Details</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
