"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Mail, ShieldCheck, CheckCircle2, AlertCircle, Trash2,
  RefreshCw, Send, Sliders, ExternalLink, Inbox, Check, X,
  AlertTriangle, Lock, Sparkles, Key, Info, Globe, Shield, Power, Clock, Upload
} from "lucide-react";
import { GmailDiagnosticBanner, GmailSetupGuide } from "@/components/gmail/GmailSetupGuide";

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
  const [oauthDiagnostic, setOauthDiagnostic] = useState<{ errorCode?: string | null; rawError?: string | null } | null>(null);
  const [oauthHealth, setOauthHealth] = useState<{
    oauthConfigured?: boolean;
    callbackUri?: string;
    gmailScope?: string;
    oauthAudienceStatus?: string;
    oauthSource?: string;
    oauthMode?: string;
  } | null>(null);

  // Optional Customer-Specific OAuth JSON State (secret is NEVER stored in browser state or localStorage)
  const [customOAuthConfig, setCustomOAuthConfig] = useState<any | null>(null);
  const [uploadingJson, setUploadingJson] = useState(false);

  // Gmail Setup Time Bonus Compensation State (Part 10)
  const [bonusQty, setBonusQty] = useState<number>(30);
  const [bonusUnit, setBonusUnit] = useState<"minutes" | "hours">("minutes");
  const [bonusReason, setBonusReason] = useState<string>("");
  const [submittingBonus, setSubmittingBonus] = useState(false);
  const [bonusRequests, setBonusRequests] = useState<any[]>([]);

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
      if (token && token !== "null" && token !== "undefined") headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const [res, healthRes, customRes, bonusRes] = await Promise.all([
        fetch("/api/integrations/gmail/status", { headers: getAuthHeaders() }),
        fetch("/api/integrations/gmail/health", { headers: getAuthHeaders() }).catch(() => null),
        fetch("/api/integrations/gmail/custom-oauth", { headers: getAuthHeaders() }).catch(() => null),
        fetch("/api/integrations/gmail/bonus-request", { headers: getAuthHeaders() }).catch(() => null),
      ]);
      const data: GmailStatusResponse = await res.json();
      setStatusData(data);
      if (healthRes && healthRes.ok) {
        const h = await healthRes.json().catch(() => null);
        if (h) {
          setOauthHealth(h);
          if (!h.oauthConfigured) {
            setOauthDiagnostic({ errorCode: "credentials_missing", rawError: "OAuth credentials are missing." });
          } else if (h.diagnostic && !oauthDiagnostic) {
            setOauthDiagnostic({ errorCode: h.diagnostic.code, rawError: h.diagnostic.explanation });
          }
        }
      }
      if (customRes && customRes.ok) {
        const c = await customRes.json().catch(() => null);
        setCustomOAuthConfig(c?.config || null);
      }
      if (bonusRes && bonusRes.ok) {
        const b = await bonusRes.json().catch(() => null);
        if (Array.isArray(b?.requests)) setBonusRequests(b.requests);
      }
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
      setOauthDiagnostic({ errorCode: "backend_incomplete", rawError: "Failed to communicate with integration status API." });
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
    const oauthErrCode = searchParams.get("error_code");

    if (oauthStatus === "connected") {
      setOauthDiagnostic(null);
      setToastType("success");
      setToastMsg(`Gmail account (${oauthEmail || "connected"}) authorized successfully!`);
    } else if (oauthStatus === "error") {
      setToastType("error");
      setOauthDiagnostic({
        errorCode: oauthErrCode || "backend_incomplete",
        rawError: oauthMsg || oauthErrCode || "Google authorization failed.",
      });
      setToastMsg(oauthMsg || "Google authorization failed. Review the diagnostic box below.");
    }
  }, [searchParams]);

  const handleConnectGmail = async (sourceOverride?: "shared" | "customer") => {
    const isPreview = (user as any)?.account_type === "FREE_PREVIEW" || user?.status === "PREVIEW_ONLY";
    if (isPreview) {
      setToastType("error");
      setToastMsg("FREE PREVIEW ACCOUNT — Explore the software before purchasing. Contact the Owner to get your fully activated account.");
      return;
    }
    if (isLocked) {
      setToastType("error");
      setToastMsg("Your account is currently locked or expired. Please contact the Owner for activation.");
      return;
    }
    setConnecting(true);
    try {
      const qs = sourceOverride ? `?oauth_source=${sourceOverride}` : "";
      const res = await fetch(`/api/integrations/gmail/url${qs}`, {
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

  const handleUploadCustomOAuthJson = async (file?: File) => {
    if (!file) return;
    if (file.size > 65536) {
      setToastType("error");
      setToastMsg("Google OAuth JSON file must be under 64KB.");
      return;
    }
    setUploadingJson(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch("/api/integrations/gmail/custom-oauth", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Failed to validate OAuth JSON.");
      setToastType("success");
      setToastMsg(data?.message || "Custom OAuth JSON saved securely & encrypted.");
      await fetchStatus();
    } catch (err: any) {
      setToastType("error");
      setToastMsg(err?.message || "Invalid Google OAuth JSON configuration.");
    } finally {
      setUploadingJson(false);
    }
  };

  const handleRemoveCustomOAuth = async () => {
    if (!confirm("Remove custom Google OAuth JSON and revert to Shared Owner-Managed OAuth?")) return;
    setUploadingJson(true);
    try {
      const res = await fetch("/api/integrations/gmail/custom-oauth", {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      setToastType("info");
      setToastMsg(data?.message || "Reverted to Shared Owner-Managed OAuth.");
      await fetchStatus();
    } catch {
      setToastType("error");
      setToastMsg("Failed to remove custom OAuth configuration.");
    } finally {
      setUploadingJson(false);
    }
  };

  const handleRequestSetupBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingBonus) return;
    setSubmittingBonus(true);
    try {
      const res = await fetch("/api/integrations/gmail/bonus-request", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          quantity: bonusQty,
          unit: bonusUnit,
          reason: bonusReason.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Could not submit Gmail setup bonus request.");
      setToastType("success");
      setToastMsg(data?.message || "Gmail setup time compensation request sent to the Owner.");
      setBonusReason("");
      await fetchStatus();
    } catch (err: any) {
      setToastType("error");
      setToastMsg(err?.message || "Failed to submit bonus request.");
    } finally {
      setSubmittingBonus(false);
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
        setToastMsg(
          `Test email submitted to Gmail API (delivery status unknown until inbox check). Message ID: ${data.gmail_message_id || data.message_id || "OK"}`
        );
        setTestModalOpen(false);
        await fetchStatus();
      } else {
        setToastType("error");
        const errDetail = data.error || data.detail || "Failed to submit test email.";
        setToastMsg(errDetail);
        if (data.reconnect_required) {
          setOauthDiagnostic({ errorCode: "token_expired", rawError: errDetail });
          await fetchStatus();
        } else {
          setOauthDiagnostic({ errorCode: data.error_code || undefined, rawError: errDetail });
        }
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

  // Explicit Part 8 connection status badge text
  const exactStatusBadge = (() => {
    if (oauthDiagnostic?.errorCode === "credentials_missing") {
      return { text: "Configuration Required", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
    }
    if (
      oauthDiagnostic?.errorCode === "app_in_testing" ||
      oauthDiagnostic?.errorCode === "not_approved_test_user" ||
      oauthDiagnostic?.errorCode === "verification_required"
    ) {
      return { text: "Testing Mode Restriction", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
    }
    if (oauthDiagnostic?.errorCode === "token_expired") {
      return { text: "Token Expired • Reconnection Required", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
    }
    if (isConnected) return { text: "Connected", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    if (isReconnect) return { text: "Reconnection Required", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    if (isConfigError) return { text: "Configuration Error", cls: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
    return { text: "Not Connected", cls: "bg-slate-500/10 text-slate-300 border-slate-500/25" };
  })();

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Structured Google OAuth / Gmail API Diagnostic Banner */}
      {oauthDiagnostic && (
        <GmailDiagnosticBanner
          errorCode={oauthDiagnostic.errorCode}
          rawError={oauthDiagnostic.rawError}
          onReconnect={() => handleConnectGmail()}
          onDismiss={() => setOauthDiagnostic(null)}
        />
      )}

      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${toastType === "success"
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
                ) : (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded border ${exactStatusBadge.cls}`}>
                    {isConnected && <CheckCircle2 className="h-3 w-3" />}
                    <span>{exactStatusBadge.text}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Plan Allowance: <strong>{statusData?.daily_quota ?? user?.daily_email_limit ?? 10} emails / UTC day</strong> • Provider Caps: Personal Gmail ~500/day max (deliverability depends on warm-up), Google Workspace up to 2,000/day
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
                  onClick={() => handleConnectGmail()}
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
                onClick={() => handleConnectGmail()}
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
        {(isConnected || isReconnect) && statusData?.accounts && statusData.accounts.length > 0 ? (
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-300">
              Workspace Sending Mailboxes ({statusData.accounts.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {statusData.accounts.map((acc: any) => {
                const needsReauth = acc.health_status === "RECONNECT_REQUIRED" || acc.health_status === "REVOKED";
                return (
                <div
                  key={acc.id}
                  className={`p-4 rounded-xl border space-y-2 ${
                    needsReauth
                      ? "bg-amber-500/[0.06] border-amber-500/30"
                      : "bg-white/[0.02] border-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        needsReauth
                          ? "text-amber-300 bg-amber-500/15 border-amber-500/30"
                          : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      }`}
                    >
                      {acc.health_status || "CONNECTED"}
                    </span>
                    <button
                      onClick={() => handleDisconnect(acc.id)}
                      className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
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
                  {needsReauth && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200 space-y-1.5">
                      <div>{acc.last_error || "Google permissions were revoked or expired."}</div>
                      <button
                        type="button"
                        onClick={() => handleConnectGmail()}
                        className="px-2 py-1 rounded bg-amber-500 text-black font-bold text-[10px] cursor-pointer"
                      >
                        Reconnect Gmail Now
                      </button>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 border-t border-white/[0.04] pt-2 flex justify-between">
                    <span>Sent Today (UTC): {acc.sent_today_utc ?? acc.sent_today ?? 0} / {statusData?.daily_quota ?? acc.daily_limit ?? 10}</span>
                    <span className="text-emerald-400 font-mono">AES-256</span>
                  </div>
                </div>
                );
              })}
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

        {/* Security & Google OAuth Verification Transparency Notice */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-start gap-3 text-xs text-slate-300">
            <Shield className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-blue-300">Multi-Account Isolation &amp; Encryption</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Multiple Gmail mailboxes can be connected per workspace for sending selection and rotation. All OAuth refresh tokens are encrypted with AES-256-GCM at rest and strictly isolated to your workspace.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3 text-xs text-slate-300">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-300">Google OAuth Restricted Scope Notice</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Connecting Gmail requests Google&apos;s <code className="text-slate-300">gmail.send</code> scope. Until Google approves full Restricted Scope App Verification (or your Gmail is added as an approved Test User in Google Cloud Console), Google shows an unverified/blocked screen during connect.
              </p>
            </div>
          </div>
        </div>

        {/* 8-Step Gmail Connection & Google Cloud Guide (All 8 Steps Open by Default) */}
        <GmailSetupGuide
          isAdmin={false}
          expectedCallbackUri={oauthHealth?.callbackUri || "https://lead-scraper-mxs5.vercel.app/api/integrations/gmail/callback"}
          oauthHealth={oauthHealth}
        />

        {/* OPTIONAL SECURE CUSTOMER-SPECIFIC OAUTH JSON UPLOAD + GMAIL SETUP TIME BONUS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
          {/* Optional Custom OAuth Web App JSON Upload */}
          <div className="rounded-2xl border border-blue-500/20 bg-[#090d16] p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-white">
                <Key className="h-4 w-4 text-blue-400" />
                <span>Optional: Workspace Custom OAuth JSON Upload</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                Optional Advanced
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Normal customers use <strong>Shared Owner-Managed OAuth</strong> automatically (no JSON upload needed). Only if your team uses its own Google Cloud project (Steps 1–6 above), upload the downloaded <code className="text-blue-200">client_secret_*.json</code> here. <strong>Never send OAuth secrets or JSON files over WhatsApp.</strong>
            </p>

            {customOAuthConfig ? (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300">Custom OAuth Saved (AES-256 Encrypted)</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40 text-emerald-200">
                    {customOAuthConfig.status}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-slate-300 space-y-0.5">
                  <div>Project: {customOAuthConfig.google_project_id || "Custom Project"}</div>
                  <div className="truncate">Client ID: {customOAuthConfig.client_id}</div>
                  <div>Secret: {customOAuthConfig.client_secret_masked}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleConnectGmail("customer")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                  >
                    Connect With Custom OAuth
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveCustomOAuth}
                    disabled={uploadingJson}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold text-[11px] cursor-pointer"
                  >
                    Revert to Shared OAuth
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block font-semibold text-slate-300">
                  Upload Google Web Application OAuth JSON (<code className="text-slate-400">client_secret_*.json</code>)
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  disabled={uploadingJson}
                  onChange={(e) => void handleUploadCustomOAuthJson(e.target.files?.[0])}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* PART 10: GMAIL SETUP TIME COMPENSATION */}
          <div id="gmail-bonus" className="rounded-2xl border border-purple-500/25 bg-[#090d16] p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-white">
              <Clock className="h-4 w-4 text-purple-400" />
              <span>Request Gmail Setup Time Bonus</span>
            </div>

            <p className="text-[11px] text-purple-100 leading-relaxed bg-purple-500/10 border border-purple-500/25 p-3 rounded-xl">
              Time spent completing the required Gmail setup can be compensated by the Owner. You do not need to worry about losing your subscription time while completing the setup.
            </p>

            <form onSubmit={handleRequestSetupBonus} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Time Spent *</label>
                  <input
                    type="number"
                    min={1}
                    max={bonusUnit === "hours" ? 24 : 1440}
                    required
                    value={bonusQty}
                    onChange={(e) => setBonusQty(Math.max(1, parseInt(e.target.value || "1", 10)))}
                    className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Unit *</label>
                  <select
                    value={bonusUnit}
                    onChange={(e) => setBonusUnit(e.target.value as "minutes" | "hours")}
                    className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Brief Explanation of Setup Time *</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                  placeholder="e.g. Spent 45 minutes configuring Gmail OAuth & domain DNS."
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submittingBonus}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {submittingBonus ? "Submitting Request..." : "Request Gmail Setup Time Bonus"}
              </button>
            </form>

            {bonusRequests.length > 0 && (
              <div className="pt-2 border-t border-white/[0.08] space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-slate-400">Your Bonus Requests</div>
                {bonusRequests.slice(0, 3).map((b) => (
                  <div key={b.id} className="p-2 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-between text-[11px]">
                    <span>
                      +{b.requested_minutes}m ({b.status})
                      {b.approved_minutes ? ` → Granted +${b.approved_minutes}m` : ""}
                    </span>
                    <span className="font-mono text-slate-400">{new Date(b.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
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
                className={`text-xs font-bold ${dnsResults.mx?.status === "PASS" ? "text-emerald-400" : "text-rose-400"
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
                className={`text-xs font-bold ${dnsResults.spf?.status === "PASS" ? "text-emerald-400" : "text-amber-400"
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
                className={`text-xs font-bold ${dnsResults.dmarc?.status === "PASS" ? "text-emerald-400" : "text-amber-400"
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
                className={`text-xs font-bold ${dnsResults.dkim?.status === "PASS" ? "text-emerald-400" : "text-slate-400"
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
              <div>1. Go to Google Cloud Console (Project: usman-ai-gtm-516005)</div>
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
