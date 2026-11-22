"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { ClientAccount } from "@/lib/types";
import {
  Users, UserPlus, KeyRound, ShieldAlert, CheckCircle2,
  AlertTriangle, Copy, Check, RefreshCw, Lock, Unlock, Trash2, Power, Search,
  Sparkles, Key, ExternalLink, ShieldCheck, Clock, Eye, EyeOff, UserCheck, Globe
} from "lucide-react";

interface OneTimeCreds {
  customer_id?: number;
  full_name: string;
  username: string;
  email?: string;
  workspace_id?: number;
  workspace_name?: string;
  temporary_password?: string;
  password?: string;
  plan?: string;
  duration?: string;
  login_url?: string;
  note?: string;
}

function generateRandomUsername(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `client_${suffix}`;
}

function generateStrongPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const special = "!@#$%^&*";
  
  let pwd = "";
  pwd += upper.charAt(Math.floor(Math.random() * upper.length));
  pwd += lower.charAt(Math.floor(Math.random() * lower.length));
  pwd += numbers.charAt(Math.floor(Math.random() * numbers.length));
  pwd += special.charAt(Math.floor(Math.random() * special.length));

  const all = upper + lower + numbers + special;
  for (let i = 0; i < 8; i++) {
    pwd += all.charAt(Math.floor(Math.random() * all.length));
  }
  return pwd;
}

export function ClientProvisioningSection() {
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [previewClients, setPreviewClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // One-time credentials display modal
  const [oneTimeCreds, setOneTimeCreds] = useState<OneTimeCreds | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Tabs: "paid" | "preview" | "inquiries"
  const [activeTab, setActiveTab] = useState<"paid" | "preview" | "inquiries">("paid");
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);

  // Top CREATE CLIENT ACCOUNT Form State
  const [createForm, setCreateForm] = useState({
    customerName: "",
    username: generateRandomUsername(),
    password: generateStrongPassword(),
    showPassword: true,
    plan: "BASIC" as "BASIC" | "LIFETIME",
    clientNotes: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<any>("/admin/clients");
      if (data && typeof data === "object") {
        setClients(data.clients || []);
        setPreviewClients(data.preview_clients || []);
      } else if (Array.isArray(data)) {
        setClients(data);
      }
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
  const totalPaid = clients.length;
  const activePaid = clients.filter((c) => c.status === "ACTIVE").length;
  const lockedPaid = clients.filter((c) => c.status === "LOCKED" || c.status === "SUSPENDED").length;
  const expiredPaid = clients.filter((c) => c.status === "EXPIRED").length;
  const lifetimePaid = clients.filter((c) => (c.raw_plan || c.plan || "").toUpperCase().includes("LIFETIME")).length;
  const basicPaid = clients.filter((c) => (c.raw_plan || c.plan || "").toUpperCase().includes("BASIC")).length;
  const totalPreview = previewClients.length;

  // Filter clients by search query (Username, customer name, internal ID, email, status, or plan)
  const filteredPaidClients = clients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (c.username || "").toLowerCase().includes(q) ||
      (c.full_name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      String(c.id).includes(q) ||
      String(c.workspace_id || "").includes(q) ||
      (c.status || "").toLowerCase().includes(q) ||
      (c.plan || "").toLowerCase().includes(q)
    );
  });

  const filteredPreviewClients = previewClients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (c.email || "").toLowerCase().includes(q) ||
      (c.full_name || "").toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  });

  // Handle Form Submit for Creating Paid Client Account
  const handleCreatePaidAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanUsername = createForm.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanUsername || cleanUsername.length < 3) {
      setError("Please provide a valid username of at least 3 alphanumeric characters.");
      return;
    }
    if (!createForm.password.trim() || createForm.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setCreateLoading(true);
    try {
      const res = await api.post<{
        status: string;
        message: string;
        client: any;
        credentials: any;
        temporary_password?: string;
      }>("/admin/clients", {
        customer_name: createForm.customerName.trim() || undefined,
        username: cleanUsername,
        password: createForm.password.trim(),
        plan: createForm.plan,
        client_notes: createForm.clientNotes.trim() || undefined,
      });

      const creds = res.credentials || {};
      const client = res.client || {};

      setOneTimeCreds({
        customer_id: creds.customer_id || client.id,
        full_name: creds.customer_name || client.full_name || createForm.customerName || cleanUsername,
        username: creds.username || cleanUsername,
        password: creds.password || createForm.password.trim(),
        plan: creds.plan || (createForm.plan === "LIFETIME" ? "LIFETIME ($100 One-Time)" : "BASIC ($25 / 30 Days)"),
        duration: creds.duration || (createForm.plan === "LIFETIME" ? "Permanent Access — No Expiry" : "30 Days from Creation"),
        workspace_id: client.workspace_id,
        workspace_name: client.workspace_name || "Client Workspace",
        login_url: creds.login_url || "https://lead-scraper-mxs5.vercel.app/login",
        note: "This application password is saved in the database only as a secure hash. Provide these credentials securely to your customer.",
      });

      setSuccessMsg(`Paid ${createForm.plan} account created successfully for '${cleanUsername}'!`);
      // Reset form with fresh random values for next account creation
      setCreateForm({
        customerName: "",
        username: generateRandomUsername(),
        password: generateStrongPassword(),
        showPassword: true,
        plan: "BASIC",
        clientNotes: "",
      });

      await fetchClients();
    } catch (err: any) {
      setError(err?.message || "Failed to create paid client account");
    } finally {
      setCreateLoading(false);
    }
  };

  // Reset Client Password (Generates fresh random credentials & shows modal once)
  const handleResetPassword = async (clientId: number, clientUsername: string) => {
    if (!confirm(`Generate a new secure password for client '${clientUsername}'? Their old password will immediately stop working.`)) {
      return;
    }

    setActionLoadingId(clientId);
    setError(null);
    try {
      const res = await api.post<{
        status: string;
        client_id: number;
        temporary_password: string;
        message: string;
      }>(`/admin/clients/${clientId}/reset-password`, {});

      const targetClient = clients.find((c) => c.id === clientId);
      setOneTimeCreds({
        customer_id: clientId,
        full_name: targetClient?.full_name || clientUsername,
        username: targetClient?.username || clientUsername,
        password: res.temporary_password,
        plan: targetClient?.plan || "Paid Account",
        duration: targetClient?.remaining_days ? String(targetClient.remaining_days) : "Active",
        workspace_id: targetClient?.workspace_id,
        login_url: "https://lead-scraper-mxs5.vercel.app/login",
        note: "Password reset complete. This new password is shown ONCE. Provide it securely to the client.",
      });

      setSuccessMsg(`Password regenerated for '${clientUsername}'.`);
      setTimeout(() => setSuccessMsg(null), 3500);
      await fetchClients();
    } catch (err: any) {
      setError(err?.message || "Failed to reset password");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Toggle account suspension
  const handleToggleStatus = async (clientId: number, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setActionLoadingId(clientId);
    setError(null);
    try {
      await api.post(`/admin/clients/${clientId}/status`, { status: newStatus });
      setSuccessMsg(`Client #${clientId} status changed to ${newStatus}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchClients();
    } catch (err: any) {
      setError(err?.message || "Failed to change client status");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Revoke client seat
  const handleRevokeClient = async (clientId: number, clientUsername: string) => {
    if (!confirm(`Are you sure you want to revoke '${clientUsername}'? This will lock access immediately.`)) {
      return;
    }

    setActionLoadingId(clientId);
    setError(null);
    try {
      await api.delete(`/admin/clients/${clientId}`);
      setSuccessMsg(`Client '${clientUsername}' access revoked.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchClients();
    } catch (err: any) {
      setError(err?.message || "Failed to revoke client");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Subscription action (Activate Basic, Activate Lifetime, Lock, Unlock, Renew)
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

      if (res && res.status === "success") {
        setSuccessMsg(res.message || `Client #${clientId} updated via ${action}.`);
        setTimeout(() => setSuccessMsg(null), 3500);
        await fetchClients();
      } else {
        throw new Error(res?.detail || res?.message || "Failed to update client subscription in database.");
      }
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
      setSuccessMsg(`Inquiry #${inquiryId} marked as ${newStatus}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchInquiries();
    } catch (e: any) {
      setError(e?.message || "Failed to update inquiry");
    }
  };

  const copyCredsToClipboard = () => {
    if (!oneTimeCreds) return;
    const text =
      `==========================================\n` +
      `USMAN AI GTM — CLIENT LOGIN CREDENTIALS\n` +
      `==========================================\n` +
      `Login URL: ${oneTimeCreds.login_url || "https://lead-scraper-mxs5.vercel.app/login"}\n` +
      `Username: ${oneTimeCreds.username}\n` +
      `Password: ${oneTimeCreds.password}\n` +
      `Customer Name: ${oneTimeCreds.full_name}\n` +
      `Customer ID: #${oneTimeCreds.customer_id || "N/A"}\n` +
      `Subscription: ${oneTimeCreds.plan || "Paid Account"}\n` +
      `Access Duration: ${oneTimeCreds.duration || "Active"}\n` +
      `------------------------------------------\n` +
      `Go to the Login URL, enter your Username and Password, and click 'Sign In to Paid Account'.\n` +
      `==========================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP SECTION: CREATE CLIENT ACCOUNT (Prominent, Simple & Unlimited)     */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-b from-[#0e1626] to-[#0c1017] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                  Master Owner Administration
                </span>
                <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                  Unlimited Paid Account Creation
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <UserPlus className="h-6 w-6 text-blue-400" />
                <span>CREATE CLIENT ACCOUNT</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate real application credentials for paying customers with instant database activation and dedicated isolated workspace.
              </p>
            </div>

            <button
              onClick={fetchClients}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/[0.03] border border-white/10 transition-colors cursor-pointer self-start sm:self-auto"
              title="Refresh Client Roster"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <form onSubmit={handleCreatePaidAccount} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Customer Name <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={createForm.customerName}
                  onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                  placeholder="e.g. John Doe / Apex Real Estate"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Username with Generate Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Username * <span className="text-slate-500 font-normal">(App Login ID)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, username: generateRandomUsername() })}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono"
                  >
                    <RefreshCw className="h-2.5 w-2.5" /> Randomize
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                  placeholder="e.g. client_abc123"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Password with Generate Strong Button & Show/Hide Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Password * <span className="text-slate-500 font-normal">(Auto-Generated)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, password: generateStrongPassword() })}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono"
                  >
                    <Key className="h-2.5 w-2.5" /> Generate Strong
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={createForm.showPassword ? "text" : "password"}
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Enter or generate password"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 pr-10 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, showPassword: !createForm.showPassword })}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {createForm.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Subscription Type Selector (Basic 30 Days $25 vs Lifetime Permanent $100) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Subscription Plan * <span className="text-slate-500 font-normal">(Select access duration and features)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Basic */}
                <div
                  onClick={() => setCreateForm({ ...createForm, plan: "BASIC" })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    createForm.plan === "BASIC"
                      ? "border-blue-500 bg-blue-500/10 shadow-glow-sm"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    checked={createForm.plan === "BASIC"}
                    onChange={() => setCreateForm({ ...createForm, plan: "BASIC" })}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>BASIC — 30 DAYS — $25</span>
                      <span className="text-[10px] font-mono text-blue-400 bg-blue-500/20 px-1.5 py-0.2 rounded">
                        Standard
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Active for exactly 30 days from creation timestamp. Automatically locks upon expiry until renewed.
                    </p>
                  </div>
                </div>

                {/* Option 2: Lifetime */}
                <div
                  onClick={() => setCreateForm({ ...createForm, plan: "LIFETIME" })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    createForm.plan === "LIFETIME"
                      ? "border-amber-500 bg-amber-500/10 shadow-glow-sm"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    checked={createForm.plan === "LIFETIME"}
                    onChange={() => setCreateForm({ ...createForm, plan: "LIFETIME" })}
                    className="mt-0.5 text-amber-500 focus:ring-amber-400"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="text-amber-300">LIFETIME — PERMANENT — $100</span>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded font-bold">
                        Google Maps Unlocked
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Permanent access with no expiration. Unlocks Google Maps Lead Generator and all premium features permanently.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-400">
                Credentials will be securely hashed and displayed to you once for direct delivery to the customer.
              </span>

              <button
                type="submit"
                disabled={createLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-glow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {createLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Creating Account in Production Database...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>CREATE ACCOUNT</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* FEEDBACK NOTIFICATIONS */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 text-xs underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DYNAMIC METRICS STRIP                                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="p-3 rounded-xl bg-[#0c1017] border border-white/10">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Paid Clients</div>
          <div className="text-lg font-extrabold text-white font-mono">{totalPaid}</div>
          <div className="text-[9px] text-slate-500">Unlimited seats</div>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="text-[10px] uppercase font-semibold text-emerald-400">Active Paid</div>
          <div className="text-lg font-extrabold text-emerald-400 font-mono">{activePaid}</div>
          <div className="text-[9px] text-emerald-500/80">Full software access</div>
        </div>
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="text-[10px] uppercase font-semibold text-blue-400">Basic ($25)</div>
          <div className="text-lg font-extrabold text-blue-400 font-mono">{basicPaid}</div>
          <div className="text-[9px] text-blue-500/80">30-day term</div>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="text-[10px] uppercase font-semibold text-amber-300">Lifetime ($100)</div>
          <div className="text-lg font-extrabold text-amber-300 font-mono">{lifetimePaid}</div>
          <div className="text-[9px] text-amber-400/80">Permanent + Maps</div>
        </div>
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <div className="text-[10px] uppercase font-semibold text-rose-400">Expired</div>
          <div className="text-lg font-extrabold text-rose-400 font-mono">{expiredPaid}</div>
          <div className="text-[9px] text-rose-500/80">Needs renewal</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Locked / Paused</div>
          <div className="text-lg font-extrabold text-slate-300 font-mono">{lockedPaid}</div>
          <div className="text-[9px] text-slate-500">Access paused</div>
        </div>
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <div className="text-[10px] uppercase font-semibold text-purple-400">Google Preview</div>
          <div className="text-lg font-extrabold text-purple-400 font-mono">{totalPreview}</div>
          <div className="text-[9px] text-purple-500/80">Preview only</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB NAVIGATION                                                         */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
        <button
          onClick={() => setActiveTab("paid")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "paid"
              ? "bg-blue-600 text-white shadow-glow-sm"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Paid Client Accounts ({clients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("preview")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "preview"
              ? "bg-purple-600 text-white shadow-glow-sm"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>Google Free Preview Users ({previewClients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("inquiries")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
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

      {/* ========================================================================= */}
      {/* 4. TAB 1: PAID CLIENT ACCOUNTS TABLE (Search, Roster, Controls)          */}
      {/* ========================================================================= */}
      {activeTab === "paid" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Paid Client Accounts Roster</span>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  ({filteredPaidClients.length}{filteredPaidClients.length !== clients.length ? ` of ${clients.length}` : ""})
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Created directly by Master Owner with username & password. Real-time lock, renewal, password reset, and upgrade governance.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Basic: $25 / 30 Days • Lifetime: $100
            </span>
          </div>

          {/* Search by Username, Customer Name, Internal ID, Status */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
            <Search className="h-4 w-4 text-blue-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search paid clients by username, customer name, internal ID (#), plan, or status..."
              className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-xs font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/5 font-mono cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading paid client accounts...</div>
          ) : clients.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Users className="h-8 w-8 mx-auto text-slate-600" />
              <p className="font-semibold text-slate-300">No paid client accounts exist yet.</p>
              <p className="text-slate-500">Use the &apos;CREATE CLIENT ACCOUNT&apos; form above to provision your first customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3">Username & Customer Name</th>
                    <th className="py-3 px-3">Internal ID</th>
                    <th className="py-3 px-3">Plan</th>
                    <th className="py-3 px-3">Activation & Expiry</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Usage</th>
                    <th className="py-3 px-3 text-right">Master Owner Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredPaidClients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                        No paid clients match your query &quot;{searchQuery}&quot;.
                      </td>
                    </tr>
                  ) : (
                    filteredPaidClients.map((c) => {
                      const isExpired = c.status === "EXPIRED";
                      const isLocked = c.status === "LOCKED";
                      const isSuspended = c.status === "SUSPENDED";
                      const isRevoked = c.status === "REVOKED";
                      const isActive = c.status === "ACTIVE";
                      const isLifetime = (c.raw_plan || c.plan || "").toUpperCase().includes("LIFETIME");

                      return (
                        <tr key={c.id} className="hover:bg-white/[0.02]">
                          {/* Username & Customer Name */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-blue-400">{c.username || `client_${c.id}`}</span>
                              {c.full_name && c.full_name !== c.username && (
                                <span className="text-slate-300 text-xs">({c.full_name})</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Created: {c.created_at ? new Date(c.created_at).toLocaleDateString() : "N/A"}
                            </div>
                          </td>

                          {/* Internal ID & Workspace ID */}
                          <td className="py-3 px-3 font-mono text-[11px]">
                            <div className="text-slate-300 font-bold">ID: #{c.id}</div>
                            <div className="text-slate-500 text-[10px]">WS: #{c.workspace_id}</div>
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

                          {/* Activation & Expiry */}
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
                                    : "Active 30 Days"}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                                isActive
                                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                  : isLocked
                                  ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                                  : isExpired
                                  ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                                  : isSuspended
                                  ? "text-purple-400 bg-purple-500/10 border-purple-500/20"
                                  : "text-slate-400 bg-slate-500/10 border-slate-500/20"
                              }`}
                            >
                              {(isLocked || isExpired) && <Lock className="h-3 w-3 inline" />}
                              {c.status}
                            </span>
                          </td>

                          {/* Usage */}
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                            <div>{c.total_leads ?? 0} leads</div>
                            <div className="text-[10px] text-slate-500">{c.total_searches ?? 0} searches</div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                              {/* Activate Basic ($25 / 30 Days) */}
                              <button
                                onClick={() => handleSubscriptionAction(c.id, "ACTIVATE_BASIC")}
                                disabled={actionLoadingId === c.id}
                                className="px-2 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded shadow-sm disabled:opacity-40 cursor-pointer"
                                title="Set / Renew 30-Day Basic Plan ($25)"
                              >
                                $25 Basic
                              </button>

                              {/* Upgrade to Lifetime ($100) */}
                              <button
                                onClick={() => handleSubscriptionAction(c.id, "ACTIVATE_LIFETIME")}
                                disabled={actionLoadingId === c.id}
                                className="px-2 py-1 text-[10px] font-bold text-black bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 rounded shadow-sm disabled:opacity-40 cursor-pointer"
                                title="Upgrade to Lifetime Plan ($100 Permanent Access)"
                              >
                                $100 Lifetime
                              </button>

                              {/* Lock / Unlock */}
                              {isActive ? (
                                <button
                                  onClick={() => handleSubscriptionAction(c.id, "LOCK")}
                                  disabled={actionLoadingId === c.id}
                                  className="px-1.5 py-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded disabled:opacity-40 cursor-pointer"
                                  title="Lock account"
                                >
                                  Lock 🔒
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSubscriptionAction(c.id, "UNLOCK")}
                                  disabled={actionLoadingId === c.id}
                                  className="px-1.5 py-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded disabled:opacity-40 cursor-pointer"
                                  title="Unlock account"
                                >
                                  Unlock 🔓
                                </button>
                              )}

                              {/* Reset Password */}
                              <button
                                onClick={() => handleResetPassword(c.id, c.username || `client_${c.id}`)}
                                disabled={actionLoadingId === c.id}
                                className="px-1.5 py-1 text-[10px] font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 rounded disabled:opacity-40 cursor-pointer flex items-center gap-1"
                                title="Generate new password and show once"
                              >
                                <Key className="h-2.5 w-2.5" />
                                <span>Reset Pwd</span>
                              </button>

                              {/* Suspend */}
                              <button
                                onClick={() => handleToggleStatus(c.id, c.status)}
                                disabled={actionLoadingId === c.id}
                                className="px-1.5 py-1 text-[10px] font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded disabled:opacity-40 cursor-pointer"
                                title="Toggle Suspension"
                              >
                                <Power className="h-2.5 w-2.5 inline" />
                              </button>

                              {/* Revoke */}
                              {!isRevoked && (
                                <button
                                  onClick={() => handleRevokeClient(c.id, c.username || c.full_name)}
                                  disabled={actionLoadingId === c.id}
                                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-40 cursor-pointer"
                                  title="Revoke access"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB 2: GOOGLE FREE PREVIEW USERS TABLE                                 */}
      {/* ========================================================================= */}
      {activeTab === "preview" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-400" />
                <span>Google Free Preview Visitors</span>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  ({filteredPreviewClients.length} registered)
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Visitors who signed in via &apos;Continue with Google&apos;. All paid features and APIs are strictly locked for these preview accounts.
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
            <Search className="h-4 w-4 text-purple-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search preview users by Google email or name..."
              className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-xs font-mono"
            />
          </div>

          {previewClients.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Globe className="h-8 w-8 mx-auto text-slate-600" />
              <p className="font-semibold text-slate-300">No Google Free Preview users yet.</p>
              <p className="text-slate-500">When visitors click &apos;Continue with Google&apos;, they appear here in PREVIEW_ONLY status.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3">Google Account</th>
                    <th className="py-3 px-3">User ID</th>
                    <th className="py-3 px-3">Registered</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Convert / Provision Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredPreviewClients.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{p.full_name || "Google Visitor"}</div>
                        <div className="text-[11px] text-purple-300 font-mono">{p.email}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">#{p.id}</td>
                      <td className="py-3 px-3 text-slate-400">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border text-purple-400 bg-purple-500/10 border-purple-500/20">
                          PREVIEW_ONLY
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setCreateForm({
                              ...createForm,
                              customerName: p.full_name || "",
                              username: (p.email?.split("@")[0] || generateRandomUsername()).toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                            });
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded cursor-pointer"
                        >
                          Provision Paid Account
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB 3: BUYING INQUIRIES TAB                                            */}
      {/* ========================================================================= */}
      {activeTab === "inquiries" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Customer Buying Inquiries</span>
              <span className="text-xs font-mono font-semibold text-slate-500">({inquiries.length} inquiries)</span>
            </h3>
            <button
              onClick={fetchInquiries}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
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
                            className="px-2 py-1 text-[10px] font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] rounded border border-white/10 cursor-pointer"
                          >
                            Contacted
                          </button>
                          <button
                            onClick={() => handleUpdateInquiryStatus(iq.id, "ACTIVATED")}
                            className="px-2 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded cursor-pointer"
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

      {/* ========================================================================= */}
      {/* 7. ONE-TIME CREDENTIALS MODAL                                             */}
      {/* ========================================================================= */}
      {oneTimeCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/50 bg-[#0c1017] p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Zero-Knowledge Security</div>
                <h3 className="text-base font-bold text-white">Application Credentials Generated</h3>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <strong>IMPORTANT:</strong> These credentials are displayed <u>ONCE</u>. The password is saved only as a secure cryptographic hash in the production database. Copy and send these credentials to your paying client.
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-black/50 border border-white/[0.08] font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Sign-In URL:</span>
                <span className="text-blue-400 font-semibold">{oneTimeCreds.login_url || "https://lead-scraper-mxs5.vercel.app/login"}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/[0.04]">
                <span className="text-slate-400 font-bold">Username:</span>
                <span className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 py-0.5 rounded select-all">
                  {oneTimeCreds.username}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/[0.04]">
                <span className="text-amber-400 font-bold">Password:</span>
                <span className="text-white font-extrabold text-sm bg-white/10 px-2 py-0.5 rounded select-all">
                  {oneTimeCreds.password}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/[0.04]">
                <span className="text-slate-500">Customer Name:</span>
                <span className="text-slate-200">{oneTimeCreds.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Internal Customer ID:</span>
                <span className="text-slate-300">#{oneTimeCreds.customer_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subscription Plan:</span>
                <span className="text-blue-300 font-bold">{oneTimeCreds.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Access Duration:</span>
                <span className="text-emerald-300 font-semibold">{oneTimeCreds.duration}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={copyCredsToClipboard}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-glow-sm cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Credentials Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy All Credentials</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setOneTimeCreds(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 rounded-xl transition-colors cursor-pointer"
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
