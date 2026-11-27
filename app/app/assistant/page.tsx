"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  MessageCircle, Send, Sparkles, Plus, Trash2, Globe2,
  ExternalLink, Bot, User, Check, Copy, ArrowRight, ShieldCheck,
  PhoneCall, Zap, Building2, HelpCircle
} from "lucide-react";
import { VoiceCaptureButton, VoiceCaptureResult } from "@/components/voice/VoiceCaptureButton";

interface Conversation {
  id: string;
  title: string;
  detected_language: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id?: number;
  role: "user" | "assistant" | "system";
  content: string;
  suggested_actions?: Array<{ label: string; url: string }>;
  created_at?: string;
}

const STARTER_PROMPTS = [
  {
    title: "Find Companies Needing My Services",
    prompt: "Based on my Business Profile, suggest the best target industries and search queries to find high-fit prospects today.",
  },
  {
    title: "Summarize Today's Lead Activity",
    prompt: "Summarize my saved leads, recent searches, and suggest what outreach steps I should take next.",
  },
  {
    title: "Translate or Rewrite an Email",
    prompt: "Help me write or translate a concise, professional cold introduction email into German for a prospective client.",
  },
  {
    title: "اردو رہنمائی",
    prompt: "میری پروفائل کے مطابق مجھے بتائیں کہ میں بہتر لیڈز کیسے تلاش کروں اور ای میل کیسے بھیجوں؟",
  },
];

function AssistantContent() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState("English");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("usman_gtm_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const wsId = localStorage.getItem("usman_gtm_workspace_id");
      if (wsId) headers["X-Workspace-Id"] = wsId;
    }
    return headers;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // 1. Fetch conversations list
  const fetchConversations = async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch("/api/assistant/conversations", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        if (!activeConvId && data.conversations.length > 0) {
          selectConversation(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.warn("Could not load conversations", err);
    } finally {
      setLoadingConversations(false);
    }
  };

  // 2. Select conversation and fetch messages
  const selectConversation = async (convId: string) => {
    setActiveConvId(convId);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/assistant/messages?conversation_id=${encodeURIComponent(convId)}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data && Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // 3. Start a fresh conversation
  const handleStartNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setActiveLanguage("English");
  };

  // 4. Delete conversation
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this consultation conversation?")) return;

    try {
      const res = await fetch(`/api/assistant/conversations?id=${encodeURIComponent(convId)}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (activeConvId === convId) {
          handleStartNewChat();
        }
      }
    } catch (err) {
      console.error("Delete conversation error:", err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // 5. Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsSending(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: text,
          conversation_id: activeConvId || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        if (data.conversation_id && data.conversation_id !== activeConvId) {
          setActiveConvId(data.conversation_id);
          fetchConversations();
        }

        if (data.language) {
          setActiveLanguage(data.language);
        }

        const assistantMsg: Message = {
          role: "assistant",
          content: data.reply,
          suggested_actions: data.suggested_actions || [],
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: Message = {
          role: "assistant",
          content: data.error || "Sorry, I could not generate a reply. Please try again.",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error. Please verify your connection or chat directly with the Founder on WhatsApp (+923174383702).",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="h-[calc(100vh-6rem)] max-w-7xl mx-auto flex flex-col md:flex-row gap-4 pb-4">
      {/* LEFT SIDEBAR: CONVERSATIONS */}
      <aside className="w-full md:w-72 shrink-0 rounded-2xl border border-white/[0.08] bg-[#0c1017] flex flex-col overflow-hidden">
        {/* New Chat Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-purple-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Consultations</h2>
          </div>
          <button
            onClick={handleStartNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loadingConversations ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading history...</div>
          ) : conversations.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 px-4 space-y-2">
              <Bot className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-300">No consultation sessions yet.</p>
              <p className="text-[11px] text-slate-500">Ask any question to start your first session.</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                    isActive
                      ? "bg-purple-600/15 border border-purple-500/30 text-white font-medium"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="truncate text-xs">{conv.title}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Workspace Footer Info */}
        <div className="p-3 border-t border-white/[0.06] bg-white/[0.01] text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Workspace #{user?.workspace_id || 1} Private</span>
          </span>
          <span className="font-mono text-[10px] text-purple-400 font-semibold">Workspace Engine</span>
        </div>
      </aside>

      {/* RIGHT MAIN CHAT AREA */}
      <main className="flex-1 rounded-2xl border border-white/[0.08] bg-[#0c1017] flex flex-col overflow-hidden">
        {/* Top Chat Header */}
        <div className="p-4 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-purple-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center shadow-glow-sm">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white">USMAN AI Growth & Sales Consultant</h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Consultative strategy, plan comparison ($25 vs $100), and lead generation workflows.
              </p>
            </div>
          </div>

          {/* Language & WhatsApp Links */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-300">
              <Globe2 className="h-3.5 w-3.5 text-blue-400" />
              <span>{activeLanguage}</span>
            </div>
            <a
              href="https://wa.me/923174383702"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all"
            >
              <PhoneCall className="h-3 w-3" />
              <span>WhatsApp Founder</span>
            </a>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {messages.length === 0 ? (
            <div className="py-8 max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-blue-600/30 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-300">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  How can I help you scale your business today?
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  I can analyze your business model, recommend tailored B2B lead generation tactics, explain the $25 Basic vs $100 Lifetime plans, and assist in English, Urdu (اردو), Roman Urdu, Turkish, French, Spanish, and Arabic.
                </p>
              </div>

              {/* Starter Question Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {STARTER_PROMPTS.map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(starter.prompt)}
                    className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-purple-600/10 hover:border-purple-500/30 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-purple-300 mb-1">
                      <span>{starter.title}</span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-purple-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {starter.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isAssistant = msg.role === "assistant";
              return (
                <div
                  key={idx}
                  className={`flex gap-3 ${isAssistant ? "items-start" : "items-start flex-row-reverse"}`}
                >
                  {/* Avatar */}
                  <div
                    className={`h-8 w-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                      isAssistant
                        ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-glow-sm"
                        : "bg-blue-600/30 border border-blue-500/40 text-blue-300"
                    }`}
                  >
                    {isAssistant ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed space-y-3 ${
                      isAssistant
                        ? "bg-white/[0.03] border border-white/[0.08] text-slate-200"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-glow-sm"
                    }`}
                  >
                    <div dir="auto" className="whitespace-pre-wrap font-sans">{msg.content}</div>

                    {/* Suggested Action Buttons if present */}
                    {isAssistant && msg.suggested_actions && msg.suggested_actions.length > 0 && (
                      <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2 flex-wrap">
                        {msg.suggested_actions.map((act, actIdx) => (
                          <a
                            key={actIdx}
                            href={act.url}
                            target={act.url.startsWith("http") ? "_blank" : undefined}
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[11px] font-semibold text-slate-200 transition-all"
                          >
                            <span>{act.label}</span>
                            {act.url.startsWith("http") && <ExternalLink className="h-3 w-3 text-slate-400" />}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Message Meta / Copy */}
                    {isAssistant && (
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                        <span>USMAN AI Consultant</span>
                        <button
                          onClick={() => handleCopy(msg.content, idx)}
                          className="hover:text-slate-300 transition-colors flex items-center gap-1"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isSending && (
            <div className="flex gap-3 items-start">
              <div className="h-8 w-8 rounded-xl shrink-0 bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white">
                <Sparkles className="h-4 w-4 animate-spin" />
              </div>
              <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.08] text-xs text-slate-400 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400 animate-ping" />
                <span>Consultant is analyzing and formulating response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/[0.08] bg-[#090d16]/70 backdrop-blur-sm space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                dir="auto"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
                placeholder="Ask about your Business Profile, today's leads, search queries, or speak in English, Urdu, German, Arabic..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            <VoiceCaptureButton
              compact
              label="Voice"
              disabled={isSending}
              onLiveTranscript={(txt) => setInputText(txt)}
              onCaptureComplete={async (cap: VoiceCaptureResult) => {
                if (cap.transcript) setInputText(cap.transcript);
                if (!cap.transcript && !cap.audioBase64) return;
                setIsSending(true);
                const previewText = cap.transcript || "[Voice input]";
                setMessages((prev) => [...prev, { role: "user", content: previewText }]);
                setInputText("");
                try {
                  const res = await fetch("/api/assistant/chat", {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                      message: cap.transcript || "",
                      audioBase64: cap.audioBase64,
                      audioMime: cap.audioMime,
                      conversation_id: activeConvId,
                    }),
                  });
                  const data = await res.json();
                  if (data.conversation_id && !activeConvId) setActiveConvId(data.conversation_id);
                  if (data.language) setActiveLanguage(data.language);
                  setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: data.reply || "Processed voice request.", suggested_actions: data.suggested_actions || [] },
                  ]);
                } catch {}
                setIsSending(false);
              }}
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isSending || !inputText.trim()}
              className="h-11 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-glow-sm disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-500 text-center">
            USMAN AI Business Assistant uses your saved workspace context. Direct support via WhatsApp (+923174383702).
          </p>
        </div>
      </main>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090e] flex items-center justify-center text-white text-xs">Loading assistant...</div>}>
      <AssistantContent />
    </Suspense>
  );
}
