"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Key,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ArrowLeft,
  RefreshCw,
  Mail,
  Lock,
  Clock,
  XCircle,
  Globe,
} from "lucide-react";
import { GmailSetupGuide } from "@/components/gmail/GmailSetupGuide";
import { api } from "@/lib/api";

export default function AdminGoogleIntegrationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [settings, setSettings] = useState<any | null>(null);
  const [bonusRequests, setBonusRequests] = useState<any[]>([]);
  const [customerOAuthRequests, setCustomerOAuthRequests] = useState<any[]>([]);

  // Secure Shared OAuth Update Form (never prepopulates raw secret)
  const [oauthProjectId, setOauthProjectId] = useState("usman-ai-gtm-516005");
  const [oauthAudienceStatus, setOauthAudienceStatus] = useState("IN_PRODUCTION_UNVERIFIED");
  const [oauthMode, setOauthMode] = useState("SHARED_PLUS_CUSTOMER_CUSTOM");
  const [newClientId, setNewClientId] = useState("");
  const [newClientSecret, setNewClientSecret] = useState("");

  // Bonus approval inline inputs per request id
  const [bonusValues, setBonusValues] = useState<Record<number, { val: number; unit: "minutes" | "hours"; note: string }>>({});
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>("/admin/gmail/overview");
      if (res?.settings) {
        setSettings(res.settings);
        setOauthProjectId(res.settings.oauthProjectId || "usman-ai-gtm-516005");
        setOauthAudienceStatus(res.settings.oauthAudienceStatus || "IN_PRODUCTION_UNVERIFIED");
        setOauthMode(res.settings.oauthMode || "SHARED_PLUS_CUSTOMER_CUSTOM");
      }
      const br = Array.isArray(res?.bonus_requests) ? res.bonus_requests : [];
      setBonusRequests(br);
      const initMap: Record<number, { val: number; unit: "minutes" | "hours"; note: string }> = {};
      for (const r of br) {
        initMap[r.id] = {
          val: r.requested_minutes >= 60 && r.requested_minutes % 60 === 0 ? r.requested_minutes / 60 : r.requested_minutes,
          unit: r.requested_minutes >= 60 && r.requested_minutes % 60 === 0 ? "hours" : "minutes",
          note: "",
        };
      }
      setBonusValues(initMap);
      setCustomerOAuthRequests(Array.isArray(res?.customer_oauth_requests) ? res.customer_oauth_requests : []);
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to load Gmail OAuth governance state.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveOAuthSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const payload: any = {
        oauth_project_id: oauthProjectId.trim(),
        oauth_audience_status: oauthAudienceStatus,
        oauth_mode: oauthMode,
      };
      if (newClientId.trim()) payload.custom_shared_client_id = newClientId.trim();
      if (newClientSecret.trim()) payload.custom_shared_client_secret = newClientSecret.trim();

      const res = await api.post<any>("/admin/settings", payload);
      setSettings(res.settings);
      setNewClientId("");
      setNewClientSecret("");
      setMsg({ text: "Google OAuth settings saved cleanly & verified in DB (secrets masked).", type: "success" });
      await loadOverview();
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to update OAuth settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleRevertToEnvOAuth = async () => {
    if (!confirm("Clear DB shared OAuth override and revert to Vercel environment credentials?")) return;
    setSaving(true);
    try {
      const res = await api.post<any>("/admin/settings", { clear_custom_shared_oauth: true });
      setSettings(res.settings);
      setMsg({ text: "Reverted shared OAuth to server environment credentials.", type: "success" });
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to clear override.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleReviewBonus = async (requestId: number, action: "APPROVE" | "REJECT") => {
    setReviewingId(requestId);
    setMsg(null);
    try {
      const cfg = bonusValues[requestId] || { val: 60, unit: "minutes", note: "" };
      const res = await api.post<any>(`/admin/gmail/bonus-requests/${requestId}`, {
        action,
        bonus_value: cfg.val,
        bonus_unit: cfg.unit,
        admin_note: cfg.note.trim() || undefined,
      });
      setMsg({ text: res?.message || `Bonus request #${requestId} processed.`, type: "success" });
      await loadOverview();
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to review bonus request.", type: "error" });
    } finally {
      setReviewingId(null);
    }
  };

  const handleReviewCustomOAuth = async (configId: number, action: "APPROVE" | "DISABLE") => {
    setReviewingId(configId);
    setMsg(null);
    try {
      await api.post(`/admin/gmail/customer-oauth/${configId}`, { action });
      setMsg({ text: `Customer OAuth config #${configId} marked ${action === "APPROVE" ? "APPROVED" : "DISABLED"}.`, type: "success" });
      await loadOverview();
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to update customer OAuth status.", type: "error" });
    } finally {
      setReviewingId(null);
    }
  };

  const isConfigured = Boolean(settings?.clientId && settings?.clientSecretConfigured);
  const redirectUri = settings?.redirectUri || "https://lead-scraper-mxs5.vercel.app/api/integrations/gmail/callback";
  const pendingBonus = bonusRequests.filter((b) => String(b.status).toUpperCase() === "PENDING").length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <Link
            href="/app/admin"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Admin
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              Owner Gmail OAuth Governance &amp; Bonus Compensation
            </h1>
            <p className="text-xs text-slate-400">
              Manage shared OAuth credentials securely (masked), review customer OAuth configs, and approve Gmail setup bonus time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadOverview}
            disabled={loading}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isConfigured
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}
          >
            ● {isConfigured ? "CONFIGURED" : "CONFIGURATION REQUIRED"}
          </span>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            msg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/25 text-rose-300"
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="underline text-xs cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Security Note */}
      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-blue-300 flex items-start gap-3">
        <Lock className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">Zero-Exposure Secret Vault: </span>
          Once saved, full Client Secrets and OAuth refresh tokens are never returned to the browser. Only a masked indicator (
          <code className="text-blue-200">{settings?.clientSecretMasked || "GOCSPX-••••••••"}</code>) is shown cleanly.
        </div>
      </div>

      {/* PART 9: OWNER SHARED GMAIL OAUTH CONFIGURATION PANEL */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-5 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="h-4 w-4 text-blue-400" />
            <span>Shared OAuth Status &amp; Credential Controls</span>
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Project: <strong className="text-blue-300">{settings?.oauthProjectId || oauthProjectId}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex justify-between">
              <span>Active Google Client ID</span>
              <span className="text-[10px] text-emerald-400 font-bold">
                {settings?.clientId ? "● Configured" : "Missing"}
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={settings?.clientId || "Not Configured"}
                className="flex-1 bg-[#121824] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 font-mono"
              />
              {settings?.clientId && (
                <button
                  type="button"
                  onClick={() => handleCopy(settings.clientId, "Client ID")}
                  className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copied === "Client ID" ? "Copied" : "Copy"}</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex justify-between">
              <span>Active Google Client Secret (Masked)</span>
              <span className="text-[10px] text-emerald-400 font-bold">
                {settings?.clientSecretConfigured ? "● Encrypted / Protected" : "Missing"}
              </span>
            </label>
            <input
              type="text"
              readOnly
              value={settings?.clientSecretConfigured ? settings.clientSecretMasked || "••••••••••••" : "Not configured"}
              className="w-full bg-[#0a0e14] border border-white/[0.05] rounded-xl px-3 py-2 text-slate-400 font-mono cursor-not-allowed"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="font-semibold text-slate-300">Authorized Redirect URI (Google Cloud Console)</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={redirectUri}
                className="flex-1 bg-[#121824] border border-white/[0.08] rounded-xl px-3 py-2 text-blue-300 font-mono"
              />
              <button
                type="button"
                onClick={() => handleCopy(redirectUri, "Redirect URI")}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copied === "Redirect URI" ? "Copied" : "Copy URI"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Update Shared OAuth Form */}
        <form onSubmit={handleSaveOAuthSettings} className="pt-4 border-t border-white/[0.08] space-y-3">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Update Shared OAuth Settings / Publishing Status
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Google Cloud Project ID</label>
              <input
                type="text"
                value={oauthProjectId}
                onChange={(e) => setOauthProjectId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">OAuth Audience / Publishing Status</label>
              <select
                value={oauthAudienceStatus}
                onChange={(e) => setOauthAudienceStatus(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
              >
                <option value="TESTING">Testing Mode (Approved Test Users Only)</option>
                <option value="IN_PRODUCTION_UNVERIFIED">In Production (Restricted Scope Pending Review)</option>
                <option value="VERIFIED_PRODUCTION">Verified Production (Unrestricted Worldwide)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Customer OAuth Policy</label>
              <select
                value={oauthMode}
                onChange={(e) => setOauthMode(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white"
              >
                <option value="SHARED_PLUS_CUSTOMER_CUSTOM">Shared OAuth + Optional Customer JSON</option>
                <option value="SHARED">Shared Owner OAuth Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">
                New Shared Client ID Override (Optional — leaves current active if blank)
              </label>
              <input
                type="text"
                value={newClientId}
                onChange={(e) => setNewClientId(e.target.value)}
                placeholder="Leave blank to keep active Client ID"
                className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">
                New Shared Client Secret Override (Encrypted AES-256-GCM; never revealed)
              </label>
              <input
                type="password"
                value={newClientSecret}
                onChange={(e) => setNewClientSecret(e.target.value)}
                placeholder="Leave blank to keep active secret"
                className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save OAuth Configuration"}
            </button>
            <button
              type="button"
              onClick={handleRevertToEnvOAuth}
              disabled={saving}
              className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 font-semibold cursor-pointer"
            >
              Use Vercel Env Default
            </button>
          </div>
        </form>
      </div>

      {/* PART 10: GMAIL SETUP TIME COMPENSATION REQUESTS */}
      <div className="rounded-2xl border border-purple-500/25 bg-[#0c1017] p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-400" />
              <span>Gmail Setup Time Bonus Requests ({pendingBonus} Pending)</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Compensate customers cleanly by extending their existing subscription expiry by your approved minutes/hours.
            </p>
          </div>
        </div>

        {bonusRequests.length === 0 ? (
          <p className="text-slate-500">No Gmail setup compensation requests submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {bonusRequests.map((req) => {
              const cfg = bonusValues[req.id] || { val: req.requested_minutes, unit: "minutes", note: "" };
              const isPending = String(req.status).toUpperCase() === "PENDING";
              return (
                <div
                  key={req.id}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/app/admin/clients/${req.user_id}`}
                          className="font-bold text-blue-300 hover:underline text-sm"
                        >
                          @{req.username}
                        </Link>
                        <span className="font-mono text-slate-400">#{req.id}</span>
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-200 font-semibold">
                          {req.user_plan_label || req.plan_label}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            req.status === "APPROVED"
                              ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"
                              : req.status === "REJECTED"
                              ? "text-rose-300 bg-rose-500/15 border-rose-500/30"
                              : "text-amber-300 bg-amber-500/15 border-amber-500/30"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Requested: +{req.requested_minutes} min • Current Expiry:{" "}
                        {req.user_expires_at ? new Date(req.user_expires_at).toLocaleString() : "N/A"}
                      </div>
                    </div>

                    <Link
                      href={`/app/admin/clients/${req.user_id}`}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-200 font-semibold inline-flex items-center gap-1 self-start"
                    >
                      <span>View Customer</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  <p className="text-slate-200 bg-black/35 p-2.5 rounded-lg border border-white/5">
                    &quot;{req.reason}&quot;
                  </p>

                  {isPending ? (
                    <div className="flex flex-wrap items-end gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Approve Bonus Time</label>
                        <input
                          type="number"
                          min={1}
                          max={1440}
                          value={cfg.val}
                          onChange={(e) =>
                            setBonusValues((p) => ({
                              ...p,
                              [req.id]: { ...cfg, val: Math.max(1, parseInt(e.target.value || "1", 10)) },
                            }))
                          }
                          className="w-20 rounded-lg border border-white/10 bg-[#121824] px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Unit</label>
                        <select
                          value={cfg.unit}
                          onChange={(e) =>
                            setBonusValues((p) => ({
                              ...p,
                              [req.id]: { ...cfg, unit: e.target.value as "minutes" | "hours" },
                            }))
                          }
                          className="rounded-lg border border-white/10 bg-[#121824] px-2.5 py-1.5 text-white"
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                        </select>
                      </div>
                      <div className="flex-1 min-w-[160px]">
                        <label className="block text-[10px] text-slate-400 mb-1">Optional Note</label>
                        <input
                          type="text"
                          value={cfg.note}
                          onChange={(e) =>
                            setBonusValues((p) => ({
                              ...p,
                              [req.id]: { ...cfg, note: e.target.value },
                            }))
                          }
                          placeholder="Added bonus time for Gmail setup."
                          className="w-full rounded-lg border border-white/10 bg-[#121824] px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={reviewingId === req.id}
                        onClick={() => handleReviewBonus(req.id, "APPROVE")}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve Bonus Time</span>
                      </button>
                      <button
                        type="button"
                        disabled={reviewingId === req.id}
                        onClick={() => handleReviewBonus(req.id, "REJECT")}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] font-mono text-slate-400">
                      Reviewed by {req.reviewed_by || "Owner"} • Approved:{" "}
                      {req.approved_minutes ? `+${req.approved_minutes} min` : "0 min"}
                      {req.admin_note ? ` • Note: ${req.admin_note}` : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PART 8/9: OPTIONAL CUSTOMER-SPECIFIC OAUTH JSON REVIEW QUEUE */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4 text-xs">
        <div className="border-b border-white/[0.08] pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-400" />
            <span>Customer-Specific OAuth JSON Configurations (Encrypted per Workspace)</span>
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Secrets remain AES-256-GCM encrypted and isolated strictly per customer workspace. Review or disable here anytime.
          </p>
        </div>

        {customerOAuthRequests.length === 0 ? (
          <p className="text-slate-500">No workspaces have uploaded a custom Google OAuth JSON configuration yet.</p>
        ) : (
          <div className="space-y-3">
            {customerOAuthRequests.map((c) => (
              <div key={c.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white">@{c.username}</span>
                    <span className="font-mono text-slate-400">WS #{c.workspace_id}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-mono text-[10px]">
                      {c.status}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Project: {c.google_project_id || "N/A"} • Client ID: {c.client_id} • Secret: {c.client_secret_masked}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={reviewingId === c.id}
                    onClick={() => handleReviewCustomOAuth(c.id, "APPROVE")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={reviewingId === c.id}
                    onClick={() => handleReviewCustomOAuth(c.id, "DISABLE")}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold cursor-pointer"
                  >
                    Disable
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verification Scope Justification + Demo Script */}
      <div className="p-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 space-y-3 text-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>Google OAuth Worldwide Verification Checklist (gmail.send)</span>
          </div>
          <a
            href={`https://console.cloud.google.com/auth/overview?project=${encodeURIComponent(settings?.oauthProjectId || oauthProjectId)}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <span>Open Google Auth Platform</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Shared outreach requests Google&apos;s Restricted <code className="text-amber-300">gmail.send</code> scope. To let arbitrary external Gmail customers worldwide connect without Google&apos;s &quot;Access blocked / unverified app&quot; restriction, publish under <strong>Audience &rarr; Production</strong> and complete Google Verification in Google Cloud Verification Center (links to <Link href="/privacy" className="underline text-blue-300">/privacy</Link> &amp; <Link href="/terms" className="underline text-blue-300">/terms</Link>).
        </p>
      </div>

      {/* ALL 8 OPEN STEPS REFERENCE */}
      <GmailSetupGuide
        isAdmin={true}
        expectedCallbackUri={redirectUri}
        oauthHealth={{
          oauthConfigured: isConfigured,
          callbackUri: redirectUri,
          oauthAudienceStatus: settings?.oauthAudienceStatus,
        }}
      />
    </div>
  );
}
