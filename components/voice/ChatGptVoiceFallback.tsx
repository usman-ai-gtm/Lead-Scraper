"use client";

import React, { useState } from "react";
import { Copy, Check, ExternalLink, Sparkles } from "lucide-react";

const DEFAULT_SHORT_INSTRUCTION =
  "Copy the instruction below, open ChatGPT, start a new chat, and use its Voice feature. Speak naturally in your own language. When finished, ChatGPT will convert your complete message into clear English. Copy the result and paste it here.";

const DEFAULT_BUSINESS_PROFILE_PROMPT = `You are helping me complete my business profile for a professional B2B business lead-generation platform.

I may describe my business in Urdu, Hindi, Punjabi, Arabic, German, English, Chinese, or another language.

Understand everything I have said, including the voice transcription and all relevant previous messages in this chat.

Rewrite my complete business description in clear, natural English.

IMPORTANT:
- Preserve my actual meaning.
- Do not summarize away important details.
- Do not invent business information.
- Do not change company names, numbers, services, products, countries, or other facts.
- Explain what my business actually does.
- Identify the products and services I offer.
- Identify the types of customers I want.
- Identify my target countries and markets.
- Identify what makes my business different, if mentioned.
- Identify my business goals.
- Identify my preferred communication style, if mentioned.

If an important business detail is missing or unclear, ask me a short, simple follow-up question before producing the final description.

Do not ask unnecessary questions. Ask only about information that genuinely matters.

When enough information is available, return one complete, well-organized English business description in paragraph form.

Also identify any important information that remains unknown.

The final English description must be suitable for pasting directly into a Business Profile form so that another AI system can extract structured business information from it.

Do not return fake information or unnecessary technical terminology.`;

export interface ChatGptVoiceFallbackProps {
  title?: string;
  shortInstruction?: string;
  promptInstruction?: string;
  targetFieldLabel?: string;
}

export function ChatGptVoiceFallback({
  title = "Option: Use ChatGPT to describe your business",
  shortInstruction = DEFAULT_SHORT_INSTRUCTION,
  promptInstruction = DEFAULT_BUSINESS_PROFILE_PROMPT,
  targetFieldLabel = "the text box here",
}: ChatGptVoiceFallbackProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptInstruction);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = promptInstruction;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div
      data-testid="chatgpt-voice-card"
      className="rounded-xl border border-emerald-500/25 bg-[#091214]/90 p-4 space-y-3"
    >
      <div className="space-y-1">
        <div className="text-xs font-bold text-emerald-200 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>{title}</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          {shortInstruction}
        </p>
      </div>

      {/* Directly visible prompt text — zero accordion or extra click */}
      <pre
        aria-label="ChatGPT Instruction"
        className="w-full max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-black/50 p-3 text-[11px] font-mono text-slate-200 leading-relaxed select-all"
      >
        {promptInstruction}
      </pre>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={handleCopyPrompt}
          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? "Copied! Now click Open ChatGPT" : "Copy ChatGPT Instruction"}</span>
        </button>

        <a
          href="https://chatgpt.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
        >
          <span>Open ChatGPT</span>
          <ExternalLink className="h-3.5 w-3.5 text-emerald-300" />
        </a>

        <span className="text-[10px] text-slate-400">
          Paste ChatGPT&apos;s English result into {targetFieldLabel}.
        </span>
      </div>
    </div>
  );
}
