import { NextResponse } from "next/server";
import {
  getNeonChatMessages,
  addNeonChatMessage,
  createNeonChatConversation,
  getNeonSql,
  isNeonConfigured,
} from "@/lib/neon-db";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

async function loadWorkspaceContext(workspaceId: number, userRecord: any) {
  const ctx: any = {
    plan_label: userRecord?.plan_label || userRecord?.plan || "Active Plan",
    daily_email_limit: userRecord?.daily_email_limit || 10,
    google_maps_enabled: Boolean(userRecord?.google_maps_enabled),
    profile: null,
    total_leads: 0,
    today_leads: 0,
    recent_leads: [],
    recent_searches: [],
    connected_gmails: 0,
  };

  if (!isNeonConfigured()) return ctx;
  const sql = getNeonSql();
  if (!sql) return ctx;

  try {
    const [profRows, statsRows, recentLeadsRows, searchesRows, acctRows] = await Promise.all([
      sql.query("SELECT * FROM workspace_profiles WHERE workspace_id = $1 LIMIT 1", [workspaceId]).catch(() => []),
      sql.query(
        "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS today_count FROM leads WHERE workspace_id = $1",
        [workspaceId]
      ).catch(() => []),
      sql.query(
        "SELECT id, business_name, email, website, industry, city, country, positive_signals FROM leads WHERE workspace_id = $1 ORDER BY id DESC LIMIT 6",
        [workspaceId]
      ).catch(() => []),
      sql.query(
        "SELECT keyword, country, qualified_quantity, search_date FROM search_records WHERE workspace_id = $1 ORDER BY id DESC LIMIT 5",
        [workspaceId]
      ).catch(() => []),
      sql.query("SELECT COUNT(*) AS cnt FROM email_accounts WHERE workspace_id = $1", [workspaceId]).catch(() => []),
    ]);

    ctx.profile = profRows?.[0] || null;
    ctx.total_leads = Number(statsRows?.[0]?.total || 0);
    ctx.today_leads = Number(statsRows?.[0]?.today_count || 0);
    ctx.recent_leads = recentLeadsRows || [];
    ctx.recent_searches = searchesRows || [];
    ctx.connected_gmails = Number(acctRows?.[0]?.cnt || 0);
  } catch {}
  return ctx;
}

function detectUserLanguage(text: string): { code: string; label: string } {
  const lower = text.toLowerCase().trim();
  if (/[\u0600-\u06FF]/.test(text)) {
    if (/[\u067E\u0686\u0698\u06AF\u06CC\u06D2]/.test(text) || lower.includes("ہیں") || lower.includes("کیا") || lower.includes("ہے")) {
      return { code: "ur", label: "Urdu (اردو)" };
    }
    return { code: "ar", label: "Arabic (العربية)" };
  }
  const romanUrduWords = ["kya", "kia", "hai", "hain", "kese", "kaise", "kro", "karo", "muje", "mujhe", "batao", "chahiye", "kitna"];
  const words = lower.split(/\s+/);
  if (words.filter((w) => romanUrduWords.includes(w)).length >= 2) {
    return { code: "ur-Latn", label: "Roman Urdu" };
  }
  if (lower.includes("hallo") || lower.includes("guten") || lower.includes("deutsch") || lower.includes("e-mail") || lower.includes("preis")) {
    return { code: "de", label: "German (Deutsch)" };
  }
  if (lower.includes("bonjour") || lower.includes("prix") || lower.includes("merci")) {
    return { code: "fr", label: "French (Français)" };
  }
  if (lower.includes("hola") || lower.includes("precio") || lower.includes("gracias")) {
    return { code: "es", label: "Spanish (Español)" };
  }
  return { code: "en", label: "English" };
}

function buildContextSummaryPrompt(wsCtx: any): string {
  const p = wsCtx.profile;
  const profileSummary = p
    ? `Saved Business Profile:
  - Business Name: ${p.business_name || "Not set"}
  - What It Does: ${p.ai_summary || p.products_services || "Not set"}
  - Ideal Customers: ${p.target_customer_type || "Not set"}
  - Target Countries: ${p.preferred_locations || p.country || "Not set"}
  - Preferred Outreach Language: ${p.preferred_outreach_language || "English"}`
    : "Saved Business Profile: NOT YET CONFIGURED (recommend filling out /app/business-profile by voice or text).";

  const recentLeadsText =
    wsCtx.recent_leads.length > 0
      ? wsCtx.recent_leads
          .map((l: any) => `#${l.id} ${l.business_name} (${l.industry || "B2B"}, ${[l.city, l.country].filter(Boolean).join(", ")}, email: ${l.email || "none"})`)
          .join("\n  ")
      : "No saved leads yet.";

  const recentSearchesText =
    wsCtx.recent_searches.length > 0
      ? wsCtx.recent_searches
          .map((s: any) => `"${s.keyword}" in ${s.country} (${s.qualified_quantity} leads on ${s.search_date})`)
          .join("; ")
      : "No searches run yet.";

  return `
AUTHENTICATED WORKSPACE CONTEXT (STRICTLY PRIVATE TO THIS WORKSPACE):
- Subscription Plan: ${wsCtx.plan_label} (Daily Gmail Cap: ${wsCtx.daily_email_limit}/day, Maps Access: ${wsCtx.google_maps_enabled ? "Enabled" : "Not Included"})
- Saved Leads Total: ${wsCtx.total_leads} (${wsCtx.today_leads} saved today)
- Connected Gmail Accounts: ${wsCtx.connected_gmails}
- Recent Searches: ${recentSearchesText}
- Recent Leads Sample:
  ${recentLeadsText}
- ${profileSummary}
`;
}

const SYSTEM_PROMPT = `You are the Intelligent Business Assistant inside USMAN AI GTM.
Never mention internal AI model vendor names (never say Gemini, GPT, Claude, etc.). Describe yourself simply as the USMAN AI Business Assistant.
Help the user using ONLY their real workspace context above. NEVER invent lead counts, emails, or actions.
If the user asks to summarize today's leads, give the exact numbers from their workspace context.
If they ask for search ideas or companies needing their services, suggest targeted queries tailored to their saved Business Profile.
If they want an email translated or rewritten, write the complete email clearly in the requested language (German, Urdu, English, Arabic, Spanish, French, etc.).
Always respond in the same language the user spoke or typed unless they asked for another output language (for example, replying in English or providing a German email draft when instructed).`;

export async function POST(req: Request) {
  try {
    const currentUser = getCurrentUserFromRequest(req);
    const subCheck = await verifyClientActiveSubscription(currentUser, "ai_assistant");
    if (!subCheck.allowed) {
      return NextResponse.json(
        { error: subCheck.message || "AI Assistant access restricted." },
        { status: subCheck.statusCode || 403 }
      );
    }

    const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
    const userId = Number(subCheck.userRecord?.id || currentUser.id) || 1;
    const body = await req.json().catch(() => ({}));
    const rawMessage = String(body.message || "").trim();
    const audioBase64 = typeof body.audioBase64 === "string" ? body.audioBase64 : undefined;
    const audioMime = typeof body.audioMime === "string" ? body.audioMime : undefined;
    let conversationId = body.conversation_id ? String(body.conversation_id).trim() : null;

    if (!rawMessage && !audioBase64) {
      return NextResponse.json({ error: "Please provide a message or voice recording." }, { status: 400 });
    }

    const displayUserMsg = rawMessage || "[Voice message]";
    const detected = detectUserLanguage(rawMessage || "English");

    // Load live isolated workspace context & chat history
    const wsCtx = await loadWorkspaceContext(workspaceId, subCheck.userRecord);

    // Handle explicit real workspace save check if user asks about daily stats offline/fallback
    if (!conversationId) {
      const titleSnippet = displayUserMsg.length > 40 ? displayUserMsg.substring(0, 37) + "..." : displayUserMsg;
      const newConv = await createNeonChatConversation(
        workspaceId,
        userId || 1,
        titleSnippet,
        detected.code,
        { initial_intent: "workspace_assistant" }
      );
      conversationId = newConv?.id || `conv_${Date.now()}`;
    }

    try {
      await addNeonChatMessage(conversationId, workspaceId, "user", displayUserMsg);
    } catch {}

    let history: any[] = [];
    try {
      history = await getNeonChatMessages(conversationId, workspaceId);
    } catch {}

    const suggestedKeyword = wsCtx.profile?.keywords?.split(",")[0]?.trim() || wsCtx.profile?.target_customer_type || "";
    const suggestedCountry = wsCtx.profile?.preferred_locations?.split(",")[0]?.trim() || wsCtx.profile?.country || "";
    const dynamicActions: Array<{ label: string; url: string }> = [
      suggestedKeyword
        ? {
            label: `Search: "${suggestedKeyword.slice(0, 32)}"`,
            url: `/app/leads?keyword=${encodeURIComponent(suggestedKeyword)}${suggestedCountry ? `&country=${encodeURIComponent(suggestedCountry)}` : ""}`,
          }
        : { label: "Find New Leads", url: "/app/leads" },
      wsCtx.profile
        ? { label: "Edit Business Profile", url: "/app/business-profile" }
        : { label: "Set Up Business Profile", url: "/app/business-profile" },
      { label: "Cold Email Composer", url: "/app/outreach" },
    ];

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey || apiKey.length < 10) {
      const fallbackReply = `**Workspace Summary (${wsCtx.plan_label}):**\n• Saved Leads: **${wsCtx.total_leads}** total (**${wsCtx.today_leads}** added today)\n• Connected Gmail Accounts: **${wsCtx.connected_gmails}**\n• Business Profile: ${wsCtx.profile?.business_name ? `Configured (${wsCtx.profile.business_name})` : "Not set yet — describe your business under Business Profile!"}\n\nTo generate custom strategies, personalized emails, or translations, ask any specific question or click a recommended action below.`;
      await addNeonChatMessage(conversationId, workspaceId, "assistant", fallbackReply, dynamicActions).catch(() => {});
      return NextResponse.json({
        conversation_id: conversationId,
        reply: fallbackReply,
        language: detected.label,
        suggested_actions: dynamicActions,
      });
    }

    const contextBlock = buildContextSummaryPrompt(wsCtx);
    const recentTurns = history.slice(-8);
    const contents: Array<{ role: "user" | "model"; parts: any[] }> = [];

    if (recentTurns.length > 1) {
      for (let i = 0; i < recentTurns.length - 1; i++) {
        const item = recentTurns[i];
        contents.push({
          role: item.role === "assistant" ? "model" : "user",
          parts: [{ text: i === 0 ? `${SYSTEM_PROMPT}\n${contextBlock}\n\n${item.content}` : item.content }],
        });
      }
    }

    const lastUserParts: any[] = [
      {
        text:
          recentTurns.length <= 1
            ? `${SYSTEM_PROMPT}\n${contextBlock}\n\nUser message (${detected.label}):\n${rawMessage || "Please listen to my attached voice question/instruction and reply helpfully in the same language."}`
            : rawMessage || "Please respond to the attached voice recording.",
      },
    ];
    if (audioBase64 && audioBase64.length > 100) {
      lastUserParts.push({
        inline_data: {
          mime_type: audioMime || "audio/webm",
          data: audioBase64,
        },
      });
    }
    contents.push({ role: "user", parts: lastUserParts });

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.55,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (replyText) {
        await addNeonChatMessage(conversationId, workspaceId, "assistant", replyText, dynamicActions).catch(() => {});
        return NextResponse.json({
          conversation_id: conversationId,
          reply: replyText,
          language: detected.label,
          suggested_actions: dynamicActions,
        });
      }
    }

    const honestFallback = `**Workspace Status (${wsCtx.plan_label}):** You currently have **${wsCtx.total_leads} saved leads** (${wsCtx.today_leads} saved today) and **${wsCtx.connected_gmails} connected Gmail account(s)**. The conversational engine was temporarily busy — please retry in a few seconds.`;
    await addNeonChatMessage(conversationId, workspaceId, "assistant", honestFallback, dynamicActions).catch(() => {});
    return NextResponse.json({
      conversation_id: conversationId,
      reply: honestFallback,
      language: detected.label,
      suggested_actions: dynamicActions,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to process assistant request." },
      { status: 500 }
    );
  }
}
