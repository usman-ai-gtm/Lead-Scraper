"use client";

import React, { useState } from "react";
import { MessageSquare, ExternalLink, ShieldCheck, X, Copy, Check } from "lucide-react";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    business_name: string;
    phone?: string;
    country?: string;
    website?: string;
  } | null;
}

export function WhatsAppModal({ isOpen, onClose, lead }: WhatsAppModalProps) {
  const [customMessage, setCustomMessage] = useState(
    `Hi ${lead?.business_name || "there"}, I came across your business online and wanted to check if you are currently open to new client partnerships?`
  );
  const [copied, setCopied] = useState(false);

  if (!isOpen || !lead || !lead.phone) return null;

  // Normalize phone for WhatsApp wa.me link
  const rawDigits = lead.phone.replace(/\D/g, "");
  const waUrl = `https://wa.me/${rawDigits}?text=${encodeURIComponent(customMessage)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    window.open(waUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-[#0e161f] p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Safe WhatsApp Outreach (wa.me)</h3>
              <p className="text-[11px] text-slate-400">Direct click-to-chat • 100% compliant with WhatsApp terms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Lead Target Info */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Recipient Business:</span>
            <span className="font-semibold text-white">{lead.business_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Phone Number:</span>
            <span className="font-mono text-emerald-400">{lead.phone}</span>
          </div>
          {lead.country && (
            <div className="flex justify-between">
              <span className="text-slate-400">Country:</span>
              <span className="text-slate-200">{lead.country}</span>
            </div>
          )}
        </div>

        {/* Customizable Message */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200">Personalize Your Message:</label>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copied" : "Copy text"}</span>
            </button>
          </div>
          <textarea
            rows={4}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white focus:outline-none focus:border-emerald-500 custom-scrollbar resize-none"
            placeholder="Type your message..."
          />
        </div>

        {/* Compliance Note */}
        <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            This opens WhatsApp Web or WhatsApp Desktop in your browser using official <code className="text-emerald-300 font-mono">wa.me</code> click-to-chat. It does not automate, harvest, or trigger account bans.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Open in WhatsApp</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
