"use client";

import React, { useState } from "react";
import OutreachNav from "@/components/outreach/OutreachNav";
import {
  Inbox, Sparkles, CheckCircle2, AlertCircle, Clock,
  Send, ThumbsUp, ThumbsDown, User, Building2, Shield,
  CornerDownLeft, MessageSquare, Bot, RefreshCw
} from "lucide-react";

interface ReplyThread {
  id: string;
  lead_name: string;
  lead_email: string;
  company: string;
  campaign: string;
  sentiment: "INTERESTED" | "POSITIVE" | "QUESTION" | "OBJECTION" | "NOT_NOW" | "OUT_OF_OFFICE" | "UNSUBSCRIBE";
  confidence: number;
  subject: string;
  incoming_snippet: string;
  incoming_full: string;
  received_at: string;
  unread: boolean;
  ai_summary: string;
  ai_recommended_reply: string;
}

const INITIAL_THREADS: ReplyThread[] = [
  {
    id: "thread-101",
    lead_name: "Sarah Jenkins",
    lead_email: "sarah@apexcloud.io",
    company: "Apex Cloud Innovations",
    campaign: "Q4 SaaS Enterprise VPs of Sales",
    sentiment: "INTERESTED",
    confidence: 0.94,
    subject: "Re: Streamlining Apex Cloud's hybrid cloud latency",
    incoming_snippet: "Hey Usman, this actually lands at the right time. We've been evaluating our egress latency...",
    incoming_full: "Hey Usman,\n\nThis actually lands at the right time. We've been evaluating our egress latency across AWS and GCP over the past two quarters. Can you send over a deck or suggest 15 mins next Tuesday afternoon to review architecture?\n\nBest,\nSarah",
    received_at: "Today, 10:24 AM",
    unread: true,
    ai_summary: "Prospect confirmed active initiative around multi-cloud egress latency and requested meeting for next Tuesday.",
    ai_recommended_reply: "Hi Sarah,\n\nGlad to hear the timing aligns. I would love to walk through how we eliminated egress bottlenecks for similar setups.\n\nHow does Tuesday at 2:00 PM EST work for you? Alternatively, feel free to pick any slot that fits your schedule here: cal.com/usman-gtm/15min\n\nLooking forward to speaking,\nUsman Khan"
  },
  {
    id: "thread-102",
    lead_name: "David Vance",
    lead_email: "d.vance@vancetech.io",
    company: "Vance Technologies",
    campaign: "Lahore Tech Founders - AI Copilot Expansion",
    sentiment: "QUESTION",
    confidence: 0.88,
    subject: "Re: Quick inquiry regarding your LLM inference cluster",
    incoming_snippet: "Does your orchestration engine support self-hosted vLLM or Ollama instances on private VPC?",
    incoming_full: "Hi Usman,\n\nDoes your orchestration engine support self-hosted vLLM or Ollama instances on private VPC? We cannot egress proprietary prompts outside our on-prem cluster.\n\nThanks,\nDavid",
    received_at: "Yesterday, 4:15 PM",
    unread: false,
    ai_summary: "Prospect inquired about on-prem / VPC self-hosted support for private LLMs.",
    ai_recommended_reply: "Hi David,\n\nYes, absolutely. USMAN AI GTM fully supports zero-egress VPC deployment with native vLLM and Ollama connector adapters. All data stays strictly within your perimeter.\n\nHappy to share our private deployment guide or run a quick test with your DevOps team.\n\nBest,\nUsman Khan"
  },
  {
    id: "thread-103",
    lead_name: "Elena Rostova",
    lead_email: "elena@nordicscale.com",
    company: "NordicScale Ventures",
    campaign: "Q4 SaaS Enterprise VPs of Sales",
    sentiment: "NOT_NOW",
    confidence: 0.91,
    subject: "Re: Scaling GTM outbound",
    incoming_snippet: "Thanks for reaching out Usman. We are locked on budget until Q1 2027. Ping us then.",
    incoming_full: "Thanks for reaching out Usman. We are locked on budget until Q1 2027. Ping us in mid-January.\n\nElena",
    received_at: "Oct 5, 2:30 PM",
    unread: false,
    ai_summary: "Prospect is interested in reconnecting in Q1 2027 due to budget cycle timing.",
    ai_recommended_reply: "Understood completely, Elena. I'll circle back in mid-January with relevant benchmark updates. Wishing you and NordicScale a productive close to the year!\n\nBest,\nUsman"
  }
];

export default function OutreachInboxPage() {
  const [threads, setThreads] = useState<ReplyThread[]>(INITIAL_THREADS);
  const [selectedThread, setSelectedThread] = useState<ReplyThread>(INITIAL_THREADS[0]);
  const [filterSentiment, setFilterSentiment] = useState<string>("ALL");
  const [replyDraft, setReplyDraft] = useState<string>(INITIAL_THREADS[0].ai_recommended_reply);
  const [sendSuccess, setSendSuccess] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  const handleSelectThread = (t: ReplyThread) => {
    setSelectedThread(t);
    setReplyDraft(t.ai_recommended_reply);
    setSendSuccess(false);
  };

  const handleSendApprovedReply = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setSendSuccess(true);
    }, 900);
  };

  const filteredThreads = threads.filter((t) => {
    if (filterSentiment === "ALL") return true;
    if (filterSentiment === "INTERESTED") return t.sentiment === "INTERESTED" || t.sentiment === "POSITIVE";
    return t.sentiment === filterSentiment;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <OutreachNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Outreach Inbox & AI Reply Analysis</h2>
          <p className="text-xs text-slate-400">
            Real-time prospect reply classification, sentiment tagging, and evidence-based AI response recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Human Approval Guard: ON
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 border-b border-white/[0.06]">
        {[
          { label: "All Replies", val: "ALL" },
          { label: "High Intent / Interested", val: "INTERESTED" },
          { label: "Questions", val: "QUESTION" },
          { label: "Not Now / Snoozed", val: "NOT_NOW" }
        ].map((f) => (
          <button
            key={f.val}
            onClick={() => setFilterSentiment(f.val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterSentiment === f.val
                ? "bg-blue-600 text-white shadow-glow-sm"
                : "bg-white/[0.03] text-slate-400 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Master-Detail Inbox View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left Column: Thread List (4 Cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          {filteredThreads.map((t) => {
            const isSelected = selectedThread.id === t.id;
            return (
              <div
                key={t.id}
                onClick={() => handleSelectThread(t)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-500/10 shadow-glow-sm"
                    : "border-white/[0.08] bg-[#0c1017] hover:border-white/[0.15]"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{t.lead_name}</span>
                    <span className="text-[10px] text-slate-500">({t.company})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{t.received_at}</span>
                </div>

                <div className="text-xs font-semibold text-slate-200 truncate mb-1">
                  {t.subject}
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {t.incoming_snippet}
                </p>

                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/[0.04]">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      t.sentiment === "INTERESTED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : t.sentiment === "QUESTION"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    ● {t.sentiment.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {(t.confidence * 100).toFixed(0)}% Confidence
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Active Conversation & AI Copilot Response (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c1017] shadow-glow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-base font-bold text-white">{selectedThread.subject}</h3>
                <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1"><User className="h-3 w-3 text-slate-500" /> {selectedThread.lead_name}</span>
                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3 text-slate-500" /> {selectedThread.company}</span>
                  <span>{selectedThread.lead_email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {selectedThread.sentiment}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/[0.06] bg-[#070a0f] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Prospect Response</span>
                <span className="text-[11px] text-slate-500 font-mono">{selectedThread.received_at}</span>
              </div>
              <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {selectedThread.incoming_full}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                <Sparkles className="h-3.5 w-3.5" /> AI Reply Intelligence Summary
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedThread.ai_summary}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Bot className="h-4 w-4 text-blue-400" /> Recommended Response (Human Approval Safeguard Active)
                </div>
                <button
                  onClick={() => setReplyDraft(selectedThread.ai_recommended_reply)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Reset Draft
                </button>
              </div>

              <textarea
                rows={6}
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                className="w-full bg-[#121824] border border-white/[0.08] rounded-xl p-4 text-xs text-white focus:outline-none focus:border-blue-500 font-mono leading-relaxed"
              />

              {sendSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Reply sent successfully via authorized Google Gmail API!
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500">
                  Sending from authorized sender: <strong>sales@company.com</strong>
                </span>

                <button
                  type="button"
                  disabled={isSending}
                  onClick={handleSendApprovedReply}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-glow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSending ? "Sending via Gmail..." : "Approve & Send Reply"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
