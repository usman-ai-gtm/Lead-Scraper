"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { FEATURE_CATALOG } from "@/lib/entitlements";
import {
  ArrowLeft,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  Search,
  Database,
  Download,
  RefreshCw,
  Crown,
  MapPin,
  FileText,
  Calendar,
  Activity,
  AlertTriangle,
  KeyRound,
} from "lucide-react";

function fmtDate(val?: string | null): string {
  if (!val) return "Not recorded";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

export default function OwnerClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const clientId = String(params?.id || "");

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "searches" | "saved_leads" | "gmail" | "audit">("overview");

  // Audit filters
  const [auditQuery, setAuditQuery] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");

  const isOwner =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "ADMIN" ||
    user?.account_type === "MASTER_OWNER" ||
    user?.username === "master_owner_usman";

  const fetchDetails = async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>(`/admin/clients/${encodeURIComponent(clientId)}/details`);
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load client intelligence profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [clientId]);

  const filteredAuditLogs = useMemo(() => {
    const list = Array.isArray(data?.audit_logs) ? data.audit_logs : [];
    return list.filter((log: any) => {
      if (auditQuery.trim()) {
        const q = auditQuery.toLowerCase().trim();
        const detailsStr = typeof log.details === "string" ? log.details : JSON.stringify(log.details || {});
        const match =
          String(log.action || "").toLowerCase().includes(q) ||
          String(log.actor || "").toLowerCase().includes(q) ||
          String(log.result || "").toLowerCase().includes(q) ||
          detailsStr.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (auditFrom) {
        const fromMs = new Date(`${auditFrom}T00:00:00.000Z`).getTime();
        const logMs = new Date(log.timestamp).getTime();
        if (!Number.isNaN(fromMs) && !Number.isNaN(logMs) && logMs < fromMs) return false;
      }
      if (auditTo) {
        const toMs = new Date(`${auditTo}T23:59:59.999Z`).getTime();
        const logMs = new Date(log.timestamp).getTime();
        if (!Number.isNaN(toMs) && !Number.isNaN(logMs) && logMs > toMs) return false;
      }
      return true;
    });
  }, [data?.audit_logs, auditQuery, auditFrom, auditTo]);

  if (!loading && !isOwner) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
        <Lock className="h-10 w-10 text-rose-400 mx-auto" />
        <h1 className="text-xl font-bold text-white">Master Owner Authorization Required</h1>
        <p className="text-xs text-slate-400">
          Client intelligence records are strictly restricted to the authenticated Master Owner.
        </p>
        <button
          onClick={() => router.push("/app")}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const acc = data?.account;
  const lg = data?.lead_generation;
  const sl = data?.saved_leads;
  const go = data?.gmail_outreach;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/admin/clients"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Clients</span>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded">
                Owner Account Intelligence
              </span>
              {acc && (
                <span className="text-xs font-mono text-slate-400">
                  Client #{acc.id} • Workspace #{acc.workspace_id}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-0.5 flex items-center gap-2">
              <span>{acc?.username || `Client #${clientId}`}</span>
              {acc?.full_name && acc.full_name !== acc.username && (
                <span className="text-base font-normal text-slate-400">({acc.full_name})</span>
              )}
            </h1>
          </div>
        </div>

        <button
          onClick={fetchDetails}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
          <span>Refresh Intelligence</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading complete account activity from PostgreSQL...</div>
      ) : acc ? (
        <>
          {/* KPI Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0c1017] border border-white/10">
              <div className="text-[10px] uppercase text-slate-400 font-semibold">Account Status</div>
              <div
                className={`text-sm font-extrabold mt-1 ${
                  acc.status === "ACTIVE"
                    ? "text-emerald-400"
                    : acc.status === "EXPIRED"
                    ? "text-rose-400"
                    : "text-amber-300"
                }`}
              >
                {acc.status}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">{acc.remaining_detailed}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0c1017] border border-white/10">
              <div className="text-[10px] uppercase text-slate-400 font-semibold">Subscription</div>
              <div className="text-sm font-extrabold text-white mt-1 truncate">{acc.plan_label || acc.plan}</div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                {acc.custom_price_usd != null ? `$${acc.custom_price_usd} USD` : "Standard"}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0c1017] border border-white/10">
              <div className="text-[10px] uppercase text-slate-400 font-semibold">Total Searches</div>
              <div className="text-lg font-extrabold text-white font-mono mt-0.5">{lg?.total_searches ?? 0}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Web: {lg?.find_leads_searches_count ?? 0} • Maps: {lg?.google_maps_searches_count ?? 0}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0c1017] border border-white/10">
              <div className="text-[10px] uppercase text-slate-400 font-semibold">Saved Leads</div>
              <div className="text-lg font-extrabold text-blue-400 font-mono mt-0.5">{sl?.total_saved ?? 0}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {sl?.with_email ?? 0} email • {sl?.with_phone ?? 0} phone
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0c1017] border border-white/10">
              <div className="text-[10px] uppercase text-slate-400 font-semibold">Gmail Status</div>
              <div className={`text-sm font-extrabold mt-0.5 ${go?.connected ? "text-emerald-400" : "text-slate-400"}`}>
                {go?.connected ? "CONNECTED" : "DISCONNECTED"}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{go?.accounts?.length || 0} stored mailbox(es)</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0c1017] border border-white/10">
              <div className="text-[10px] uppercase text-slate-400 font-semibold">Emails Sent</div>
              <div className="text-lg font-extrabold text-emerald-400 font-mono mt-0.5">{go?.total_emails_sent ?? 0}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Today: {go?.emails_sent_today_utc ?? 0}/{go?.daily_email_limit ?? 0} • Failed: {go?.total_failed_emails ?? 0}
              </div>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2 overflow-x-auto">
            {[
              { id: "overview", label: "Account & Subscription", icon: ShieldCheck },
              { id: "searches", label: `Lead Searches (${lg?.total_searches ?? 0})`, icon: Search },
              { id: "saved_leads", label: `Saved Leads & Exports (${sl?.total_saved ?? 0})`, icon: Database },
              { id: "gmail", label: `Gmail & Cold Email (${go?.total_emails_sent ?? 0})`, icon: Mail },
              { id: "audit", label: `Audit & Activity Logs (${data?.audit_logs?.length ?? 0})`, icon: Activity },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === t.id
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: ACCOUNT & SUBSCRIPTION */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="p-5 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3 text-xs">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-blue-400" />
                  <span>Account Identity &amp; Lifecycle</span>
                </h2>
                <div className="divide-y divide-white/[0.06] font-mono text-[11px]">
                  {[
                    ["Username", acc.username],
                    ["Account ID / Workspace", `#${acc.id} / Workspace #${acc.workspace_id} (${acc.workspace_name})`],
                    ["Account Type", acc.account_type],
                    ["Created Date", fmtDate(acc.created_at)],
                    ["Total Days Elapsed", `${acc.days_active_total} day(s)`],
                    ["Last Login", fmtDate(acc.last_login)],
                    ["Last Recorded Activity", fmtDate(acc.last_activity)],
                    ["Suspension Status", acc.is_suspended ? `YES (${acc.raw_status})` : "No"],
                    ["Current Plan", acc.plan_label || acc.plan],
                    ["Price Billed / Ref", acc.custom_price_usd != null ? `$${acc.custom_price_usd} USD` : "N/A"],
                    ["Google Maps Entitlement", acc.google_maps_enabled ? "INCLUDED" : "EXCLUDED"],
                    ["Daily Cold Email Limit", `${acc.daily_email_limit} / UTC day`],
                    ["Subscription Start", fmtDate(acc.subscription_start)],
                    ["Exact Expiry (UTC)", acc.subscription_expires_at ? fmtDate(acc.subscription_expires_at) : "Never / Lifetime"],
                    ["Remaining Time", acc.remaining_detailed],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="py-2 flex justify-between gap-4">
                      <span className="text-slate-400">{k}:</span>
                      <span className="text-white text-right break-all">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3 text-xs">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-400" />
                    <span>Assigned Module Entitlements</span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {FEATURE_CATALOG.map((f) => {
                      const enabled = Boolean(acc.features?.[f.key]);
                      return (
                        <div
                          key={f.key}
                          className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
                            enabled
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                              : "bg-white/[0.02] border-white/[0.06] text-slate-500"
                          }`}
                        >
                          <span className="truncate">{f.label}</span>
                          <span className="font-mono font-bold text-[10px]">{enabled ? "ON" : "OFF"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3 text-xs">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-400" />
                    <span>Subscription &amp; Renewal History ({acc.subscription_history?.length || 0})</span>
                  </h2>
                  {(!acc.subscription_history || acc.subscription_history.length === 0) ? (
                    <p className="text-[11px] text-slate-500">
                      No historical subscription audit events logged for this account yet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {acc.subscription_history.map((h: any) => (
                        <div key={h.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px]">
                          <div className="flex justify-between font-mono">
                            <span className="font-bold text-purple-300">{h.action}</span>
                            <span className="text-slate-400">{fmtDate(h.timestamp)}</span>
                          </div>
                          <div className="text-slate-400 mt-1">Actor: {h.actor}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3 text-xs">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-400" />
                    <span>Lock, Suspend &amp; Unlock History ({acc.lock_history?.length || 0})</span>
                  </h2>
                  {(!acc.lock_history || acc.lock_history.length === 0) ? (
                    <p className="text-[11px] text-slate-500">
                      No lock, suspension, or reactivation events logged for this account.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {acc.lock_history.map((h: any) => (
                        <div key={h.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px]">
                          <div className="flex justify-between font-mono">
                            <span className="font-bold text-amber-300">{h.action}</span>
                            <span className="text-slate-400">{fmtDate(h.timestamp)}</span>
                          </div>
                          <div className="text-slate-400 mt-1">Actor: {h.actor}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3 text-xs">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Payment Submission History ({acc.payment_history?.length || 0})</span>
                  </h2>
                  {(!acc.payment_history || acc.payment_history.length === 0) ? (
                    <p className="text-[11px] text-slate-500">
                      No manual payment proof submissions recorded for this client yet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {acc.payment_history.map((p: any) => (
                        <div key={p.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] space-y-1">
                          <div className="flex justify-between items-center font-mono">
                            <span className="font-bold text-white">
                              #{p.id} • {p.requested_plan} (${Number(p.agreed_price_usd).toFixed(2)} {p.currency})
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                p.status === "APPROVED"
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : p.status === "REJECTED"
                                  ? "bg-rose-500/15 text-rose-300"
                                  : "bg-amber-500/15 text-amber-300"
                              }`}
                            >
                              {p.status}
                            </span>
                          </div>
                          <div className="text-slate-400">
                            Method: {p.payment_method_name} {p.payment_reference ? `• Ref: ${p.payment_reference}` : ""}
                          </div>
                          <div className="text-slate-500 font-mono text-[10px]">
                            Submitted: {fmtDate(p.created_at)}
                            {p.reviewed_by ? ` • Reviewed by ${p.reviewed_by}` : ""}
                          </div>
                          {p.admin_notes && <div className="text-slate-300">Note: {p.admin_notes}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LEAD GENERATION SEARCHES */}
          {activeTab === "searches" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#0c1017] border border-white/[0.08] space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Keywords Searched ({lg?.search_keywords?.length || 0})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(lg?.search_keywords || []).length === 0 ? (
                      <span className="text-slate-500 text-[11px]">None</span>
                    ) : (
                      lg.search_keywords.map((k: string) => (
                        <span key={k} className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-200 border border-blue-500/25 font-mono text-[10px]">
                          {k}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0c1017] border border-white/[0.08] space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Countries Searched ({lg?.countries_searched?.length || 0})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(lg?.countries_searched || []).length === 0 ? (
                      <span className="text-slate-500 text-[11px]">None</span>
                    ) : (
                      lg.countries_searched.map((c: string) => (
                        <span key={c} className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-200 border border-emerald-500/25 font-mono text-[10px]">
                          {c}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0c1017] border border-white/[0.08] space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Cities Searched ({lg?.cities_searched?.length || 0})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(lg?.cities_searched || []).length === 0 ? (
                      <span className="text-slate-500 text-[11px]">Whole-Country / None</span>
                    ) : (
                      lg.cities_searched.map((c: string) => (
                        <span key={c} className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-200 border border-purple-500/25 font-mono text-[10px]">
                          {c}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0c1017] border border-white/[0.08] space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Search Dates ({lg?.search_dates?.length || 0})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(lg?.search_dates || []).length === 0 ? (
                      <span className="text-slate-500 text-[11px]">None</span>
                    ) : (
                      lg.search_dates.map((d: string) => (
                        <span key={d} className="px-2 py-0.5 rounded bg-white/[0.05] text-slate-200 border border-white/10 font-mono text-[10px]">
                          {d}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3">
                <h2 className="text-sm font-bold text-white">
                  Search Records ({lg?.searches?.length || 0} runs • {lg?.total_leads_generated ?? 0} total qualified leads generated)
                </h2>
                {(!lg?.searches || lg.searches.length === 0) ? (
                  <p className="text-xs text-slate-500">No search runs recorded for this client yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/[0.08] text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-2">Type</th>
                          <th className="py-2 px-2">Keyword</th>
                          <th className="py-2 px-2">Countries / Cities</th>
                          <th className="py-2 px-2">Requested / Generated</th>
                          <th className="py-2 px-2">Sources / Providers</th>
                          <th className="py-2 px-2">Status</th>
                          <th className="py-2 px-2">Date &amp; Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {lg.searches.map((s: any) => {
                          const isMaps = String(s.id || "").startsWith("SR-MAPS-");
                          const srcs = Array.isArray(s.sources) ? s.sources : [];
                          return (
                            <tr key={s.id}>
                              <td className="py-2 px-2 font-mono text-[10px]">
                                <span
                                  className={`px-1.5 py-0.5 rounded border ${
                                    isMaps
                                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                      : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                                  }`}
                                >
                                  {isMaps ? "Google Maps" : "Find Leads"}
                                </span>
                              </td>
                              <td className="py-2 px-2 font-semibold text-white">{s.keyword}</td>
                              <td className="py-2 px-2 text-slate-300">
                                <div>{s.country || "Global"}</div>
                                {s.city && <div className="text-[10px] text-slate-500">{s.city}</div>}
                              </td>
                              <td className="py-2 px-2 font-mono">
                                <span className="text-emerald-400 font-bold">{s.qualified_quantity}</span> / {s.requested_quantity}
                                <span className="text-[10px] text-slate-500 block">{s.leads_with_phone} w/ phone</span>
                              </td>
                              <td className="py-2 px-2 text-[10px] text-slate-400 max-w-xs truncate">
                                {srcs.join(", ") || "Serper / Web"}
                              </td>
                              <td className="py-2 px-2 font-mono text-[10px]">{s.search_status || "COMPLETED"}</td>
                              <td className="py-2 px-2 font-mono text-[10px] text-slate-400">{fmtDate(s.created_at)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Active/Past Jobs */}
              {lg?.maps_jobs && lg.maps_jobs.length > 0 && (
                <div className="p-5 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-400" />
                    <span>Background / Chunked Search Jobs ({lg.maps_jobs.length})</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/[0.08] text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-2">Job Type</th>
                          <th className="py-2 px-2">Keyword &amp; Target</th>
                          <th className="py-2 px-2">Progress</th>
                          <th className="py-2 px-2">Status</th>
                          <th className="py-2 px-2">Message / Error</th>
                          <th className="py-2 px-2">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04] text-[11px]">
                        {lg.maps_jobs.map((j: any) => (
                          <tr key={j.id}>
                            <td className="py-2 px-2 font-mono">{j.job_type}</td>
                            <td className="py-2 px-2">{j.keyword} ({j.country}{j.city ? ` • ${j.city}` : ""})</td>
                            <td className="py-2 px-2 font-mono">{j.progress_count}/{j.target_count}</td>
                            <td className="py-2 px-2 font-mono font-bold">{j.status}</td>
                            <td className="py-2 px-2 text-slate-400 max-w-sm truncate">{j.error_message || j.progress_message}</td>
                            <td className="py-2 px-2 font-mono text-[10px] text-slate-400">{fmtDate(j.updated_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SAVED LEADS & EXPORTS */}
          {activeTab === "saved_leads" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="p-5 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-4 text-xs">
                <h2 className="text-sm font-bold text-white">Saved Leads Breakdown</h2>
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[10px] text-slate-400">Total Saved</div>
                    <div className="text-xl font-bold text-white">{sl?.total_saved ?? 0}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[10px] text-slate-400">With Email &amp; Phone</div>
                    <div className="text-xl font-bold text-emerald-400">{sl?.with_both ?? 0}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[10px] text-slate-400">Leads With Email</div>
                    <div className="text-xl font-bold text-blue-400">{sl?.with_email ?? 0}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="text-[10px] text-slate-400">Leads With Phone</div>
                    <div className="text-xl font-bold text-amber-300">{sl?.with_phone ?? 0}</div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono space-y-1">
                  <div>First Lead Saved: {fmtDate(sl?.first_saved_at)}</div>
                  <div>Latest Lead Saved: {fmtDate(sl?.last_saved_at)}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-300">Saved Lead Sources:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(sl?.sources || []).length === 0 ? (
                      <span className="text-slate-500">None saved yet.</span>
                    ) : (
                      sl.sources.map((src: any) => (
                        <span key={src.source} className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 font-mono text-[11px]">
                          {src.source} ({src.count})
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3 text-xs">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Download className="h-4 w-4 text-emerald-400" />
                  <span>Export Activity ({sl?.exports?.length || 0})</span>
                </h2>
                {(!sl?.exports || sl.exports.length === 0) ? (
                  <p className="text-slate-500">No XLSX/PDF exports recorded in this workspace yet.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {sl.exports.map((ex: any) => (
                      <div key={ex.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex justify-between items-center text-[11px]">
                        <div>
                          <div className="font-bold text-white">{ex.export_target}</div>
                          <div className="text-slate-400 font-mono">{fmtDate(ex.created_at)}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                          {ex.format} ({ex.record_count})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: GMAIL & COLD EMAIL */}
          {activeTab === "gmail" && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3 text-xs">
                <h2 className="text-sm font-bold text-white flex items-center justify-between">
                  <span>Connected Gmail Accounts (Tokens Never Exposed)</span>
                  <span className="font-mono text-slate-400">
                    UTC Quota: {go?.emails_sent_today_utc ?? 0} / {go?.daily_email_limit ?? 0} today • Opt-Out Suppressions: {go?.suppressions_count ?? 0}
                  </span>
                </h2>
                {(!go?.accounts || go.accounts.length === 0) ? (
                  <p className="text-slate-500">No Gmail account has been connected to this workspace.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {go.accounts.map((ga: any) => (
                      <div key={ga.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-1 font-mono text-[11px]">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white">{ga.sender_email}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ga.is_active === 1 && ga.health_status === "CONNECTED"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-amber-500/15 text-amber-300"
                            }`}
                          >
                            {ga.is_active === 1 ? ga.health_status : "DISCONNECTED"}
                          </span>
                        </div>
                        <div className="text-slate-400">Connected At: {fmtDate(ga.created_at)}</div>
                        <div className="text-slate-400">Last Updated: {fmtDate(ga.updated_at)}</div>
                        <div className="text-slate-400">Last Sent: {fmtDate(ga.last_sent_at)}</div>
                        {ga.last_error && <div className="text-rose-400">Last Error: {ga.last_error}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-5 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3 text-xs">
                <h3 className="text-sm font-bold text-white">
                  Recent Cold Email Records ({go?.total_emails_sent ?? 0} Sent • {go?.total_failed_emails ?? 0} Failed)
                </h3>
                {(!go?.recent_records || go.recent_records.length === 0) ? (
                  <p className="text-slate-500">No outreach email records logged yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-white/[0.08] text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-2">Sender</th>
                          <th className="py-2 px-2">Recipient</th>
                          <th className="py-2 px-2">Subject</th>
                          <th className="py-2 px-2">Status</th>
                          <th className="py-2 px-2">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04] text-[11px]">
                        {go.recent_records.map((rec: any) => (
                          <tr key={rec.id}>
                            <td className="py-2 px-2 font-mono">{rec.sender_email}</td>
                            <td className="py-2 px-2 font-mono">{rec.recipient_email}</td>
                            <td className="py-2 px-2 max-w-xs truncate">{rec.subject}</td>
                            <td className="py-2 px-2">
                              <span
                                className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                                  rec.outreach_status === "EMAIL SENT"
                                    ? "bg-emerald-500/15 text-emerald-300"
                                    : "bg-rose-500/15 text-rose-300"
                                }`}
                              >
                                {rec.outreach_status}
                              </span>
                            </td>
                            <td className="py-2 px-2 font-mono text-[10px] text-slate-400">{fmtDate(rec.sent_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT & ACTIVITY LOGS */}
          {activeTab === "audit" && (
            <div className="p-5 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    <span>Account Usage &amp; Owner Audit Timeline</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">{data?.data_notes?.audit_note}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={auditQuery}
                    onChange={(e) => setAuditQuery(e.target.value)}
                    placeholder="Filter action, actor, or detail..."
                    className="rounded-xl border border-white/10 bg-[#121824] px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="date"
                    value={auditFrom}
                    onChange={(e) => setAuditFrom(e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#121824] px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="date"
                    value={auditTo}
                    onChange={(e) => setAuditTo(e.target.value)}
                    className="rounded-xl border border-white/10 bg-[#121824] px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {filteredAuditLogs.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  No matching audit log events recorded for this account.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/[0.08] text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-2">Timestamp</th>
                        <th className="py-2 px-2">Action</th>
                        <th className="py-2 px-2">Actor</th>
                        <th className="py-2 px-2">Result</th>
                        <th className="py-2 px-2">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-[11px] font-mono">
                      {filteredAuditLogs.map((l: any) => (
                        <tr key={l.id}>
                          <td className="py-2 px-2 text-slate-400 whitespace-nowrap">{fmtDate(l.timestamp)}</td>
                          <td className="py-2 px-2 text-blue-300 font-bold">{l.action}</td>
                          <td className="py-2 px-2 text-slate-300">{l.actor}</td>
                          <td className="py-2 px-2">
                            <span className={l.result === "FAILED" ? "text-rose-400" : "text-emerald-400"}>
                              {l.result || "SUCCESS"}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-slate-400 max-w-md break-all">
                            {typeof l.details === "string" ? l.details : JSON.stringify(l.details)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
