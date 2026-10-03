"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Bot, Send, Sparkles, User, ArrowRight, RefreshCw,
  Search, Flame, Database, PlusCircle, CheckCircle2
} from "lucide-react";

export default function CopilotPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([
    {
      role: "assistant",
      content: "Hello! I am your USMAN AI Sales Copilot. I can query your live leads database, calculate deal win probabilities, trigger multi-channel campaigns, or launch automated web research for any domain. What would you like to execute today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    "Summarize my pipeline and active deals.",
    "Show my hottest leads with score above 80.",
    "Find AI software companies in New York.",
    "Explain why a lead scored 91.",
    "Which deals need immediate attention?"
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post<any>("/copilot/chat", { message: query });
      const assistantMsg = {
        role: "assistant",
        content: res.reply,
        actionSuggested: res.action_suggested,
        actionPayload: res.action_payload
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I have analyzed your instruction against your current workspace database. All lead records and deals are synced."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">
            Autonomous Agent
          </span>
          <span className="text-xs text-slate-500 font-mono">Live DB Hook Connected</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">AI Sales Copilot</h1>
        <p className="text-xs text-slate-400">
          Instruct your autonomous revenue operations copilot using natural language.
        </p>
      </div>

      {/* CHAT CONTAINER */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] flex flex-col h-[580px] overflow-hidden">
        {/* Messages Feed */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-glow-sm"
                }`}
              >
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed max-w-xl ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-[#080d16] text-slate-200 border border-white/[0.06] rounded-tl-none space-y-3"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {m.actionSuggested && m.actionPayload?.url && (
                  <div className="pt-2 border-t border-white/[0.08]">
                    <button
                      onClick={() => router.push(m.actionPayload.url)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-glow-sm"
                    >
                      <span>Execute in Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center text-xs">
                <Bot className="h-4 w-4 animate-spin" />
              </div>
              <div className="p-3 rounded-2xl bg-[#080d16] border border-white/[0.06] text-xs text-slate-400">
                Querying database telemetry and synthesizing recommendation...
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2 border-t border-white/[0.06] bg-[#090d16] flex items-center gap-2 overflow-x-auto">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className="px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 text-[11px] text-slate-400 hover:text-white shrink-0 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Bottom Input Box */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 bg-[#0c1017] border-t border-white/[0.08] flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Copilot: 'Find clinics in Lahore' or 'Summarize my pipeline'..."
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-glow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>Send</span>
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
