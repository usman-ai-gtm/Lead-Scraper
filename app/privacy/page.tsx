"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import {
  ShieldCheck, Lock, EyeOff, KeyRound, ArrowLeft,
  Clock, FileCheck2, Send, CheckCircle2, AlertCircle
} from "lucide-react";

export default function PrivacyPage() {
  const [requestType, setRequestType] = useState<"ACCESS" | "DELETION" | "OPTOUT" | "CORRECTION">("DELETION");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<{ ticketId?: string; message?: string; error?: string } | null>(null);

  const handleDsrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTicketResult(null);
    try {
      const res = await fetch("/api/privacy/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_type: requestType,
          requester_email: requesterEmail,
          requester_name: requesterName,
          target_email: targetEmail || requesterEmail,
          details,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTicketResult({ error: data.error || "Unable to submit request." });
      } else {
        setTicketResult({
          ticketId: data.ticket_id,
          message: data.message || "Request received.",
        });
        setRequesterEmail("");
        setRequesterName("");
        setTargetEmail("");
        setDetails("");
      }
    } catch {
      setTicketResult({ error: "Network error submitting request." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      <main className="flex-1 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400 mb-4">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>DATA PRIVACY, RETENTION &amp; DSR PORTAL</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-400 mb-12">
            Last updated: November 2026 • Google API Limited Use Compliance, Data Retention &amp; GDPR/CCPA Subject Rights.
          </p>

          <div className="space-y-10 text-sm text-slate-300 leading-relaxed">
            {/* Section 1 */}
            <section className="p-6 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-400" />
                <span>1. Google OAuth, Gmail API Data Usage &amp; Limited Use Compliance</span>
              </h2>
              <p>
                USMAN AI GTM (Lead Scraper) uses Google OAuth 2.0 both for account sign-in (<code className="text-xs bg-white/10 px-1 py-0.5 rounded">openid</code>, <code className="text-xs bg-white/10 px-1 py-0.5 rounded">email</code>, <code className="text-xs bg-white/10 px-1 py-0.5 rounded">profile</code>) and to let authorized customers connect their own Gmail accounts for explicit 1-to-1 cold business outreach.
              </p>
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-200 leading-relaxed">
                <strong>Google API Services User Data Policy — Limited Use Disclosure:</strong> USMAN AI GTM&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold text-white"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
                <li><strong className="text-white">Least-Privileged Sending Scope Only:</strong> When you connect a sending mailbox, we request only <code className="text-xs bg-white/10 px-1 py-0.5 rounded">https://www.googleapis.com/auth/gmail.send</code> and <code className="text-xs bg-white/10 px-1 py-0.5 rounded">https://www.googleapis.com/auth/userinfo.email</code>. We never request permissions to read, modify, index, or delete emails in your Gmail inbox.</li>
                <li><strong className="text-white">Strictly User-Initiated Sending:</strong> The <code className="text-xs bg-white/10 px-1 py-0.5 rounded">gmail.send</code> permission is used solely to transmit emails you explicitly compose, review, and click to send from your workspace.</li>
                <li><strong className="text-white">No AI Training or Ad Broker Sharing:</strong> We never use Google Workspace / Gmail API data or tokens to train generalized AI/ML models, and we never sell, rent, or transfer Google user data to third-party advertisers or data brokers.</li>
                <li><strong className="text-white">Token Encryption &amp; Workspace Isolation:</strong> OAuth access and refresh tokens are encrypted at rest with AES-256-GCM authenticated encryption in PostgreSQL and isolated strictly to your authenticated workspace.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="p-6 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <EyeOff className="h-5 w-5 text-blue-400" />
                <span>2. Public Business Directory Data &amp; Provider Attribution</span>
              </h2>
              <p>
                Lead records surfaced by Find Leads and Google Maps discovery come from publicly accessible commercial web pages, Google Places search results via Serper API, and public business profiles. Every record retains original source evidence URLs, collection timestamps, and honest contact verification classifications (distinguishing syntax validation vs DNS MX domain resolution without misrepresenting unverified mailbox delivery).
              </p>
              <p className="text-xs text-slate-400">
                Subprocessors used strictly for runtime functionality include Vercel (application hosting), Neon PostgreSQL (database storage), Serper API (live search &amp; Places queries), and Google Gemini API (AI text drafts &amp; research summaries).
              </p>
            </section>

            {/* Section 3 */}
            <section className="p-6 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-purple-400" />
                <span>3. Token Revocation &amp; Account Disconnection</span>
              </h2>
              <p>
                You may disconnect any connected Gmail account at any time from <strong className="text-white">Email Accounts</strong> inside your dashboard (which revokes the token with Google OAuth and removes stored encrypted credentials from our database), or directly from your{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Google Account Third-Party Permissions
                </a>
                .
              </p>
            </section>

            {/* Section 4 */}
            <section className="p-6 rounded-2xl bg-[#0c1017] border border-white/[0.08] space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                <span>4. Data Retention &amp; Deletion Schedule</span>
              </h2>
              <ul className="list-disc list-inside space-y-1.5 text-slate-400 pl-2">
                <li><strong className="text-white">Gmail OAuth Tokens:</strong> Deleted immediately upon mailbox disconnection or workspace deletion.</li>
                <li><strong className="text-white">Workspace Saved Leads &amp; Search History:</strong> Retained while your workspace remains active; deleted immediately upon manual bulk delete, account deletion, or fulfilled Data Subject Request.</li>
                <li><strong className="text-white">Suppression Lists &amp; Opt-Outs:</strong> Email &amp; WhatsApp opt-out records are preserved intentionally per workspace so opted-out recipients are not contacted again.</li>
                <li><strong className="text-white">Payment Proofs &amp; Security Audit Logs:</strong> Payment verification records and security audit entries are retained up to 12 months for accounting and fraud-prevention compliance.</li>
              </ul>
            </section>

            {/* Section 5: Interactive GDPR/CCPA DSR Form */}
            <section id="dsr" className="p-6 rounded-2xl bg-[#0c121e] border border-blue-500/25 space-y-4">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-bold text-white">5. Submit a Privacy or Data Subject Request (GDPR / CCPA)</h2>
              </div>
              <p className="text-xs text-slate-400">
                Use this form to request data access, correction, permanent deletion of your contact information, or placement on outreach suppression lists. We also respond via{" "}
                <a href="mailto:telegramtiktokn1@gmail.com" className="text-blue-400 hover:underline">
                  telegramtiktokn1@gmail.com
                </a>{" "}
                or WhatsApp (+923174383702).
              </p>

              <form onSubmit={handleDsrSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dsr-type" className="block text-xs font-semibold text-slate-300 mb-1">
                      Request Type
                    </label>
                    <select
                      id="dsr-type"
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value as any)}
                      className="w-full rounded-xl border border-white/10 bg-[#07090e] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="DELETION">Data Deletion (Erasure)</option>
                      <option value="OPTOUT">Outreach Opt-Out / Do Not Contact</option>
                      <option value="ACCESS">Data Access / Export Copy</option>
                      <option value="CORRECTION">Data Rectification / Correction</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="dsr-name" className="block text-xs font-semibold text-slate-300 mb-1">
                      Your Name (Optional)
                    </label>
                    <input
                      id="dsr-name"
                      type="text"
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      placeholder="Full name or organization"
                      className="w-full rounded-xl border border-white/10 bg-[#07090e] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dsr-email" className="block text-xs font-semibold text-slate-300 mb-1">
                      Your Contact Email *
                    </label>
                    <input
                      id="dsr-email"
                      type="email"
                      required
                      value={requesterEmail}
                      onChange={(e) => setRequesterEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full rounded-xl border border-white/10 bg-[#07090e] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="dsr-target" className="block text-xs font-semibold text-slate-300 mb-1">
                      Target Business Email to Remove / Suppress
                    </label>
                    <input
                      id="dsr-target"
                      type="email"
                      value={targetEmail}
                      onChange={(e) => setTargetEmail(e.target.value)}
                      placeholder="Defaults to your contact email"
                      className="w-full rounded-xl border border-white/10 bg-[#07090e] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="dsr-details" className="block text-xs font-semibold text-slate-300 mb-1">
                    Request Details
                  </label>
                  <textarea
                    id="dsr-details"
                    rows={3}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Provide your domain, company name, or request notes..."
                    className="w-full rounded-xl border border-white/10 bg-[#07090e] px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {ticketResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                      ticketResult.error
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    }`}
                  >
                    {ticketResult.error ? (
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    )}
                    <div>
                      {ticketResult.ticketId && (
                        <div className="font-mono font-bold mb-0.5">Reference: {ticketResult.ticketId}</div>
                      )}
                      <div>{ticketResult.error || ticketResult.message}</div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{submitting ? "Submitting Request..." : "Submit Privacy Request"}</span>
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
