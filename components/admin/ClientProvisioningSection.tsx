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

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    company: "",
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

  useEffect(() => {
    fetchClients();
  }, []);

  // Compute active client seat statistics
  const activeCount = clients.filter((c) => c.status !== "REVOKED").length;
  const maxQuota = 50;
  const seatsRemaining = Math.max(0, maxQuota - activeCount);
  const percentageUsed = Math.min(100, Math.round((activeCount / maxQuota) * 100));

  const handleOpenProvisionModal = () => {
    setFormData({
      email: "",
      full_name: "",
      company: "",
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
      {/* SEATS QUOTA STRIP */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                Phase 2 Architecture
              </span>
              <span className="text-[11px] text-slate-400 font-mono">50 Active Client Seats Max</span>
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Client Workspace Provisioning & Isolation
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Admin-gated client provisioning with zero-knowledge credentials, enforced first-login rotation, and strict multi-tenant boundary checks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchClients}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/[0.03] border border-white/10 transition-colors"
              title="Refresh Client List"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={handleOpenProvisionModal}
              disabled={activeCount >= maxQuota}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-glow-sm disabled:opacity-50 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              <span>Provision New Client ({seatsRemaining} seats left)</span>
            </button>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">
              Capacity: <strong className="text-white">{activeCount}</strong> / {maxQuota} Active Client Seats Allocated
            </span>
            <span className={`font-mono font-bold ${activeCount >= 45 ? "text-amber-400" : "text-emerald-400"}`}>
              {percentageUsed}% Utilized ({seatsRemaining} Available)
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                activeCount >= 45
                  ? "bg-gradient-to-r from-amber-500 to-rose-500"
                  : "bg-gradient-to-r from-blue-500 to-emerald-500"
              }`}
              style={{ width: `${Math.max(2, percentageUsed)}%` }}
            />
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

      {/* CLIENTS TABLE */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Provisioned Client Workspaces</span>
            <span className="text-xs font-mono font-semibold text-slate-500">({clients.length} total)</span>
          </h3>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading provisioned clients...</div>
        ) : clients.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <Users className="h-8 w-8 mx-auto text-slate-600" />
            <p className="font-semibold text-slate-300">No client accounts provisioned yet.</p>
            <p className="text-slate-500">Click &ldquo;Provision New Client&rdquo; above to onboard your first client with an isolated workspace.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Workspace</th>
                  <th className="py-3 px-3">Leads Count</th>
                  <th className="py-3 px-3">Password Status</th>
                  <th className="py-3 px-3">Seat Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{c.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{c.email}</div>
                      {c.company && (
                        <div className="text-[10px] text-slate-500 mt-0.5">{c.company}</div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-200">{c.workspace_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Workspace ID: #{c.workspace_id}</div>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-300">
                      <span className="inline-block px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                        {(c as any).total_leads ?? c.leads_count ?? 0} leads
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {c.must_change_password ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          <Lock className="h-3 w-3" />
                          <span>Pending First Login</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Password Set</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          c.status === "ACTIVE"
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                            : c.status === "SUSPENDED"
                            ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                            : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleResetPassword(c.id, c.full_name)}
                          disabled={actionLoadingId === c.id || c.status === "REVOKED"}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg transition-colors disabled:opacity-40"
                          title="Generate new temporary password"
                        >
                          <KeyRound className="h-3.5 w-3.5 inline mr-1 text-amber-400" />
                          Reset Pass
                        </button>

                        <button
                          onClick={() => handleToggleStatus(c.id, c.status)}
                          disabled={actionLoadingId === c.id || c.status === "REVOKED"}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors disabled:opacity-40 ${
                            c.status === "ACTIVE"
                              ? "text-amber-300 border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20"
                              : "text-emerald-300 border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20"
                          }`}
                          title={c.status === "ACTIVE" ? "Suspend Client Access" : "Activate Client Access"}
                        >
                          <Power className="h-3.5 w-3.5 inline mr-1" />
                          {c.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </button>

                        {c.status !== "REVOKED" && (
                          <button
                            onClick={() => handleRevokeClient(c.id, c.full_name)}
                            disabled={actionLoadingId === c.id}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-40"
                            title="Revoke Seat"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
