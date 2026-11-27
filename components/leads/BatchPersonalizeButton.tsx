"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, CheckCircle2, Mail, ExternalLink, X, Copy, Check } from "lucide-react";

interface PersonalizedItem {
  lead_id?: number;
  business_name: string;
  email: string;
  website: string;
  contact_person_name?: string;
  personalized_subject: string;
  personalized_body: string;
  personalization_status: string;
  research_source_url: string;
  research_summary: string;
  note?: string;
}

export function BatchPersonalizeButton({
  leads,
  onPersonalized,
}: {
  leads: any[];
  onPersonalized?: (items: PersonalizedItem[]) => void;
}) {
  const [running, setRunning] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [summary, setSummary] = useState<{
    total_requested: number;
    generated_count: number;
    research_limited_count: number;
    needs_review_count: number;
    failed_count: number;
    used_business_profile: boolean;
  } | null>(null);
  const [items, setItems] = useState<PersonalizedItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRun = async () => {
    if (!leads || leads.length === 0 || running) return;
    setRunning(true);
    setErrorMsg(null);
    setModalOpen(true);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const persistedIds = leads.map((l) => Number(l.id)).filter((id) => Number.isInteger(id) && id > 0 && id < 2_000_000_000);
      const res = await fetch("/api/leads/personalize", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token && token !== "null" ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(
          persistedIds.length === leads.length
            ? { lead_ids: persistedIds.slice(0, 25) }
            : { leads: leads.slice(0, 25) }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || data.error || "Unable to personalize leads.");
      }

      const list: PersonalizedItem[] = Array.isArray(data.items) ? data.items : [];
      setItems(list);
      setSummary({
        total_requested: Number(data.total_requested || list.length),
        generated_count: Number(data.generated_count || 0),
        research_limited_count: Number(data.research_limited_count || 0),
        needs_review_count: Number(data.needs_review_count || 0),
        failed_count: Number(data.failed_count || 0),
        used_business_profile: Boolean(data.used_business_profile),
      });
      setSelectedIdx(0);
      onPersonalized?.(list);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to generate personalized outreach.");
    } finally {
      setRunning(false);
    }
  };

  const activeItem = items[selectedIdx];

  const handleCopy = () => {
    if (!activeItem) return;
    const text = `Subject: ${activeItem.personalized_subject}\n\n${activeItem.personalized_body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleRun}
        disabled={running || leads.length === 0}
        className="px-3.5 py-2 rounded-xl border border-indigo-500/35 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 font-bold text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
      >
        {running ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Personalizing...</span>
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
            <span>Personalize Emails</span>
          </>
        )}
      </button>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/15 bg-[#0c1017] shadow-2xl flex flex-col">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="h-4 w-4 text-indigo-400" />
                  <span>Individual Personalized Outreach Drafts</span>
                </h3>
                {summary && (
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                    <span className="text-emerald-400">Generated: {summary.generated_count}</span>
                    <span className="text-amber-300">Research Limited: {summary.research_limited_count}</span>
                    <span className="text-slate-400">Needs Review: {summary.needs_review_count}</span>
                    {!summary.used_business_profile && (
                      <Link href="/app/business-profile" className="text-blue-400 hover:underline">
                        Set up Business Profile for deeper matching
                      </Link>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {running ? (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-400 mx-auto" />
                <div className="text-sm font-bold text-white">Researching websites and crafting individual drafts...</div>
                <p className="text-xs text-slate-400">
                  Using your Business Profile and each company&apos;s public website details (up to 25 leads per batch).
                </p>
              </div>
            ) : errorMsg ? (
              <div className="p-8 text-center text-xs text-rose-300">{errorMsg}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 overflow-hidden">
                {/* Lead list */}
                <div className="md:col-span-5 border-r border-white/[0.08] overflow-y-auto divide-y divide-white/[0.05] max-h-[65vh]">
                  {items.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedIdx(idx)}
                      className={`w-full text-left p-3.5 transition-colors cursor-pointer ${
                        idx === selectedIdx ? "bg-indigo-600/20" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="font-bold text-xs text-white truncate">{item.business_name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.email || item.website || "No email"}</div>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-mono ${
                          item.personalization_status === "Generated"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : item.personalization_status === "Research Limited"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-slate-700/40 text-slate-300 border border-white/10"
                        }`}
                      >
                        {item.personalization_status}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Email Draft Viewer */}
                <div className="md:col-span-7 p-5 overflow-y-auto space-y-4 max-h-[65vh]">
                  {activeItem ? (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-white">{activeItem.business_name}</div>
                          {activeItem.contact_person_name && (
                            <div className="text-[11px] text-indigo-300">
                              Contact: {activeItem.contact_person_name}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[11px] text-white inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          <span>{copied ? "Copied" : "Copy Email"}</span>
                        </button>
                      </div>

                      {activeItem.note ? (
                        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200">
                          {activeItem.note}
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <div className="text-[10px] font-mono uppercase text-slate-400">Subject</div>
                            <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white font-semibold">
                              {activeItem.personalized_subject}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-mono uppercase text-slate-400">Personalized Body</div>
                            <pre
                              dir="auto"
                              className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed"
                            >
                              {activeItem.personalized_body}
                            </pre>
                          </div>
                        </>
                      )}

                      {activeItem.research_source_url && (
                        <a
                          href={activeItem.research_source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline"
                        >
                          <span>Research Source: {activeItem.research_source_url}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
