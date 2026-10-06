"use client";

import React, { useState } from "react";
import Link from "next/link";
import OutreachNav from "@/components/outreach/OutreachNav";
import {
  FileText, Sparkles, Copy, Edit3, ArrowRight, PlusCircle,
  CheckCircle2, Search, Filter, Layers, Send
} from "lucide-react";

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  subject: string;
  preview: string;
  body: string;
  performance_reply_rate: string;
}

const TEMPLATE_CATEGORIES = [
  "All",
  "Introduction",
  "Cold Outreach",
  "Follow-up",
  "Meeting Request",
  "Value Proposition",
  "Reactivation",
  "Event",
  "Partnership",
  "Enterprise",
  "Custom"
];

const INITIAL_TEMPLATES: TemplateItem[] = [
  {
    id: "tpl-1",
    name: "Executive Architecture Peer Benchmark",
    category: "Cold Outreach",
    subject: "Streamlining {{company}}'s infrastructure latency",
    preview: "Observation regarding infrastructure scale and tailored value hypothesis.",
    body: "Hi {{first_name}},\n\nI noticed {{company}}'s recent infrastructure scaling initiatives. Teams tackling {{pain_point}} typically lose 20-30 hours weekly to sync latency.\n\n{{personalized_pitch}}\n\nAre you open to a brief 10-minute briefing on how we solved this for similar setups?",
    performance_reply_rate: "18.4%"
  },
  {
    id: "tpl-2",
    name: "Tactical Value & Case Study Proof",
    category: "Value Proposition",
    subject: "Relevant benchmark for {{first_name}} at {{company}}",
    preview: "Enterprise case study detailing benchmark metrics and architecture diagram.",
    body: "Hi {{first_name}},\n\nFollowing up on my last note with a 1-page architecture breakdown: our partners reduced infrastructure spend by 35% without refactoring existing pipelines.\n\nWould you like me to send the PDF over?",
    performance_reply_rate: "14.2%"
  },
  {
    id: "tpl-3",
    name: "C-Level Permission to Close / Breakup",
    category: "Follow-up",
    subject: "Closing the loop on {{company}}",
    preview: "Polite check-in acknowledging priorities and offering future touchpoint.",
    body: "Hi {{first_name}},\n\nI assume optimizing {{opportunity}} isn't top priority for this quarter. I'll step back for now so I don't clutter your inbox.\n\nIf anything changes in Q1, feel free to reach back out.",
    performance_reply_rate: "21.6%"
  },
  {
    id: "tpl-4",
    name: "Q4 Budget Planning & Executive Demo",
    category: "Meeting Request",
    subject: "10 min for {{first_name}} regarding Q4 GTM pipeline?",
    preview: "Direct calendar inquiry for decision makers.",
    body: "Hi {{first_name}},\n\nWith Q4 planning in motion, I'd love to share how our autonomous engine adds 15+ qualified enterprise deals monthly.\n\nDo you have 10 minutes this Thursday afternoon?",
    performance_reply_rate: "16.8%"
  },
  {
    id: "tpl-5",
    name: "Series A / Enterprise Growth Partnership",
    category: "Partnership",
    subject: "Collaboration between {{company}} and USMAN AI GTM",
    preview: "Strategic partnership proposal for executive leadership.",
    body: "Hi {{first_name}},\n\nWe love what {{company}} is building in the {{industry}} space. We see a strong co-selling synergy that could unlock mutual distribution for both our ecosystems.\n\nLet's connect for 15 minutes next week.",
    performance_reply_rate: "19.1%"
  }
];

export default function OutreachTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>(INITIAL_TEMPLATES);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  // AI Generator Form
  const [aiIndustry, setAiIndustry] = useState<string>("FinTech & B2B SaaS");
  const [aiAudience, setAiAudience] = useState<string>("VP of Sales & Revenue Operations");
  const [aiGoal, setAiGoal] = useState<string>("Book product demo for Q4 pipeline");
  const [aiTone, setAiTone] = useState<string>("Executive Consultative");
  const [aiOffer, setAiOffer] = useState<string>("Automated lead qualification + 35% pipeline acceleration");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleGenerateTemplate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const generated: TemplateItem = {
        id: `tpl-ai-${Date.now().toString().slice(-4)}`,
        name: `${aiIndustry} — ${aiTone} Template`,
        category: "Cold Outreach",
        subject: `Accelerating {{company}}'s Q4 pipeline velocity`,
        preview: `Specific value prop on ${aiOffer}`,
        body: `Hi {{first_name}},\n\nI was reviewing {{company}}'s positioning in the ${aiIndustry} market. Many ${aiAudience} leaders struggle with ${aiOffer.toLowerCase()}.\n\n{{personalized_pitch}}\n\nGiven your focus, would you have 10 minutes next Tuesday to review how we solved this for peers?`,
        performance_reply_rate: "22.0%"
      };
      setTemplates([generated, ...templates]);
      setIsGenerating(false);
      setShowAiModal(false);
    }, 1200);
  };

  const filtered = templates.filter((t) => {
    const matchCat = selectedCategory === "All" || t.category === selectedCategory;
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.body.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <OutreachNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Email Template Library</h2>
          <p className="text-xs text-slate-400">
            High-converting cold outreach copy, follow-up frameworks, and AI template synthesis.
          </p>
        </div>

        <button
          onClick={() => setShowAiModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-glow-sm"
        >
          <Sparkles className="h-4 w-4" /> ✨ Generate Template with AI
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-white/[0.08] bg-[#0c1017]">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {TEMPLATE_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === c
                  ? "bg-blue-600 text-white shadow-glow-sm"
                  : "bg-white/[0.03] text-slate-400 hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-[#121824] border border-white/[0.08] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="p-5 rounded-2xl border border-white/[0.08] bg-[#0c1017] hover:border-white/[0.15] transition-all shadow-glow-sm flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {t.category}
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  ★ {t.performance_reply_rate} Avg. Reply
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-1">{t.name}</h3>
                <div className="text-xs text-blue-300 font-mono line-clamp-1">
                  Subject: {t.subject}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#070a0f] border border-white/[0.04] text-[11px] text-slate-300 whitespace-pre-wrap font-sans line-clamp-5 leading-relaxed">
                {t.body}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-white/[0.04] flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">ID: {t.id}</span>
              <Link
                href={`/app/outreach/campaigns/new?template=${t.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-xs font-bold transition-all border border-blue-500/20"
              >
                Use in Campaign <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* AI Template Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.12] bg-[#0c1017] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="h-4 w-4 text-blue-400" /> AI Cold Email Template Generator
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Industry</label>
                <input
                  type="text"
                  value={aiIndustry}
                  onChange={(e) => setAiIndustry(e.target.value)}
                  className="w-full bg-[#121824] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Persona / Audience</label>
                <input
                  type="text"
                  value={aiAudience}
                  onChange={(e) => setAiAudience(e.target.value)}
                  className="w-full bg-[#121824] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Campaign Goal</label>
                <input
                  type="text"
                  value={aiGoal}
                  onChange={(e) => setAiGoal(e.target.value)}
                  className="w-full bg-[#121824] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tone</label>
                <input
                  type="text"
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="w-full bg-[#121824] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Core Value Offer / Hook</label>
                <input
                  type="text"
                  value={aiOffer}
                  onChange={(e) => setAiOffer(e.target.value)}
                  className="w-full bg-[#121824] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateTemplate}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-glow-sm disabled:opacity-50"
              >
                {isGenerating ? "Synthesizing Template..." : "Generate Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
