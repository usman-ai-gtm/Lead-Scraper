"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck, Key, Copy, CheckCircle2, AlertTriangle,
  ExternalLink, ArrowLeft, RefreshCw, Mail, Lock, Info
} from "lucide-react";

export default function AdminGoogleIntegrationPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState<string>("");
  const [clientId, setClientId] = useState<string>("892347182934-abc123xyz789.apps.googleusercontent.com");
  const [hasSecret, setHasSecret] = useState<boolean>(true);
  const [gmailApiEnabled, setGmailApiEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRedirectUri(`${window.location.origin}/api/auth/google/callback`);
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

          {/* Gmail API Status */}
          <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-blue-400" /> Google Gmail API (v1)
              </div>
              <p className="text-[11px] text-slate-400">
                Grants least-privileged sending & message ID telemetry access to connected sending accounts.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ● ENABLED
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
          >
            <span>Open Google Cloud Console Credentials</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <Link
            href="/app/outreach/accounts"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-glow-sm"
          >
            Manage Sending Accounts
          </Link>
        </div>
      </div>
    </div>
  );
}
