"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Sparkles, Mail, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testToken, setTestToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ status: string; message: string; token_available_for_local_test?: string }>("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      setSubmitted(true);
      if (res.token_available_for_local_test) {
        setTestToken(res.token_available_for_local_test);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit password reset request.");
    } finally {
      setLoading(false);
    }
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
            Enter your work email address to receive secure password recovery instructions
          </p>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Check Your Inbox</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                If an account exists for <span className="text-white font-medium">{email}</span>, we have dispatched a single-use recovery link valid for 60 minutes.
              </p>

              {testToken && (
                <div className="mb-6 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-left">
                  <div className="text-[11px] font-bold text-blue-400 mb-1">Local Diagnostic Recovery Link:</div>
                  <Link
                    href={`/reset-password?token=${testToken}`}
                    className="text-xs text-blue-300 underline break-all hover:text-white"
                  >
                    Open Password Reset Form →
                  </Link>
                </div>
              )}

              <Link
                href="/login"
                className="inline-block w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
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
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-glow-sm transition-all disabled:opacity-50"
              >
                {loading ? "Generating Recovery Link..." : "Send Reset Link"}
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
