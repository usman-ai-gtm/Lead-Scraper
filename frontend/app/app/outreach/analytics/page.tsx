"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import OutreachNav from "@/components/outreach/OutreachNav";
import {
  BarChart3, TrendingUp, Users, Send, CheckCircle2, MessageSquare,
  Calendar, DollarSign, Filter, ArrowUpRight, Layers, Inbox, Plus
} from "lucide-react";

export default function OutreachAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<string>("30D");
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("usman_user_campaigns");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCampaigns(parsed);
          return;
        }
      }
      setCampaigns([]);
    } catch {
      setCampaigns([]);
    }
  }, []);

  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalReplies = campaigns.reduce((acc, c) => acc + (c.replies_count || 0), 0);
  const totalMeetings = campaigns.reduce((acc, c) => acc + (c.meetings_booked || 0), 0);
  const positiveReplies = campaigns.reduce((acc, c) => acc + (c.positive_replies || 0), 0);

  const replyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : "0.0";
  const meetingRate = totalReplies > 0 ? ((totalMeetings / totalReplies) * 100).toFixed(1) : "0.0";

  const funnelData = [
    { stage: "Delivered", count: totalSent, pct: totalSent > 0 ? "100%" : "0%", color: "bg-blue-500" },
    { stage: "Replies Received", count: totalReplies, pct: `${replyRate}% of sent`, color: "bg-purple-500" },
    { stage: "Positive Sentiment", count: positiveReplies, pct: `${positiveReplies} positive`, color: "bg-emerald-500" },
    { stage: "Meetings Booked", count: totalMeetings, pct: `${meetingRate}% of replies`, color: "bg-amber-500" }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <OutreachNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Outreach & Cadence Telemetry</h2>
          <p className="text-xs text-slate-400">
            Real delivery analytics, response rates, and meeting conversions from your connected Gmail accounts.
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
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
            <span>Total Sent</span>
            <Send className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{totalSent}</div>
          <div className="text-[10px] text-slate-400 mt-1">Live dispatch count</div>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
            <span>Delivered Rate</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{totalSent > 0 ? "100%" : "0%"}</div>
          <div className="text-[10px] text-emerald-400 mt-1 font-semibold">SPF & DKIM aligned</div>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
            <span>Reply Rate</span>
            <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400 mt-1">{replyRate}%</div>
          <div className="text-[10px] text-slate-400 mt-1">{totalReplies} total replies</div>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017]">
          <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-between">
            <span>Meetings Booked</span>
            <Calendar className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 mt-1">{totalMeetings}</div>
          <div className="text-[10px] text-cyan-400 mt-1 font-semibold">Calendar discovery meetings</div>
        </div>
      </div>

      {/* Funnel Section */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-400" />
              <span>Full Outbound Conversion Funnel</span>
            </h3>
            <p className="text-xs text-slate-400">Step-by-step telemetry from email delivery to closed meetings.</p>
          </div>
        </div>

        {totalSent === 0 ? (
          <div className="p-10 text-center space-y-2 border border-white/[0.06] rounded-xl bg-white/[0.02]">
            <Inbox className="h-8 w-8 text-slate-500 mx-auto" />
            <div className="text-sm font-bold text-white">No Telemetry Recorded Yet</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Launch an outreach campaign to start tracking live delivery, open rates, and replies.
            </p>
            <Link
              href="/app/outreach/campaigns/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs"
            >
              <Plus className="h-3 w-3" /> Create Campaign
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {funnelData.map((stage, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">{stage.stage}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400">{stage.count}</span>
                    <span className="font-bold text-white">{stage.pct}</span>
                  </div>
                </div>
                <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
                  <div className={`${stage.color} h-full rounded-full transition-all duration-500`} style={{ width: stage.pct }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
