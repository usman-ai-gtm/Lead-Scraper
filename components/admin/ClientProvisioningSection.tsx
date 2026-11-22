"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { ClientAccount } from "@/lib/types";
import {
  Users, UserPlus, KeyRound, ShieldAlert, CheckCircle2,
  AlertTriangle, Copy, Check, RefreshCw, Lock, Trash2, Power
} from "lucide-react";

interface OneTimeCreds {
  full_name: string;
  email: string;
  workspace_id: number;
  workspace_name: string;
  temporary_password: string;
  note?: string;
}

function isTestAccount(email: string): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return (
    lower.startsWith("audit_user_") ||
    lower.startsWith("test_") ||
    lower.startsWith("selftest_") ||
    lower.startsWith("client_alpha_") ||
    lower.startsWith("client_beta_") ||
    lower.startsWith("verify_client_") ||
    lower.startsWith("verify_beta_") ||
    lower.startsWith("diag_locked_") ||
    lower.includes("example.com")
  );
}

export function ClientProvisioningSection() {
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [provisionModalOpen, setProvisionModalOpen] = useState(false);
  const [oneTimeCreds, setOneTimeCreds] = useState<OneTimeCreds | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Tab & Inquiries State
  const [activeTab, setActiveTab] = useState<"clients" | "inquiries">("clients");
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    company: "",
    address: "",
    plan: "STARTER",
    workspace_name: "",
    max_leads_quota: 5000,
    client_notes: "",
  });

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<any>("/admin/clients");
      const clientList = Array.isArray(data) ? data : (data?.clients || []);
      setClients(clientList);
    } catch (err: any) {
      setError(err?.message || "Failed to load provisioned clients");
    } finally {
      setLoading(false);
    }
  };

  const fetchInquiries = async () => {
    setInquiriesLoading(true);
    try {
      const data = await api.get<any>("/inquiries");
      setInquiries(data?.inquiries || []);
    } catch {
      // Inquiries default to empty
    } finally {
      setInquiriesLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchInquiries();
  }, []);

  // Compute dynamic client seat and subscription statistics
  const totalCount = clients.length;
  const activeCount = clients.filter((c) => c.status === "ACTIVE").length;
  const lockedCount = clients.filter((c) => c.status === "LOCKED").length;
  const pendingCount = clients.filter((c) => c.status === "PENDING").length;
  const expiredCount = clients.filter((c) => c.status === "EXPIRED").length;
  const suspendedCount = clients.filter((c) => c.status === "SUSPENDED" || c.status === "REVOKED").length;
  const lifetimeCount = clients.filter((c) => (c.raw_plan || c.plan || "").toUpperCase().includes("LIFETIME")).length;
  const basicCount = clients.filter((c) => (c.raw_plan || c.plan || "").toUpperCase().includes("BASIC")).length;

  const handleOpenProvisionModal = () => {
    setFormData({
      email: "",
      full_name: "",
      company: "",
      address: "",
      plan: "STARTER",
      workspace_name: "",
      max_leads_quota: 5000,
      client_notes: "",
    });
    setError(null);
    setProvisionModalOpen(true);
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email.trim() || !formData.full_name.trim()) {
      setError("Please fill in both Full Name and Email.");
      return;
    }

    try {
      const res = await api.post<{
        status: string;
        message: string;
        client: any;
        temporary_password: string;
      }>("/admin/clients", {
        email: formData.email.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        company: formData.company.trim() || undefined,
        address: formData.address.trim() || undefined,
        plan: formData.plan,
        workspace_name: formData.workspace_name.trim() || undefined,
        max_leads_quota: Number(formData.max_leads_quota) || 5000,
        client_notes: formData.client_notes.trim() || undefined,
      });

      const clientObj = res.client || res;
      setProvisionModalOpen(false);
      setOneTimeCreds({
        full_name: clientObj.full_name || formData.full_name,
        email: clientObj.email || formData.email,
        workspace_id: clientObj.workspace_id,
        workspace_name: clientObj.workspace_name || formData.workspace_name || "Client Workspace",
        temporary_password: res.temporary_password,
        note: "Store this password immediately. For zero-knowledge security, it will NEVER be displayed again.",
      });

      fetchClients();
    } catch (err: any) {
      setError(err?.message || "Failed to provision client");
    }
  };

  const handleResetPassword = async (clientId: number, clientName: string) => {
    if (!confirm(`Are you sure you want to generate a new temporary password for ${clientName}? This will revoke their current password and force them to rotate on their next sign-in.`)) {
      return;
    }

    setActionLoadingId(clientId);
    setError(null);
    try {
      const res = await api.post<{
        status: string;
        client_id: number;
        email: string;
        temporary_password: string;
        message: string;
      }>(`/admin/clients/${clientId}/reset-password`, {});

      const targetClient = clients.find((c) => c.id === clientId);
      setOneTimeCreds({
        full_name: targetClient?.full_name || "Client",
        email: res.email,
        workspace_id: targetClient?.workspace_id || 0,
        workspace_name: targetClient?.workspace_name || "Workspace",
        temporary_password: res.temporary_password,
        note: "This new temporary password is shown only ONCE. The client must change it upon their next sign-in.",
      });

      fetchClients();
    } catch (err: any) {
      setError(err?.message || "Failed to reset password");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (clientId: number, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setActionLoadingId(clientId);
    setError(null);
    try {
      await api.post(`/admin/clients/${clientId}/status`, { status: newStatus });
      setSuccessMsg(`Client status changed to ${newStatus}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchClients();
    } catch (err: any) {
      setError(err?.message || "Failed to change client status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeClient = async (clientId: number, clientName: string) => {
    if (!confirm(`WARNING: Revoking ${clientName} will free up their seat in the 50-client quota and prevent future access. Their workspace data remains safely preserved. Proceed?`)) {
      return;
    }

    setActionLoadingId(clientId);
    setError(null);
    try {
      await api.delete(`/admin/clients/${clientId}`);
      setSuccessMsg(`Client ${clientName} revoked successfully. Seat freed up.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchClients();
    } catch (err: any) {
      setError(err?.message || "Failed to revoke client");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSubscriptionAction = async (clientId: number, action: string, notes?: string) => {
    setActionLoadingId(clientId);
    setError(null);
    try {
      const res = await api.post<{
        status: string;
        client?: any;
        message?: string;
        detail?: string;
      }>(`/admin/clients/${clientId}/subscription`, { action, notes });

      if (res && res.status === "success" && res.client) {
        // Instant optimistic update in React table state
        setClients((prev) =>
          prev.map((c) => {
            if (c.id === clientId) {
              const updatedPlan = res.client.plan || c.plan;
              const updatedStatus = res.client.status || c.status;
              return {
                ...c,
                ...res.client,
                raw_plan: updatedPlan,
                plan: updatedPlan === "LIFETIME" ? "LIFETIME ($100)" : "BASIC ($25/30 Days)",
                status: updatedStatus,
                payment_status: updatedStatus === "ACTIVE" ? "PAID" : "PENDING",
              };
            }
            return c;
          })
        );
        setSuccessMsg(res.message || `Client #${clientId} updated via ${action}.`);
      } else {
        throw new Error(res?.detail || res?.message || "Failed to update client subscription in database.");
      }
      setTimeout(() => setSuccessMsg(null), 3500);
      await fetchClients();
    } catch (err: any) {
      setError(err?.message || `Failed to execute ${action}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateInquiryStatus = async (inquiryId: number, newStatus: string) => {
    setError(null);
    try {
      await api.patch("/inquiries", { id: inquiryId, status: newStatus });
      setSuccessMsg(`Inquiry #${inquiryId} updated to ${newStatus}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchInquiries();
    } catch (e: any) {
      setError(e?.message || "Failed to update inquiry");
    }
  };

  const copyCredsToClipboard = () => {
    if (!oneTimeCreds) return;
    const text = `USMAN AI GTM — CLIENT ACCESS CREDENTIALS\n` +
      `-----------------------------------------\n` +
      `Workspace: ${oneTimeCreds.workspace_name} (ID: ${oneTimeCreds.workspace_id})\n` +
      `Sign-In URL: https://lead-scraper-mxs5.vercel.app/login\n` +
      `Email: ${oneTimeCreds.email}\n` +
      `Temporary Password: ${oneTimeCreds.temporary_password}\n\n` +
      `* NOTE: You will be required to choose a new confidential password upon your first sign-in.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* DYNAMIC METRICS STRIP */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                Live Governance
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">Unlimited Multi-Tenant Client Architecture</span>
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Client Workspace Provisioning & Subscriptions
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Instant activation ($25/mo Basic or $100 Lifetime), server-side lock/unlock governance, real-time audit logs, and zero-knowledge credentials.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchClients}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/[0.03] border border-white/10 transition-colors cursor-pointer"
              title="Refresh Client List"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={handleOpenProvisionModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-glow-sm transition-all cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Provision New Client</span>
            </button>
          </div>
        </div>

        {/* 8 Real Dynamic Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-2">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total</div>
            <div className="text-lg font-extrabold text-white font-mono">{totalCount}</div>
            <div className="text-[9px] text-slate-500">Registered</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-[10px] uppercase font-semibold text-emerald-400">Active</div>
            <div className="text-lg font-extrabold text-emerald-400 font-mono">{activeCount}</div>
            <div className="text-[9px] text-emerald-500/80">Paid access</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="text-[10px] uppercase font-semibold text-amber-400">Locked</div>
            <div className="text-lg font-extrabold text-amber-400 font-mono">{lockedCount}</div>
            <div className="text-[9px] text-amber-500/80">Needs purchase</div>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="text-[10px] uppercase font-semibold text-purple-400">Pending</div>
            <div className="text-lg font-extrabold text-purple-400 font-mono">{pendingCount}</div>
            <div className="text-[9px] text-purple-500/80">Awaiting approval</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <div className="text-[10px] uppercase font-semibold text-rose-400">Expired</div>
            <div className="text-lg font-extrabold text-rose-400 font-mono">{expiredCount}</div>
            <div className="text-[9px] text-rose-500/80">Needs renewal</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Suspended</div>
            <div className="text-lg font-extrabold text-slate-300 font-mono">{suspendedCount}</div>
            <div className="text-[9px] text-slate-500">Revoked / paused</div>
          </div>
          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="text-[10px] uppercase font-semibold text-yellow-400">Lifetime</div>
            <div className="text-lg font-extrabold text-yellow-400 font-mono">{lifetimeCount}</div>
            <div className="text-[9px] text-yellow-500/80">$100 permanent</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="text-[10px] uppercase font-semibold text-blue-400">Basic</div>
            <div className="text-lg font-extrabold text-blue-400 font-mono">{basicCount}</div>
            <div className="text-[9px] text-blue-500/80">$25 / 30 days</div>
          </div>
        </div>
      </div>

      {/* FEEDBACK MESSAGES */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB NAVIGATION: CLIENTS VS BUYING INQUIRIES */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
        <button
          onClick={() => setActiveTab("clients")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === "clients"
              ? "bg-blue-600 text-white shadow-glow-sm"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Client Accounts ({clients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("inquiries")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === "inquiries"
              ? "bg-amber-600 text-white shadow-glow-sm"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>Buying Inquiries ({inquiries.length})</span>
          {inquiries.some((i: any) => i.status === "NEW") && (
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>
      </div>

      {activeTab === "clients" ? (
        /* CLIENTS TABLE */
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Client Accounts & Subscriptions</span>
              <span className="text-xs font-mono font-semibold text-slate-500">({clients.length} registered)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Basic: $25 / 30 Days • Lifetime: $100
            </span>
          </div>

          {/* Real-time Indicator for Locked / Pending Accounts */}
          {(() => {
            const pendingRealClients = clients.filter(
              (c) => !isTestAccount(c.email) && (c.status === "LOCKED" || c.status === "PENDING" || c.status === "EXPIRED")
            );
            const pendingTestAccounts = clients.filter(
              (c) => isTestAccount(c.email) && (c.status === "LOCKED" || c.status === "PENDING" || c.status === "EXPIRED")
            );

            if (pendingRealClients.length > 0) {
              return (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>
                      <strong>Genuine Clients Awaiting Activation or Renewal:</strong>{" "}
                      {pendingRealClients
                        .map((c) => `${c.email} (${c.status})`)
                        .join(", ")}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded border border-amber-500/30 shrink-0">
                    Action Required
                  </span>
                </div>
              );
            }

            if (pendingTestAccounts.length > 0) {
              return (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    All genuine client accounts are active. ({pendingTestAccounts.length} test accounts in staging/locked)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Staging Active</span>
                </div>
              );
            }

            return null;
          })()}

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading client roster...</div>
          ) : clients.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Users className="h-8 w-8 mx-auto text-slate-600" />
              <p className="font-semibold text-slate-300">No client accounts found.</p>
              <p className="text-slate-500">Clients register via Google login and appear here in LOCKED status.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3">Client & Google Email</th>
                    <th className="py-3 px-3">Account & Workspace</th>
                    <th className="py-3 px-3">Reg & Last Login</th>
                    <th className="py-3 px-3">Plan</th>
                    <th className="py-3 px-3">Duration / Expiry</th>
                    <th className="py-3 px-3">Gmail</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Usage</th>
                    <th className="py-3 px-3 text-right">Owner Control Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {clients.map((c) => {
                    const isPending = c.status === "LOCKED" || c.status === "PENDING";
                    const isExpired = c.status === "EXPIRED";
                    const isSuspended = c.status === "SUSPENDED";
                    const isRevoked = c.status === "REVOKED";
                    const isActive = c.status === "ACTIVE";
                    const isLifetime = (c.raw_plan || "").toUpperCase() === "LIFETIME";

                    return (
                      <tr key={c.id} className="hover:bg-white/[0.02]">
                        {/* Client Name & Real Google Email */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                            <span>{c.full_name}</span>
                            {isTestAccount(c.email) ? (
                              <span className="text-[9px] font-mono text-slate-500 bg-white/[0.04] border border-white/10 px-1.5 py-0.5 rounded">
                                Test / System
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                Genuine Customer
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{c.email}</div>
                          {c.company && <div className="text-[10px] text-slate-500">{c.company}</div>}
                        </td>

                        {/* Account ID & Workspace ID */}
                        <td className="py-3 px-3 font-mono text-[11px]">
                          <div className="text-slate-300 font-bold">ID: #{c.id}</div>
                          <div className="text-slate-500 text-[10px]">WS: #{c.workspace_id}</div>
                        </td>

                        {/* Registration Date & Last Login */}
                        <td className="py-3 px-3 text-[11px] text-slate-400">
                          <div>{c.created_at ? new Date(c.created_at).toLocaleDateString() : "N/A"}</div>
                          <div className="text-[10px] text-slate-500">
                            Login: {c.last_login ? new Date(c.last_login).toLocaleDateString() : "Never"}
                          </div>
                        </td>

                        {/* Plan */}
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              isLifetime
                                ? "text-amber-300 bg-amber-500/15 border-amber-500/30"
                                : "text-blue-400 bg-blue-500/10 border-blue-500/20"
                            }`}
                          >
                            {isLifetime ? "Lifetime ($100)" : "Basic ($25/30d)"}
                          </span>
                        </td>

                        {/* Duration / Expiry / Remaining Days */}
                        <td className="py-3 px-3 text-[11px]">
                          {isLifetime ? (
                            <span className="text-amber-400 font-bold">Permanent — No Expiry</span>
                          ) : (
                            <div>
                              <div className={typeof c.remaining_days === "number" && c.remaining_days <= 3 ? "text-rose-400 font-bold" : "text-slate-300 font-semibold"}>
                                {typeof c.remaining_days === "number"
                                  ? `${c.remaining_days} days left`
                                  : c.remaining_days || "30 Days"}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {c.subscription_expires_at
                                  ? `Exp: ${new Date(c.subscription_expires_at).toLocaleDateString()}`
                                  : "Pending start"}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Connected Gmail Count */}
                        <td className="py-3 px-3 font-mono text-[11px]">
                          <span className={`px-2 py-0.5 rounded ${
                            (c.connected_accounts ?? 0) > 0
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-white/[0.03] text-slate-500"
                          }`}>
                            {c.connected_accounts ?? 0} connected
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                              isActive
                                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                : isPending
                                ? "text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse"
                                : isExpired
                                ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                                : isSuspended
                                ? "text-purple-400 bg-purple-500/10 border-purple-500/20"
                                : "text-slate-400 bg-slate-500/10 border-slate-500/20"
                            }`}
                          >
                            {(isPending || isExpired) && <Lock className="h-3 w-3 inline" />}
                            {c.status}
                          </span>
                        </td>

                        {/* Usage */}
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                          <div>{c.total_leads ?? 0} leads</div>
                          <div className="text-[10px] text-slate-500">{c.total_searches ?? 0} searches</div>
                        </td>

                        {/* Owner Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                            {/* Activate Basic ($25) */}
                            <button
                              onClick={() => handleSubscriptionAction(c.id, "ACTIVATE_BASIC")}
                              disabled={actionLoadingId === c.id}
                              className="px-2 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded shadow-sm disabled:opacity-40"
                              title="Activate 30-Day Basic Plan ($25)"
                            >
                              $25 Basic
                            </button>

                            {/* Activate Lifetime ($100) */}
                            <button
                              onClick={() => handleSubscriptionAction(c.id, "ACTIVATE_LIFETIME")}
                              disabled={actionLoadingId === c.id}
                              className="px-2 py-1 text-[10px] font-bold text-black bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 rounded shadow-sm disabled:opacity-40"
                              title="Activate Lifetime Plan ($100)"
                            >
                              $100 Lifetime
                            </button>

                            {/* Extend +30 Days */}
                            {isActive && !isLifetime && (
                              <button
                                onClick={() => handleSubscriptionAction(c.id, "EXTEND_30")}
                                disabled={actionLoadingId === c.id}
                                className="px-1.5 py-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 rounded disabled:opacity-40"
                                title="Add 30 Days to Subscription"
                              >
                                +30d
                              </button>
                            )}

                            {/* Lock / Unlock */}
                            {isActive ? (
                              <button
                                onClick={() => handleSubscriptionAction(c.id, "LOCK")}
                                disabled={actionLoadingId === c.id}
                                className="px-1.5 py-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded disabled:opacity-40"
                                title="Lock account (require purchase)"
                              >
                                Lock 🔒
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSubscriptionAction(c.id, "UNLOCK")}
                                disabled={actionLoadingId === c.id}
                                className="px-1.5 py-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded disabled:opacity-40"
                                title="Unlock account"
                              >
                                Unlock
                              </button>
                            )}

                            {/* Suspend */}
                            <button
                              onClick={() => handleToggleStatus(c.id, c.status)}
                              disabled={actionLoadingId === c.id}
                              className="px-1.5 py-1 text-[10px] font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded disabled:opacity-40"
                              title="Toggle Suspension"
                            >
                              <Power className="h-2.5 w-2.5 inline" />
                            </button>

                            {/* Revoke */}
                            {!isRevoked && (
                              <button
                                onClick={() => handleRevokeClient(c.id, c.full_name)}
                                disabled={actionLoadingId === c.id}
                                className="p-1 text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-40"
                                title="Revoke Seat"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* BUYING INQUIRIES TAB */
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Customer Buying Inquiries</span>
              <span className="text-xs font-mono font-semibold text-slate-500">({inquiries.length} inquiries)</span>
            </h3>
            <button
              onClick={fetchInquiries}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {inquiriesLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading buying inquiries...</div>
          ) : inquiries.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <KeyRound className="h-8 w-8 mx-auto text-slate-600" />
              <p className="font-semibold text-slate-300">No buying inquiries received yet.</p>
              <p className="text-slate-500">Inquiries submitted from the Pricing and Contact pages will appear here in real time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3">Customer Name</th>
                    <th className="py-3 px-3">Contact (WhatsApp / Phone)</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Plan Requested</th>
                    <th className="py-3 px-3">Inquiry Date</th>
                    <th className="py-3 px-3">Message</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Inquiry Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {inquiries.map((iq: any) => (
                    <tr key={iq.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3 font-bold text-white">{iq.customer_name}</td>
                      <td className="py-3 px-3 text-slate-300 font-mono">
                        <a
                          href={`https://wa.me/${(iq.contact_info || "").replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline"
                        >
                          {iq.contact_info}
                        </a>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono">{iq.email || "N/A"}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          iq.plan === "LIFETIME"
                            ? "text-amber-300 bg-amber-500/10 border-amber-500/20"
                            : "text-blue-400 bg-blue-500/10 border-blue-500/20"
                        }`}>
                          {iq.plan === "LIFETIME" ? "$100 Lifetime" : "$25 Basic"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {iq.created_at ? new Date(iq.created_at).toLocaleString() : "N/A"}
                      </td>
                      <td className="py-3 px-3 text-slate-300 max-w-xs truncate" title={iq.message}>
                        {iq.message || "—"}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          iq.status === "NEW"
                            ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                            : iq.status === "ACTIVATED"
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                            : "text-slate-300 bg-white/5 border-white/10"
                        }`}>
                          {iq.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => handleUpdateInquiryStatus(iq.id, "CONTACTED")}
                            className="px-2 py-1 text-[10px] font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] rounded border border-white/10"
                          >
                            Contacted
                          </button>
                          <button
                            onClick={() => handleUpdateInquiryStatus(iq.id, "ACTIVATED")}
                            className="px-2 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded"
                          >
                            Mark Activated
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PROVISION NEW CLIENT MODAL */}
      {provisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c1017] p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Provision Client Workspace</h3>
              </div>
              <button
                onClick={() => setProvisionModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Creates a dedicated, isolated workspace with 0 initial leads. A cryptographically random temporary password will be generated and shown to you ONCE.
            </p>

            <form onSubmit={handleProvisionSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Client Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Client Email * (Used for Sign-In)
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. john@acme.com"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Acme Real Estate"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Subscription / Plan Status
                  </label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-[#0c1017] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="STARTER">Starter Plan ($25 / mo)</option>
                    <option value="LIFETIME">Lifetime Access Deal ($100 One-Time)</option>
                    <option value="GROWTH">Growth Plan ($29 / mo)</option>
                    <option value="SCALE">Scale Plan ($49 / mo)</option>
                    <option value="ENTERPRISE">Enterprise Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Business Address (Optional)
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. 123 Business Way, Suite 400, New York, NY"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={formData.workspace_name}
                    onChange={(e) => setFormData({ ...formData, workspace_name: e.target.value })}
                    placeholder="Acme Lead Engine"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Max Leads Quota
                  </label>
                  <input
                    type="number"
                    value={formData.max_leads_quota}
                    onChange={(e) => setFormData({ ...formData, max_leads_quota: Number(e.target.value) })}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Internal Admin Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.client_notes}
                  onChange={(e) => setFormData({ ...formData, client_notes: e.target.value })}
                  placeholder="e.g. Paid client, dental industry pilot in London."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProvisionModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-glow-sm"
                >
                  Provision Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ONE-TIME CREDENTIALS MODAL */}
      {oneTimeCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-[#0c1017] p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Security Notice</div>
                <h3 className="text-base font-bold text-white">One-Time Temporary Password Generated</h3>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <strong>CRITICAL:</strong> This temporary password will <u>NEVER</u> be displayed again. It is saved in the database only as a PBKDF2 hash. Copy these credentials immediately and send them securely to the client.
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-black/40 border border-white/[0.08] font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Client:</span>
                <span className="text-slate-200 font-semibold">{oneTimeCreds.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Workspace:</span>
                <span className="text-slate-200">{oneTimeCreds.workspace_name} (ID: #{oneTimeCreds.workspace_id})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="text-blue-400 font-bold">{oneTimeCreds.email}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/[0.08]">
                <span className="text-amber-400 font-bold">Temporary Password:</span>
                <span className="text-white font-extrabold text-sm bg-white/10 px-2 py-0.5 rounded select-all">
                  {oneTimeCreds.temporary_password}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={copyCredsToClipboard}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-glow-sm"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Credentials Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Full Credentials</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setOneTimeCreds(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 rounded-xl transition-colors"
              >
                I Have Saved These Credentials
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
