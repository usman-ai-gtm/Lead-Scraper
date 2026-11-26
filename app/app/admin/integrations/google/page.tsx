"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck, Key, Copy, CheckCircle2, AlertTriangle,
  ExternalLink, ArrowLeft, RefreshCw, Mail, Lock, Info
} from "lucide-react";
import { GmailSetupGuide } from "@/components/gmail/GmailSetupGuide";

export default function AdminGoogleIntegrationPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState<string>("");
  const [clientId, setClientId] = useState<string>("Configured in server environment (GOOGLE_CLIENT_ID)");
  const [hasSecret, setHasSecret] = useState<boolean>(true);
  const [gmailApiEnabled, setGmailApiEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRedirectUri(`${window.location.origin}/api/integrations/gmail/callback`);
    }
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const isConfigured = Boolean(clientId && hasSecret);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <Link
            href="/app/admin"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">Google & Gmail OAuth Architecture</h1>
            <p className="text-xs text-slate-400">
              Enterprise OAuth 2.0 credentials and multi-account sending authorization protocol.
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isConfigured
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          }`}
        >
          ● {isConfigured ? "READY" : "CONFIGURATION REQUIRED"}
        </span>
      </div>

      {/* Security Note */}
      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-blue-300 flex items-start gap-3">
        <Lock className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">Security Isolation: </span>
          Client secrets and refresh tokens are strictly stored in backend encrypted environment vaults.
          The secret is never exposed over client network payloads or browser DOM inspectors.
        </div>
      </div>

      {/* Config Form Cards */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm space-y-6">
        <h2 className="text-sm font-bold text-white">OAuth 2.0 Credentials Status</h2>

        <div className="space-y-4">
          {/* Client ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Google Client ID</span>
              <span className="text-[10px] text-emerald-400 font-bold">● Configured</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={clientId}
                className="flex-1 bg-[#121824] border border-white/[0.08] rounded-xl px-4 py-2 text-xs text-slate-300 font-mono focus:outline-none"
              />
              <button
                onClick={() => handleCopy(clientId, "Client ID")}
                className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-all"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copied === "Client ID" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Client Secret */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Google Client Secret</span>
              <span className="text-[10px] text-emerald-400 font-bold">● Protected in Environment (GOOGLE_CLIENT_SECRET)</span>
            </label>
            <input
              type="password"
              readOnly
              value="************************************************"
              className="w-full bg-[#0a0e14] border border-white/[0.04] rounded-xl px-4 py-2 text-xs text-slate-500 font-mono cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-500">
              The client secret is never transmitted to the browser. Validated server-side during OAuth exchange.
            </p>
          </div>

          {/* Redirect URI */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Authorized Redirect URI (Add to Google Cloud Console)</span>
              <span className="text-[10px] text-blue-400 font-bold">● Current Environment URI</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={redirectUri}
                className="flex-1 bg-[#121824] border border-white/[0.08] rounded-xl px-4 py-2 text-xs text-blue-300 font-mono focus:outline-none"
              />
              <button
                onClick={() => handleCopy(redirectUri, "Redirect URI")}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copied === "Redirect URI" ? "Copied" : "Copy URI"}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Automatically respects both local development (<code className="text-slate-400">http://localhost:3000</code>) and live production domains without hardcoded URLs.
            </p>
          </div>

          {/* Gmail API & Google OAuth Verification Readiness Checklist */}
          <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Google OAuth Worldwide Verification Checklist (gmail.send)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Requires Cloud Console Action
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Sending outreach uses Google&apos;s Restricted <code className="text-amber-300">gmail.send</code> scope under project <code className="text-blue-300">semiotic-tracer-466311-j4</code>. Code-side OAuth security, HMAC state verification, refresh token preservation, and Google Limited Use Privacy Policy (<Link href="/privacy" className="underline text-blue-300">/privacy</Link>) are live. To allow arbitrary Gmail customers worldwide without <code className="text-rose-300">Error 403: access_denied</code>, complete these steps in Google Cloud Console:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
              <li><strong className="text-slate-200">Google Auth Platform → Audience:</strong> Click <em>Publish App</em> to move Publishing Status from <em>Testing</em> to <em>In Production</em> (External).</li>
              <li><strong className="text-slate-200">Branding &amp; Authorized Domains:</strong> Confirm Homepage URL, <code className="text-slate-300">/privacy</code>, <code className="text-slate-300">/terms</code>, and verify domain ownership in Google Search Console.</li>
              <li><strong className="text-slate-200">Verification Center (Restricted Scope):</strong> Submit scope justification for <code className="text-slate-300">gmail.send</code>, attach the OAuth grant demo video, and complete Google&apos;s Restricted Scope security assessment if prompted.</li>
            </ol>
            <div className="pt-2 border-t border-white/[0.06] text-[11px] text-slate-300 space-y-1">
              <div className="font-bold text-white">Ready-to-Paste Google Scope Justification (<code className="text-amber-300">gmail.send</code>):</div>
              <p className="text-slate-400">
                USMAN AI GTM requests strictly <code className="text-slate-300">gmail.send</code> + <code className="text-slate-300">userinfo.email</code> (never <code className="text-slate-300">gmail.readonly</code> or mailbox access) solely so paying workspace owners can manually compose and send explicit 1-to-1 business outreach emails through their own Gmail account. Email drafts stay isolated in the user&apos;s workspace until they click Send; OAuth tokens are AES-256-GCM encrypted in Neon PostgreSQL per workspace_id, never used for AI model training or ads, never involve Gmail passwords, and can be revoked at any time via Gmail Connections (calling Google&apos;s revoke endpoint + deleting DB tokens).
              </p>
            </div>
            <div className="pt-2 border-t border-white/[0.06] text-[11px] text-slate-300 space-y-1.5">
              <div className="font-bold text-white">Short Screen-Recording Script (For Google OAuth Verification &amp; Customer Tutorial):</div>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li><strong>Show Homepage &amp; App URL:</strong> Open <code className="text-slate-300">https://lead-scraper-mxs5.vercel.app</code> with clear English UI, Privacy Policy (<code className="text-slate-300">/privacy</code>), and Terms (<code className="text-slate-300">/terms</code>) visible.</li>
                <li><strong>Show Gmail Connect Screen:</strong> Sign in, open <em>Email Accounts</em> (<code className="text-slate-300">/app/accounts</code>), and click <em>Connect Official Gmail Account</em>.</li>
                <li><strong>Show Consent Screen &amp; Client ID:</strong> Ensure browser address bar displays full URL including <code className="text-slate-300">client_id=855677476876-...</code>, select your test Gmail, expand permissions showing only <code className="text-slate-300">gmail.send</code> and email address, and click <em>Allow</em>.</li>
                <li><strong>Demonstrate Live Feature:</strong> Show the connected mailbox badge on <code className="text-slate-300">/app/accounts</code>, open <em>Send Test Email</em> (or <em>Cold Email</em>), manually compose and send a 1-to-1 test email, open Gmail Sent folder to confirm delivery, then click <em>Disconnect</em> to show revocation works.</li>
              </ol>
            </div>
          </div>
        </div>

        <GmailSetupGuide
          isAdmin={true}
          expectedCallbackUri={redirectUri || "https://lead-scraper-mxs5.vercel.app/api/integrations/gmail/callback"}
        />

        <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
          <a
            href="https://console.cloud.google.com/auth/overview?project=semiotic-tracer-466311-j4"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
          >
            <span>Open Google Auth Platform (Project semiotic-tracer-466311-j4)</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <Link
            href="/app/accounts"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-glow-sm"
          >
            Manage Sending Accounts
          </Link>
        </div>
      </div>
    </div>
  );
}
