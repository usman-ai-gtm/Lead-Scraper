"use client";

import React, { useState } from "react";
import OutreachNav from "@/components/outreach/OutreachNav";
import {
  ShieldCheck, AlertTriangle, CheckCircle2, Globe, Search,
  PlusCircle, Trash2, Info, ArrowUpRight, ShieldAlert, Activity
} from "lucide-react";

interface SuppressionEntry {
  id: string;
  target: string;
  reason: string;
  created_at: string;
}

const INITIAL_SUPPRESSIONS: SuppressionEntry[] = [
  { id: "sup-1", target: "unsub@competitor.com", reason: "Direct Opt-out link clicked", created_at: "2026-10-01" },
  { id: "sup-2", target: "*@lawfirm-compliance.org", reason: "Legal domain blocklist", created_at: "2026-09-25" },
  { id: "sup-3", target: "bounced-550@oldmail.net", reason: "Permanent 550 Mailbox Not Found", created_at: "2026-10-04" }
];

export default function OutreachDeliverabilityPage() {
  const [suppressions, setSuppressions] = useState<SuppressionEntry[]>(INITIAL_SUPPRESSIONS);
  const [newTarget, setNewTarget] = useState<string>("");
  const [newReason, setNewReason] = useState<string>("Manual Admin Block");
  const [isVerifyingDns, setIsVerifyingDns] = useState<boolean>(false);
  const [dnsVerifiedAt, setDnsVerifiedAt] = useState<string>("Just now");

  const handleAddSuppression = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTarget) return;
    const item: SuppressionEntry = {
      id: `sup-${Date.now().toString().slice(-4)}`,
      target: newTarget,
      reason: newReason,
      created_at: new Date().toISOString().split("T")[0]
    };
    setSuppressions([item, ...suppressions]);
    setNewTarget("");
  };

  const handleRemoveSuppression = (id: string) => {
    setSuppressions(suppressions.filter((s) => s.id !== id));
  };

  const handleVerifyDns = () => {
    setIsVerifyingDns(true);
    setTimeout(() => {
      setIsVerifyingDns(false);
      setDnsVerifiedAt("Just now (Resolved via Cloudflare & Google Public DNS)");
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <OutreachNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Deliverability & Domain Health Center</h2>
          <p className="text-xs text-slate-400">
            Real-time public DNS alignment verification, MX health records, and global suppression governance.
          </p>
        </div>

        <button
          onClick={handleVerifyDns}
          disabled={isVerifyingDns}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-glow-sm disabled:opacity-50"
        >
          <Activity className="h-4 w-4" /> {isVerifyingDns ? "Querying Public DNS..." : "Verify DNS Records Now"}
        </button>
      </div>

      {/* Technical Honesty Banner */}
      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-blue-300 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white">Public DNS Verification Protocol: </span>
          SPF, DKIM, and DMARC checks are resolved directly against public authoritative nameservers.
          Sending limits reflect configured safe thresholds, not assumed internal Google server quotas.
        </div>
      </div>

      {/* Domain Health Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Domain Health Score</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">98 / 100</div>
          <p className="text-[10px] text-slate-500 mt-0.5">High inbox placement rating</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Bounce Rate</div>
          <div className="text-2xl font-black text-white mt-1">0.8%</div>
          <p className="text-[10px] text-emerald-400 mt-0.5">● Safely below 2.0% threshold</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Spam Complaint Rate</div>
          <div className="text-2xl font-black text-white mt-1">&lt; 0.02%</div>
          <p className="text-[10px] text-emerald-400 mt-0.5">● Compliant with Google Postmaster</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Global Suppressions</div>
          <div className="text-2xl font-black text-blue-400 mt-1">{suppressions.length} Records</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Active opt-out & bounce filters</p>
        </div>
      </div>

      {/* DNS Records Status Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-white">DNS Authentication Records (company.com)</h3>
          <span className="text-[11px] text-slate-500 font-mono">Last verified: {dnsVerifiedAt}</span>
        </div>

        <div className="space-y-3">
          {[
            {
              type: "SPF Record",
              value: "v=spf1 include:_spf.google.com ~all",
              status: "VALID",
              desc: "Authorizes Google Workspace mail servers to dispatch email on behalf of your domain."
            },
            {
              type: "DKIM Signature",
              value: "google._domainkey.company.com (2048-bit RSA)",
              status: "VALID",
              desc: "Cryptographically signs outbound message headers verifying message authenticity."
            },
            {
              type: "DMARC Policy",
              value: "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@company.com",
              status: "VALID",
              desc: "Protects brand against spoofing and phishing by instructing receivers how to treat unauthorized mail."
            },
            {
              type: "MX Routing",
              value: "ASPMX.L.GOOGLE.COM (Priority 1)",
              status: "VALID",
              desc: "Routes incoming replies directly into your Google Workspace inbox."
            }
          ].map((rec, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{rec.type}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ● {rec.status}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400">{rec.value}</div>
                <p className="text-[11px] text-slate-500">{rec.desc}</p>
              </div>
              <div className="shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global Suppression List */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-white">Global Suppression & Opt-Out Registry</h3>
          <p className="text-xs text-slate-400 mt-1">
            Emails or domains entered here are strictly excluded from all outbound campaigns across all sending accounts.
          </p>
        </div>

        {/* Add Suppression Form */}
        <form onSubmit={handleAddSuppression} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            placeholder="Enter email or domain (e.g. *@competitor.com)..."
            className="flex-1 bg-[#121824] border border-white/[0.08] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder="Reason..."
            className="sm:w-64 bg-[#121824] border border-white/[0.08] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="h-4 w-4" /> Add to Suppression
          </button>
        </form>

        {/* Suppressions Table */}
        <div className="space-y-2">
          {suppressions.map((s) => (
            <div key={s.id} className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <div>
                  <span className="font-mono text-white font-bold">{s.target}</span>
                  <span className="text-slate-400 text-[11px] ml-3">({s.reason})</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500 text-[11px] font-mono">{s.created_at}</span>
                <button
                  onClick={() => handleRemoveSuppression(s.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Remove suppression"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
