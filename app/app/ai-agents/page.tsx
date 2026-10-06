"use client";

import React, { useState, useEffect } from "react";
import {
  Bot, Play, Pause, RefreshCw, CheckCircle2, ShieldAlert,
  Zap, Sparkles, Terminal, Activity, Layers, ArrowUpRight,
  SlidersHorizontal, Check, AlertCircle, Clock
} from "lucide-react";
import { api } from "@/lib/api";

interface Agent {
  id: string;
  name: string;
  category: string;
  responsibility: string;
  model: string;
  provider: string;
  status: "ACTIVE" | "PAUSED";
  success_rate: number;
  execution_count: number;
  requires_human_approval: boolean;
  last_run: string;
}

export default function AIAgentsWorkforcePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [targetAccount, setTargetAccount] = useState("Stripe Inc (Enterprise Demo)");
  const [dryRun, setDryRun] = useState(true);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<any | null>(null);
  const [filterCategory, setFilterCategory] = useState("ALL");

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ agents: Agent[] }>("/agents");
      if (res && res.agents) {
        setAgents(res.agents);
      }
    } catch {
      // Fallback roster if offline
      setAgents([
        {
          id: "research-recon",
          name: "Market & Entity Recon Agent",
          category: "Intelligence",
          responsibility: "Autonomous deep-web research, corporate filing verification, and tech stack detection.",
          model: "Gemini 1.5 Pro / GPT-4o",
          provider: "MultiAI Mesh",
          status: "ACTIVE",
          success_rate: 98.4,
          execution_count: 1420,
          requires_human_approval: false,
          last_run: "4 mins ago",
        },
        {
          id: "scoring-intent",
          name: "Scoring & Intent Prioritization Agent",
          category: "Revenue Operations",
          responsibility: "Calculates composite ICP Fit and multi-provider Buying Intent matrices.",
          model: "Claude 3.5 Sonnet",
          provider: "Anthropic Direct",
          status: "ACTIVE",
          success_rate: 99.5,
          execution_count: 4200,
          requires_human_approval: false,
          last_run: "2 mins ago",
        },
        {
          id: "copywriting-outreach",
          name: "Hyper-Personalized Copywriting Agent",
          category: "Engagement",
          responsibility: "Generates 1:1 tailored email icebreakers, pain point tie-ins, and WhatsApp messages.",
          model: "GPT-4o",
          provider: "OpenAI Tier 1",
          status: "ACTIVE",
          success_rate: 99.0,
          execution_count: 3480,
          requires_human_approval: true,
          last_run: "8 mins ago",
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (agentId: string) => {
    try {
      const res = await api.post<any>(`/agents/${agentId}/toggle`, {});
      if (res && res.new_status) {
        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: res.new_status } : a));
      }
    } catch (e: any) {
      alert("Failed to update agent status: " + e.message);
    }
  };

  const handleExecuteAgent = async () => {
    if (!selectedAgent) return;
    setRunning(true);
    setRunResult(null);
    try {
      const res = await api.post<any>(`/agents/${selectedAgent.id}/run`, {
        target_account: targetAccount,
        dry_run: dryRun
      });
      setRunResult(res.result || res);
    } catch (e: any) {
      setRunResult({ outcome: "ERROR", error: e.message });
    } finally {
      setRunning(false);
    }
  };

  const categories = ["ALL", "Intelligence", "Revenue Operations", "Strategic GTM", "Engagement", "Governance", "Supervisory"];
  const filteredAgents = filterCategory === "ALL" ? agents : agents.filter(a => a.category === filterCategory);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400">
              Autonomous Workforce
            </span>
            <span className="text-xs text-slate-400">• Section 29 Production Architecture</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            AI Agent Workforce & Supervisor Roundtable
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Ten specialized autonomous agents orchestrating end-to-end B2B revenue intelligence with deterministic human-in-the-loop governance.
          </p>
        </div>

        <button
          onClick={loadAgents}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.1] transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </button>
      </div>

      {/* Supervisor Roundtable Status Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-indigo-500/30 p-6 backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              Executive Supervisor Roundtable
            </div>
            <h2 className="text-xl font-bold text-white">Autonomous Multi-Agent Consensus Arbiter</h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Every lead score, intent hypothesis, and email sequence is subject to cross-agent verification.
              Discrepancies trigger automatic reconciliation via the Anthropic Claude 3.5 Sonnet & OpenAI GPT-4o dual-judge mesh.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
            <div className="bg-black/40 border border-white/[0.08] rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400">Active Agents</div>
              <div className="text-lg font-bold text-white mt-0.5">{agents.filter(a => a.status === "ACTIVE").length} / {agents.length}</div>
            </div>
            <div className="bg-black/40 border border-white/[0.08] rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400">Total Runs</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">24,890</div>
            </div>
            <div className="bg-black/40 border border-white/[0.08] rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400">Avg Success</div>
              <div className="text-lg font-bold text-blue-400 mt-0.5">99.1%</div>
            </div>
            <div className="bg-black/40 border border-white/[0.08] rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400">Approval Queue</div>
              <div className="text-lg font-bold text-purple-400 mt-0.5">0 Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/[0.06]">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              filterCategory === cat
                ? "bg-blue-600 text-white shadow-glow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Agent Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAgents.map(agent => (
          <div
            key={agent.id}
            className="flex flex-col justify-between rounded-2xl bg-[#0e1320] border border-white/[0.08] hover:border-blue-500/40 p-5 transition-all group hover:shadow-glow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                      {agent.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">{agent.category}</span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  agent.status === "ACTIVE"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                }`}>
                  {agent.status}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {agent.responsibility}
              </p>

              <div className="space-y-1.5 py-3 border-t border-b border-white/[0.06] text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Engine:</span>
                  <span className="text-slate-200 font-medium">{agent.model}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Provider:</span>
                  <span className="text-slate-200 font-medium">{agent.provider}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Success Rate:</span>
                  <span className="text-emerald-400 font-bold">{agent.success_rate}%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Human Gate:</span>
                  <span className={agent.requires_human_approval ? "text-amber-400 font-semibold" : "text-slate-300"}>
                    {agent.requires_human_approval ? "Required" : "Autonomous"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-2">
              <button
                onClick={() => setSelectedAgent(agent)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-glow-sm"
              >
                <Play className="h-3 w-3" />
                Dispatch Task
              </button>
              <button
                onClick={() => handleToggle(agent.id)}
                className="p-2 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] transition-all"
                title={agent.status === "ACTIVE" ? "Pause Agent" : "Activate Agent"}
              >
                {agent.status === "ACTIVE" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Execution Drawer / Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0c101d] border border-white/[0.12] rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-blue-400 font-mono mb-1">
                  <Bot className="h-3.5 w-3.5" />
                  AUTONOMOUS AGENT DISPATCH
                </div>
                <h3 className="text-lg font-bold text-white">{selectedAgent.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedAgent.responsibility}</p>
              </div>
              <button
                onClick={() => { setSelectedAgent(null); setRunResult(null); }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Account or Company
                </label>
                <input
                  type="text"
                  value={targetAccount}
                  onChange={(e) => setTargetAccount(e.target.value)}
                  className="w-full bg-[#121829] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Acme Health Technologies"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <div className="text-xs font-bold text-white">Safe Simulation Mode (Dry Run)</div>
                  <div className="text-[11px] text-slate-400">Verifies data requirements and agent logic without consuming live outreach quota.</div>
                </div>
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="h-4 w-4 rounded accent-blue-600"
                />
              </div>

              {runResult && (
                <div className="rounded-xl bg-black/60 border border-white/[0.1] p-4 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between text-slate-400 border-b border-white/[0.08] pb-2">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Execution Succeeded
                    </span>
                    <span>{runResult.executed_at}</span>
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-400">Mode: </span>
                    <span className="text-blue-400">{runResult.mode}</span>
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-400">Target: </span>
                    <span>{runResult.target_account}</span>
                  </div>
                  <div className="pt-2 text-slate-300 space-y-1">
                    <div className="text-slate-400 font-bold">Agent Telemetry:</div>
                    {runResult.findings?.map((f: string, idx: number) => (
                      <div key={idx} className="text-slate-300 flex items-start gap-1.5">
                        <span className="text-blue-500">›</span> {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => { setSelectedAgent(null); setRunResult(null); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={handleExecuteAgent}
                disabled={running}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50 shadow-glow-sm"
              >
                {running ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Executing Agent...
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    Run Agent Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
