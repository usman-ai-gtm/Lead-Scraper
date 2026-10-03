"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Campaign } from "@/lib/types";
import {
  Mail, Send, Plus, Pause, Play, CheckCircle2, AlertCircle,
  MessageSquare, Users, Sparkles, Clock, RefreshCw, BarChart2
} from "lucide-react";

export default function OutreachPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // New Campaign Modal
  const [builderOpen, setBuilderOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [channel, setChannel] = useState("email");
  const [dailyLimit, setDailyLimit] = useState(50);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [day1Subject, setDay1Subject] = useState("Scaling {{company}}'s Revenue Operations");
  const [day1Body, setDay1Body] = useState("Hi {{first_name}},\n\nI noticed {{company}}'s growth in {{industry}}. We built USMAN AI GTM to automate verified account discovery and personalized cadences.\n\nWould you be open to a 10-minute briefing this week?\n\nBest,\nUsman Team");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const data = await api.get<Campaign[]>("/campaigns");
      setCampaigns(data || []);
    } catch (e) {
      console.warn("Failed to fetch campaigns", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === "Active" ? "Paused" : "Active";
    try {
      await api.put(`/campaigns/${id}/status`, { status: nextStatus });
      fetchCampaigns();
    } catch {}
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/campaigns", {
        name: campaignName,
        channel,
        daily_limit: dailyLimit,
        approval_required: approvalRequired,
        sequence_steps: [
          { day: 1, subject: day1Subject, body: day1Body },
          { day: 3, subject: `Re: ${day1Subject}`, body: "Hi {{first_name}},\n\nQuick bump on this. Have you had a chance to review?" }
        ]
      });
      setBuilderOpen(false);
      setCampaignName("");
      fetchCampaigns();
    } catch (err) {
      console.warn("Campaign creation error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Outreach & Cadence Campaigns</h1>
          <p className="text-xs text-slate-400">
            Multi-step outbound sequences across verified Google Gmail accounts and Meta WhatsApp Cloud API.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/app/accounts"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all"
          >
            <Mail className="h-3.5 w-3.5 text-blue-400" />
            <span>Connected Accounts</span>
          </Link>

          <button
            onClick={() => setBuilderOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-glow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* CAMPAIGNS LIST */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-400" />
            Loading active cadences...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-12 text-center text-slate-400">
            No outbound campaigns found. Click "Create Campaign" to build your first cadence.
          </div>
        ) : (
          campaigns.map((camp) => {
            const openRate = camp.sent_count > 0 ? ((camp.opened_count / camp.sent_count) * 100).toFixed(1) : "0.0";
            const replyRate = camp.sent_count > 0 ? ((camp.replied_count / camp.sent_count) * 100).toFixed(1) : "0.0";

            return (
              <div
                key={camp.id}
                className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-blue-500/30 transition-all"
              >
                <div className="space-y-1.5 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{camp.name}</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        camp.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : camp.status === "Paused"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-white/5 text-slate-400 border-white/10"
                      }`}
                    >
                      {camp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Cadence: Day 1, Day 3 • Multi-Account Sender Pool • Smart Pause Active
                  </p>
                </div>

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-4 gap-3 text-center w-full md:w-auto">
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-slate-400">Sent</div>
                    <div className="text-sm font-bold text-white">{camp.sent_count}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-slate-400">Opened</div>
                    <div className="text-sm font-bold text-blue-400">{openRate}%</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-slate-400">Replies</div>
                    <div className="text-sm font-bold text-emerald-400">{replyRate}%</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="text-[10px] text-slate-400">Bounces</div>
                    <div className="text-sm font-bold text-slate-300">0.0%</div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => handleToggleStatus(camp.id, camp.status)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      camp.status === "Active"
                        ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                    }`}
                  >
                    {camp.status === "Active" ? (
                      <>
                        <Pause className="h-3.5 w-3.5" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        <span>Resume</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE CAMPAIGN BUILDER MODAL */}
      {builderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-2xl border border-white/20 bg-[#0c121e] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-400" /> Multi-Step Cadence Builder
              </h2>
              <button onClick={() => setBuilderOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Campaign Title</label>
                  <input
                    type="text"
                    required
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Q4 Enterprise AI Outreach"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0c1017] px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="email">Cold Email (Gmail / SMTP)</option>
                    <option value="whatsapp">Meta WhatsApp Business API</option>
                    <option value="omnichannel">Omnichannel (Email + WhatsApp)</option>
                  </select>
                </div>
              </div>

              {/* Personalization Variables Toolbar */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Insert Dynamic Personalization Tokens</label>
                <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                  {["{{first_name}}", "{{company}}", "{{industry}}", "{{website}}", "{{custom_ai_pitch}}"].map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => setDay1Body((prev) => `${prev} ${token}`)}
                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-blue-400 border border-white/5"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 1: Subject & Message */}
              <div className="space-y-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="text-blue-400">Step 1</span> • Immediate Delivery (Day 1)
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Subject Line</label>
                  <input
                    type="text"
                    required
                    value={day1Subject}
                    onChange={(e) => setDay1Subject(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Email Body Content</label>
                  <textarea
                    rows={5}
                    required
                    value={day1Body}
                    onChange={(e) => setDay1Body(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Daily Send Volume</label>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="approval"
                    checked={approvalRequired}
                    onChange={(e) => setApprovalRequired(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0"
                  />
                  <label htmlFor="approval" className="text-xs text-slate-300">
                    Require approval before sending Day 1
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBuilderOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-glow-sm"
                >
                  {isSubmitting ? "Launching..." : "Save & Launch Cadence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
