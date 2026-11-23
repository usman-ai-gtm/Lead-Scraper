"use client";

import React, { useState } from "react";
import { Sparkles, Info } from "lucide-react";

interface LeadQualityBadgeProps {
  score?: number | null;
  category?: string | null;
  reasons?: string[] | null;
}

export function LeadQualityBadge({ score, category, reasons }: LeadQualityBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const finalScore = typeof score === "number" ? Math.min(Math.max(score, 0), 100) : 50;
  const finalCategory =
    category ||
    (finalScore >= 80 ? "Excellent" : finalScore >= 60 ? "Good" : finalScore >= 40 ? "Fair" : "Basic");

  // Style configurations
  const colorMap: Record<string, { bg: string; text: string; border: string; bar: string }> = {
    Excellent: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      bar: "bg-emerald-500",
    },
    Good: {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/30",
      bar: "bg-blue-500",
    },
    Fair: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/30",
      bar: "bg-amber-500",
    },
    Basic: {
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      border: "border-slate-500/30",
      bar: "bg-slate-500",
    },
  };

  const style = colorMap[finalCategory] || colorMap.Fair;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono tracking-wider cursor-help transition-all ${style.bg} ${style.text} ${style.border}`}
      >
        <Sparkles className="h-2.5 w-2.5" />
        <span>{finalCategory}</span>
        <span className="opacity-70">({finalScore}/100)</span>
      </div>

      {/* Hover Reasons Popover */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 rounded-xl border border-white/10 bg-[#0e1624] p-3 text-xs shadow-2xl backdrop-blur-xl animate-in fade-in">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5 mb-2">
            <span className="font-bold text-white text-[11px]">Quality Score Breakdown</span>
            <span className={`font-mono font-bold ${style.text}`}>{finalScore}/100</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/[0.06] rounded-full h-1.5 mb-2 overflow-hidden">
            <div className={`h-full ${style.bar}`} style={{ width: `${finalScore}%` }} />
          </div>

          {/* Reasons List */}
          {reasons && reasons.length > 0 ? (
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
              Scored based on public commercial presence, verified email, direct phone, and domain identity.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
