"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Deal } from "@/lib/types";
import {
  Database, Plus, DollarSign, Calendar, TrendingUp, CheckCircle2,
  Building2, Users, ArrowRight, RefreshCw, Layers, ListFilter, Send
} from "lucide-react";

export default function CRMPage() {
  const [pipeline, setPipeline] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"kanban" | "table" | "companies" | "contacts">("kanban");
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  // Create Deal Modal
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [newDealTitle, setNewDealTitle] = useState("");
  const [newDealAmount, setNewDealAmount] = useState(25000);
  const [newDealStage, setNewDealStage] = useState("NEW");
  const [newDealWinP, setNewDealWinP] = useState(50);
  const [isCreating, setIsCreating] = useState(false);

  const fetchPipeline = async () => {
    setLoading(true);
    try {
      const data = await api.get<any>("/crm/pipeline");
      setPipeline(data);
    } catch (err) {
      console.warn("CRM fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompaniesAndContacts = async () => {
    try {
      const comps = await api.get<any[]>("/crm/companies");
      setCompanies(comps || []);
      const cts = await api.get<any[]>("/crm/contacts");
      setContacts(cts || []);
    } catch {}
  };

  useEffect(() => {
    fetchPipeline();
    fetchCompaniesAndContacts();
  }, []);

  const handleStageChange = async (dealId: number, targetStage: string) => {
    try {
      await api.put(`/crm/deals/${dealId}/stage`, { stage: targetStage });
      fetchPipeline();
    } catch (e) {
      console.warn("Failed to update deal stage", e);
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await api.post("/crm/deals", {
        title: newDealTitle,
        amount: Number(newDealAmount),
        stage: newDealStage,
        win_probability: Number(newDealWinP),
      });
      setDealModalOpen(false);
      setNewDealTitle("");
      fetchPipeline();
    } catch (err) {
      console.warn("Failed to create deal", err);
    } finally {
      setIsCreating(false);
    }
  };

  const stages = [
    "NEW",
    "QUALIFIED",
    "CONTACTED",
    "REPLIED",
    "MEETING",
    "PROPOSAL",
    "NEGOTIATION",
    "WON",
    "LOST",
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Enterprise CRM & Pipeline</h1>
          <p className="text-xs text-slate-400">
            ${(pipeline?.pipeline_value || 0).toLocaleString()} Active Pipeline Value across {pipeline?.total_deals || 0} Opportunities
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex rounded-xl bg-white/[0.03] border border-white/10 p-0.5 text-xs">
            <button
              onClick={() => setActiveTab("kanban")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "kanban" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setActiveTab("table")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "table" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Deals Table
            </button>
            <button
              onClick={() => setActiveTab("companies")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "companies" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Companies
            </button>
            <button
              onClick={() => setActiveTab("contacts")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "contacts" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Contacts
            </button>
          </div>

          <button
            onClick={() => setDealModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-glow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create Deal</span>
          </button>
        </div>
      </div>

      {/* VIEW: KANBAN BOARD */}
      {activeTab === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-6 min-h-[550px]">
          {stages.map((stg) => {
            const dealsInStage: Deal[] = pipeline?.kanban?.[stg] || [];
            const stageTotal = dealsInStage.reduce((acc, d) => acc + (d.amount || 0), 0);

            return (
              <div
                key={stg}
                className="w-72 shrink-0 rounded-2xl border border-white/[0.08] bg-[#090d16] flex flex-col justify-between"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{stg}</span>
                    <span className="text-[10px] text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded-full">
                      {dealsInStage.length}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-300 font-semibold">
                    ${(stageTotal / 1000).toFixed(0)}k
                  </span>
                </div>

                {/* Deal Cards Container */}
                <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[500px]">
                  {dealsInStage.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-slate-600 border border-dashed border-white/5 rounded-xl">
                      Empty stage
                    </div>
                  ) : (
                    dealsInStage.map((deal) => (
                      <div
                        key={deal.id}
                        className="rounded-xl border border-white/[0.06] bg-[#0c121e] p-3 shadow-sm hover:border-blue-500/40 transition-all space-y-2"
                      >
                        <div className="font-semibold text-xs text-white leading-tight">
                          {deal.title}
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-blue-400">
                            ${deal.amount?.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-purple-400 font-mono">
                            {deal.win_probability}% Win
                          </span>
                        </div>

                        {/* Stage Selector on Card */}
                        <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-slate-400">
                          <span>Move:</span>
                          <select
                            value={deal.stage}
                            onChange={(e) => handleStageChange(deal.id, e.target.value)}
                            className="bg-transparent text-slate-300 font-semibold text-[10px] focus:outline-none cursor-pointer"
                          >
                            {stages.map((s) => (
                              <option key={s} value={s} className="bg-[#0c1017] text-white">
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: TABLE */}
      {activeTab === "table" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Deal Title</th>
                <th className="py-3.5 px-4">Stage</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Win Prob</th>
                <th className="py-3.5 px-4">Expected Close</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {stages.flatMap((s) => pipeline?.kanban?.[s] || []).map((d: any) => (
                <tr key={d.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-bold text-white">{d.title}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                      {d.stage}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-200">
                    ${d.amount?.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-purple-400 font-mono">{d.win_probability}%</td>
                  <td className="py-3 px-4 text-slate-400 font-mono">{d.expected_close_date || "2026-12-31"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW: COMPANIES */}
      {activeTab === "companies" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4">
          <h3 className="text-sm font-bold text-white mb-3">Enterprise Accounts & Companies</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {companies.map((c) => (
              <div key={c.id} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="font-bold text-white text-sm mb-1">{c.name}</div>
                <div className="text-xs text-slate-400">{c.industry || "Technology"} • {c.country || "Global"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: CONTACTS */}
      {activeTab === "contacts" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-4">
          <h3 className="text-sm font-bold text-white mb-3">Decision Makers & Key Contacts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {contacts.map((ct) => (
              <div key={ct.id} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col justify-between">
                <div>
                  <div className="font-bold text-white text-sm mb-1">{ct.first_name} {ct.last_name || ""}</div>
                  <div className="text-xs text-blue-400 mb-1">{ct.title || "Executive"}</div>
                  <div className="text-[11px] text-slate-400">{ct.email || "No email"}</div>
                </div>
                <div className="pt-3 mt-3 border-t border-white/[0.04]">
                  <Link
                    href={`/app/outreach/campaigns/new?contact_email=${encodeURIComponent(ct.email || "")}&contact_name=${encodeURIComponent(ct.first_name || "")}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Send className="h-3 w-3" /> Add to Campaign
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE DEAL MODAL */}
      {dealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#0c121e] p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Create Enterprise Deal</h2>
            <form onSubmit={handleCreateDeal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Deal Title</label>
                <input
                  type="text"
                  required
                  value={newDealTitle}
                  onChange={(e) => setNewDealTitle(e.target.value)}
                  placeholder="Apex Global - Enterprise Expansion"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contract Amount ($)</label>
                <input
                  type="number"
                  required
                  value={newDealAmount}
                  onChange={(e) => setNewDealAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Stage</label>
                  <select
                    value={newDealStage}
                    onChange={(e) => setNewDealStage(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0c1017] px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {stages.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Win Probability (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newDealWinP}
                    onChange={(e) => setNewDealWinP(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDealModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-glow-sm"
                >
                  {isCreating ? "Saving..." : "Create Deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
