"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import OutreachNav from "@/components/outreach/OutreachNav";
import {
  Send, PlusCircle, Search, Filter, Play, Pause, Copy,
  CheckCircle2, Clock, AlertCircle, ArrowUpRight, BarChart2,
  Trash2, Mail, Users, Inbox
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

export default function OutreachCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("usman_user_campaigns");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCampaigns(parsed);
          setLoading(false);
          return;
        }
      }
      setCampaigns([]);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleStatus = (id: string) => {
    setCampaigns((prev) => {
      const updated = prev.map((c) => {
        if (c.id === id) {
          const nextStatus = c.status === "ACTIVE" ? ("PAUSED" as const) : ("ACTIVE" as const);
          return { ...c, status: nextStatus };
        }
        return c;
      });
      try {
        localStorage.setItem("usman_user_campaigns", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleDeleteCampaign = (id: string) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      const updated = campaigns.filter((c) => c.id !== id);
      setCampaigns(updated);
      try {
        localStorage.setItem("usman_user_campaigns", JSON.stringify(updated));
      } catch {}
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesFilter = filter === "ALL" || c.status === filter;
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.sender_email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalAudience = campaigns.reduce((acc, c) => acc + (c.audience_count || 0), 0);
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalReplies = campaigns.reduce((acc, c) => acc + (c.replies_count || 0), 0);
  const totalMeetings = campaigns.reduce((acc, c) => acc + (c.meetings_booked || 0), 0);
  const activeCount = campaigns.filter((c) => c.status === "ACTIVE").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <OutreachNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Active Outbound Campaigns</h2>
          <p className="text-xs text-slate-400">
            Real multi-step email cadences dispatched through your verified Gmail and SMTP sending pool.
          </p>
        </div>

        <Link
          href="/app/outreach/campaigns/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-glow-sm self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Campaign</span>
        </Link>
      </div>

      {/* Aggregate Metric Cards (100% computed from real campaigns) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Active Campaigns</div>
          <div className="text-2xl font-extrabold text-white mt-1">{activeCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Audience</div>
          <div className="text-2xl font-extrabold text-white mt-1">{totalAudience}</div>
        </div>
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Emails Delivered</div>
          <div className="text-2xl font-extrabold text-white mt-1">{totalSent}</div>
        </div>
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Replies Received</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">{totalReplies}</div>
        </div>
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0c1017] col-span-2 sm:col-span-1">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Meetings Booked</div>
          <div className="text-2xl font-extrabold text-blue-400 mt-1">{totalMeetings}</div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.08] bg-[#0c1017]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns by name or sender account..."
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1">
          {["ALL", "ACTIVE", "PAUSED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === f ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Table or Honest Zero State */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading campaigns...</div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="p-12 rounded-2xl border border-white/[0.08] bg-[#0c1017] text-center space-y-3">
          <Inbox className="h-10 w-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Campaigns Launched Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {campaigns.length === 0
              ? "Your campaign list is completely clean. Click '+ New Campaign' to draft and launch your first targeted cold outreach sequence."
              : "No campaigns match your current search or filter."}
          </p>
          {campaigns.length === 0 && (
            <Link
              href="/app/outreach/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Your First Campaign</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0c1017]">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] border-b border-white/[0.08] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Campaign Name</th>
                <th className="py-3 px-4">Sender Account</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Audience</th>
                <th className="py-3 px-4 text-right">Sent</th>
                <th className="py-3 px-4 text-right">Replies</th>
                <th className="py-3 px-4 text-right">Meetings</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-slate-300">
              {filteredCampaigns.map((camp) => (
                <tr key={camp.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    <div>{camp.name}</div>
                    <div className="text-[10px] text-slate-500 font-normal">Created: {camp.created_at}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                    {camp.sender_email}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        camp.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {camp.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-white">{camp.audience_count}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-300">{camp.sent_count}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-400">{camp.replies_count}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-blue-400">{camp.meetings_booked}</td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(camp.id)}
                        className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white"
                        title={camp.status === "ACTIVE" ? "Pause Campaign" : "Resume Campaign"}
                      >
                        {camp.status === "ACTIVE" ? <Pause className="h-3.5 w-3.5 text-amber-400" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(camp.id)}
                        className="p-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/10 text-rose-400"
                        title="Delete Campaign"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
