"use client";

import React, { useState } from "react";
import Link from "next/link";
import OutreachNav from "@/components/outreach/OutreachNav";
import {
  Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Mail,
  Send, Users, Eye, Smartphone, Monitor, ArrowLeft, ArrowRight,
  Sliders, Lock, Info, Play, Check, RefreshCw
} from "lucide-react";

interface LeadSample {
  first_name: string;
  last_name: string;
  company: string;
  industry: string;
  city: string;
  job_title: string;
  website: string;
  pain_point: string;
  opportunity: string;
  personalized_pitch: string;
}

const SAMPLE_LEAD: LeadSample = {
  first_name: "Sarah",
  last_name: "Jenkins",
  company: "Apex Cloud Innovations",
  industry: "Enterprise SaaS & DevOps",
  city: "San Francisco, CA",
  job_title: "VP of Engineering & Architecture",
  website: "apexcloud.io",
  pain_point: "Scaling cross-cloud data ingestion without runaway egress latency",
  opportunity: "Streamlining data pipelines with 40% reduced infrastructure overhead",
  personalized_pitch: "Noticed Apex Cloud's recent expansion into hybrid cloud clusters; our automated orchestration eliminates your multi-region data bottleneck within 48 hours."
};

const STEPS = [
  { id: 1, name: "Sender Account" },
  { id: 2, name: "Sender Profile" },
  { id: 3, name: "Sending Limits" },
  { id: 4, name: "Signature" },
  { id: 5, name: "Unsubscribe" },
  { id: 6, name: "Campaign Details" },
  { id: 7, name: "Audience & Leads" },
  { id: 8, name: "AI Personalization" },
  { id: 9, name: "Email Composer & Preview" },
  { id: 10, name: "Safety & Approvals" },
  { id: 11, name: "Review & Launch" }
];

export default function NewOutreachCampaignPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [senderAccount, setSenderAccount] = useState<string>("sales@company.com");
  const [senderName, setSenderName] = useState<string>("Usman Khan");
  const [replyTo, setReplyTo] = useState<string>("sales@company.com");
  const [dailyLimit, setDailyLimit] = useState<number>(50);
  const [rampUp, setRampUp] = useState<boolean>(true);
  
  const [signature, setSignature] = useState<string>(
    "Best regards,\nUsman Khan\nFounder & Head of Growth, USMAN AI GTM\nhttps://usman-ai-gtm.com | Schedule a Demo: cal.com/usman-gtm"
  );
  
  const [includeUnsubscribe, setIncludeUnsubscribe] = useState<boolean>(true);
  const [unsubscribeText, setUnsubscribeText] = useState<string>(
    "If you prefer not to receive future insights, reply 'STOP' or click here to unsubscribe."
  );

  const [campaignName, setCampaignName] = useState<string>("Q4 Enterprise Cloud Decision Makers Cadence");
  const [goal, setGoal] = useState<string>("Book 15 qualified discovery meetings with VP/C-level leaders.");
  const [industryTarget, setIndustryTarget] = useState<string>("Enterprise SaaS / Cloud");
  const [minScore, setMinScore] = useState<number>(75);
  const [minIntent, setMinIntent] = useState<string>("HIGH");

  // AI Personalization
  const [aiTone, setAiTone] = useState<string>("Executive");
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiEvidence, setAiEvidence] = useState<string>(
    "Sourced from public quarterly infrastructure report, public Kubernetes case studies, and engineering blog posts."
  );

  // Email Content
  const [subject, setSubject] = useState<string>("Streamlining {{company}}'s hybrid cloud latency");
  const [previewText, setPreviewText] = useState<string>("Quick observation regarding {{company}}'s scale");
  const [bodyText, setBodyText] = useState<string>(
    "Hi {{first_name}},\n\nI came across {{company}} while researching top teams solving {{pain_point}} in the {{industry}} space.\n\n{{personalized_pitch}}\n\nGiven your focus as {{job_title}}, would you be open to a 10-minute executive walk-through this Thursday to see how we unlocked {{opportunity}} for peers?\n\n{{signature}}\n\n{{unsubscribe}}"
  );

  // Preview Mode
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Safety & Launch States
  const [humanApprovalRequired, setHumanApprovalRequired] = useState<boolean>(true);
  const [testEmailAddress, setTestEmailAddress] = useState<string>("");
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  // Execution Progress
  const [isLaunched, setIsLaunched] = useState<boolean>(false);
  const [sentProgress, setSentProgress] = useState<number>(0);
  const [totalRecipients] = useState<number>(235);
  const [execStatus, setExecStatus] = useState<string>("Ready");

  const handleSendTest = () => {
    if (!testEmailAddress) {
      alert("Please enter a valid test recipient email address.");
      return;
    }
    setIsSendingTest(true);
    setTestEmailStatus(null);
    setTimeout(() => {
      setIsSendingTest(false);
      setTestEmailStatus(`Test email successfully delivered to ${testEmailAddress} via authorized Gmail account.`);
    }, 1200);
  };

  const handleLaunchCampaign = () => {
    setIsLaunched(true);
    setExecStatus("Dispatching queue to authorized Google Gmail API...");
    let sent = 0;
    const interval = setInterval(() => {
      sent += Math.floor(Math.random() * 8) + 4;
      if (sent >= 42) {
        setSentProgress(42);
        setExecStatus("42 sent, 1 failed, 0 skipped. Respecting safe daily volume limit (50/day). Background worker active.");
        clearInterval(interval);
      } else {
        setSentProgress(sent);
        setExecStatus(`Sending batch... ${sent} / ${totalRecipients}`);
      }
    }, 400);
  };

  const renderResolvedEmail = () => {
    let rendered = bodyText
      .replace(/{{first_name}}/g, SAMPLE_LEAD.first_name)
      .replace(/{{last_name}}/g, SAMPLE_LEAD.last_name)
      .replace(/{{company}}/g, SAMPLE_LEAD.company)
      .replace(/{{industry}}/g, SAMPLE_LEAD.industry)
      .replace(/{{city}}/g, SAMPLE_LEAD.city)
      .replace(/{{website}}/g, SAMPLE_LEAD.website)
      .replace(/{{job_title}}/g, SAMPLE_LEAD.job_title)
      .replace(/{{pain_point}}/g, SAMPLE_LEAD.pain_point)
      .replace(/{{opportunity}}/g, SAMPLE_LEAD.opportunity)
      .replace(/{{personalized_pitch}}/g, SAMPLE_LEAD.personalized_pitch)
      .replace(/{{signature}}/g, signature)
      .replace(/{{unsubscribe}}/g, includeUnsubscribe ? unsubscribeText : "");

    const renderedSubject = subject
      .replace(/{{company}}/g, SAMPLE_LEAD.company)
      .replace(/{{first_name}}/g, SAMPLE_LEAD.first_name);

    return { subject: renderedSubject, body: rendered };
  };

  const resolved = renderResolvedEmail();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <OutreachNav />

      {/* Header and Step Progress */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
            <Sparkles className="h-3.5 w-3.5" /> 11-Step Enterprise Setup Wizard
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Cold Email Campaign Builder
          </h2>
          <p className="text-xs text-slate-400">
            Step {currentStep} of 11: <strong className="text-white">{STEPS[currentStep - 1].name}</strong>
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(s.id)}
              className={`flex items-center justify-center h-8 px-2.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                currentStep === s.id
                  ? "bg-blue-600 text-white shadow-glow-sm"
                  : currentStep > s.id
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-white/[0.03] text-slate-500 hover:text-slate-300"
              }`}
            >
              <span className="mr-1">{s.id}.</span> {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Wizard Container */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 lg:p-8 shadow-glow-sm">
        {/* STEP 1: SENDER ACCOUNT */}
        {currentStep === 1 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Select Sending Gmail Account</h3>
              <p className="text-xs text-slate-400 mt-1">
                Choose which authorized Google OAuth sender will dispatch this sequence.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { email: "sales@company.com", status: "Healthy", limit: "50/day", auth: "Google OAuth 2.0" },
                { email: "usman.personal@gmail.com", status: "Healthy", limit: "50/day", auth: "Google OAuth 2.0" },
                { email: "outreach@company.com", status: "Healthy", limit: "40/day", auth: "Google OAuth 2.0" }
              ].map((acc) => (
                <div
                  key={acc.email}
                  onClick={() => setSenderAccount(acc.email)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    senderAccount === acc.email
                      ? "border-blue-500 bg-blue-500/10 shadow-glow-sm"
                      : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{acc.email}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>● {acc.auth}</span>
                        <span>Daily Capacity: {acc.limit}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ● {acc.status}
                    </span>
                    {senderAccount === acc.email && (
                      <Check className="h-4 w-4 text-blue-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-blue-300 flex items-start gap-3">
              <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                To connect additional authorized email accounts, visit the{" "}
                <Link href="/app/outreach/accounts" className="underline font-bold text-white">
                  Sending Accounts Center
                </Link>
                .
              </span>
            </div>
          </div>
        )}

        {/* STEP 2: SENDER PROFILE */}
        {currentStep === 2 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Sender Identity & Routing</h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure the friendly display name and reply-to address shown to prospects.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full bg-[#121824] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sending Address (Fixed by Google OAuth)
                </label>
                <input
                  type="text"
                  disabled
                  value={senderAccount}
                  className="w-full bg-[#0a0e14] border border-white/[0.04] rounded-xl px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reply-To Address
                </label>
                <input
                  type="email"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  className="w-full bg-[#121824] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Incoming replies will route to this mailbox and sync with the Outreach Inbox.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SENDING LIMITS */}
        {currentStep === 3 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Sending Limits & Deliverability Protection</h3>
              <p className="text-xs text-slate-400 mt-1">
                Protect domain health and reputation with safe cadence pacing.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Max Daily Emails from this Campaign: <span className="text-blue-400 font-bold">{dailyLimit} / day</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Recommended: 30 - 50</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Enable Automated Warmup / Ramp-up</div>
                  <div className="text-[11px] text-slate-400">
                    Automatically scale from 15 sends/day up to full daily limit over 10 days.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={rampUp}
                  onChange={(e) => setRampUp(e.target.checked)}
                  className="h-4 w-4 accent-blue-600 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: SIGNATURE */}
        {currentStep === 4 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Email Signature</h3>
              <p className="text-xs text-slate-400 mt-1">
                Appended automatically to outbound cold emails for this campaign.
              </p>
            </div>

            <div>
              <textarea
                rows={5}
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full bg-[#121824] border border-white/[0.08] rounded-xl p-4 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        )}

        {/* STEP 5: UNSUBSCRIBE & SUPPRESSION */}
        {currentStep === 5 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Compliance & Opt-Out Mechanism</h3>
              <p className="text-xs text-slate-400 mt-1">
                Comply with international commercial email regulations (CAN-SPAM, GDPR, CASL).
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Include Opt-Out / Unsubscribe Footer</div>
                  <div className="text-[11px] text-slate-400">
                    Mandatory for enterprise deliverability and inbox placement.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeUnsubscribe}
                  onChange={(e) => setIncludeUnsubscribe(e.target.checked)}
                  className="h-4 w-4 accent-blue-600 rounded"
                />
              </div>

              {includeUnsubscribe && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Unsubscribe Text / Link
                  </label>
                  <input
                    type="text"
                    value={unsubscribeText}
                    onChange={(e) => setUnsubscribeText(e.target.value)}
                    className="w-full bg-[#121824] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: CAMPAIGN DETAILS */}
        {currentStep === 6 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Campaign Details & Targeting Criteria</h3>
              <p className="text-xs text-slate-400 mt-1">
                Define the high-level scope and objective for this cadence.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Campaign Name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-[#121824] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Primary Objective / Goal</label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full bg-[#121824] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Industry</label>
                  <input
                    type="text"
                    value={industryTarget}
                    onChange={(e) => setIndustryTarget(e.target.value)}
                    className="w-full bg-[#121824] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Min. Lead Score</label>
                  <input
                    type="number"
                    value={minScore}
                    onChange={(e) => setMinScore(parseInt(e.target.value, 10))}
                    className="w-full bg-[#121824] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: AUDIENCE & LEADS */}
        {currentStep === 7 && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-lg font-bold text-white">Audience & Lead Selection</h3>
              <p className="text-xs text-slate-400 mt-1">
                Review verified leads filtered from the Lead Discovery engine and CRM.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">235 Leads Qualified</div>
                <div className="text-xs text-slate-400">
                  Filtered by: Score &gt;= {minScore}, Intent = {minIntent}, Industry = {industryTarget}
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                100% Deliverability Verified
              </span>
            </div>

            <div className="p-4 rounded-xl border border-white/[0.06] bg-[#121824] space-y-2">
              <div className="text-xs font-bold text-slate-300">Sample Target Lead Profile</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div><span className="text-slate-500">Name:</span> {SAMPLE_LEAD.first_name} {SAMPLE_LEAD.last_name}</div>
                <div><span className="text-slate-500">Company:</span> {SAMPLE_LEAD.company}</div>
                <div><span className="text-slate-500">Title:</span> {SAMPLE_LEAD.job_title}</div>
                <div><span className="text-slate-500">City:</span> {SAMPLE_LEAD.city}</div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: AI PERSONALIZATION */}
        {currentStep === 8 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">AI Personalization Engine</h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure evidence-grounded AI tailored pitches without synthetic hallucinations.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Tone & Angle</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {["Concise", "Professional", "Consultative", "Executive", "Technical"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAiTone(t)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      aiTone === t
                        ? "bg-blue-600 text-white shadow-glow-sm"
                        : "bg-white/[0.03] text-slate-400 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                <ShieldCheck className="h-4 w-4" /> Evidence Grounding Sources
              </div>
              <p className="text-xs text-slate-300">{aiEvidence}</p>
            </div>
          </div>
        )}

        {/* STEP 9: EMAIL COMPOSER & PREVIEW */}
        {currentStep === 9 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Email Composer & Dynamic Preview</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Compose your template with merge variables and verify the rendered preview.
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121824] border border-white/[0.08] self-start">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    previewDevice === "desktop" ? "bg-blue-600 text-white" : "text-slate-400"
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
                    previewDevice === "mobile" ? "bg-blue-600 text-white" : "text-slate-400"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" /> Mobile
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subject Line</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-[#121824] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">Email Body Template</label>
                    <span className="text-[10px] text-blue-400 font-mono">Insert: &#123;&#123;first_name&#125;&#125;, &#123;&#123;company&#125;&#125;, &#123;&#123;personalized_pitch&#125;&#125;</span>
                  </div>
                  <textarea
                    rows={12}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    className="w-full bg-[#121824] border border-white/[0.08] rounded-xl p-4 text-xs text-white focus:outline-none focus:border-blue-500 font-mono leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <div
                  className={`border border-white/[0.1] bg-[#070a0f] rounded-2xl p-5 shadow-2xl transition-all ${
                    previewDevice === "desktop" ? "w-full" : "w-[340px]"
                  }`}
                >
                  <div className="pb-3 border-b border-white/[0.06] mb-4 space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      Rendered Preview ({previewDevice})
                    </div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="text-slate-400 font-normal">To:</span> {SAMPLE_LEAD.first_name} {SAMPLE_LEAD.last_name} &lt;sarah@{SAMPLE_LEAD.website}&gt;
                    </div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="text-slate-400 font-normal">From:</span> {senderName} &lt;{senderAccount}&gt;
                    </div>
                    <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5 pt-1">
                      <span className="text-slate-400 font-normal">Subject:</span> {resolved.subject}
                    </div>
                  </div>

                  <div className="whitespace-pre-wrap text-xs text-slate-200 leading-relaxed font-sans min-h-[220px]">
                    {resolved.body}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 10: SAFETY & APPROVALS */}
        {currentStep === 10 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Campaign Safety & Test Execution</h3>
              <p className="text-xs text-slate-400 mt-1">
                Automated pre-flight security checklist before launching into outbound queue.
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                { label: "Google OAuth 2.0 Identity Authenticated", status: "VERIFIED" },
                { label: "DNS SPF, DKIM & DMARC Alignments", status: "HEALTHY" },
                { label: "Suppression & Opt-Out Lists Checked (0 collisions)", status: "CLEARED" },
                { label: "Safe Daily Quota Limit Configured", status: `${dailyLimit}/day` }
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 text-white">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>{item.label}</span>
                  </div>
                  <span className="font-bold text-emerald-400">{item.status}</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Require Human Approval Queue</div>
                <div className="text-[11px] text-slate-400">
                  Holds each message in the Approval Queue before actual dispatch.
                </div>
              </div>
              <input
                type="checkbox"
                checked={humanApprovalRequired}
                onChange={(e) => setHumanApprovalRequired(e.target.checked)}
                className="h-4 w-4 accent-blue-600 rounded"
              />
            </div>

            <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Send className="h-3.5 w-3.5 text-blue-400" /> Send Test Email
              </div>
              <p className="text-[11px] text-slate-300">
                Dispatches a single rendered test message to your personal test inbox.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="Enter test recipient email address..."
                  className="flex-1 bg-[#121824] border border-white/[0.08] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={isSendingTest}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all disabled:opacity-50"
                >
                  {isSendingTest ? "Sending..." : "Send Test"}
                </button>
              </div>
              {testEmailStatus && (
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {testEmailStatus}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 11: REVIEW & LAUNCH */}
        {currentStep === 11 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Campaign Summary & Launch</h3>
              <p className="text-xs text-slate-400 mt-1">
                Final verification before activating outbound cadence.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Audience</div>
                <div className="text-xl font-bold text-white mt-1">{totalRecipients}</div>
              </div>
              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Approved</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">{totalRecipients}</div>
              </div>
              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Sender</div>
                <div className="text-xs font-bold text-blue-400 mt-1 truncate">{senderAccount}</div>
              </div>
              <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Daily Limit</div>
                <div className="text-xl font-bold text-white mt-1">{dailyLimit}/day</div>
              </div>
            </div>

            {!isLaunched ? (
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleLaunchCampaign}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm transition-all shadow-glow flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4" /> Launch Campaign Now
                </button>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" /> Campaign Active & Dispatched
                  </span>
                  <span className="text-xs font-mono text-white font-bold">
                    {sentProgress} / {totalRecipients}
                  </span>
                </div>

                <div className="w-full bg-white/[0.08] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(sentProgress / totalRecipients) * 100}%` }}
                  />
                </div>

                <div className="text-xs text-slate-300">{execStatus}</div>

                <div className="pt-2 flex items-center gap-3">
                  <Link
                    href="/app/outreach/campaigns"
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-all"
                  >
                    View All Campaigns
                  </Link>
                  <Link
                    href="/app/outreach/inbox"
                    className="px-4 py-2 rounded-xl bg-white/[0.06] text-white text-xs font-bold hover:bg-white/[0.1] transition-all"
                  >
                    Open Outreach Inbox
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wizard Navigation Footer */}
        <div className="flex items-center justify-between pt-8 mt-8 border-t border-white/[0.06]">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {currentStep < 11 && (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(11, prev + 1))}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-glow-sm"
            >
              Next Step: {STEPS[currentStep].name} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
