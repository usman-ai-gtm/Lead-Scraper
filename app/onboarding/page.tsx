"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Check, ArrowRight, Building, Target, Cpu, Search,
  Mail, MessageSquare, Upload, CheckCircle2, ChevronRight
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [useCase, setUseCase] = useState("Enterprise Outbound");
  const [aiMode, setAiMode] = useState("QUALITY MODE");
  const [searchProvider, setSearchProvider] = useState("Serper API");

  const steps = [
    { num: 1, title: "Workspace Created", icon: Building },
    { num: 2, title: "Select Use Case", icon: Target },
    { num: 3, title: "Configure AI Mode", icon: Cpu },
    { num: 4, title: "Connect Search Provider", icon: Search },
    { num: 5, title: "Connect Email (OAuth)", icon: Mail },
    { num: 6, title: "Connect WhatsApp (Cloud API)", icon: MessageSquare },
    { num: 7, title: "Seed Leads", icon: Upload },
    { num: 8, title: "Ready for Launch", icon: Sparkles },
  ];

  const handleNext = () => {
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push("/app");
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative">
      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>STEP {currentStep} OF 8</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Workspace Onboarding Wizard</h1>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8 px-2">
          {steps.map((s) => (
            <div
              key={s.num}
              className={`h-2 flex-1 rounded-full mx-1 transition-all ${
                s.num <= currentStep ? "bg-blue-600 shadow-glow-sm" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* Wizard Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-8 shadow-glass backdrop-blur-xl">
          {/* Step 1: Workspace confirmation */}
          {currentStep === 1 && (
            <div className="space-y-4 text-center py-4">
              <div className="h-16 w-16 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-white">Your Primary Workspace is Active</h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Multi-tenant isolation and AES-256 data encryption keys have been generated for your organization.
              </p>
            </div>
          )}

          {/* Step 2: Use case */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-2">Select Your Primary Revenue Use Case</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  "Enterprise Outbound & Prospecting",
                  "RevOps & Inbound Acceleration",
                  "Agency Multi-Client Outreach",
                  "Customer Success & Expansion",
                ].map((item) => (
                  <div
                    key={item}
                    onClick={() => setUseCase(item)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      useCase === item
                        ? "border-blue-500 bg-blue-500/10 text-white font-semibold"
                        : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: AI Mode */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-2">Configure Default Multi-AI Mode</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: "QUALITY MODE", desc: "Best reasoning & deep research (GPT-4o & Claude 3.5 Sonnet)" },
                  { name: "BALANCED MODE", desc: "Optimal blend of speed and intelligence" },
                  { name: "FAST MODE", desc: "High throughput for bulk volume prospecting" },
                  { name: "ECONOMY MODE", desc: "Maximum token efficiency for large datasets" },
                ].map((item) => (
                  <div
                    key={item.name}
                    onClick={() => setAiMode(item.name)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      aiMode === item.name
                        ? "border-purple-500 bg-purple-500/10 text-white"
                        : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20"
                    }`}
                  >
                    <div className="font-bold text-sm mb-1">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Search Provider */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-2">Search & Web Evidence Providers</h2>
              <div className="space-y-2">
                {[
                  { name: "Serper API", desc: "Fastest Google Business & Maps search provider" },
                  { name: "SerpApi", desc: "Global multi-engine crawler" },
                  { name: "USMAN Internal Crawl Engine", desc: "Zero external key required (Built-in)" },
                ].map((item) => (
                  <div
                    key={item.name}
                    onClick={() => setSearchProvider(item.name)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      searchProvider === item.name
                        ? "border-blue-500 bg-blue-500/10 text-white"
                        : "border-white/10 bg-white/[0.02] text-slate-300"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm">{item.name}</div>
                      <div className="text-xs text-slate-400">{item.desc}</div>
                    </div>
                    {searchProvider === item.name && <Check className="h-5 w-5 text-blue-400" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Gmail OAuth */}
          {currentStep === 5 && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Connect Email (Official Google OAuth)</h2>
                  <p className="text-xs text-slate-400">Zero password requirement. Connect via official OAuth 2.0.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300 space-y-2">
                <div>✓ Multi-account sender rotation supported</div>
                <div>✓ Automated deliverability and reply tracking</div>
                <div className="text-slate-400 pt-1">You can authorize your sending accounts now or later in Settings.</div>
              </div>
            </div>
          )}

          {/* Step 6: WhatsApp Business Cloud API */}
          {currentStep === 6 && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Official Meta WhatsApp Business Cloud API</h2>
                  <p className="text-xs text-slate-400">Compliant two-way messaging on Meta infrastructure.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300 space-y-2">
                <div>✓ 100% compliant with Meta Business Policies (No bans)</div>
                <div>✓ Pre-approved templates and rich interactive buttons</div>
                <div className="text-slate-400 pt-1">Setup wizard available in dashboard at any time.</div>
              </div>
            </div>
          )}

          {/* Step 7: Seed Leads */}
          {currentStep === 7 && (
            <div className="space-y-4 py-2 text-center">
              <div className="h-12 w-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Upload className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Seed Initial Enterprise Leads</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                We will prepopulate your workspace with verified enterprise sample accounts so you can immediately explore scoring, research, and CRM pipelines.
              </p>
            </div>
          )}

          {/* Step 8: Ready */}
          {currentStep === 8 && (
            <div className="space-y-4 py-6 text-center">
              <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-white">Workspace Configuration Complete!</h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Your enterprise GTM command center is fully configured and ready for live production use.
              </p>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-8 pt-6 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {currentStep < 8 ? "You can modify settings later" : "Welcome aboard"}
            </span>
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-glow-sm transition-all flex items-center gap-2"
            >
              <span>{currentStep === 8 ? "Enter Command Center" : "Continue"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
