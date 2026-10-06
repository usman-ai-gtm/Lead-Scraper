"use client";

import React, { useState } from "react";
import OutreachNav from "@/components/outreach/OutreachNav";
import {
  CheckSquare, ShieldCheck, CheckCircle2, XCircle, AlertTriangle,
  Sparkles, User, Building2, Eye, Play, ThumbsUp, ThumbsDown
} from "lucide-react";

interface ApprovalItem {
  id: string;
  lead_name: string;
  email: string;
  company: string;
  subject: string;
  ai_score: number;
  personalization_status: "VERIFIED" | "PENDING_REVIEW";
  compliance_status: "CLEARED" | "FLAGGED";
  approved: boolean | null; // null = pending, true = approved, false = rejected
}

const INITIAL_QUEUE: ApprovalItem[] = [
  {
    id: "appr-1",
    lead_name: "Sarah Jenkins",
    email: "sarah@apexcloud.io",
    company: "Apex Cloud Innovations",
    subject: "Streamlining Apex Cloud's hybrid cloud latency",
    ai_score: 92,
    personalization_status: "VERIFIED",
    compliance_status: "CLEARED",
    approved: null
  },
  {
    id: "appr-2",
    lead_name: "Marcus Vance",
    email: "m.vance@solarenergy.com",
    company: "SolarScale Dynamics",
    subject: "Reducing grid telemetry sync overhead for SolarScale",
    ai_score: 88,
    personalization_status: "VERIFIED",
    compliance_status: "CLEARED",
    approved: null
  },
  {
    id: "appr-3",
    lead_name: "Chloe Dupont",
    email: "chloe@luxurylabs.fr",
    company: "Luxury Labs Paris",
    subject: "Accelerating omni-channel customer intelligence",
    ai_score: 84,
    personalization_status: "VERIFIED",
    compliance_status: "CLEARED",
    approved: null
  },
  {
    id: "appr-4",
    lead_name: "Tariq Malik",
    email: "tariq@indusbiotech.pk",
    company: "Indus BioTech",
    subject: "Automated cold-chain verification protocols",
    ai_score: 79,
    personalization_status: "PENDING_REVIEW",
    compliance_status: "CLEARED",
    approved: null
  }
];

export default function OutreachApprovalsPage() {
  const [queue, setQueue] = useState<ApprovalItem[]>(INITIAL_QUEUE);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, approved: true } : item))
    );
    notify("Outreach message approved for delivery.");
  };

  const handleReject = (id: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, approved: false } : item))
    );
    notify("Outreach message skipped and added to suppression list.");
  };

  const handleApproveAll = () => {
    setQueue((prev) => prev.map((item) => ({ ...item, approved: true })));
    notify("All pending items approved for scheduled sending.");
  };

  const notify = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const pendingCount = queue.filter((i) => i.approved === null).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <OutreachNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Human Approval Queue & Safety Center</h2>
          <p className="text-xs text-slate-400">
            Mandatory human verification checkpoint ensuring brand safety, compliance, and personalization quality.
          </p>
        </div>

        {pendingCount > 0 && (
          <button
            onClick={handleApproveAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-glow-sm"
          >
            <CheckCircle2 className="h-4 w-4" /> Approve All ({pendingCount})
          </button>
        )}
      </div>

      {actionNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {actionNotice}
        </div>
      )}

      {/* Campaign Safety Center Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> OAuth Sender State
          </div>
          <div className="text-sm font-bold text-emerald-400 mt-1">● Authenticated</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Google OAuth token active</p>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Deliverability Pre-flight
          </div>
          <div className="text-sm font-bold text-emerald-400 mt-1">100% Valid MX / Syntax</div>
          <p className="text-[10px] text-slate-500 mt-0.5">0 invalid recipient formats</p>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Suppression Collisions
          </div>
          <div className="text-sm font-bold text-emerald-400 mt-1">0 Collisions</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Cleared against global blocklist</p>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5 text-blue-400" /> Pending Review
          </div>
          <div className="text-sm font-bold text-white mt-1">{pendingCount} Messages</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Awaiting human sign-off</p>
        </div>
      </div>

      {/* Approval Queue Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm space-y-4">
        <h3 className="text-sm font-bold text-white">Outbound Messages in Queue</h3>

        <div className="space-y-3">
          {queue.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                item.approved === true
                  ? "border-emerald-500/30 bg-emerald-500/5 opacity-70"
                  : item.approved === false
                  ? "border-rose-500/30 bg-rose-500/5 opacity-50"
                  : "border-white/[0.08] bg-white/[0.02]"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{item.lead_name}</span>
                  <span className="text-xs text-slate-400">({item.company})</span>
                  <span className="text-[11px] text-slate-500 font-mono">&lt;{item.email}&gt;</span>
                </div>
                <div className="text-xs text-blue-300 font-medium">Subject: {item.subject}</div>
                <div className="flex items-center gap-3 pt-1 text-[11px]">
                  <span className="text-purple-400 font-bold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> AI Score: {item.ai_score}/100
                  </span>
                  <span className="text-emerald-400 font-semibold">● {item.personalization_status}</span>
                  <span className="text-slate-400">● Compliance: {item.compliance_status}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {item.approved === null ? (
                  <>
                    <button
                      onClick={() => handleApprove(item.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(item.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 font-bold text-xs transition-all flex items-center gap-1.5 border border-rose-500/20"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" /> Skip
                    </button>
                  </>
                ) : item.approved === true ? (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5" /> Skipped
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
