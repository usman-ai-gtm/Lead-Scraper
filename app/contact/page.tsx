"use client";

import React, { useState } from "react";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Mail, Phone, MapPin, Send, CheckCircle2, Sparkles } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    teamSize: "10-50",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Header />

      <section className="py-20 lg:py-28 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              <span>DIRECT ENTERPRISE ENGAGEMENT</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-6">
              Connect With Our <span className="text-gradient">Solutions Team</span>
            </h1>

            <p className="text-lg text-slate-400">
              Have questions regarding custom enterprise data integrations, dedicated IP pools, or SLA guarantees? We are ready to help.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">
            {/* Contact Details */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-8 space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Direct Communication</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Our sales engineering team provides tailored architecture briefings and custom demo runs for enterprise revenue leaders.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <Mail className="h-6 w-6 text-blue-400" />
                  <div>
                    <div className="text-xs text-slate-400">Enterprise Inquiries</div>
                    <div className="text-sm font-semibold text-white">enterprise@usmanai.com</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <Phone className="h-6 w-6 text-emerald-400" />
                  <div>
                    <div className="text-xs text-slate-400">Direct Phone / WhatsApp</div>
                    <div className="text-sm font-semibold text-white">+1 (800) 876-2624</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <MapPin className="h-6 w-6 text-purple-400" />
                  <div>
                    <div className="text-xs text-slate-400">Headquarters</div>
                    <div className="text-sm font-semibold text-white">New York, NY • Global Remote Support</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-8">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Message Received</h3>
                  <p className="text-sm text-slate-400">
                    A dedicated enterprise solutions specialist will contact you within 2 business hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      placeholder="Alexander Vance"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Work Email</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                        placeholder="a.vance@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Company</label>
                      <input
                        type="text"
                        required
                        value={form.company}
                        onChange={(e) => setForm({ ...form, company: e.target.value })}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                        placeholder="Vance Technologies"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Sales / SDR Team Size</label>
                    <select
                      value={form.teamSize}
                      onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-[#0c1017] px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="1-5">1 - 5 Sales Reps</option>
                      <option value="6-20">6 - 20 Sales Reps</option>
                      <option value="21-50">21 - 50 Sales Reps</option>
                      <option value="50+">50+ Enterprise Team</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Scope or Objectives</label>
                    <textarea
                      rows={4}
                      required
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      placeholder="Tell us about your target accounts, prospecting volume, and current bottlenecks..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-glow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>Send Enterprise Inquiry</span>
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
