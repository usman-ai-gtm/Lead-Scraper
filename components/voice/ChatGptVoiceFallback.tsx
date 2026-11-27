"use client";

import React, { useState } from "react";
import { ExternalLink, Copy, Check, MessageSquare, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

const CHATGPT_VOICE_INSTRUCTION =
  "Listen to my complete spoken message in its original language. Understand the exact meaning and rewrite it in clear, natural English. Preserve all business details, names, numbers, services, requirements, and important information. Do not summarize, remove important details, or invent information. Return only the final English text.";

export function ChatGptVoiceFallback({
  targetFieldLabel = "the text box above",
}: {
  targetFieldLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copyErr, setCopyErr] = useState<string | null>(null);

  const handleCopyPrompt = async () => {
    setCopyErr(null);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(CHATGPT_VOICE_INSTRUCTION);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2600);
    } catch {
      setCopyErr("Automatic copy was blocked by the browser. Please select and copy the instruction text manually.");
    }
  };

  return (
    <div className="pt-2 border-t border-white/[0.06]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
      >
        <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
        <span>Use ChatGPT Voice Instead</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="mt-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-3.5 space-y-3 text-xs text-slate-300">
          <div className="text-[11px] text-slate-300 leading-relaxed space-y-1">
            <div className="font-bold text-white">Alternative Multilingual Voice Workflow (Manual Copy-Back):</div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300">
              <li>Copy the instruction prompt below, then open ChatGPT in a new tab.</li>
              <li>Paste the instruction into ChatGPT and tap ChatGPT&apos;s own microphone/voice button to speak naturally in Urdu, Hindi, Punjabi, German, Arabic, English, or any other language.</li>
              <li>Copy ChatGPT&apos;s English response, return here, paste it into <strong>{targetFieldLabel}</strong>, and submit.</li>
            </ol>
            <p className="text-[10px] text-amber-200/80 pt-0.5">
              Note: USMAN AI GTM cannot automatically attach your microphone stream inside external ChatGPT tabs; speak inside ChatGPT directly and paste the output back here.
            </p>
          </div>

          <div className="rounded-lg bg-black/50 border border-white/10 p-2.5 space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Ready-to-Copy ChatGPT Instruction
            </div>
            <p className="text-[11px] text-slate-200 leading-relaxed select-all">
              {CHATGPT_VOICE_INSTRUCTION}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Instruction Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Instruction</span>
                  </>
                )}
              </button>

              <a
                href="https://chatgpt.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-600/85 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <span>Open ChatGPT</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            {copyErr && (
              <div className="text-[10px] text-amber-300 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{copyErr}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
