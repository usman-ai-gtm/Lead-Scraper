"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  ShieldAlert,
  Wrench,
  UserCheck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import {
  GOOGLE_CLOUD_CONSOLE_LINKS,
  GMAIL_8_STEP_SETUP_GUIDE,
  classifyGoogleOAuthError,
} from "@/lib/google-oauth-diagnostics";

export function GmailDiagnosticBanner({
  errorCode,
  rawError,
  onReconnect,
  onDismiss,
}: {
  errorCode?: string | null;
  rawError?: string | null;
  onReconnect?: () => void;
  onDismiss?: () => void;
}) {
  if (!errorCode && !rawError) return null;
  const diag = classifyGoogleOAuthError(errorCode, rawError);

  return (
    <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-5 text-left space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-white">{diag.headline}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {diag.isAdminAction ? "Admin Google Cloud Setting" : "Customer Action Required"}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">{diag.explanation}</p>
            {rawError && rawError !== diag.code && rawError !== diag.headline && (
              <p className="text-[11px] font-mono text-rose-200/80 bg-black/30 px-2.5 py-1.5 rounded-lg border border-rose-500/20">
                Details: {rawError}
              </p>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg"
          >
            Dismiss
          </button>
        )}
      </div>

      <div className="rounded-xl bg-[#0b101b] border border-white/10 p-3.5 space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
          Recommended Next Step
        </div>
        <p className="text-xs text-slate-200">{diag.nextAction}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <a
            href={diag.googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{diag.googleUrlLabel}</span>
          </a>
          {onReconnect && (
            <button
              type="button"
              onClick={onReconnect}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry / Reconnect Gmail</span>
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-400 pt-1">{diag.showSupportAfterSteps}</p>
      </div>
    </div>
  );
}

export function GmailSetupGuide({
  isAdmin = false,
  expectedCallbackUri = "https://lead-scraper-mxs5.vercel.app/api/integrations/gmail/callback",
  oauthHealth,
}: {
  isAdmin?: boolean;
  expectedCallbackUri?: string;
  oauthHealth?: {
    oauthConfigured?: boolean;
    gmailScope?: string;
    callbackUri?: string;
  } | null;
}) {
  const [showAdminSteps, setShowAdminSteps] = useState(isAdmin);

  const quickLinks = [
    {
      label: "1. Google Cloud Project Selector",
      url: GOOGLE_CLOUD_CONSOLE_LINKS.projectSelector,
      role: "Admin",
    },
    {
      label: "2. Enable Gmail API",
      url: GOOGLE_CLOUD_CONSOLE_LINKS.gmailApi,
      role: "Admin",
    },
    {
      label: "3. OAuth Branding / Consent",
      url: GOOGLE_CLOUD_CONSOLE_LINKS.oauthBranding,
      role: "Admin",
    },
    {
      label: "4. OAuth Audience / Test Users",
      url: GOOGLE_CLOUD_CONSOLE_LINKS.oauthAudience,
      role: "Admin",
    },
    {
      label: "5. OAuth Clients (Redirect URI)",
      url: GOOGLE_CLOUD_CONSOLE_LINKS.oauthClients,
      role: "Admin",
    },
    {
      label: "6. Google API Credentials",
      url: GOOGLE_CLOUD_CONSOLE_LINKS.apiCredentials,
      role: "Admin",
    },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-400" />
            <span>Simple Gmail Connection &amp; Troubleshooting Guide</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Understand how ordinary customers connect Gmail in seconds vs. the one-time Administrator Google Cloud setup.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdminSteps(!showAdminSteps)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-200 cursor-pointer shrink-0"
        >
          <Wrench className="h-3.5 w-3.5 text-amber-400" />
          <span>{showAdminSteps ? "Hide Admin Cloud Setup Steps (1-6)" : "Show Full 8-Step Google Cloud Guide"}</span>
          {showAdminSteps ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Clear Role Distinction */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
            <UserCheck className="h-4 w-4" />
            <span>For Customers (2 Quick Steps — Zero Cloud Project Needed)</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            You do <strong>NOT</strong> need to create your own Google Cloud project or developer account. Click <strong>Connect Gmail</strong> above, pick your Google mailbox, approve email sending permission, and run a safe test email.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <ShieldAlert className="h-4 w-4" />
            <span>For Platform Administrator (One-Time App Setup &amp; Testing Notice)</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            The Owner configures Google Cloud once (Steps 1–6). While the Google OAuth app is in <strong>Testing mode</strong> before Google Verification approval, only Gmail addresses added in <strong>Audience &rarr; Test Users</strong> can authorize.
          </p>
        </div>
      </div>

      {/* Backend Config Readout (Zero Secrets) */}
      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-slate-400">Backend OAuth Environment: </span>
          {oauthHealth?.oauthConfigured === false ? (
            <span className="font-bold text-rose-400">Incomplete (Credentials missing on server)</span>
          ) : (
            <span className="font-bold text-emerald-400">Configured (Minimum gmail.send scope)</span>
          )}
        </div>
        <div className="font-mono text-[11px] text-slate-300 bg-black/30 px-2.5 py-1 rounded border border-white/10">
          Redirect URI: {oauthHealth?.callbackUri || expectedCallbackUri}
        </div>
      </div>

      {/* Customer-Visible Steps 7 & 8 Always Shown */}
      <div className="space-y-3">
        {(showAdminSteps ? GMAIL_8_STEP_SETUP_GUIDE : GMAIL_8_STEP_SETUP_GUIDE.filter((s) => s.audience === "CUSTOMER_ANYTIME")).map(
          (step) => (
            <div
              key={step.stepNumber}
              className={`p-4 rounded-xl border ${
                step.audience === "CUSTOMER_ANYTIME"
                  ? "bg-blue-500/5 border-blue-500/20"
                  : "bg-white/[0.02] border-white/[0.07]"
              } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-white">{step.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      step.audience === "CUSTOMER_ANYTIME"
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {step.audience === "CUSTOMER_ANYTIME" ? "Customer Step" : "Admin One-Time Step"}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{step.summary}</p>
              </div>
              {step.linkUrl && step.linkLabel && (
                <a
                  href={step.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-blue-600/25 border border-white/10 hover:border-blue-500/40 text-xs font-semibold text-blue-300 transition-all shrink-0"
                >
                  <span>{step.linkLabel}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )
        )}
      </div>

      {/* Direct 6 Google Cloud Console Buttons */}
      <div className="pt-2 border-t border-white/[0.08] space-y-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Direct Google Cloud Console Links (Administrator Reference)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {quickLinks.map((lnk) => (
            <a
              key={lnk.url}
              href={lnk.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.03] hover:bg-blue-600/15 border border-white/10 hover:border-blue-500/40 text-xs font-semibold text-slate-200 hover:text-white transition-all"
            >
              <span className="truncate">{lnk.label}</span>
              <ExternalLink className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            </a>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 text-[11px] text-slate-400 pt-1">
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <span>
          Never share or type your Gmail password. Authorization uses official Google OAuth 2.0 encrypted tokens tied exclusively to your workspace, with instant one-click disconnect at any time.
        </span>
      </div>
    </div>
  );
}
