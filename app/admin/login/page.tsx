"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  X,
  HelpCircle,
} from "lucide-react";

function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recovery modal state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryUsername, setRecoveryUsername] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          rememberMe,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed. Please verify credentials.");
      }

      if (data.token) {
        localStorage.setItem("usman_gtm_token", data.token);
        if (data.user) {
          localStorage.setItem("usman_gtm_user", JSON.stringify(data.user));
        }
        if (data.user?.workspace_id) {
          localStorage.setItem("usman_gtm_workspace_id", String(data.user.workspace_id));
        }

        // Direct navigation to Master Owner Command Center
        window.location.href = data.redirectUrl || "/app/admin/clients";
      } else {
        throw new Error("No authentication token received.");
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryLoading(true);
    setRecoveryError(null);
    setRecoverySuccess(null);

    if (newPassword !== confirmPassword) {
      setRecoveryError("New passwords do not match.");
      setRecoveryLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: recoveryUsername.trim(),
          recoveryKey: recoveryKey.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || "Password reset failed.");
      }

      setRecoverySuccess(data.message || "Password successfully reset! You can now log in.");
      setPassword(newPassword);
      setUsername(recoveryUsername);
      setTimeout(() => {
        setShowRecoveryModal(false);
        setRecoverySuccess(null);
      }, 2500);
    } catch (err: any) {
      setRecoveryError(err?.message || "Failed to reset password.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[400px] h-[250px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand & Security Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
            <ShieldCheck className="h-4 w-4" />
            <span>Master Owner Command Center</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Admin Authentication
          </h1>
          <p className="text-slate-400 text-sm">
            Restricted portal for Master Administrator access only.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-400 hover:text-rose-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider"
              >
                Master Admin Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  placeholder="e.g. master_owner_usman"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                >
                  Admin Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowRecoveryModal(true);
                    setRecoveryUsername(username);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot Password?
                </button>
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
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  placeholder="••••••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-white/[0.03] text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="ml-2 text-xs text-slate-400 cursor-pointer">
                Keep session active on this workstation (30 days)
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-bold text-sm shadow-glow-sm hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? "Authenticating Master Owner..." : "Sign In to Command Center"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Return to Client Portal Link */}
        <div className="text-center mt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <span>← Return to Client Portal</span>
          </Link>
        </div>
      </div>

      {/* Master Password Recovery Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowRecoveryModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Master Owner Recovery</h3>
                <p className="text-xs text-slate-400">Reset credentials using Master Recovery Key</p>
              </div>
            </div>

            {recoveryError && (
              <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{recoveryError}</span>
              </div>
            )}

            {recoverySuccess && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{recoverySuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Admin Username
                </label>
                <input
                  type="text"
                  required
                  value={recoveryUsername}
                  onChange={(e) => setRecoveryUsername(e.target.value)}
                  placeholder="master_owner_usman"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Master Recovery Key
                </label>
                <input
                  type="password"
                  required
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  placeholder="REC-XXXXXXXXXXXXXXXX"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Secure Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-3.5 pr-10 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.05] text-xs font-medium text-slate-300 hover:bg-white/[0.1] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{recoveryLoading ? "Resetting..." : "Update Password"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-white text-xs">
          Loading Admin Portal...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
