"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Sparkles, Mail, ArrowRight, CheckCircle2, AlertCircle, ShieldAlert, KeyRound, UserCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<any>("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || "Failed to process recovery request.");
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
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Password Recovery</h1>
          <p className="text-xs text-slate-400 text-center mb-6">
            Enter your work email address to initiate genuine credentials recovery
          </p>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              {result.smtp_configured ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white mb-1">Recovery Link Dispatched</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    A secure password reset link has been dispatched to <span className="text-white font-medium">{email}</span>.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-start gap-2.5">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                    <div className="space-y-1">
                      <div className="font-bold">Transparent Recovery Notice:</div>
                      <div className="text-[11px] leading-relaxed text-amber-200/90">
                        {result.message}
                      </div>
                    </div>
                  </div>

                  {result.is_admin_account ? (
                    <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                        <KeyRound className="h-4 w-4 text-blue-400" />
                        <span>Administrator Secure Reset Link</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        As the registered platform administrator, a cryptographically signed one-time token has been generated:
                      </p>
                      <Link
                        href={result.reset_url}
                        className="inline-flex items-center justify-center w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
                      >
                        <span>Set New Password Now →</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03] space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <UserCheck className="h-4 w-4 text-emerald-400" />
                        <span>Client Account Password Reset</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        To maintain zero-knowledge workspace security, please ask your administrator to generate a new temporary password for your seat via:
                      </p>
                      <div className="bg-[#141b26] p-2 rounded-lg font-mono text-[10px] text-slate-300">
                        Admin Governance &gt; Client Accounts &gt; Reset Password
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Link
                href="/login"
                className="inline-block w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors text-center"
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
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-glow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Verifying Account..." : "Initiate Recovery"}
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
