"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  Settings, Key, Shield, User, Building, Bell,
  Lock, CheckCircle2, Save, Sparkles, RefreshCw, Target, HelpCircle,
  Mail, Send, Globe, AlertCircle, AlertTriangle, ExternalLink, ShieldCheck, Check,
  Eye, EyeOff, KeyRound
} from "lucide-react";

interface GmailStatus {
  configured: boolean;
  connected: boolean;
  status_code: "CONNECTED" | "NOT_CONNECTED" | "CONFIGURATION_ERROR" | "RECONNECT_REQUIRED";
  account: {
    sender_email: string;
    sender_name: string;
    account_name?: string;
    health_status: string;
    daily_limit: number;
    sent_today: number;
    last_sent_at?: string;
    created_at?: string;
  } | null;
  provider: string;
  daily_quota: number;
  cost: string;
  redirect_uri?: string;
}

interface DnsCheckData {
  domain: string;
  timestamp: string;
  overall: "EXCELLENT" | "GOOD" | "NEEDS ATTENTION" | "INCOMPLETE";
  mx: { status: "PASS" | "MISSING" | "NEEDS ATTENTION"; records: string[]; summary: string };
  spf: { status: "PASS" | "MISSING" | "NEEDS ATTENTION"; record: string | null; summary: string };
  dmarc: { status: "PASS" | "MISSING" | "NEEDS ATTENTION"; record: string | null; summary: string };
  dkim: { status: "PASS" | "MISSING" | "NEEDS ATTENTION" | "NOT CHECKED"; selector: string; record: string | null; summary: string };
}

export default function SettingsPage() {
  const { user, activeWorkspace, refreshUser, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "icp" | "gmail" | "workspace" | "vault" | "security">("profile");

  // User Profile (Username is permanent & server-enforced read-only)
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [company, setCompany] = useState(user?.company || "USMAN AI GTM");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  // Secure Customer Password Change State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
    if (user?.company) setCompany(user.company);
  }, [user?.full_name, user?.company]);

  // Ideal Customer Profile (ICP)
  const [icp, setIcp] = useState({
    business_name: "",
    offer_description: "",
    website: "",
    target_industries: "",
    target_company_sizes: "",
    target_locations: "",
    ideal_customer_roles: "",
    typical_problems_solved: "",
    excluded_industries: "",
    additional_instructions: ""
  });
  const [loadingIcp, setLoadingIcp] = useState(false);
  const [savingIcp, setSavingIcp] = useState(false);

  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Gmail Integration State
  const [gmailStatus, setGmailStatus] = useState<GmailStatus | null>(null);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailActionLoading, setGmailActionLoading] = useState(false);

  // DNS Domain Health Check State
  const [dnsDomain, setDnsDomain] = useState("usmanai.com");
  const [dnsSelector, setDnsSelector] = useState("google");
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsResult, setDnsResult] = useState<DnsCheckData | null>(null);

  // Check URL query parameters for tab switches or OAuth callbacks
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "gmail") {
        setActiveTab("gmail");
      }
      const statusParam = params.get("status");
      const emailParam = params.get("email");
      const msgParam = params.get("message");
      if (statusParam === "connected") {
        setSavedMsg(`Gmail account connected successfully (${emailParam || "Authorized"}).`);
        setTimeout(() => setSavedMsg(null), 5000);
      } else if (statusParam === "error") {
        setSavedMsg(msgParam ? `Gmail Error: ${msgParam}` : "Gmail authorization was not completed.");
        setTimeout(() => setSavedMsg(null), 6000);
      }
    }
  }, []);

  // Load ICP on mount
  useEffect(() => {
    async function loadIcp() {
      setLoadingIcp(true);
      try {
        const res = await api.get<any>("/auth/icp");
        if (res && res.profile) {
          setIcp({
            business_name: res.profile.business_name || "",
            offer_description: res.profile.offer_description || "",
            website: res.profile.website || "",
            target_industries: res.profile.target_industries || "",
            target_company_sizes: res.profile.target_company_sizes || "",
            target_locations: res.profile.target_locations || "",
            ideal_customer_roles: res.profile.ideal_customer_roles || "",
            typical_problems_solved: res.profile.typical_problems_solved || "",
            excluded_industries: res.profile.excluded_industries || "",
            additional_instructions: res.profile.additional_instructions || ""
          });
        }
      } catch (e) {
        console.warn("Could not load ICP profile", e);
      } finally {
        setLoadingIcp(false);
      }
    }
    loadIcp();
  }, []);

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("usman_gtm_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const wsId = localStorage.getItem("usman_gtm_workspace_id");
      if (wsId) headers["X-Workspace-Id"] = wsId;
    }
    return headers;
  };

  // Fetch Gmail status when switching to "gmail" tab or on mount
  const fetchGmailStatus = async () => {
    setGmailLoading(true);
    try {
      const res = await fetch("/api/integrations/gmail/status", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data: GmailStatus = await res.json();
        setGmailStatus(data);
        if (data.account?.sender_email) {
          const parts = data.account.sender_email.split("@");
          if (parts.length === 2 && !dnsDomain) {
            setDnsDomain(parts[1]);
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch Gmail status", e);
    } finally {
      setGmailLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "gmail") {
      fetchGmailStatus();
    }
  }, [activeTab]);

  const handleConnectGmail = async () => {
    setGmailActionLoading(true);
    try {
      const res = await fetch("/api/integrations/gmail/url", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.configured && data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        alert(
          "Google OAuth credentials (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET) are not yet configured or pending propagation in production environment.\n\nPlease verify Vercel Project Settings > Environment Variables."
        );
      }
    } catch (e: any) {
      alert("Failed to initiate Google OAuth: " + (e.message || "Unknown error"));
    } finally {
      setGmailActionLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!confirm("Are you sure you want to disconnect your Gmail account from USMAN AI GTM?")) return;
    setGmailActionLoading(true);
    try {
      const res = await fetch("/api/integrations/gmail/disconnect", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setSavedMsg("Gmail account disconnected.");
        setTimeout(() => setSavedMsg(null), 3500);
        await fetchGmailStatus();
      }
    } catch (e: any) {
      alert("Failed to disconnect Gmail: " + (e.message || "Unknown error"));
    } finally {
      setGmailActionLoading(false);
    }
  };

  const handleRunDnsCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!dnsDomain.trim()) return;
    setDnsLoading(true);
    try {
      const res = await fetch(`/api/integrations/dns-check?domain=${encodeURIComponent(dnsDomain.trim())}&selector=${encodeURIComponent(dnsSelector.trim())}`);
      if (res.ok) {
        const data: DnsCheckData = await res.json();
        setDnsResult(data);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to check DNS records.");
      }
    } catch (err: any) {
      alert("DNS check error: " + (err.message || "Network error"));
    } finally {
      setDnsLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErr(null);
    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      setProfileErr("Full name must be at least 2 characters.");
      return;
    }
    setSavingProfile(true);
    try {
      await api.patch("/auth/profile", { full_name: cleanName });
      await refreshUser();
      setSavedMsg("Profile display name updated. Your permanent username remains unchanged.");
      setTimeout(() => setSavedMsg(null), 4000);
    } catch (err: any) {
      setProfileErr(err?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (!oldPassword) {
      setPwdError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPwdError("New password must be at least 8 characters long.");
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(newPassword)) {
      setPwdError("New password must include letters plus at least one number or special character.");
      return;
    }
    if (newPassword === oldPassword) {
      setPwdError("New password must be different from your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("New password and confirm password do not match.");
      return;
    }

    setChangingPwd(true);
    try {
      await changePassword(oldPassword, newPassword, confirmPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwdSuccess("Password updated successfully. Other active sessions have been signed out while your current session stays active.");
      setSavedMsg("Password updated and verified cleanly.");
      setTimeout(() => setSavedMsg(null), 4500);
    } catch (err: any) {
      setPwdError(err?.message || "Failed to update password. Verify your current password and try again.");
    } finally {
      setChangingPwd(false);
    }
  };

  const handleSaveIcp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingIcp(true);
    try {
      await api.post("/auth/icp", icp);
      setSavedMsg("Ideal Customer Profile saved. Lead fit scores will evaluate against this criteria.");
    } catch (err: any) {
      setSavedMsg(err.message || "Failed to save ICP");
    } finally {
      setSavingIcp(false);
      setTimeout(() => setSavedMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {savedMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-500/30 bg-[#0c121e] px-4 py-3 text-xs text-white shadow-glass flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white">Settings & Preferences</h1>
        <p className="text-xs text-slate-400">
          Manage your account profile, Ideal Customer Profile (ICP), Gmail outreach integration, and security controls.
        </p>
      </div>

      {/* TABS */}
      <div className="flex rounded-xl bg-white/[0.03] border border-white/10 p-1 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex-1 min-w-[90px] py-2 rounded-lg font-bold transition-all ${activeTab === "profile" ? "bg-blue-600 text-white shadow-glow-sm" : "text-slate-400 hover:text-white"
            }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab("icp")}
          className={`flex-1 min-w-[130px] py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === "icp" ? "bg-blue-600 text-white shadow-glow-sm" : "text-slate-400 hover:text-white"
            }`}
        >
          <Target className="h-3.5 w-3.5" />
          <span>My Business & ICP</span>
        </button>
        <button
          onClick={() => setActiveTab("gmail")}
          className={`flex-1 min-w-[150px] py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === "gmail" ? "bg-blue-600 text-white shadow-glow-sm" : "text-slate-400 hover:text-white"
            }`}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>Gmail & Domain Health</span>
        </button>
        <button
          onClick={() => setActiveTab("workspace")}
          className={`flex-1 min-w-[90px] py-2 rounded-lg font-bold transition-all ${activeTab === "workspace" ? "bg-blue-600 text-white shadow-glow-sm" : "text-slate-400 hover:text-white"
            }`}
        >
          Workspace
        </button>
        <button
          onClick={() => setActiveTab("vault")}
          className={`flex-1 min-w-[100px] py-2 rounded-lg font-bold transition-all ${activeTab === "vault" ? "bg-blue-600 text-white shadow-glow-sm" : "text-slate-400 hover:text-white"
            }`}
        >
          API Key Vault
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex-1 min-w-[110px] py-2 rounded-lg font-bold transition-all ${activeTab === "security" ? "bg-blue-600 text-white shadow-glow-sm" : "text-slate-400 hover:text-white"
            }`}
        >
          Security & Access
        </button>
      </div>

      {/* TAB CONTENT: PROFILE & CHANGE PASSWORD */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User className="h-4 w-4 text-blue-400" /> Account Identity
              </h2>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 flex items-center gap-1">
                <Lock className="h-3 w-3 text-amber-400" />
                <span>Permanent Account Username</span>
              </span>
            </div>

            {profileErr && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{profileErr}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Permanent Username (Login ID)</span>
                  <span className="text-[10px] text-amber-400 font-normal">Assigned by Owner • Cannot Be Changed</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={user?.username || user?.email || ""}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.015] px-3.5 py-2 text-xs font-mono text-slate-300 cursor-not-allowed"
                  />
                  <Lock className="h-3.5 w-3.5 text-slate-500 absolute right-3.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  readOnly
                  value={user?.email || ""}
                  className="w-full rounded-xl border border-white/5 bg-white/[0.01] px-3.5 py-2 text-xs text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-glow-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingProfile ? "Saving..." : "Save Display Name"}
                </button>
              </div>
            </form>
          </div>

          {/* CHANGE PASSWORD SECTION */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/[0.06]">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-400" /> Change Password
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Update your password securely anytime. All other active sessions are signed out automatically when your password changes.
                </p>
              </div>
            </div>

            {pwdError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{pwdError}</span>
              </div>
            )}
            {pwdSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{pwdSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="settings-cur-pwd" className="block text-xs font-semibold text-slate-300 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="settings-cur-pwd"
                    type={showOldPwd ? "text" : "password"}
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 pr-10 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPwd((v) => !v)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-white cursor-pointer"
                    aria-label="Toggle current password visibility"
                  >
                    {showOldPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-new-pwd" className="block text-xs font-semibold text-slate-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="settings-new-pwd"
                      type={showNewPwd ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 chars, letters + numbers/symbols"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 pr-10 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd((v) => !v)}
                      className="absolute right-3 top-2 text-slate-400 hover:text-white cursor-pointer"
                      aria-label="Toggle new password visibility"
                    >
                      {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="settings-conf-pwd" className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    id="settings-conf-pwd"
                    type={showNewPwd ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                <span className="text-[11px] text-slate-500">
                  Forgot a temporary password? Contact your Workspace Owner for a secure password reset.
                </span>
                <button
                  type="submit"
                  disabled={changingPwd}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-glow-sm disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>{changingPwd ? "Updating..." : "Update Password"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB CONTENT: MY BUSINESS & ICP */}
      {activeTab === "icp" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-400" /> My Business & Ideal Customers
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Describe what you offer and who you want to reach. The scoring system evaluates discovered leads against these parameters to calculate explainable fit scores.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveIcp} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">My Business or Service Name</label>
                <input
                  type="text"
                  required
                  value={icp.business_name}
                  onChange={(e) => setIcp({ ...icp, business_name: e.target.value })}
                  placeholder="e.g. Acme Data Solutions, Usman Analytics"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">My Website (Optional)</label>
                <input
                  type="text"
                  value={icp.website}
                  onChange={(e) => setIcp({ ...icp, website: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">What I Offer (Services & Value Proposition)</label>
              <textarea
                rows={3}
                required
                value={icp.offer_description}
                onChange={(e) => setIcp({ ...icp, offer_description: e.target.value })}
                placeholder="e.g. We help dental clinics and private medical practices automate patient follow-ups, reduce appointment no-shows by 40%, and scale local patient acquisition..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Industries / Niches</label>
                <input
                  type="text"
                  value={icp.target_industries}
                  onChange={(e) => setIcp({ ...icp, target_industries: e.target.value })}
                  placeholder="e.g. Dental Clinics, Private Healthcare, Wellness, Cosmetic Surgery"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Locations / Regions</label>
                <input
                  type="text"
                  value={icp.target_locations}
                  onChange={(e) => setIcp({ ...icp, target_locations: e.target.value })}
                  placeholder="e.g. London, Manchester, UK, New York, Texas, United States"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Company Sizes</label>
                <input
                  type="text"
                  value={icp.target_company_sizes}
                  onChange={(e) => setIcp({ ...icp, target_company_sizes: e.target.value })}
                  placeholder="e.g. 5-20 staff, 1-3 clinic locations, Independent practitioners"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ideal Decision Maker Roles</label>
                <input
                  type="text"
                  value={icp.ideal_customer_roles}
                  onChange={(e) => setIcp({ ...icp, ideal_customer_roles: e.target.value })}
                  placeholder="e.g. Practice Owner, Managing Director, VP of Sales, Head of Ops"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Typical Customer Problems I Solve</label>
              <textarea
                rows={2}
                value={icp.typical_problems_solved}
                onChange={(e) => setIcp({ ...icp, typical_problems_solved: e.target.value })}
                placeholder="e.g. Disorganized lead data, manual reporting bottlenecks, missing KPI visibility, low outreach conversion..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Excluded Industries or Companies</label>
                <input
                  type="text"
                  value={icp.excluded_industries}
                  onChange={(e) => setIcp({ ...icp, excluded_industries: e.target.value })}
                  placeholder="e.g. Adult, Gambling, Government, MLM"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Additional AI Scoring Instructions</label>
                <input
                  type="text"
                  value={icp.additional_instructions}
                  onChange={(e) => setIcp({ ...icp, additional_instructions: e.target.value })}
                  placeholder="e.g. Prioritize clinics with active booking or public email addresses"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingIcp}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-glow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {savingIcp ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save Ideal Customer Profile</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT: GMAIL & DOMAIN HEALTH */}
      {activeTab === "gmail" && (
        <div className="space-y-6">
          {/* SECTION 1: GMAIL CONNECTION */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Mail className="h-4 w-4 text-rose-400" /> Gmail Account Connection
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Connect your personal or business Gmail account via official Google OAuth 2.0 to send verified cold outreach emails directly from your own inbox.
                </p>
              </div>
              <button
                onClick={fetchGmailStatus}
                disabled={gmailLoading}
                className="p-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-slate-400 hover:text-white transition-colors"
                title="Refresh Status"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${gmailLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Connection Status Box */}
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-base ${(gmailStatus?.status_code === "CONNECTED" || (gmailStatus?.connected && gmailStatus?.status_code !== "RECONNECT_REQUIRED"))
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : gmailStatus?.status_code === "RECONNECT_REQUIRED"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : gmailStatus?.status_code === "CONFIGURATION_ERROR" || !gmailStatus?.configured
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-white/[0.05] text-slate-400 border border-white/10"
                    }`}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {gmailStatus?.connected && gmailStatus?.account?.sender_email
                          ? gmailStatus.account.sender_email
                          : "Google Gmail Integration"}
                      </span>

                      {/* Explicit Requirement: CONNECTED, NOT CONNECTED, CONFIGURATION ERROR, RECONNECT REQUIRED */}
                      {(gmailStatus?.status_code === "CONNECTED" || (gmailStatus?.connected && gmailStatus?.status_code !== "RECONNECT_REQUIRED")) ? (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>CONNECTED</span>
                        </span>
                      ) : gmailStatus?.status_code === "RECONNECT_REQUIRED" ? (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>RECONNECT REQUIRED</span>
                        </span>
                      ) : (gmailStatus?.status_code === "CONFIGURATION_ERROR" || !gmailStatus?.configured) ? (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>CONFIGURATION ERROR</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                          NOT CONNECTED
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {(gmailStatus?.status_code === "CONNECTED" || (gmailStatus?.connected && gmailStatus?.status_code !== "RECONNECT_REQUIRED")) ? (
                        <span>Authorized sender: <strong className="text-white">{gmailStatus?.account?.sender_name || "Sales Outreach"}</strong> · Daily quota: <strong className="text-white">{gmailStatus?.account?.daily_limit || 500} emails/day</strong></span>
                      ) : gmailStatus?.status_code === "RECONNECT_REQUIRED" ? (
                        <span className="text-amber-300">Previous OAuth session has expired or requires consent renewal. Click Reconnect below.</span>
                      ) : (gmailStatus?.status_code === "CONFIGURATION_ERROR" || !gmailStatus?.configured) ? (
                        <span className="text-rose-300">Google OAuth credentials are pending redeployment propagation on Vercel.</span>
                      ) : (
                        <span>Ready to authorize. Click Connect to authorize your personal or business Gmail address.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(gmailStatus?.status_code === "CONNECTED" || (gmailStatus?.connected && gmailStatus?.status_code !== "RECONNECT_REQUIRED")) ? (
                    <>
                      <button
                        onClick={handleDisconnectGmail}
                        disabled={gmailActionLoading}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        {gmailActionLoading ? "Disconnecting..." : "Disconnect Gmail"}
                      </button>
                      <button
                        onClick={handleConnectGmail}
                        disabled={gmailActionLoading}
                        className="px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Switch Account
                      </button>
                    </>
                  ) : gmailStatus?.status_code === "RECONNECT_REQUIRED" ? (
                    <button
                      onClick={handleConnectGmail}
                      disabled={gmailActionLoading}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-glow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${gmailActionLoading ? "animate-spin" : ""}`} />
                      <span>{gmailActionLoading ? "Connecting..." : "Reconnect Gmail"}</span>
                    </button>
                  ) : (gmailStatus?.status_code === "CONFIGURATION_ERROR" || !gmailStatus?.configured) ? (
                    <button
                      onClick={fetchGmailStatus}
                      disabled={gmailLoading}
                      className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-bold text-xs border border-white/10 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${gmailLoading ? "animate-spin" : ""}`} />
                      <span>Re-check Configuration</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectGmail}
                      disabled={gmailActionLoading}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-glow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{gmailActionLoading ? "Redirecting to Google..." : "Connect Gmail Account"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cost & Quota Notes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/[0.04] text-[11px]">
                <div className="text-slate-400">
                  <span className="text-slate-200 font-semibold">Monthly Service Cost:</span> $0 / month (Included free)
                </div>
                <div className="text-slate-400">
                  <span className="text-slate-200 font-semibold">Standard Gmail Daily Cap:</span> 500 emails / day
                </div>
                <div className="text-slate-400">
                  <span className="text-slate-200 font-semibold">Google Workspace Daily Cap:</span> 2,000 emails / day
                </div>
              </div>
            </div>

            {/* Scope & Compliance Notice */}
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> Official OAuth 2.0 Security Scope
              </div>
              <p className="text-[11px] leading-relaxed">
                USMAN AI GTM strictly requests the <code className="text-slate-300 font-mono">https://www.googleapis.com/auth/gmail.send</code> permission to deliver messages you explicitly review and approve. Your inbox emails are never read, analyzed, or shared.
              </p>
            </div>
          </div>

          {/* SECTION 2: SENDER DOMAIN HEALTH CHECK */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-400" /> Sender Domain Deliverability Health Check
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Verify that your domain records comply with 2024 Google & Yahoo inbox deliverability standards (MX, SPF, DMARC, DKIM) to ensure cold outreach lands in primary inboxes rather than spam folders.
                </p>
              </div>
            </div>

            {/* Domain Input Form */}
            <form onSubmit={handleRunDnsCheck} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Outreach Sending Domain</label>
                  <input
                    type="text"
                    required
                    value={dnsDomain}
                    onChange={(e) => setDnsDomain(e.target.value)}
                    placeholder="e.g. usmanai.com or yourcompany.com"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">DKIM Selector (Optional)</label>
                  <input
                    type="text"
                    value={dnsSelector}
                    onChange={(e) => setDnsSelector(e.target.value)}
                    placeholder="google"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={dnsLoading || !dnsDomain.trim()}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-glow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {dnsLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  <span>{dnsLoading ? "Querying DNS Records..." : "Check Domain Deliverability"}</span>
                </button>
              </div>
            </form>

            {/* DNS Results View */}
            {dnsResult && (
              <div className="space-y-4 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-300 font-semibold">
                    DNS Health Report for <span className="font-mono text-white">{dnsResult.domain}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">Deliverability Grade:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${dnsResult.overall === "EXCELLENT"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : dnsResult.overall === "GOOD"
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}>
                      {dnsResult.overall}
                    </span>
                  </div>
                </div>

                {/* 4 Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* MX Record Card */}
                  <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-blue-400" /> MX (Mail Routing)
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${dnsResult.mx.status === "PASS"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/20 text-rose-400"
                        }`}>
                        {dnsResult.mx.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">{dnsResult.mx.summary}</p>
                    {dnsResult.mx.records.length > 0 && (
                      <div className="font-mono text-[10px] text-slate-300 bg-black/30 p-1.5 rounded max-h-16 overflow-y-auto">
                        {dnsResult.mx.records.slice(0, 2).map((r, i) => (
                          <div key={i}>{r}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SPF Record Card */}
                  <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-emerald-400" /> SPF (Sender Policy)
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${dnsResult.spf.status === "PASS"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                        }`}>
                        {dnsResult.spf.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">{dnsResult.spf.summary}</p>
                    {dnsResult.spf.record && (
                      <div className="font-mono text-[10px] text-emerald-300 bg-black/30 p-1.5 rounded truncate">
                        {dnsResult.spf.record}
                      </div>
                    )}
                  </div>

                  {/* DMARC Record Card */}
                  <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-purple-400" /> DMARC Policy
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${dnsResult.dmarc.status === "PASS"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                        }`}>
                        {dnsResult.dmarc.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">{dnsResult.dmarc.summary}</p>
                    {dnsResult.dmarc.record && (
                      <div className="font-mono text-[10px] text-purple-300 bg-black/30 p-1.5 rounded truncate">
                        {dnsResult.dmarc.record}
                      </div>
                    )}
                  </div>

                  {/* DKIM Record Card */}
                  <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-amber-400" /> DKIM Signature ({dnsResult.dkim.selector})
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${dnsResult.dkim.status === "PASS"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                        }`}>
                        {dnsResult.dkim.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">{dnsResult.dkim.summary}</p>
                    {dnsResult.dkim.record && (
                      <div className="font-mono text-[10px] text-amber-300 bg-black/30 p-1.5 rounded truncate">
                        {dnsResult.dkim.record}
                      </div>
                    )}
                  </div>
                </div>

                {/* Practical Guidance */}
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-200">Plain English Deliverability Recommendation:</div>
                  <p className="text-[11px] leading-relaxed">
                    If SPF or DMARC is flagged as &apos;NEEDS ATTENTION&apos;, add these two TXT records in your DNS provider (Cloudflare, GoDaddy, Namecheap):
                  </p>
                  <ul className="text-[11px] list-disc list-inside space-y-0.5 text-slate-300 font-mono mt-1">
                    <li>Root Domain TXT: <span className="text-emerald-400">v=spf1 include:_spf.google.com ~all</span></li>
                    <li>Subdomain <span className="text-purple-400">_dmarc.{dnsResult.domain}</span> TXT: <span className="text-emerald-400">v=DMARC1; p=none;</span></li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: WORKSPACE */}
      {activeTab === "workspace" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building className="h-4 w-4 text-purple-400" /> Active Organization Workspace
          </h2>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Workspace Name:</span>
              <span className="text-white font-bold">{activeWorkspace?.name || "Primary Enterprise Workspace"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Subscription Plan:</span>
              <span className="text-emerald-400 font-bold">{activeWorkspace?.plan || "Enterprise"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Workspace Isolation:</span>
              <span className="text-blue-400 font-bold">Strict Single-Tenant Isolation</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ENGINE STATUS (Masked / Read-Only Security View for Workspace Members) */}
      {activeTab === "vault" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-400" /> Platform Intelligence &amp; Credential Security
            </h2>
            <span className="text-[10px] text-emerald-400 font-mono">Server-Managed &amp; Protected</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            All search, speech comprehension, and intelligence engine keys are securely managed strictly on protected backend servers and never exposed to browsers. Connect your personal outreach Gmail mailbox safely from{" "}
            <Link href="/app/accounts" className="text-blue-400 hover:underline font-semibold">
              Email Accounts
            </Link>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-slate-400 text-[11px]">Lead Search &amp; Contact Engine</div>
              <div className="text-emerald-400 font-bold mt-1 font-mono">Configured (Server-Side)</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-slate-400 text-[11px]">Intelligent Outreach &amp; Voice Engine</div>
              <div className="text-emerald-400 font-bold mt-1 font-mono">Configured (Server-Side)</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SECURITY & ACCESS */}
      {activeTab === "security" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" /> Security & Account Protection
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Plain-language overview of how your workspace identity, password, and credentials are protected.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <KeyRound className="h-4 w-4 text-amber-400" />
                <span>Permanent Username: <span className="font-mono text-amber-300">{user?.username || user?.email}</span></span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Your username cannot be modified by users. You can update your password anytime from Account Profile.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
            >
              Go to Change Password
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <div className="text-slate-400 font-semibold">How passwords are protected</div>
              <div className="text-white font-bold">Salted PBKDF2-HMAC-SHA256 (100,000 iterations)</div>
              <p className="text-[11px] text-slate-400">Passwords are never stored in plain text and cannot be decrypted even by system administrators.</p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <div className="text-slate-400 font-semibold">How your login stays protected</div>
              <div className="text-white font-bold">Cryptographic Session Tokens (24h Rolling Refresh)</div>
              <p className="text-[11px] text-slate-400">Secure tokens protect your session and automatically expire upon prolonged inactivity or logout.</p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <div className="text-slate-400 font-semibold">How integration credentials are protected</div>
              <div className="text-white font-bold">Neon PostgreSQL Vault & Token Encryption</div>
              <p className="text-[11px] text-slate-400">OAuth tokens and API secrets are stored server-side and never exposed to the client browser.</p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <div className="text-slate-400 font-semibold">Who can view or change information</div>
              <div className="text-emerald-400 font-bold">Strict Workspace Isolation</div>
              <p className="text-[11px] text-slate-400">Each organization workspace is isolated; no user can view or modify leads from another workspace.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
