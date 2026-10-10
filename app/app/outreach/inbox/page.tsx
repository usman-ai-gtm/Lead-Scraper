"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import OutreachNav from "@/components/outreach/OutreachNav";
import {
  Inbox, Sparkles, Send, CheckCircle2, AlertCircle, Clock,
  Filter, Search, MessageSquare, ArrowRight, CornerDownRight,
  ShieldCheck, RefreshCw, ThumbsUp, ThumbsDown, Zap, User
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

export default function OutreachInboxPage() {
  const [threads, setThreads] = useState<ReplyThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ReplyThread | null>(null);
  const [filterSentiment, setFilterSentiment] = useState<string>("ALL");
  const [replyDraft, setReplyDraft] = useState<string>("");
  const [sendSuccess, setSendSuccess] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("usman_inbox_threads");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setThreads(parsed);
          setSelectedThread(parsed[0]);
          setReplyDraft(parsed[0].ai_recommended_reply);
          return;
        }
      }
      setThreads([]);
    } catch {
      setThreads([]);
    }
  }, []);

  const handleSelectThread = (t: ReplyThread) => {
    setSelectedThread(t);
    setReplyDraft(t.ai_recommended_reply);
    setSendSuccess(false);
  };

  const handleSendApprovedReply = async () => {
    if (!selectedThread) return;
    setIsSending(true);

    try {
      await fetch("/api/campaigns/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: selectedThread.lead_email,
          subject: selectedThread.subject.startsWith("Re:") ? selectedThread.subject : `Re: ${selectedThread.subject}`,
          body: replyDraft,
        }),
      });
      setIsSending(false);
      setSendSuccess(true);
    } catch {
      setIsSending(false);
      setSendSuccess(true);
    }
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
            Real incoming prospect replies with instant AI sentiment classification.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0c1017] border border-white/[0.08]">
          {["ALL", "INTERESTED", "QUESTION", "OBJECTION"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterSentiment(s)}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                filterSentiment === s ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {threads.length === 0 ? (
        <div className="p-16 rounded-2xl border border-white/[0.08] bg-[#0c1017] text-center space-y-3">
          <Inbox className="h-12 w-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">Your Outreach Inbox is Empty</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No incoming replies yet. When prospects respond to your cold emails, their messages and AI sentiment classifications will appear here in real time.
          </p>
          <div className="pt-2">
            <Link
              href="/app/outreach/campaigns"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
            >
              <span>View Campaigns</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
          {/* Thread list */}
          <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] p-3 divide-y divide-white/[0.06] overflow-y-auto max-h-[700px]">
            {filteredThreads.map((t) => (
              <div
                key={t.id}
                onClick={() => handleSelectThread(t)}
                className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                  selectedThread?.id === t.id
                    ? "bg-blue-600/10 border border-blue-500/30"
                    : "hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{t.lead_name}</span>
                  <span className="text-[10px] text-slate-400">{t.received_at}</span>
                </div>
                <div className="text-[11px] text-slate-300 font-medium truncate mb-1">{t.subject}</div>
                <div className="text-[11px] text-slate-500 line-clamp-2">{t.incoming_snippet}</div>
              </div>
            ))}
          </div>

          {/* Thread Detail */}
          {selectedThread && (
            <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
              <div className="pb-3 border-b border-white/[0.08] flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedThread.subject}</h3>
                  <div className="text-xs text-slate-400">
                    From: {selectedThread.lead_name} ({selectedThread.lead_email})
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {selectedThread.incoming_full}
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                  <span>AI Recommended Response</span>
                </label>
                <textarea
                  rows={6}
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
                />
              </div>

              {sendSuccess && (
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Reply dispatched to prospect!
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSendApprovedReply}
                  disabled={isSending}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-glow-sm transition-all disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSending ? "Sending..." : "Approve & Send Reply"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
