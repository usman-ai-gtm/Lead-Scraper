"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ClientAccount } from "@/lib/types";
import {
  Receipt, Shield, Users, CheckCircle2, AlertTriangle,
  ArrowLeft, RefreshCw, Power, MessageCircle, DollarSign, Clock, ExternalLink
} from "lucide-react";

export default function AdminPaymentsPage() {
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const data = await api.get<any>("/admin/clients");
      const list = Array.isArray(data) ? data : (data?.clients || []);
      setClients(list);
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to load clients", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleActivate = async (clientId: number, clientEmail: string) => {
    setActionLoadingId(clientId);
    setMsg(null);
    try {
      await api.post(`/admin/clients/${clientId}/status`, { status: "ACTIVE" });
      setMsg({ text: `Approved payment & activated client ${clientEmail}!`, type: "success" });
      fetchClients();
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to activate client", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSuspend = async (clientId: number, clientEmail: string) => {
    setActionLoadingId(clientId);
    setMsg(null);
    try {
      await api.post(`/admin/clients/${clientId}/status`, { status: "SUSPENDED" });
      setMsg({ text: `Suspended client ${clientEmail}. Paid features are now locked.`, type: "success" });
      fetchClients();
    } catch (err: any) {
      setMsg({ text: err?.message || "Failed to suspend client", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingPayments = clients.filter((c) => c.status === "LOCKED" || c.status === "PENDING");
  const paidActive = clients.filter((c) => c.status === "ACTIVE");

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/app/admin"
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Admin Center</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Payments & Verification
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Manual WhatsApp Payment Verification</h1>
          <p className="text-xs text-slate-400">
            Review client registrations, verify transaction confirmations from WhatsApp (+923174383702), and approve or suspend paid access.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchClients}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/[0.03] border border-white/10 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <a
            href="https://wa.me/923174383702"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-glow-sm transition-all cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Open Support WhatsApp (+923174383702)</span>
          </a>
        </div>
      </div>

      {/* Feedback Alert */}
      {msg && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
          msg.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="underline text-xs">Dismiss</button>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Pending Verifications</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{pendingPayments.length} Accounts</div>
          <div className="text-[10px] text-slate-400">Awaiting WhatsApp payment confirmation</div>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Active Paid Subscriptions</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{paidActive.length} Clients</div>
          <div className="text-[10px] text-slate-400">$25/mo or $100 Lifetime active</div>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Estimated MRR</span>
            <DollarSign className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">${paidActive.length * 25} / mo</div>
          <div className="text-[10px] text-slate-400">Approx. {(paidActive.length * 7000).toLocaleString()} PKR / mo</div>
        </div>
      </div>

      {/* Client Accounts Payment Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-400" />
            <span>Client Accounts & Payment Approval Ledger</span>
          </h3>
          <span className="text-xs text-slate-400">{clients.length} Registered Accounts</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading payment ledger...</div>
        ) : clients.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No client accounts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-3">Client & Google Email</th>
                  <th className="py-3 px-3">Workspace</th>
                  <th className="py-3 px-3">Plan</th>
                  <th className="py-3 px-3">Registration Date</th>
                  <th className="py-3 px-3">Payment Status</th>
                  <th className="py-3 px-3">Access Status</th>
                  <th className="py-3 px-3 text-right">Owner Approval Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {clients.map((c) => {
                  const isLocked = c.status === "LOCKED" || c.status === "PENDING";
                  const isActive = c.status === "ACTIVE";

                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{c.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{c.email}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-200">{c.workspace_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">ID: #{c.workspace_id}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          {c.plan || "$25/mo Starter"}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-[11px] text-slate-400">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : "N/A"}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isActive
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                            : "text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse"
                        }`}>
                          {isActive ? "PAID (ACTIVE)" : "PENDING VERIFICATION"}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isActive
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                            : isLocked
                            ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                            : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                        }`}>
                          {c.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {isLocked ? (
                            <button
                              onClick={() => handleActivate(c.id, c.email)}
                              disabled={actionLoadingId === c.id}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                              Approve & Activate
                            </button>
                          ) : isActive ? (
                            <button
                              onClick={() => handleSuspend(c.id, c.email)}
                              disabled={actionLoadingId === c.id}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-xs transition-all disabled:opacity-50"
                            >
                              <Power className="h-3.5 w-3.5 inline mr-1" />
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(c.id, c.email)}
                              disabled={actionLoadingId === c.id}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                            >
                              Reactivate
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
    </div>
  );
}
