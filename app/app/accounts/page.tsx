"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Mail, ShieldCheck, CheckCircle2, AlertCircle, Trash2,
  RefreshCw, Send, Sliders, ExternalLink, Inbox, Check, X,
  AlertTriangle, Lock, Sparkles, Key, Info, Globe, Shield, Power
} from "lucide-react";

interface GmailStatusResponse {
  configured: boolean;
  connected: boolean;
  status_code: "CONNECTED" | "NOT_CONNECTED" | "CONFIGURATION_ERROR" | "RECONNECT_REQUIRED";
  account?: {
    id: number;
    sender_name: string;
    sender_email: string;
    daily_limit: number;
    sent_today: number;
    health_status: string;
    last_sent_at?: string;
  } | null;
  accounts?: Array<{
    id: number;
    sender_name: string;
    sender_email: string;
    daily_limit: number;
    sent_today: number;
    health_status: string;
    created_at?: string;
  }>;
  connected_count?: number;
  provider: string;
  daily_quota: number;
  cost: string;
  redirect_uri?: string;
  scopes?: string[];
  message?: string;
}

function EmailAccountsContent() {
  const { user, isLocked, refreshUser } = useAuth();
  const searchParams = useSearchParams();

  const [statusData, setStatusData] = useState<GmailStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

  // Test send modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [testSubject, setTestSubject] = useState("USMAN AI GTM - Official Gmail Integration Test");
  const [testBody, setTestBody] = useState("Hello! This is a test email sent from USMAN AI GTM via the official Google Gmail API.");
  const [sendingTest, setSendingTest] = useState(false);

  // DNS deliverability checker
  const [checkDomain, setCheckDomain] = useState("");
  const [checkingDns, setCheckingDns] = useState(false);
  const [dnsResults, setDnsResults] = useState<any | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("usman_gtm_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const wsId = localStorage.getItem("usman_gtm_workspace_id");
      if (wsId) headers["X-Workspace-Id"] = wsId;
    }
    return headers;
  };

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/gmail/status", {
        headers: getAuthHeaders(),
      });
      const data: GmailStatusResponse = await res.json();
      setStatusData(data);
      if (data.account?.sender_email && !testRecipient) {
        setTestRecipient(data.account.sender_email);
      }
    } catch {
      setStatusData({
        configured: false,
        connected: false,
        status_code: "CONFIGURATION_ERROR",
        provider: "Google Gmail API",
        daily_quota: 500,
        cost: "$0 / month (Standard Gmail)",
        message: "Failed to communicate with integration status API.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Check URL params from OAuth callback
    const oauthStatus = searchParams.get("status");
    const oauthEmail = searchParams.get("email");
    const oauthMsg = searchParams.get("message");

    if (oauthStatus === "connected") {
      setToastType("success");
      setToastMsg(`Gmail account (${oauthEmail || "connected"}) authorized successfully!`);
    } else if (oauthStatus === "error") {
      setToastType("error");
      setToastMsg(oauthMsg || "Google authorization was cancelled or failed.");
    }
  }, [searchParams]);

  const handleConnectGmail = async () => {
    if (isLocked) {
      setToastType("error");
      setToastMsg("🔒 Feature Locked: Connecting outreach mailboxes requires an active paid subscription ($25/mo or $100 Lifetime). Contact Owner via WhatsApp (+923174383702).");
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch("/api/integrations/gmail/url", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        setToastType("error");
        setToastMsg(data.error || "Google OAuth client is not fully configured on server.");
      }
    } catch {
      setToastType("error");
      setToastMsg("Failed to initiate Google OAuth.");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (accountId?: number) => {
    if (!confirm(accountId ? "Are you sure you want to disconnect this mailbox?" : "Are you sure you want to disconnect Gmail accounts from this workspace?")) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/gmail/disconnect", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ account_id: accountId }),
      });
      if (res.ok) {
        setToastType("info");
        setToastMsg(accountId ? "Mailbox disconnected successfully." : "Gmail account disconnected successfully.");
        await fetchStatus();
      } else {
        const err = await res.json().catch(() => ({}));
        setToastType("error");
        setToastMsg(err.error || "Failed to disconnect account.");
      }
    } catch {
      setToastType("error");
      setToastMsg("Error communicating with server.");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) {
      alert("Please enter a test recipient email.");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/integrations/gmail/send", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          recipient_email: testRecipient.trim(),
          recipient_name: "Test Recipient",
          subject: testSubject.trim(),
          body: testBody.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToastType("success");
        setToastMsg(`Test email sent successfully! Gmail Message ID: ${data.message_id || "OK"}`);
        setTestModalOpen(false);
        await fetchStatus();
      } else {
        setToastType("error");
        setToastMsg(data.error || data.detail || "Failed to send test email.");
      }
    } catch (err: any) {
      setToastType("error");
      setToastMsg(err.message || "Error sending test email.");
    } finally {
      setSendingTest(false);
    }
  };

  const handleCheckDns = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkDomain.trim()) return;
    setCheckingDns(true);
    setDnsResults(null);
    try {
      const clean = checkDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
      const res = await fetch(`/api/integrations/dns-check?domain=${encodeURIComponent(clean)}`);
      const data = await res.json();
      setDnsResults(data);
    } catch (err: any) {
      alert("Failed to query DNS: " + err.message);
    } finally {
      setCheckingDns(false);
    }
  };

  const isConnected = statusData?.status_code === "CONNECTED";
  const isNotConnected = statusData?.status_code === "NOT_CONNECTED";
  const isConfigError = statusData?.status_code === "CONFIGURATION_ERROR";
  const isReconnect = statusData?.status_code === "RECONNECT_REQUIRED";

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            toastType === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : toastType === "error"
              ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
              : "bg-blue-500/10 border-blue-500/20 text-blue-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastType === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : toastType === "error" ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : (
              <Info className="h-4 w-4 shrink-0" />
            )}
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="p-1 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
              Email Accounts
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Workspace #{user?.workspace_id || 1} • Private Mailbox
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Connect Your Sending Account
          </h1>
          <p className="text-xs text-slate-400">
            Connect your own Google Gmail account using official OAuth 2.0 to send personalized business outreach at $0 operating cost.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Primary Gmail Connection Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">Google Gmail API</h3>
                {loading ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/10">
                    Checking...
                  </span>
                ) : isConnected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>CONNECTED</span>
                  </span>
                ) : isReconnect ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="h-3 w-3" />
                    <span>RECONNECT REQUIRED</span>
                  </span>
                ) : isConfigError ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertCircle className="h-3 w-3" />
                    <span>CONFIGURATION ERROR</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
                    <span>NOT CONNECTED</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard Free Gmail: 500 emails / day ($0/mo) • Google Workspace: 2,000 emails / day
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isConnected ? (
              <>
                <button
                  onClick={() => setTestModalOpen(true)}
                  className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Test Email</span>
                </button>
                <button
                  onClick={handleConnectGmail}
                  disabled={connecting}
                  className="px-3 py-2 text-xs font-semibold text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5 text-blue-400" />
                  <span>+ Connect Another Gmail</span>
                </button>
                <button
                  onClick={() => handleDisconnect()}
                  disabled={disconnecting}
                  className="px-3 py-2 text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>{disconnecting ? "..." : "Disconnect All"}</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleConnectGmail}
                disabled={connecting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl transition-all shadow-glow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{connecting ? "Opening Google Auth..." : "Connect Official Gmail Account"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-Account Mailbox Grid */}
        {isConnected && statusData?.accounts && statusData.accounts.length > 0 ? (
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-300">
              Active Sending Mailboxes ({statusData.accounts.length} connected)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {statusData.accounts.map((acc: any) => (
                <div key={acc.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      CONNECTED
                    </span>
                    <button
                      onClick={() => handleDisconnect(acc.id)}
                      className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline"
                    >
                      Disconnect
                    </button>
                  </div>
                  <div className="font-bold text-white text-xs font-mono truncate" title={acc.sender_email}>
                    {acc.sender_email}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Sender: {acc.sender_name || "Sales Outreach"}
                  </div>
                  <div className="text-[10px] text-slate-400 border-t border-white/[0.04] pt-2 flex justify-between">
                    <span>Sent Today: {acc.sent_today || 0} / {acc.daily_limit || 500}</span>
                    <span className="text-emerald-400 font-mono">AES-256</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : isConnected && statusData?.account ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Connected Sender Email
              </div>
              <div className="text-sm font-bold text-white font-mono">
                {statusData.account.sender_email}
              </div>
              <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                <Check className="h-3 w-3" />
                <span>Authorized via Google OAuth 2.0</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Daily Sending Quota
              </div>
              <div className="text-sm font-bold text-white font-mono">
                {statusData.account.sent_today || 0} / {statusData.account.daily_limit || 500} sent today
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {Math.max(0, (statusData.account.daily_limit || 500) - (statusData.account.sent_today || 0))} emails remaining today
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Token Security at Rest
              </div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <Lock className="h-4 w-4" />
                <span>AES-256-GCM Encrypted</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Stored in Neon PostgreSQL • Isolated to Workspace
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-3">
            <Mail className="h-8 w-8 mx-auto text-slate-500" />
            <h4 className="text-sm font-semibold text-white">No Gmail Account Connected Yet</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Connecting your official Gmail account enables you to send personalized cold outreach directly from your address. We never ask for your password; authorization is handled securely via Google OAuth.
            </p>
          </div>
        )}

        {/* Security & Multi-Tenant Isolation Notice */}
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-start gap-3 text-xs text-slate-300">
          <Shield className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-blue-300">Strict Multi-Tenant Privacy Guarantee</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Your connected Gmail address and OAuth tokens are strictly isolated to your private workspace. Other clients on USMAN AI GTM cannot see or send from your email account. Tokens are encrypted with AES-256-GCM at rest and refreshed automatically.
            </p>
          </div>
        </div>
      </div>

      {/* SENDER DOMAIN DELIVERABILITY HEALTH CHECKER */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Sender Domain Deliverability Health Checker</h3>
            <p className="text-xs text-slate-400">
              Free native DNS check to verify SPF, DKIM, DMARC, and MX records for your sender domain ($0 cost, &lt;200ms).
            </p>
          </div>
        </div>

        <form onSubmit={handleCheckDns} className="flex gap-2">
          <input
            type="text"
            value={checkDomain}
            onChange={(e) => setCheckDomain(e.target.value)}
            placeholder="e.g. acme.com or yourcompany.com"
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={checkingDns || !checkDomain.trim()}
            className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-glow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {checkingDns ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Checking DNS...</span>
              </>
            ) : (
              <span>Check Deliverability</span>
            )}
          </button>
        </form>

        {dnsResults && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                MX (Mail Server)
              </div>
              <div
                className={`text-xs font-bold ${
                  dnsResults.mx?.status === "PASS" ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {dnsResults.mx?.status || "UNKNOWN"}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate">
                {dnsResults.mx?.records?.[0]?.exchange || "No MX record"}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                SPF (Sender Policy)
              </div>
              <div
                className={`text-xs font-bold ${
                  dnsResults.spf?.status === "PASS" ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {dnsResults.spf?.status || "UNKNOWN"}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate">
                {dnsResults.spf?.status === "PASS" ? "Google authorized" : "Needs attention"}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                DMARC (Protection)
              </div>
              <div
                className={`text-xs font-bold ${
                  dnsResults.dmarc?.status === "PASS" ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {dnsResults.dmarc?.status || "UNKNOWN"}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate">
                {dnsResults.dmarc?.status === "PASS" ? "Policy active" : "Add DMARC TXT"}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                DKIM (Signature)
              </div>
              <div
                className={`text-xs font-bold ${
                  dnsResults.dkim?.status === "PASS" ? "text-emerald-400" : "text-slate-400"
                }`}
              >
                {dnsResults.dkim?.status || "PASS (Default)"}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate">
                Google auto-signs
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GOOGLE OAUTH MULTI-ACCOUNT & VERIFICATION RESOLUTION GUIDE */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-400" />
          <h3 className="text-sm font-bold text-white">
            Google OAuth Setup & Multi-Account Outreach Guide
          </h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          USMAN AI GTM connects to official personal Gmail accounts via Google OAuth 2.0. Each client workspace maintains isolated tokens and zero cross-account data leakage.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              <span>Resolving &quot;Access blocked: App is currently being tested&quot;</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              If a secondary Gmail account displays this Google prompt during connection, your Google Cloud OAuth Consent Screen is currently in <strong>Testing</strong> mode.
            </p>
            <div className="space-y-1 text-slate-300 font-mono text-[10px] bg-black/40 p-2.5 rounded-lg border border-white/5">
              <div>1. Go to Google Cloud Console (Project: semiotic-tracer-466311-j4)</div>
              <div>2. Navigate to: APIs & Services &gt; OAuth consent screen</div>
              <div>3. Click &quot;PUBLISH APP&quot; to switch from Testing to In Production</div>
              <div>OR add the user&apos;s Gmail under &quot;Test users&quot; (+ ADD USERS)</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span>Multi-Mailbox Isolation & Quotas</span>
            </div>
            <ul className="space-y-1 text-slate-400 text-[11px] list-disc list-inside leading-relaxed">
              <li>Each workspace connects its own Gmail accounts independently.</li>
              <li>Free Gmail accounts send up to 500 emails/day at $0 cost.</li>
              <li>Google Workspace accounts send up to 2,000 emails/day.</li>
              <li>Tokens are encrypted at rest with AES-256-GCM.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* TEST SEND MODAL */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1017] p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Send Live Test Email</h3>
              </div>
              <button onClick={() => setTestModalOpen(false)} className="text-xs text-slate-400 hover:text-white">
                Close
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Send a real test email through your connected Gmail account to verify live delivery.
            </p>

            <form onSubmit={handleSendTestEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  required
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="youremail@example.com"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  required
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Body *
                </label>
                <textarea
                  rows={3}
                  required
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-glow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {sendingTest ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090e] flex items-center justify-center text-white text-xs">Loading...</div>}>
      <EmailAccountsContent />
    </Suspense>
  );
}
