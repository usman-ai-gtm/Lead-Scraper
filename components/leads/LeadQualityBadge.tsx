"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { evaluateContactReadiness } from "@/lib/lead-quality-engine";
import { normalizePersistedEmailStatus, normalizePersistedPhoneStatus } from "@/lib/contact-taxonomy";

interface LeadQualityBadgeProps {
  lead?: any;
  score?: number | null;
  category?: string | null;
  reasons?: string[] | null;
}

export function LeadQualityBadge({ lead, score, category, reasons }: LeadQualityBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const readiness = lead ? evaluateContactReadiness(lead) : null;
  const finalScore = readiness
    ? readiness.score
    : typeof score === "number"
    ? Math.min(Math.max(score, 0), 100)
    : 50;
  const finalCategory = readiness
    ? readiness.category
    : category ||
      (finalScore >= 80 ? "Complete Contact" : finalScore >= 60 ? "Email Available" : finalScore >= 40 ? "Phone Available" : "Incomplete Contact");

  const colorMap: Record<string, { bg: string; text: string; border: string; bar: string }> = {
    "Complete Contact": {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      bar: "bg-emerald-500",
    },
    Excellent: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      bar: "bg-emerald-500",
    },
    "Email Available": {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/30",
      bar: "bg-blue-500",
    },
    Good: {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/30",
      bar: "bg-blue-500",
    },
    "Phone Available": {
      bg: "bg-teal-500/10",
      text: "text-teal-300",
      border: "border-teal-500/30",
      bar: "bg-teal-500",
    },
    "Website Available": {
      bg: "bg-amber-500/10",
      text: "text-amber-300",
      border: "border-amber-500/30",
      bar: "bg-amber-500",
    },
    Fair: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/30",
      bar: "bg-amber-500",
    },
    "Incomplete Contact": {
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      border: "border-slate-500/30",
      bar: "bg-slate-500",
    },
    Basic: {
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      border: "border-slate-500/30",
      bar: "bg-slate-500",
    },
  };

  const style = colorMap[finalCategory] || colorMap["Email Available"];

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono tracking-tight cursor-help transition-all ${style.bg} ${style.text} ${style.border}`}
      >
        <Sparkles className="h-2.5 w-2.5 shrink-0" />
        <span>{finalCategory}</span>
        <span className="opacity-75">({finalScore})</span>
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 rounded-xl border border-white/15 bg-[#0e1624] p-3 text-xs shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5 mb-2">
            <span className="font-bold text-white text-[11px]">Contact Readiness Breakdown</span>
            <span className={`font-mono font-bold ${style.text}`}>{finalScore}/100</span>
          </div>

          <div className="w-full bg-white/[0.06] rounded-full h-1.5 mb-2 overflow-hidden">
            <div className={`h-full ${style.bar}`} style={{ width: `${finalScore}%` }} />
          </div>

          {readiness ? (
            <ul className="space-y-1 text-[10px]">
              {readiness.factors.map((f) => (
                <li key={f.label} className="flex items-start gap-1.5">
                  {f.met ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-3 w-3 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <span className={f.met ? "text-slate-200 font-semibold" : "text-slate-500"}>
                      {f.label} (+{f.points}):
                    </span>{" "}
                    <span className="text-slate-400 break-words">{f.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : reasons && reasons.length > 0 ? (
            <ul className="space-y-1 text-[10px] text-slate-300">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-emerald-400">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[10px] text-slate-400">
              Assessed from observed email syntax, phone, website, business name, and source URL fields.
            </p>
          )}
          {lead && (
            <div className="mt-2 pt-2 border-t border-white/[0.08] space-y-1 text-[10px] font-mono text-slate-400">
              <div>
                Email Check:{" "}
                <span className="text-slate-200">
                  {normalizePersistedEmailStatus(lead.email_status, lead.email)}
                </span>
              </div>
              <div>
                Phone Check:{" "}
                <span className="text-slate-200">
                  {normalizePersistedPhoneStatus(lead.phone_status, lead.phone)}
                </span>
              </div>
              {(lead.last_verified_at || lead.created_at) && (
                <div className="text-[9px] text-slate-500">
                  Checked: {String(lead.last_verified_at || lead.created_at).slice(0, 19).replace("T", " ")} UTC
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
