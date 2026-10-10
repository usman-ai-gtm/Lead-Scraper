"use client";

import React, { useState } from "react";
import OutreachNav from "@/components/outreach/OutreachNav";
import {
  Workflow, PlusCircle, Clock, ShieldCheck, Mail, Sparkles,
  CheckCircle2, ArrowDown, Settings, AlertOctagon, Edit3, Trash2,
  HelpCircle, Check, ArrowRight
} from "lucide-react";

interface SequenceStep {
  step: number;
  day: number;
  type: string;
  subject: string;
  preview: string;
  ai_personalized: boolean;
}

const INITIAL_STEPS: SequenceStep[] = [
  {
    step: 1,
    day: 1,
    type: "Initial Introduction",
    subject: "Streamlining {{company}}'s hybrid cloud latency",
    preview: "First cold outreach message introducing your core value proposition.",
    ai_personalized: true
  },
  {
    step: 2,
    day: 3,
    type: "Tactical Follow-up",
    subject: "Re: Streamlining {{company}}'s hybrid cloud latency",
    preview: "Quick 2-minute reminder sharing benchmark metrics if no reply.",
    ai_personalized: true
  },
  {
    step: 3,
    day: 7,
    type: "Case Study & Social Proof",
    subject: "Relevant benchmark for {{first_name}} at {{company}}",
    preview: "Sharing customer case study and ROI statistics.",
    ai_personalized: false
  },
  {
    step: 4,
    day: 12,
    type: "Polite Breakup Email",
    subject: "Closing the loop for {{company}}",
    preview: "Polite check-in acknowledging priorities and offering future touchpoint.",
    ai_personalized: true
  }
];

export default function OutreachSequencesPage() {
  const [steps, setSteps] = useState<SequenceStep[]>(INITIAL_STEPS);
  const [stopOnReply, setStopOnReply] = useState<boolean>(true);
  const [stopOnUnsubscribe, setStopOnUnsubscribe] = useState<boolean>(true);
  const [stopOnMeeting, setStopOnMeeting] = useState<boolean>(true);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleAddStep = () => {
    const nextStepNum = steps.length + 1;
    const lastDay = steps.length > 0 ? steps[steps.length - 1].day : 0;
    const newStep: SequenceStep = {
      step: nextStepNum,
      day: lastDay + 4,
      type: "Custom Follow-up",
      subject: "Quick question regarding {{company}}'s timeline",
      preview: "Focused message addressing strategic ROI.",
      ai_personalized: true
    };
    setSteps([...steps, newStep]);
    showNotice("Added new sequence step.");
  };

  const handleRemoveStep = (stepNum: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((s) => s.step !== stepNum));
    showNotice("Sequence step removed.");
  };

  const showNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <OutreachNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Automated Follow-Up Sequences</h2>
          <p className="text-xs text-slate-400">
            Define multi-day automated follow-up cadences with automated stop conditions.
          </p>
        </div>
        <button
          onClick={handleAddStep}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-glow-sm"
        >
          <PlusCircle className="h-4 w-4" /> Add Sequence Step
        </button>
      </div>

      {savedNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {savedNotice}
        </div>
      )}

      {/* Educational Guide: What is an Email Sequence? */}
      <div className="p-5 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
          <HelpCircle className="h-4 w-4 text-blue-400" />
          <span>What is an Email Sequence? (How Automated Follow-ups Work)</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          In B2B sales, over <strong>80% of replies happen after the 2nd or 3rd follow-up email</strong>. 
          A sequence is an automated chain of emails: if the recipient does not reply to Email 1, the platform automatically waits 
          a few days and sends Email 2, then Email 3.
        </p>

        {/* 4-Step Visual Flowchart */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl border border-white/10 bg-black/40 text-left space-y-1">
            <span className="text-[10px] font-bold text-blue-400 uppercase">Step 1 • Day 1</span>
            <div className="text-xs font-bold text-white">First Cold Email</div>
            <p className="text-[11px] text-slate-400">Personalized initial pitch</p>
          </div>
          <div className="p-3 rounded-xl border border-white/10 bg-black/40 text-left space-y-1">
            <span className="text-[10px] font-bold text-indigo-400 uppercase">Step 2 • Day 3</span>
            <div className="text-xs font-bold text-white">Polite Follow-up</div>
            <p className="text-[11px] text-slate-400">Sends only if no reply</p>
          </div>
          <div className="p-3 rounded-xl border border-white/10 bg-black/40 text-left space-y-1">
            <span className="text-[10px] font-bold text-purple-400 uppercase">Step 3 • Day 7</span>
            <div className="text-xs font-bold text-white">Case Study Proof</div>
            <p className="text-[11px] text-slate-400">Shares evidence & ROI</p>
          </div>
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-left space-y-1">
            <span className="text-[10px] font-bold text-emerald-400 uppercase">Auto-Stop Trigger</span>
            <div className="text-xs font-bold text-emerald-300">Prospect Replies!</div>
            <p className="text-[11px] text-slate-400">Follow-ups stop immediately</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Steps & Stop Conditions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Sequence Steps Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Workflow className="h-4 w-4 text-blue-400" />
            <span>Cadence Timeline ({steps.length} Steps)</span>
          </div>

          <div className="space-y-4 relative">
            {steps.map((st, idx) => (
              <div key={st.step} className="relative">
                <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-white/20 transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
                        {st.step}
                      </span>
                      <span className="text-sm font-bold text-white">{st.type}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.05] border border-white/10 text-slate-300 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-400" /> Day {st.day}
                      </span>
                      {steps.length > 1 && (
                        <button
                          onClick={() => handleRemoveStep(st.step)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400"
                          title="Remove step"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-blue-300 font-mono">
                    Subject: {st.subject}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{st.preview}</p>
                </div>

                {idx < steps.length - 1 && (
                  <div className="flex justify-center my-1.5">
                    <div className="p-1 rounded-full bg-white/[0.04] text-slate-500">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Automated Stop Conditions */}
        <div className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-emerald-400" />
            <span>Safety Stop Conditions</span>
          </div>

          <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] space-y-4">
            <p className="text-xs text-slate-400">
              When any of the following events occur, the sequence will immediately stop sending further follow-ups to that contact:
            </p>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] cursor-pointer">
                <input
                  type="checkbox"
                  checked={stopOnReply}
                  onChange={(e) => setStopOnReply(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-blue-600 rounded"
                />
                <div>
                  <div className="text-xs font-bold text-white">Stop on Prospect Reply</div>
                  <div className="text-[11px] text-slate-400">Prevents embarrassing follow-ups after someone responds.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] cursor-pointer">
                <input
                  type="checkbox"
                  checked={stopOnMeeting}
                  onChange={(e) => setStopOnMeeting(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-blue-600 rounded"
                />
                <div>
                  <div className="text-xs font-bold text-white">Stop on Meeting Booked</div>
                  <div className="text-[11px] text-slate-400">Halts sequence immediately once a calendar demo is confirmed.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] cursor-pointer">
                <input
                  type="checkbox"
                  checked={stopOnUnsubscribe}
                  onChange={(e) => setStopOnUnsubscribe(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-blue-600 rounded"
                />
                <div>
                  <div className="text-xs font-bold text-white">Stop on Opt-Out / STOP</div>
                  <div className="text-[11px] text-slate-400">Complies with RFC-8058 global unsubscribe compliance.</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
