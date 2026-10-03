"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Target, Layers, Sparkles, Building, Users, ArrowRight,
  CheckCircle2, Globe, Shield, RefreshCw
} from "lucide-react";

export default function ABMPage() {
  const [activeTier, setActiveTier] = useState<"tier1" | "tier2" | "tier3">("tier1");

  const tierAccounts = {
    tier1: [
      { name: "Apex Global Technologies", revenue: "$150M+", intent: "Surging on AI Sales Ops", contacts: 8, status: "Active 1:1 Cadence" },
      { name: "Vanguard Health Systems", revenue: "$500M+", intent: "Surging on HIPAA Automation", contacts: 12, status: "Executive Sponsor Engaged" }
    ],
    tier2: [
      { name: "Nexus Logistics Co", revenue: "$45M", intent: "Freight Dispatch API", contacts: 4, status: "1:Few Segment Cadence" },
      { name: "BlueStone Financial", revenue: "$80M", intent: "Private Equity CRM", contacts: 6, status: "1:Few Segment Cadence" }
    ],
    tier3: [
      { name: "OmniCommerce Group", revenue: "$12M", intent: "E-Commerce Optimization", contacts: 2, status: "Automated Programmatic Outreach" },
      { name: "Elevate Media Agency", revenue: "$8M", intent: "B2B Lead Generation", contacts: 3, status: "Automated Programmatic Outreach" }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">
            Account-Based Orchestration
          </span>
          <span className="text-xs text-slate-500 font-mono">Features 561–570 Active</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">ABM Studio & Intent Surges</h1>
        <p className="text-xs text-slate-400">
          Orchestrate bespoke multi-touch campaigns for high-value enterprise target accounts.
        </p>
      </div>

      {/* TIER ALLOCATION TABS */}
      <div className="flex rounded-xl bg-white/[0.03] border border-white/10 p-1 text-xs max-w-md">
        <button
          onClick={() => setActiveTier("tier1")}
          className={`flex-1 py-2 rounded-lg font-bold transition-all ${
            activeTier === "tier1" ? "bg-blue-600 text-white shadow-glow-sm" : "text-slate-400 hover:text-white"
          }`}
        >
          Tier 1 (1:1 Hyper-Target)
        </button>
        <button
          onClick={() => setActiveTier("tier2")}
          className={`flex-1 py-2 rounded-lg font-bold transition-all ${
            activeTier === "tier2" ? "bg-blue-600 text-white shadow-glow-sm" : "text-slate-400 hover:text-white"
          }`}
        >
          Tier 2 (1:Few Cluster)
        </button>
        <button
          onClick={() => setActiveTier("tier3")}
          className={`flex-1 py-2 rounded-lg font-bold transition-all ${
            activeTier === "tier3" ? "bg-blue-600 text-white shadow-glow-sm" : "text-slate-400 hover:text-white"
          }`}
        >
          Tier 3 (Programmatic)
        </button>
      </div>

      {/* ACCOUNTS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tierAccounts[activeTier].map((acc, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4 hover:border-blue-500/30 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white">{acc.name}</h3>
                <span className="text-xs text-slate-400">Est. Revenue: {acc.revenue}</span>
              </div>
              <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                {activeTier.toUpperCase()}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Intent Signal:</span>
                <span className="text-emerald-400 font-semibold">{acc.intent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Buying Committee:</span>
                <span className="text-white font-medium">{acc.contacts} Stakeholders Mapped</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cadence Status:</span>
                <span className="text-blue-400 font-medium">{acc.status}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Link
                href="/app/outreach"
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-glow-sm transition-all flex items-center gap-1.5"
              >
                <span>Trigger ABM Cadence</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
