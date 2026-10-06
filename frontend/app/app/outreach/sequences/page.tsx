"use client";

import React, { useState } from "react";
import OutreachNav from "@/components/outreach/OutreachNav";
import {
  Workflow, PlusCircle, Clock, ShieldCheck, Mail, Sparkles,
  CheckCircle2, ArrowDown, Settings, AlertOctagon, Edit3, Trash2
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
    preview: "Observation regarding infrastructure scale and tailored value hypothesis.",
    ai_personalized: true
  },
  {
    step: 2,
    day: 3,
    type: "Tactical Follow-up",
    subject: "Re: Streamlining {{company}}'s hybrid cloud latency",
    preview: "Sharing a 2-minute loom on how our peers reduced egress costs by 35%.",
    ai_personalized: true
  },
  {
    step: 3,
    day: 7,
    type: "Value Proposition & Case Study",
    subject: "Relevant benchmark for {{first_name}} at {{company}}",
    preview: "Enterprise case study detailing benchmark metrics and architecture diagram.",
    ai_personalized: false
  },
  {
    step: 4,
    day: 12,
    type: "Permission to Close / Breakup",
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
  const [stopOnDealStage, setStopOnDealStage] = useState<boolean>(true);
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
          <h2 className="text-xl font-bold text-white tracking-tight">Multi-Touch Cadence Sequences</h2>
          <p className="text-xs text-slate-400">
            Define multi-day automated follow-up cadences with enterprise stop-conditions.
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

      {/* Main Grid: Steps & Stop Conditions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Step Pipeline */}
        <div className="lg:col-span-2 space-y-4">
          {steps.map((st, idx) => (
            <React.Fragment key={st.step}>
              <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-white/[0.15] transition-all shadow-glow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] uppercase font-bold text-slate-400">Day</span>
                      <span className="text-xs font-black text-blue-400">{st.day}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Step {st.step}: {st.type}</span>
                        {st.ai_personalized && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            <Sparkles className="h-2.5 w-2.5" /> AI Personalization
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-blue-300 font-mono font-medium">{st.subject}</div>
                      <p className="text-xs text-slate-400">{st.preview}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRemoveStep(st.step)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete step"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="flex items-center justify-center my-1 text-slate-600">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.04] text-[11px] text-slate-500 font-mono">
                    <Clock className="h-3 w-3 text-slate-500" /> Wait {steps[idx + 1].day - st.day} Days <ArrowDown className="h-3 w-3" />
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Right Col: Stop Conditions */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c1017] shadow-glow-sm space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                <AlertOctagon className="h-4 w-4" /> Safeguards
              </div>
              <h3 className="text-base font-bold text-white">Automated Stop Conditions</h3>
              <p className="text-xs text-slate-400 mt-1">
                Campaign cadence automatically halts immediately when any of these conditions are met.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { title: "Stop on Prospect Reply", desc: "Halts follow-ups as soon as recipient responds.", val: stopOnReply, set: setStopOnReply },
                { title: "Stop on Unsubscribe / Opt-Out", desc: "Instantly adds recipient to global suppression.", val: stopOnUnsubscribe, set: setStopOnUnsubscribe },
                { title: "Stop on Meeting Scheduled", desc: "Detects calendar booking event and stops cadence.", val: stopOnMeeting, set: setStopOnMeeting },
                { title: "Stop on CRM Opportunity / Deal", desc: "Halts cold outreach once lead moves to active sales stage.", val: stopOnDealStage, set: setStopOnDealStage }
              ].map((cond, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-white">{cond.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{cond.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={cond.val}
                    onChange={(e) => {
                      cond.set(e.target.checked);
                      showNotice("Updated stop conditions.");
                    }}
                    className="h-4 w-4 accent-blue-600 rounded mt-0.5"
                  />
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>All stop conditions active and synchronizing with Gmail Webhook & CRM Timeline.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
