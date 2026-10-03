"use client";

import React, { useState } from "react";
import {
  GitMerge, Play, Plus, CheckCircle2, AlertTriangle, ShieldCheck,
  Sparkles, Layers, Sliders, Save, RefreshCw, Trash2, ArrowRight,
  Clock, Database, Mail, MessageSquare, Bot, UserCheck
} from "lucide-react";

interface WorkflowNode {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: any;
  status: "idle" | "running" | "completed" | "paused";
  config: Record<string, any>;
}

export default function WorkflowsPage() {
  const [workflowName, setWorkflowName] = useState("Enterprise Account Autonomous GTM Sequence");
  const [version, setVersion] = useState("v2.1 (Active)");
  const [simulating, setSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);

  const [nodes, setNodes] = useState<WorkflowNode[]>([
    {
      id: "node-1",
      type: "DISCOVERY",
      title: "1. Account Discovery Filter",
      description: "Query accounts in SaaS / Logistics with >$25M ARR",
      icon: Database,
      status: "idle",
      config: { query: "SaaS >$25M ARR", location: "Global" }
    },
    {
      id: "node-2",
      type: "ENRICHMENT",
      title: "2. Deep Intelligence & Tech Stack",
      description: "Extract CRM, cloud provider, and decision maker contacts",
      icon: Sparkles,
      status: "idle",
      config: { providers: ["Serper", "Perplexity"], depth: "Deep" }
    },
    {
      id: "node-3",
      type: "INTENT",
      title: "3. Buying Intent Scoring",
      description: "Evaluate intent signals (hiring, expansion, tech adoption)",
      icon: Layers,
      status: "idle",
      config: { min_intent_score: 75 }
    },
    {
      id: "node-4",
      type: "DECISION",
      title: "4. Conditional Decision Gate",
      description: "Route: Score >= 80 -> Executive Outreach, Else -> Nurture",
      icon: GitMerge,
      status: "idle",
      config: { threshold: 80, branch_true: "Executive", branch_false: "Nurture" }
    },
    {
      id: "node-5",
      type: "APPROVAL",
      title: "5. Human-in-the-Loop Approval Gate",
      description: "Require manager approval before cold email dispatch",
      icon: UserCheck,
      status: "idle",
      config: { approver: "admin@usmanai.com", timeout_hours: 24 }
    },
    {
      id: "node-6",
      type: "OUTREACH",
      title: "6. Omnichannel Dispatch",
      description: "Send personalized Day 1 sequence via Gmail OAuth / WhatsApp Cloud",
      icon: Mail,
      status: "idle",
      config: { channels: ["Email", "WhatsApp"], daily_limit: 50 }
    },
    {
      id: "node-7",
      type: "CRM",
      title: "7. CRM Deal & Stage Sync",
      description: "Create deal in Kanban stage 'CONTACTED' and log activity",
      icon: Database,
      status: "idle",
      config: { stage: "CONTACTED", pipeline: "Enterprise" }
    }
  ]);

  const runSimulation = () => {
    setSimulating(true);
    setSimulationLog([]);
    const logs: string[] = [];

    nodes.forEach((node, idx) => {
      setTimeout(() => {
        setNodes((prev) =>
          prev.map((n, i) => (i === idx ? { ...n, status: "completed" } : n))
        );
        logs.push(`[${new Date().toLocaleTimeString()}] Completed Step: ${node.title}`);
        setSimulationLog([...logs]);

        if (idx === nodes.length - 1) {
          setSimulating(false);
          logs.push(`[${new Date().toLocaleTimeString()}] ✅ Workflow simulation completed with 0 errors.`);
          setSimulationLog([...logs]);
        }
      }, (idx + 1) * 600);
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
            <GitMerge className="h-3.5 w-3.5" /> Autonomous Workflow Studio (Feature #141–150)
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-blue-500 focus:outline-none"
            />
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {version}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={runSimulation}
            disabled={simulating}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-glow-sm transition-all flex items-center gap-2"
          >
            {simulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />}
            {simulating ? "Simulating Pipeline..." : "Run Test Simulation"}
          </button>
          <button
            onClick={() => alert("Workflow saved and deployed to autonomous execution queue.")}
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-bold text-xs transition-all flex items-center gap-2"
          >
            <Save className="h-4 w-4" /> Save Sequence
          </button>
        </div>
      </div>

      {/* Visual Workflow Canvas */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-8 shadow-glow-sm relative overflow-hidden">
        <div className="flex items-center justify-between pb-6 border-b border-white/[0.06] mb-8">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Visual Orchestration Sequence</h3>
            <p className="text-xs text-slate-400">7 interconnected autonomous nodes with Human-in-the-Loop checkpoint</p>
          </div>
          <button
            onClick={() => alert("Custom node builder initialized.")}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-slate-300 font-semibold flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Node
          </button>
        </div>

        {/* Nodes Flow */}
        <div className="space-y-4 max-w-3xl mx-auto">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            return (
              <div key={node.id} className="relative">
                {/* Connecting Line */}
                {index < nodes.length - 1 && (
                  <div className="absolute left-6 top-14 w-0.5 h-8 bg-gradient-to-b from-blue-500 to-indigo-500/30 z-0" />
                )}

                <div className={`relative z-10 p-5 rounded-2xl border transition-all flex items-start gap-4 ${
                  node.status === "completed"
                    ? "border-emerald-500/40 bg-emerald-500/[0.03]"
                    : "border-white/[0.08] bg-[#07090e] hover:border-white/20"
                }`}>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    node.status === "completed"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white tracking-tight">{node.title}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-400">
                        {node.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{node.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulation Telemetry Console */}
      {simulationLog.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 shadow-glow-sm">
          <div className="flex items-center gap-2 pb-4 border-b border-white/[0.06] mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Clock className="h-4 w-4 text-blue-400" /> Simulation Execution Log
          </div>
          <div className="rounded-xl border border-white/[0.04] bg-[#07090e] p-4 font-mono text-xs text-slate-300 space-y-1">
            {simulationLog.map((log, i) => (
              <div key={i} className="leading-relaxed">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
