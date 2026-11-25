"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, ExternalLink, ShieldCheck, X, Copy, Check, CheckCircle2, AlertCircle } from "lucide-react";
import { normalizePhoneNumber, buildWhatsAppClickToChatUrl } from "@/lib/phone-utils";

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id?: number;
    business_name: string;
    phone?: string;
    country?: string;
    website?: string;
    whatsapp_status?: string;
  } | null;
  onStatusUpdated?: (leadId: number, status: "CONFIRMED" | "NOT_CONFIRMED" | "NOT_CHECKED") => void;
}

export function WhatsAppModal({ isOpen, onClose, lead, onStatusUpdated }: WhatsAppModalProps) {
  const [customMessage, setCustomMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [openedChat, setOpenedChat] = useState(false);

  useEffect(() => {
    if (lead) {
      setCustomMessage(
        `Hi ${lead.business_name || "there"}, I came across your business online and wanted to check if you are currently open to new client partnerships?`
      );
      setOpenedChat(false);
    }
  }, [lead?.id, lead?.business_name, isOpen]);

  if (!isOpen || !lead || !lead.phone) return null;

  const phoneCheck = normalizePhoneNumber(lead.phone, lead.country);
  const waUrl = phoneCheck.isValid
    ? buildWhatsAppClickToChatUrl(phoneCheck.normalized, customMessage)
    : `https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(customMessage)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    window.open(waUrl, "_blank", "noopener,noreferrer");
    setOpenedChat(true);
  };

  const handleMarkWhatsAppStatus = async (status: "CONFIRMED" | "NOT_CONFIRMED" | "NOT_CHECKED") => {
    if (!lead?.id) {
      onClose();
      return;
    }
    setSavingStatus(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && token !== "null" && token !== "undefined" ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ whatsapp_status: status }),
      });
      if (res.ok && onStatusUpdated) {
        onStatusUpdated(lead.id, status);
      }
      onClose();
    } catch {
      onClose();
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-[#0e161f] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">WhatsApp Click-to-Chat (wa.me)</h3>
              <p className="text-[11px] text-slate-400">Opens your own WhatsApp session • Manual verification only</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.05]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Recipient Business:</span>
            <span className="font-semibold text-white">{lead.business_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Raw / E.164 Formatted:</span>
            <span className="font-mono text-emerald-400">
              {phoneCheck.isValid ? phoneCheck.displayFormatted : lead.phone}
            </span>
          </div>
          {lead.country && (
            <div className="flex justify-between">
              <span className="text-slate-400">Country:</span>
              <span className="text-slate-200">{lead.country}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400">WhatsApp Registration Status:</span>
            <span className="font-mono text-[11px] text-amber-300">
              {lead.whatsapp_status === "CONFIRMED"
                ? "Confirmed Manually"
                : lead.whatsapp_status === "NOT_CONFIRMED"
                ? "Not Registered / Unconfirmed"
                : "Not Checked (Open WhatsApp to check)"}
            </span>
          </div>
        </div>

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

        <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            Official Meta WhatsApp Cloud API does not provide an unbilled phone registration check endpoint. Clicking <strong>Open in WhatsApp</strong> opens <code className="text-emerald-300 font-mono">wa.me</code> directly so you can confirm manually without account bans.
          </p>
        </div>

        {lead?.id && (
          <div className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-2">
            <div className="text-[11px] font-semibold text-slate-300">
              {openedChat ? "After checking in WhatsApp, record result:" : "Manual Verification Status:"}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savingStatus}
                onClick={() => handleMarkWhatsAppStatus("CONFIRMED")}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>WhatsApp Confirmed</span>
              </button>
              <button
                type="button"
                disabled={savingStatus}
                onClick={() => handleMarkWhatsAppStatus("NOT_CONFIRMED")}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <AlertCircle className="h-3 w-3" />
                <span>Not on WhatsApp</span>
              </button>
              <button
                type="button"
                disabled={savingStatus}
                onClick={() => handleMarkWhatsAppStatus("NOT_CHECKED")}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer disabled:opacity-50"
              >
                Reset to Not Checked
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/[0.05]"
          >
            Close
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
