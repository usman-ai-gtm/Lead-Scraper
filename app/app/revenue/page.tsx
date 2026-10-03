"use client";

import React, { useState } from "react";
import {
  LineChart, TrendingUp, DollarSign, ShieldAlert, Award,
  Cpu, ArrowUpRight, CheckCircle2, AlertTriangle, Play
} from "lucide-react";

export default function RevenuePage() {
  const [scenario, setScenario] = useState<"conservative" | "expected" | "best">("expected");

  const scenarios = {
    conservative: { arr: 310000, growth: "+18%", winRate: "22%", color: "text-amber-400" },
    expected: { arr: 425000, growth: "+36%", winRate: "28%", color: "text-blue-400" },
    best: { arr: 580000, growth: "+58%", winRate: "35%", color: "text-emerald-400" }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20">
            Predictive AI Models
          </span>
          <span className="text-xs text-slate-500 font-mono">Features 501–520 Active</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">Revenue Intelligence & Forecasting</h1>
        <p className="text-xs text-slate-400">
          Monte Carlo simulation, predictive deal win rates, ARR forecasting, and churn risk scoring.
        </p>
      </div>

      {/* FORECAST SCENARIO SIMULATOR */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" /> Quarterly ARR Forecast Scenario Simulator
            </h2>
            <p className="text-xs text-slate-400">Monte Carlo pipeline modeling based on historical conversion velocity</p>
          </div>

          <div className="flex rounded-xl bg-white/[0.03] border border-white/10 p-0.5 text-xs">
            <button
              onClick={() => setScenario("conservative")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                scenario === "conservative" ? "bg-amber-600/30 text-amber-400 border border-amber-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Conservative
            </button>
            <button
              onClick={() => setScenario("expected")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                scenario === "expected" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Expected Commit
            </button>
            <button
              onClick={() => setScenario("best")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                scenario === "best" ? "bg-emerald-600/30 text-emerald-400 border border-emerald-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Best Case Upside
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="text-xs text-slate-400 mb-1">Projected End-of-Quarter ARR</div>
            <div className={`text-3xl font-extrabold ${scenarios[scenario].color}`}>
              ${scenarios[scenario].arr.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Growth: {scenarios[scenario].growth} YoY</div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="text-xs text-slate-400 mb-1">Blended Win Rate Multiple</div>
            <div className="text-3xl font-extrabold text-white">
              {scenarios[scenario].winRate}
            </div>
            <div className="text-[10px] text-emerald-400 mt-1">Sufficient Pipeline Coverage (3.4x)</div>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <div className="text-xs text-slate-400 mb-1">Average Sales Cycle Length</div>
            <div className="text-3xl font-extrabold text-white">
              24 Days
            </div>
            <div className="text-[10px] text-blue-400 mt-1">-6 days vs industry benchmark</div>
          </div>
        </div>
      </div>

      {/* 2 COLUMNS: CHURN SHIELD & SALES VELOCITY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Churn Risk Predictor */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-400" /> Predictive Churn Early-Warning Shield
            </h3>
            <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              Feature #502
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Monitors login velocity, API error spikes, and executive champion job turnover to trigger proactive CSM intervention.
          </p>

          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-rose-500/[0.04] border border-rose-500/15 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">TechNova AI ($28K ARR)</div>
                <div className="text-[10px] text-slate-400">Drop in weekly active seats detected (-45%)</div>
              </div>
              <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded">High Risk</span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Apex Global Tech ($65K ARR)</div>
                <div className="text-[10px] text-slate-400">Executive champion turnover monitored via LinkedIn</div>
              </div>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">Moderate Risk</span>
            </div>
          </div>
        </div>

        {/* Sales Velocity Calculator */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-400" /> Sales Velocity Engine
            </h3>
            <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              Feature #507
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Formula: (Opportunities × Win Rate × Deal Value) / Duration in Sales Cycle.
          </p>

          <div className="p-4 rounded-xl bg-purple-500/[0.04] border border-purple-500/15 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Current Velocity Index:</span>
              <span className="font-extrabold text-white text-sm">$3,842 / Day</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pipeline Velocity Trajectory:</span>
              <span className="text-emerald-400 font-bold">+24% vs Q3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Recommended Lever:</span>
              <span className="text-blue-400 font-semibold">Shorten Proposal Review Stage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
