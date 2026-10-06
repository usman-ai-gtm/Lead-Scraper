"use client";

import React, { useState } from "react";
import OutreachNav from "@/components/outreach/OutreachNav";
import {
  BarChart3, TrendingUp, Users, Send, CheckCircle2, MessageSquare,
  Calendar, DollarSign, Filter, ArrowUpRight, ArrowDownRight, Layers
} from "lucide-react";

export default function OutreachAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<string>("30D");

  const funnelData = [
    { stage: "Delivered", count: 1840, pct: "99.2%", color: "bg-blue-500" },
    { stage: "Opened (Where Supported)", count: 1240, pct: "67.4%", color: "bg-indigo-500" },
    { stage: "Replies Received", count: 342, pct: "18.6%", color: "bg-purple-500" },
    { stage: "Positive Sentiment", count: 218, pct: "63.7% of replies", color: "bg-emerald-500" },
    { stage: "Meetings Booked", count: 54, pct: "24.8% of pos.", color: "bg-amber-500" },
    { stage: "Pipeline Created", count: "$420,000", pct: "18 Opportunities", color: "bg-emerald-600" }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <OutreachNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Outreach & Cadence Telemetry</h2>
          <p className="text-xs text-slate-400">
            End-to-end conversion funnel analysis, sender health metrics, and revenue attribution.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0c1017] border border-white/[0.08]">
          {["7D", "30D", "90D", "ALL"].map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                timeRange === r ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] shadow-glow-sm">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
            <span>Total Sent</span>
            <Send className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">1,855</div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
            <TrendingUp className="h-3 w-3" /> +14.2% vs last period
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] shadow-glow-sm">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
            <span>Reply Rate</span>
            <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400 mt-1">18.6%</div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
            <TrendingUp className="h-3 w-3" /> +3.4% above SaaS benchmark
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] shadow-glow-sm">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
            <span>Positive Ratio</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">63.7%</div>
          <div className="text-[10px] text-slate-500 mt-1">218 positive responses</div>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] shadow-glow-sm">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
            <span>Pipeline Generated</span>
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">$420,000</div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
            <TrendingUp className="h-3 w-3" /> 18 Active Opportunities
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-white">Cold Outreach Conversion Funnel</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Stage-by-stage conversion from initial dispatch to pipeline revenue.
          </p>
        </div>

        <div className="space-y-3">
          {funnelData.map((f, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">{f.stage}</span>
                <span className="font-mono text-white font-bold">{f.count} <span className="text-slate-500 font-normal">({f.pct})</span></span>
              </div>
              <div className="w-full bg-white/[0.04] rounded-full h-2 overflow-hidden">
                <div
                  className={`${f.color} h-full rounded-full transition-all duration-500`}
                  style={{ width: `${100 - idx * 15}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Comparison Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm space-y-4">
        <h3 className="text-sm font-bold text-white">Campaign Performance Comparison</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-slate-400">
                <th className="pb-3 font-semibold">Campaign</th>
                <th className="pb-3 font-semibold">Sender Account</th>
                <th className="pb-3 font-semibold">Sent</th>
                <th className="pb-3 font-semibold">Replies</th>
                <th className="pb-3 font-semibold">Reply Rate</th>
                <th className="pb-3 font-semibold">Positive</th>
                <th className="pb-3 font-semibold">Meetings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300">
              <tr>
                <td className="py-3 font-bold text-white">Q4 SaaS Enterprise VPs of Sales</td>
                <td className="py-3 font-mono text-slate-400">usman.personal@gmail.com</td>
                <td className="py-3">142</td>
                <td className="py-3">28</td>
                <td className="py-3 font-bold text-blue-400">19.7%</td>
                <td className="py-3 font-bold text-emerald-400">19 (67.8%)</td>
                <td className="py-3 font-bold text-purple-400">6</td>
              </tr>
              <tr>
                <td className="py-3 font-bold text-white">Lahore Tech Founders - AI Copilot</td>
                <td className="py-3 font-mono text-slate-400">sales@company.com</td>
                <td className="py-3">110</td>
                <td className="py-3">22</td>
                <td className="py-3 font-bold text-blue-400">20.0%</td>
                <td className="py-3 font-bold text-emerald-400">14 (63.6%)</td>
                <td className="py-3 font-bold text-purple-400">4</td>
              </tr>
              <tr>
                <td className="py-3 font-bold text-white">B2B Dentists & Healthcare Execs</td>
                <td className="py-3 font-mono text-slate-400">outreach@company.com</td>
                <td className="py-3">40</td>
                <td className="py-3">5</td>
                <td className="py-3 font-bold text-blue-400">12.5%</td>
                <td className="py-3 font-bold text-emerald-400">3 (60.0%)</td>
                <td className="py-3 font-bold text-purple-400">1</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
