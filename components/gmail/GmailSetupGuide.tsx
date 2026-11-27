"use client";

import React from "react";
import {
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  RefreshCw,
  Info,
  CheckSquare,
} from "lucide-react";
import {
  GOOGLE_CLOUD_CONSOLE_LINKS,
  buildGmail8Steps,
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
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg cursor-pointer"
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

/**
 * Displays ALL EIGHT GMAIL SETUP STEPS OPENLY BY DEFAULT in a clear numbered vertical layout.
 * Never collapsed inside accordions, dropdowns, or "Show Full Steps" toggles.
 */
export function GmailSetupGuide({
  expectedCallbackUri = "https://lead-scraper-mxs5.vercel.app/api/integrations/gmail/callback",
  oauthHealth,
}: {
  isAdmin?: boolean;
  expectedCallbackUri?: string;
  oauthHealth?: {
    oauthConfigured?: boolean;
    gmailScope?: string;
    callbackUri?: string;
    oauthAudienceStatus?: string;
    oauthSource?: string;
  } | null;
}) {
  const effectiveCallbackUri = oauthHealth?.callbackUri || expectedCallbackUri;
  const steps = buildGmail8Steps(effectiveCallbackUri);

  const quickLinks = [
    { label: "Project Selection", url: GOOGLE_CLOUD_CONSOLE_LINKS.projectSelector },
    { label: "Gmail API", url: GOOGLE_CLOUD_CONSOLE_LINKS.gmailApi },
    { label: "OAuth Branding", url: GOOGLE_CLOUD_CONSOLE_LINKS.oauthBranding },
    { label: "OAuth Audience", url: GOOGLE_CLOUD_CONSOLE_LINKS.oauthAudience },
    { label: "OAuth Clients", url: GOOGLE_CLOUD_CONSOLE_LINKS.oauthClients },
    { label: "Credentials", url: GOOGLE_CLOUD_CONSOLE_LINKS.apiCredentials },
  ];

  return (
    <div id="gmail-8-steps" className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-400" />
            <span>Complete 8-Step Gmail Setup Guide (All 8 Steps Open by Default)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            All eight steps remain open for full transparency. Normal customers connect in seconds using Shared Owner-Managed OAuth (no Google Cloud project needed); optional customer-specific OAuth instructions are included below.
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-[11px] font-bold text-blue-200 shrink-0 self-start">
          8 Steps Always Visible
        </span>
      </div>

      {/* Clear Architecture Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
            <UserCheck className="h-4 w-4" />
            <span>Default: Shared Owner-Managed OAuth (Recommended)</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            Ordinary customers do <strong>NOT</strong> need to create a Google Cloud project or upload any JSON file. Jump straight to <strong>Step 8</strong> and click <strong>Connect Official Gmail Account</strong> above.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <ShieldAlert className="h-4 w-4" />
            <span>Optional Advanced / Google Testing Notice</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            If the shared app is in Google <strong>Testing mode</strong> or unverified for restricted scopes, only approved test users can authorize it — or workspaces with their own Google Cloud project can follow Steps 1–8 to upload their encrypted Web OAuth JSON securely.
          </p>
        </div>
      </div>

      {/* Backend Config Readout (Zero Secrets) */}
      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            <span className="text-slate-400">Active OAuth Mode: </span>
            <strong className="text-white">
              {oauthHealth?.oauthSource === "customer" ? "Workspace Custom OAuth" : "Shared Owner-Managed OAuth"}
            </strong>
          </span>
          <span>
            <span className="text-slate-400">Server Status: </span>
            {oauthHealth?.oauthConfigured === false ? (
              <strong className="text-rose-400">Configuration Required</strong>
            ) : (
              <strong className="text-emerald-400">Configured (gmail.send)</strong>
            )}
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-300 bg-black/30 px-2.5 py-1 rounded border border-white/10 break-all">
          Authorized Redirect URI: {effectiveCallbackUri}
        </div>
      </div>

      {/* ALL 8 STEPS — STRICTLY OPEN IN VERTICAL NUMBERED LAYOUT */}
      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.stepNumber}
            className={`p-4 rounded-xl border space-y-2.5 ${
              step.stepNumber >= 7
                ? "bg-blue-500/10 border-blue-500/30"
                : step.stepNumber === 6
                ? "bg-amber-500/[0.06] border-amber-500/30"
                : "bg-white/[0.025] border-white/[0.08]"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-black">
                  {step.stepNumber}
                </span>
                <h4 className="text-sm font-extrabold text-white">{step.title}</h4>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    step.stepNumber >= 7
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {step.stepNumber >= 7 ? "All Customers" : "Owner / Custom OAuth Setup"}
                </span>
              </div>

              {step.linkUrl && step.linkLabel && (
                <a
                  href={step.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-xs font-bold text-blue-200 transition-all shrink-0 self-start"
                >
                  <span>{step.linkLabel}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">{step.summary}</p>

            {step.details && step.details.length > 0 && (
              <div className="space-y-1">
                {step.details.map((line) => (
                  <div
                    key={line}
                    className="font-mono text-[11px] text-blue-200 bg-black/45 px-3 py-2 rounded-lg border border-white/10 break-all"
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}

            {step.importantWarning && (
              <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-400/40 text-xs font-extrabold text-amber-200">
                {step.importantWarning}
              </div>
            )}

            {step.checklist && step.checklist.length > 0 && (
              <div className="p-3 rounded-lg bg-black/35 border border-white/10 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Manual Verification Checklist (Confirm Each Item Yourself)
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-200">
                  {step.checklist.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckSquare className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Direct 6 Google Cloud Console Destinations */}
      <div className="pt-2 border-t border-white/[0.08] space-y-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Direct Google Cloud Console Destinations
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
          Never share Gmail passwords or send OAuth Client Secrets / JSON files through WhatsApp. All OAuth credentials and tokens stored in this platform are AES-256-GCM encrypted and isolated per workspace.
        </span>
      </div>
    </div>
  );
}
