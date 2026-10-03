"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Mail, ArrowRight, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center items-center px-4 relative">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 shadow-glow-sm">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              USMAN <span className="text-blue-500">AI GTM</span>
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-8 shadow-glass backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Reset Password</h1>
          <p className="text-xs text-slate-400 text-center mb-6">
            Enter your work email address to receive password reset instructions
          </p>

          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Check Your Inbox</h3>
              <p className="text-xs text-slate-400 mb-6">
                If an account exists for <span className="text-white font-medium">{email}</span>, we have sent a secure recovery link.
              </p>
              <Link
                href="/login"
                className="inline-block w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-glow-sm transition-all"
              >
                Send Reset Link
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Remembered your credentials?{" "}
          <Link href="/login" className="text-blue-400 font-semibold hover:text-blue-300">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
