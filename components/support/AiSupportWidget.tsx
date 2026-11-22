"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, Sparkles, ExternalLink, RefreshCw, ChevronDown } from "lucide-react";

interface ActionLink {
  label: string;
  url: string;
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  time: string;
  actions?: ActionLink[];
}

export function AiSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "👋 Hi! I am the **USMAN AI Growth Assistant**.\n\nAsk me anything about discovering B2B leads, connecting Gmail, or activating your subscription ($25 Basic or $100 Lifetime)!",
      time: "Just now",
      actions: [
        { label: "Pricing ($25 vs $100)", url: "/pricing" },
        { label: "WhatsApp Activation", url: "https://wa.me/923174383702?text=Hi%20Usman%2C%20I%20want%20to%20activate%20my%20subscription" },
      ],
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const starterChips = [
    "💰 Basic ($25) vs Lifetime ($100)",
    "🔒 How to activate account?",
    "✉️ Connecting Gmail OAuth",
    "🔍 How search works",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleResetChat = () => {
    setMessages([
      {
        id: "welcome",
        sender: "assistant",
        text: "👋 Hi! I am the **USMAN AI Growth Assistant**.\n\nAsk me anything about discovering B2B leads, Google Maps scraping, connecting Gmail, or activating your subscription ($25 Basic or $100 Lifetime)!",
        time: "Just now",
        actions: [
          { label: "Pricing ($25 vs $100)", url: "/pricing" },
          { label: "WhatsApp Activation", url: "https://wa.me/923174383702?text=Hi%20Usman%2C%20I%20want%20to%20activate%20my%20subscription" },
        ],
      },
    ]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const currentHistory = messages.map((m) => ({
      role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: currentHistory }),
      });

      const data = await res.json();
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "assistant",
        text: data.reply || "I am available to assist you. Contact the Founder directly on WhatsApp (+923174383702).",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actions: data.suggested_actions || [],
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: "assistant",
          text: "I am having trouble connecting right now. Please reach out to our Founder directly on WhatsApp at **+923174383702**.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actions: [
            { label: "Chat on WhatsApp (+923174383702)", url: "https://wa.me/923174383702" },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-xs shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
            aria-label="Open AI Assistant"
          >
            <div className="relative">
              <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#07090e]" />
            </div>
            <span className="font-semibold tracking-wide">AI Assistant</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono">Online</span>
          </button>
        )}
      </div>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-5rem)] rounded-2xl bg-[#0c1017] border border-white/10 shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#111726] to-[#0c1017] border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-glow-sm">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">USMAN AI Assistant</span>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Powered by Gemini AI • GTM Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
                title="New Conversation"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
                title="Minimize Chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Starter Chips */}
          <div className="p-2.5 bg-white/[0.02] border-b border-white/[0.04] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {starterChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                className="text-[10px] font-medium text-slate-300 bg-white/[0.04] hover:bg-blue-600/20 hover:text-blue-300 hover:border-blue-500/30 px-2.5 py-1 rounded-full border border-white/10 shrink-0 transition-all cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {messages.map((m) => {
              const isBot = m.sender === "assistant";
              return (
                <div key={m.id} className={`flex flex-col ${isBot ? "items-start" : "items-end"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                      isBot
                        ? "bg-white/[0.05] border border-white/10 text-slate-200"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    }`}
                  >
                    <div className="whitespace-pre-line text-xs font-normal">
                      {m.text}
                    </div>

                    {/* Action buttons attached to message */}
                    {m.actions && m.actions.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                        {m.actions.map((act, i) => (
                          <a
                            key={i}
                            href={act.url}
                            target={act.url.startsWith("http") ? "_blank" : undefined}
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded transition-colors"
                          >
                            <span>{act.label}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 px-1">{m.time}</span>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
                <span>AI Assistant is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* WhatsApp Direct Banner */}
          <div className="px-3 py-1.5 bg-[#0a0e14] border-t border-white/[0.04] flex items-center justify-between text-[10px] text-slate-400 shrink-0">
            <span>Direct WhatsApp:</span>
            <a
              href="https://wa.me/923174383702?text=Hello%20Usman%2C%20I%20need%20assistance%20with%20my%20account"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 font-bold hover:underline"
            >
              +923174383702 💬
            </a>
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#0c1017] border-t border-white/10 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything about leads, Gmail, or plans..."
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-all cursor-pointer"
              title="Send Message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
