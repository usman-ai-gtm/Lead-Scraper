"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles, Bot, X, Check, Copy, ExternalLink, Send,
  AlertTriangle, ShieldCheck, ArrowRight, Lightbulb, Lock, RefreshCw
} from "lucide-react";

interface LeadResearchData {
  company_name: string;
  website?: string;
  industry?: string;
  location?: string;
  executive_summary: string;
  opportunities: Array<{
    title: string;
    description: string;
    impact: string;
  }>;
  personalized_proposal: {
    subject: string;
    greeting: string;
    body: string;
    call_to_action: string;
    signature: string;
  };
  explainability: {
    target_angle: string;
    pain_point_addressed: string;
    why_this_converts: string;
  };
  generated_by?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead: any | null;
  onPushToOutreach?: (emailData: {
    recipient_email: string;
    subject: string;
    body: string;
    lead_id?: number;
  }) => void;
}

export function AiLeadResearchModal({ isOpen, onClose, lead, onPushToOutreach }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LeadResearchData | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !lead) {
      setData(null);
      setUpgradeRequired(false);
      return;
    }

    const fetchResearch = async () => {
      setLoading(true);
      setUpgradeRequired(false);
      setData(null);

      try {
        const token = localStorage.getItem("usman_gtm_token");
        const wsId = localStorage.getItem("usman_gtm_workspace_id");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (wsId) headers["X-Workspace-Id"] = wsId;

        const leadId = lead.id || 0;
        const res = await fetch(`/api/leads/${leadId}/research`, {
          method: "POST",
          headers,
          body: JSON.stringify(lead),
        });

        if (res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          setUpgradeRequired(true);
          setUpgradeMessage(
            errData.detail ||
              "The AI Lead Research Agent is an exclusive capability of the $100 Lifetime Plan. Upgrade to unlock deep business analysis, growth opportunities, and hyper-personalized proposals."
          );
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to generate research report (${res.status})`);
        }

        const json = await res.json();
        setData(json);
      } catch (err: any) {
        console.error("AI Research error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResearch();
  }, [isOpen, lead]);

  if (!isOpen) return null;

  const copyEmail = () => {
    if (!data?.personalized_proposal) return;
    const p = data.personalized_proposal;
    const text = `Subject: ${p.subject}\n\n${p.greeting}\n\n${p.body}\n\n${p.call_to_action}\n\n${p.signature}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePush = () => {
    if (!data?.personalized_proposal || !onPushToOutreach || !lead) return;
    const p = data.personalized_proposal;
    const fullBody = `${p.greeting}\n\n${p.body}\n\n${p.call_to_action}\n\n${p.signature}`;
    onPushToOutreach({
      recipient_email: lead.email || "",
      subject: p.subject,
      body: fullBody,
      lead_id: lead.id,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#0c1017] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#111726] to-[#0c1017] border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-black font-bold shadow-glow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">AI Lead Research Agent</h3>
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded">
                  Pro Research
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Company: <strong className="text-white">{lead?.company_name || lead?.business_name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="h-7 w-7 animate-spin mx-auto text-amber-400" />
              <p className="text-sm font-semibold text-white">Analyzing Company Intelligence...</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Reviewing public domain data, industry positioning, and drafting tailored cold email proposals via Smart Business Research.
              </p>
            </div>
          )}

          {/* UPGRADE GATE */}
          {upgradeRequired && (
            <div className="py-10 text-center space-y-4 max-w-md mx-auto">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <Lock className="h-7 w-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Upgrade Required for AI Lead Research</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {upgradeMessage}
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <a
                  href={`https://wa.me/923174383702?text=Hello%20Usman%2C%20I%20want%20to%20upgrade%20to%20the%20Lifetime%20Plan%20($100)%20for%20AI%20Lead%20Research`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Upgrade to Lifetime ($100)</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>

                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold text-xs transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          )}

          {/* SUCCESSFUL RESEARCH REPORT */}
          {data && !loading && (
            <div className="space-y-4">
              {/* Executive Summary */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold uppercase tracking-wider text-[10px]">
                  <Bot className="h-3.5 w-3.5" />
                  <span>Strategic Executive Summary</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{data.executive_summary}</p>
              </div>

              {/* Identified Growth Opportunities */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                  <Lightbulb className="h-3.5 w-3.5" />
                  <span>Identified Business Pain Points & Growth Angles</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {data.opportunities?.map((opp, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-white text-xs">{opp.title}</div>
                        <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">{opp.description}</p>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded shrink-0 border ${
                        opp.impact === "High"
                          ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                          : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                      }`}>
                        {opp.impact} Impact
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personalized Proposal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Personalized Cold Email Proposal</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={copyEmail}
                      className="px-2 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-[10px] flex items-center gap-1 transition-colors"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copied ? "Copied" : "Copy Draft"}</span>
                    </button>
                    {onPushToOutreach && lead?.email && (
                      <button
                        onClick={handlePush}
                        className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Send className="h-3 w-3" />
                        <span>Push to Gmail Outreach</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#080c12] border border-white/10 space-y-2 text-slate-200 font-mono text-[11px] leading-relaxed">
                  <div>
                    <span className="text-slate-500">Subject: </span>
                    <strong className="text-white">{data.personalized_proposal?.subject}</strong>
                  </div>
                  <div className="pt-2 border-t border-white/[0.05] space-y-2 whitespace-pre-line text-slate-300">
                    <p>{data.personalized_proposal?.greeting}</p>
                    <p>{data.personalized_proposal?.body}</p>
                    <p className="font-semibold text-slate-200">{data.personalized_proposal?.call_to_action}</p>
                    <p className="text-slate-400">{data.personalized_proposal?.signature}</p>
                  </div>
                </div>
              </div>

              {/* Strategic Conversion Explainability */}
              {data.explainability && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold uppercase tracking-wider text-[10px]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Why This Angle Converts</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    <strong>Angle:</strong> {data.explainability.target_angle} • <strong>Pain point:</strong> {data.explainability.pain_point_addressed}
                  </p>
                  <p className="text-slate-400 text-[10px] italic">
                    {data.explainability.why_this_converts}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0a0e14] border-t border-white/[0.08] flex items-center justify-between shrink-0">
          <span className="text-[10px] text-slate-500">
            Powered by USMAN AI GTM • Business Intelligence Engine
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
