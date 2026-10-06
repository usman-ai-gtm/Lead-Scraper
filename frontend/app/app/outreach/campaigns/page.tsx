"use client";

import React, { useState } from "react";
import Link from "next/link";
import OutreachNav from "@/components/outreach/OutreachNav";
import {
  Send, PlusCircle, Search, Filter, Play, Pause, Copy,
  CheckCircle2, Clock, AlertCircle, ArrowUpRight, BarChart2,
  Trash2, Mail, Users
} from "lucide-react";

interface CampaignItem {
  id: string;
  name: string;
  sender_email: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "SCHEDULED";
  audience_count: number;
  sent_count: number;
  replies_count: number;
  positive_replies: number;
  meetings_booked: number;
  created_at: string;
  channel: "GMAIL" | "OMNICHANNEL";
}

const INITIAL_CAMPAIGNS: CampaignItem[] = [
  {
    id: "camp-001",
    name: "Q4 SaaS Enterprise VPs of Sales - High Intent",
    sender_email: "usman.personal@gmail.com",
    status: "ACTIVE",
    audience_count: 250,
    sent_count: 142,
    replies_count: 28,
    positive_replies: 19,
    meetings_booked: 6,
    created_at: "2026-10-02",
    channel: "GMAIL"
  },
  {
    id: "camp-002",
    name: "Lahore Tech Founders - AI Copilot Expansion",
    sender_email: "sales@company.com",
    status: "ACTIVE",
    audience_count: 180,
    sent_count: 110,
    replies_count: 22,
    positive_replies: 14,
    meetings_booked: 4,
    created_at: "2026-10-04",
    channel: "GMAIL"
  },
  {
    id: "camp-003",
    name: "B2B Dentists & Healthcare Execs Pilot",
    sender_email: "outreach@company.com",
    status: "PAUSED",
    audience_count: 95,
    sent_count: 40,
    replies_count: 5,
    positive_replies: 3,
    meetings_booked: 1,
    created_at: "2026-09-28",
    channel: "GMAIL"
  },
  {
    id: "camp-004",
    name: "Global FinTech Series A - Buying Committee Cadence",
    sender_email: "usman.personal@gmail.com",
    status: "SCHEDULED",
    audience_count: 320,
    sent_count: 0,
    replies_count: 0,
    positive_replies: 0,
    meetings_booked: 0,
    created_at: "2026-10-06",
    channel: "GMAIL"
  }
];

export default function OutreachCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(INITIAL_CAMPAIGNS);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [cloningId, setCloningId] = useState<string | null>(null);

  const handleToggleStatus = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextStatus = c.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  const handleCloneCampaign = (camp: CampaignItem) => {
    setCloningId(camp.id);
    setTimeout(() => {
      const cloned: CampaignItem = {
        ...camp,
        id: `camp-clone-${Date.now().toString().slice(-4)}`,
        name: `${camp.name} (Copy)`,
        status: "PAUSED",
        sent_count: 0,
        replies_count: 0,
        positive_replies: 0,
        meetings_booked: 0,
        created_at: new Date().toISOString().split("T")[0]
      };
      setCampaigns((prev) => [cloned, ...prev]);
      setCloningId(null);
    }, 600);
  };

  const filtered = campaigns.filter((c) => {
    const matchFilter = filter === "ALL" || c.status === filter;
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.sender_email.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <OutreachNav />

      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Email Campaigns</h2>
          <p className="text-xs text-slate-400">
            Multi-step personalized cold outreach sequences dispatched via authorized Gmail accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/app/outreach/campaigns/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-glow-sm"
          >
            <PlusCircle className="h-4 w-4" /> New Campaign (11-Step Wizard)
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-white/[0.08] bg-[#0c1017]">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {["ALL", "ACTIVE", "PAUSED", "SCHEDULED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === s
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/[0.03] text-slate-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns or sender..."
            className="w-full bg-[#121824] border border-white/[0.08] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="space-y-3">
        {filtered.map((c) => {
          const replyRate = c.sent_count > 0 ? ((c.replies_count / c.sent_count) * 100).toFixed(1) : "0.0";
          const positiveRate = c.replies_count > 0 ? ((c.positive_replies / c.replies_count) * 100).toFixed(0) : "0";

          return (
            <div
              key={c.id}
              className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-white/[0.15] transition-all shadow-glow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : c.status === "PAUSED"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {c.status}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-slate-500" /> {c.sender_email}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">ID: {c.id}</span>
                  </div>
                  <h3 className="text-base font-bold text-white hover:text-blue-400 transition-colors">
                    {c.name}
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-4">
                    <span>Target Audience: <strong className="text-white">{c.audience_count} Leads</strong></span>
                    <span>Created: {c.created_at}</span>
                  </div>
                </div>

                {/* Telemetry Numbers */}
                <div className="flex items-center gap-6 py-2 px-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Sent</div>
                    <div className="text-base font-bold text-white">{c.sent_count} / {c.audience_count}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Reply Rate</div>
                    <div className="text-base font-bold text-blue-400">{replyRate}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Positive</div>
                    <div className="text-base font-bold text-emerald-400">{c.positive_replies} ({positiveRate}%)</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Meetings</div>
                    <div className="text-base font-bold text-purple-400">{c.meetings_booked}</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(c.id)}
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5 border border-white/[0.06]"
                    title={c.status === "ACTIVE" ? "Pause Campaign" : "Resume Campaign"}
                  >
                    {c.status === "ACTIVE" ? <Pause className="h-3.5 w-3.5 text-amber-400" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
                    <span className="hidden sm:inline">{c.status === "ACTIVE" ? "Pause" : "Resume"}</span>
                  </button>

                  <button
                    onClick={() => handleCloneCampaign(c)}
                    disabled={cloningId === c.id}
                    className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5 border border-white/[0.06]"
                    title="Duplicate Campaign"
                  >
                    <Copy className="h-3.5 w-3.5 text-blue-400" />
                    <span className="hidden sm:inline">{cloningId === c.id ? "Cloning..." : "Clone"}</span>
                  </button>

                  <Link
                    href={`/app/outreach/analytics?campaign=${c.id}`}
                    className="p-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 transition-all text-xs flex items-center gap-1.5 border border-blue-500/20"
                    title="View Analytics"
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Analytics</span>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 rounded-2xl border border-white/[0.06] bg-[#0c1017]">
            <p className="text-slate-400 text-sm">No campaigns match your filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
