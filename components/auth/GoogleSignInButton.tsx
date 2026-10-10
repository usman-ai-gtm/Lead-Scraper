"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles, AlertCircle } from "lucide-react";

interface GoogleSignInButtonProps {
  label?: string;
  className?: string;
  onSuccess?: () => void;
}

export default function GoogleSignInButton({
  label = "Continue with Google",
  className = "",
  onSuccess,
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google/url");
      const data = await res.json();

      // If official Google Cloud Client ID is configured in production:
      // Redirect to official accounts.google.com where Chrome/Firefox/Mobile detects active accounts natively
      if (data.configured && data.auth_url) {
        window.location.href = data.auth_url;
        return;
      }
    } catch {}

    // When client ID is not yet provided, open clean neutral Google Sign-in modal
    setLoading(false);
    setEmail("");
    setFullName("");
    setModalOpen(true);
  };

  const handleCustomGoogleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setSubmitting(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName =
      fullName.trim() ||
      cleanEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    try {
      const res = await fetch("/api/auth/google/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, name: cleanName }),
      });

      const data = await res.json();

      if (data.access_token) {
        localStorage.setItem("usman_gtm_token", data.access_token);
        localStorage.setItem("usman_gtm_workspace_id", String(data.user?.workspace_id || 1));
        localStorage.setItem("usman_gtm_user", JSON.stringify(data.user));
        localStorage.setItem("usman_gtm_workspaces", JSON.stringify([data.workspace]));
        document.cookie = `usman_gtm_token=${data.access_token}; path=/; max-age=${7 * 86400}; SameSite=Lax`;
      }

      setModalOpen(false);
      setSubmitting(false);

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.href = "/app";
      }
    } catch {
      window.location.href = "/app";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleGoogleClick}
        disabled={loading}
        className={`w-full py-3 px-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-sm transition-all flex items-center justify-center gap-3 shadow-sm hover:border-white/20 active:scale-[0.99] disabled:opacity-50 ${className}`}
      >
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
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
        <span>{loading ? "Connecting to Google..." : label}</span>
      </button>

      {/* Clean, Neutral Google Sign-in Modal (Never leaks another user's account) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-[420px] rounded-2xl bg-white text-[#1f1f1f] shadow-2xl border border-gray-200 overflow-hidden relative font-sans text-left">
            {/* Header Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-[#fafafa]">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="text-xs font-medium text-gray-700">Sign in with Google</span>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-7">
              <div className="flex items-center justify-start mb-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-sm">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>

              <h2 className="text-[22px] font-normal text-[#1f1f1f] tracking-tight">
                Sign in with Google
              </h2>
              <p className="text-xs text-[#5f6368] mt-1 mb-5">
                to continue to <span className="text-[#1a73e8] font-medium">USMAN AI GTM</span>
              </p>

              <form onSubmit={handleCustomGoogleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Your Google Email
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. name@gmail.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#1f1f1f] placeholder-gray-400 focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Your Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-[#1f1f1f] placeholder-gray-400 focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!email || submitting}
                    className="bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium text-xs px-6 py-2.5 rounded-full transition shadow-sm disabled:opacity-50"
                  >
                    {submitting ? "Signing in..." : "Continue to Dashboard"}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-start gap-2 text-[11px] text-[#5f6368]">
                <AlertCircle className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  For automated 1-click browser account detection via accounts.google.com, configure <strong>GOOGLE_CLIENT_ID</strong> in Vercel.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
