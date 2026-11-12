"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Shield, ArrowRight, Lock, CheckCircle2, Mail } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 shadow-glow-sm">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <div className="text-2xl font-bold tracking-tight text-white flex items-center gap-1.5">
                USMAN <span className="text-blue-500 font-extrabold">AI GTM</span>
              </div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
                Enterprise B2B Lead Extraction
              </div>
            </div>
          </Link>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/95 p-8 shadow-glass backdrop-blur-xl text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto">
            <Shield className="h-8 w-8" />
          </div>

          <div>
            <div className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 mb-2">
              Invitation-Only Platform
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Client Workspace Access</h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              To guarantee strict multi-tenant isolation, data privacy, and dedicated search capacity, public registration is closed.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-left space-y-2.5">
            <div className="text-xs font-semibold text-slate-300">How to access your workspace:</div>
            <div className="flex items-start gap-2 text-xs text-slate-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Already have client credentials?</strong> Sign in with your temporary password and update it on your first login.</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Need a new client seat?</strong> Contact your account administrator to provision your isolated workspace (up to 50 active client seats).</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href="/login"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-sm shadow-glow-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              <Lock className="h-4 w-4" />
              <span>Sign In to Your Workspace</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/contact"
              className="w-full py-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-slate-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Request Client Access</span>
            </Link>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
