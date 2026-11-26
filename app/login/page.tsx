"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sparkles, Lock, Mail, ArrowRight, AlertCircle, X, Eye, EyeOff, User as UserIcon } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Handle error param
    const errParam = searchParams.get("error");
    const sessionExpiredParam = searchParams.get("session_expired");
    if (errParam) {
      const decoded = decodeURIComponent(errParam);
      if (decoded.includes("users_username_key") || decoded.includes("unique constraint")) {
        setError("Your account is registered. Click 'Continue with Google' to access your command center, or contact WhatsApp (+923174383702) to activate your subscription ($25/mo Basic or $100 Lifetime).");
      } else {
        setError(decoded);
      }
    } else if (sessionExpiredParam === "true") {
      setError("Your session ended or was invalidated (for example after a password reset). Please sign in again.");
    }

    // 2. Handle Google OAuth redirect session
    const googleSessionRaw = searchParams.get("google_session");
    if (googleSessionRaw) {
      try {
        const session = JSON.parse(decodeURIComponent(googleSessionRaw));
        if (session && session.token) {
          localStorage.setItem("usman_gtm_token", session.token);
          if (session.user) {
            localStorage.setItem("usman_gtm_user", JSON.stringify(session.user));
          }
          if (session.workspace_id) {
            localStorage.setItem("usman_gtm_workspace_id", String(session.workspace_id));
          }
          // Redirect immediately to client command center
          window.location.href = "/app";
        }
      } catch (e) {
        console.error("Failed to parse Google session payload:", e);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      const nextTarget = searchParams.get("next");
      router.push(nextTarget && nextTarget.startsWith("/app") ? nextTarget : "/app");
    } catch (err: any) {
      setError(err?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/google/url");
      const data = await res.json();
      if (data && data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        setError("Google authentication service is temporarily unavailable.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to initialize Google sign-in.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center items-center px-4 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
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
                Find. Engage. Convert. Grow.
              </div>
            </div>
          </Link>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-8 shadow-glass backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white mb-1.5 text-center">Welcome Back</h1>
          <p className="text-xs text-slate-400 text-center mb-6">
            Sign in to access your enterprise revenue operations command center
          </p>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-400 hover:text-white p-0.5 rounded transition"
                aria-label="Dismiss error"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Google OAuth Free Preview Sign-In Option */}
          <div className="space-y-2 mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full py-2.5 px-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-xs flex items-center justify-center gap-2.5 transition-all shadow-sm hover:border-white/20 cursor-pointer disabled:opacity-50"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{googleLoading ? "Connecting to Google..." : "Continue with Google (Free Preview)"}</span>
            </button>
            <p className="text-[11px] text-center text-slate-400">
              Explore the software and preview dashboard features before purchasing.
            </p>
          </div>

          <div className="relative mb-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <span className="relative bg-[#0c1017] px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              or login with paid account
            </span>
          </div>

          {/* Paid Client Username & Password Login Form */}
          <form method="POST" onSubmit={handleSubmit} autoComplete="on" className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username or Account ID
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter your assigned username"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-glow-sm hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? "Authenticating..." : "Sign In to Paid Account"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Registration & Assistance Information */}
        <div className="text-center text-xs text-slate-400 mt-6 space-y-2">
          <p>
            New to USMAN AI GTM?{" "}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-bold underline">
              Create a free customer account
            </Link>{" "}
            to pick Basic ($25), Lifetime ($100), or a Custom plan &amp; submit payment proof.
          </p>
          <p>
            WhatsApp Support: <strong className="text-emerald-400">+923174383702</strong>
          </p>
        </div>

        {/* Master Owner Portal Link */}
        <div className="text-center mt-4">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 transition-colors"
          >
            <span>Master Owner Administration Portal</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090e] flex items-center justify-center text-white text-xs">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
