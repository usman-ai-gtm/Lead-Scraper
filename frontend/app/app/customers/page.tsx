"use client";

import React, { useState } from "react";
import {
  Users2, UserCheck, Heart, FileText, Sparkles, AlertCircle,
  CheckCircle2, ArrowRight, TrendingUp, BarChart2
} from "lucide-react";

export default function CustomersPage() {
  const [qbrGenerated, setQbrGenerated] = useState(false);

  const customerCohorts = [
    { name: "Apex Global Tech", tier: "Tier 1 Enterprise", health: 96, arr: "$65,000", status: "Healthy / Expansion Champion", csm: "Farhan Malik" },
    { name: "Nexus Logistics Co", tier: "Tier 2 Mid-Market", health: 88, arr: "$38,000", status: "Active Onboarding", csm: "Sarah Chen" },
    { name: "Vanguard Health Systems", tier: "Tier 1 Enterprise", health: 92, arr: "$95,000", status: "Optimal Adoption", csm: "Farhan Malik" },
    { name: "TechNova AI", tier: "Tier 3 Growth", health: 64, arr: "$28,000", status: "At-Risk (Usage Drop)", csm: "Jessica Taylor" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
            CS & Net Retention Operations
          </span>
          <span className="text-xs text-slate-500 font-mono">Features 541–560 Active</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">Customer Success & Retention</h1>
        <p className="text-xs text-slate-400">
          Monitor 360° health telemetry, generate executive QBR briefs, and trigger proactive retention playbooks.
        </p>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-xs text-slate-400 mb-1">Net Retention Rate (NRR)</div>
          <div className="text-2xl font-extrabold text-emerald-400">128.4%</div>
          <div className="text-[10px] text-slate-500 mt-1">Expansion outpacing churn</div>
        </div>

        <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-xs text-slate-400 mb-1">Average Account Health Score</div>
          <div className="text-2xl font-extrabold text-white">88 / 100</div>
          <div className="text-[10px] text-emerald-400 mt-1">Optimal product adoption</div>
        </div>

        <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-xs text-slate-400 mb-1">Accounts in Onboarding</div>
          <div className="text-2xl font-extrabold text-blue-400">14 Accounts</div>
          <div className="text-[10px] text-slate-500 mt-1">Avg 8.4 days to first lead</div>
        </div>

        <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-xs text-slate-400 mb-1">Q4 Expansion Pipeline</div>
          <div className="text-2xl font-extrabold text-purple-400">$142,000</div>
          <div className="text-[10px] text-purple-400 mt-1">Ready for upsell tier</div>
        </div>
      </div>

      {/* CUSTOMER HEALTH TABLE */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Heart className="h-4 w-4 text-emerald-400" /> Enterprise Customer Health Telemetry
          </h2>
          <button
            onClick={() => setQbrGenerated(!qbrGenerated)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 text-xs font-semibold hover:bg-purple-600/30 transition-all"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{qbrGenerated ? "Hide QBR Deck" : "Generate QBR Brief"}</span>
          </button>
        </div>

        {qbrGenerated && (
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-slate-200 space-y-2">
            <div className="font-bold text-white text-sm">Quarterly Business Review Brief Generated</div>
            <p className="text-slate-300">
              Executive slide briefing compiled for <strong>Apex Global Tech</strong>: Total Verified Leads crawled: 2,420 • Deliverability: 99.4% • 18 Qualified Inbound Demos Booked • Estimated Sales Pipeline Generated: $185,000.
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-3">Enterprise Account</th>
                <th className="py-3 px-3">Tier</th>
                <th className="py-3 px-3">ARR</th>
                <th className="py-3 px-3">Health Score</th>
                <th className="py-3 px-3">CSM Owner</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {customerCohorts.map((c, i) => (
                <tr key={i} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-3 font-bold text-white">{c.name}</td>
                  <td className="py-3 px-3 text-slate-300">{c.tier}</td>
                  <td className="py-3 px-3 font-mono font-bold text-blue-400">{c.arr}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        c.health >= 85
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {c.health} / 100
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{c.csm}</td>
                  <td className="py-3 px-3 text-slate-300">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
