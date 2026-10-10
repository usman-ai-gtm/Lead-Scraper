"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import OutreachNav from "@/components/outreach/OutreachNav";
import { useAuth } from "@/lib/auth-context";
import { ConnectedAccount } from "@/lib/types";
import {
  Mail, Plus, ShieldCheck, CheckCircle2, AlertCircle, Trash2,
  RefreshCw, Send, Sliders, ExternalLink, Inbox, Copy, Check, X,
  AlertTriangle, Lock, Sparkles, Key, Info
} from "lucide-react";

export default function OutreachAccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ConnectedAccount | null>(null);

  // Connect Gmail Form state
  const [newGmail, setNewGmail] = useState("");
  const [newSenderName, setNewSenderName] = useState("");
  const [newAppPassword, setNewAppPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Test Email state
  const [testRecipient, setTestRecipient] = useState("");
  const [testSubject, setTestSubject] = useState("USMAN AI GTM - Live Email Verification Test");
  const [testBody, setTestBody] = useState("Hello! This is a verified live email sent from USMAN AI GTM via Google SMTP.");
  const [testAppPassword, setTestAppPassword] = useState("");
  const [testSending, setTestSending] = useState(false);

  // Notifications
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load connected accounts from localStorage or initialize with user's own email
  useEffect(() => {
    try {
      const stored = localStorage.getItem("usman_connected_sending_accounts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAccounts(parsed);
          setLoading(false);
          return;
        }
      }

      // If user is logged in, initialize with their own email
      if (user?.email) {
        const initialUserAccount: ConnectedAccount = {
          id: Date.now(),
          account_type: "email",
          identifier: user.email,
          status: "CONNECTED",
          daily_limit: 50,
          sent_today: 0,
          workspace_id: 1,
          is_active: true,
        };
        setAccounts([initialUserAccount]);
        localStorage.setItem("usman_connected_sending_accounts", JSON.stringify([initialUserAccount]));
      } else {
        setAccounts([]);
      }
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const openTestModal = (acc: ConnectedAccount) => {
    setSelectedAccount(acc);
    setTestRecipient(user?.email || "");
    setTestAppPassword("");
    setTestModalOpen(true);
  };

  const handleDisconnect = (id: number, email: string) => {
    if (confirm(`Are you sure you want to disconnect ${email}?`)) {
      const updated = accounts.filter((a) => a.id !== id);
      setAccounts(updated);
      try {
        localStorage.setItem("usman_connected_sending_accounts", JSON.stringify(updated));
      } catch {}
      setToastMsg(`Account ${email} disconnected from sending pool.`);
    }
  };

  // Real verification and attachment of Gmail account
  const handleConnectGmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGmail || !newAppPassword) {
      setVerifyError("Please enter both your Gmail address and 16-character Google App Password.");
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const res = await fetch("/api/campaigns/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newGmail,
          name: newSenderName || user?.full_name || "Sales Outreach",
          app_password: newAppPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.status === "error") {
        setVerifyError(data.error || data.detail || "Google SMTP authentication failed.");
        setIsVerifying(false);
        return;
      }

      const newAcc: ConnectedAccount = {
        id: Date.now(),
        account_type: "email",
        identifier: newGmail.trim().toLowerCase(),
        status: "CONNECTED",
        daily_limit: 50,
        sent_today: 0,
        workspace_id: 1,
        is_active: true,
      };

      const updated = [newAcc, ...accounts.filter((a) => a.identifier.toLowerCase() !== newGmail.toLowerCase())];
      setAccounts(updated);

      try {
        localStorage.setItem("usman_connected_sending_accounts", JSON.stringify(updated));
        // Also save the app password locally for seamless test sends
        localStorage.setItem(`app_pwd_${newGmail.toLowerCase()}`, newAppPassword.trim());
      } catch {}

      setIsVerifying(false);
      setConnectModalOpen(false);
      setNewGmail("");
      setNewAppPassword("");
      setNewSenderName("");
      setToastMsg(`🎉 Live Gmail account connected: ${newAcc.identifier}`);
    } catch (err: any) {
      setVerifyError(err?.message || "Failed to contact Google SMTP server.");
      setIsVerifying(false);
    }
  };

  // Real Test Email Dispatch
  const handleSendRealTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !testRecipient) return;

    setTestSending(false);
    setTestSending(true);

    const savedPwd = localStorage.getItem(`app_pwd_${selectedAccount.identifier.toLowerCase()}`) || testAppPassword;

    try {
      const res = await fetch("/api/campaigns/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_email: selectedAccount.identifier,
          from_name: user?.full_name || "USMAN AI GTM",
          to_email: testRecipient,
          subject: testSubject,
          body: testBody,
          app_password: savedPwd,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.status === "error") {
        setToastMsg(`❌ Delivery error: ${data.error || data.detail || "Authentication failed"}`);
      } else {
        setToastMsg(`✅ Real email delivered to ${testRecipient}! Check your inbox.`);
        setTestModalOpen(false);
      }
    } catch (err: any) {
      setToastMsg(`❌ Error sending email: ${err?.message}`);
    } finally {
      setTestSending(false);
    }
  };

  const redirectUri = typeof window !== "undefined"
    ? `${window.location.origin}/api/auth/google/callback`
    : "https://lead-scraper-mxs5.vercel.app/api/auth/google/callback";

  return (
    <div className="space-y-6">
      <OutreachNav />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-blue-500/30 bg-[#0c121e] px-4 py-3 text-xs text-white shadow-glass flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-slate-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Gmail & Sending Accounts</h1>
          <p className="text-xs text-slate-400">
            Connect your real Google Workspace or personal Gmail accounts to send live outbound campaigns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setVerifyError(null);
              setConnectModalOpen(true);
            }}
            className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-glow-sm transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Connect Gmail Account</span>
          </button>
        </div>
      </div>

      {/* Accounts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading your sending accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0c1017] p-8 text-center space-y-3">
            <Mail className="h-10 w-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No Sending Accounts Connected</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              To send real emails that land in prospect inboxes, connect your Gmail account using your Google App Password.
            </p>
            <button
              onClick={() => setConnectModalOpen(true)}
              className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
            >
              + Connect Your Gmail
            </button>
          </div>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-4 rounded-2xl border border-white/10 bg-[#0c1017] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{acc.identifier}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      LIVE SMTP READY
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Safe Daily Volume: {acc.daily_limit} emails/day | Sent Today: {acc.sent_today}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openTestModal(acc)}
                  className="py-2 px-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white transition-all flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5 text-blue-400" />
                  <span>Send Real Test Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDisconnect(acc.id, acc.identifier)}
                  className="py-2 px-3 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Connect Gmail Modal (Real SMTP + App Password) */}
      {connectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c1017] p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setConnectModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <Mail className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Connect Live Gmail Account</h3>
                <p className="text-xs text-slate-400">Enables real email dispatch directly from your Gmail</p>
              </div>
            </div>

            {verifyError && (
              <div className="p-3 mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{verifyError}</span>
              </div>
            )}

            <form onSubmit={handleConnectGmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Your Gmail Address
                </label>
                <input
                  type="email"
                  required
                  value={newGmail}
                  onChange={(e) => setNewGmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={newSenderName}
                  onChange={(e) => setNewSenderName(e.target.value)}
                  placeholder="e.g. Muhammad Usman"
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-amber-400" />
                    <span>Google 16-Character App Password</span>
                  </label>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>Generate in Google</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <input
                  type="password"
                  required
                  value={newAppPassword}
                  onChange={(e) => setNewAppPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono tracking-wider"
                />
              </div>

              {/* Instructions Guide */}
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] text-slate-300 space-y-1">
                <div className="font-semibold text-blue-400 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  <span>How to get your Google App Password in 30 seconds:</span>
                </div>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                  <li>Open <strong>myaccount.google.com/apppasswords</strong></li>
                  <li>Under App Name, type <strong>USMAN AI GTM</strong> and click <strong>Create</strong></li>
                  <li>Copy the 16-letter password and paste it above!</li>
                </ol>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-white/10 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-glow-sm disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Verifying with Google...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Verify & Connect Gmail</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Verified Test Email Modal */}
      {testModalOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c1017] p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setTestModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Send Live Test Email</h3>
                <p className="text-xs text-slate-400">Sending real email from: {selectedAccount.identifier}</p>
              </div>
            </div>

            <form onSubmit={handleSendRealTestEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient Email (Where to send the test)
                </label>
                <input
                  type="email"
                  required
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="e.g. your_personal_email@gmail.com"
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message Body
                </label>
                <textarea
                  rows={4}
                  required
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/50 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-white/10 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={testSending}
                  className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-glow-sm disabled:opacity-50"
                >
                  {testSending ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending Real Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Dispatch Real Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
