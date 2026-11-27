import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_KNOWLEDGE = `
You are the official Conversational Sales & Support AI Agent for USMAN AI GTM (Website: https://lead-scraper-mxs5.vercel.app/).
You represent the founder (Usman) and the platform.

CORE PERSONALITY & BEHAVIOR:
- Warm, consultative, professional, and helpful.
- MULTILINGUAL: Detect the user's language automatically and respond in the same language:
  - If user writes in English -> Respond in fluent English.
  - If user writes in Urdu (اردو) -> Respond in polite, natural Urdu (اردو رسم الخط).
  - If user writes in Roman Urdu (e.g. "kese buy krein", "tala kese khulay ga", "price kya hai") -> Respond in clean, natural Roman Urdu.
- MULTI-TURN MEMORY: Maintain conversation context and answer follow-up questions accurately.

STRICT SECURITY & PRIVACY GUARD:
- NEVER reveal, quote, or guess database passwords, connection strings, JWT tokens, OAuth client secrets, or private API keys.
- NEVER disclose or search other users' private lead lists, workspace names, or email accounts.
- If a user asks for secret credentials, politely explain that customer data and infrastructure secrets are strictly isolated and confidential.

GENUINE PLATFORM INFORMATION:
1. WHAT IS USMAN AI GTM:
   A B2B lead generation and 1-to-1 cold outreach SaaS built for sales teams, agencies, and founders.
   Core features include:
   - High-Speed B2B Lead Search Engine: Discovers public commercial emails, phone numbers, and domains across supported global markets with DNS MX & syntax checking.
   - Google Maps Business Lead Generator (Lifetime & Maps-enabled plans): Discovers local business listings, crawls websites for public emails, and supports flexible filtering (Email Only, Phone Only, Both, Either).
   - Direct Gmail Integration: Authenticated via Google OAuth 2.0 (minimal gmail.send scope) to send 1-to-1 cold outreach directly from your Gmail account.
   - Intelligent Email Assistant: Creates natural, concise, profile-aware B2B outreach drafts.
   - AI Lead Research Agent (Lifetime & AI Research enabled plans): Generates practical company summaries and tailored outreach proposals.
   - Multi-Format Exports: Download workspace leads in XLSX, Executive PDF, CSV, and JSON.

2. PRICING & SUBSCRIPTION PLANS (TRUTHFUL LIMITS):
   - Basic Plan: $25 / 30 Days
     • Multi-country web lead search (excludes Google Maps).
     • Personal Gmail outreach integration: up to 10 cold emails per UTC day.
     • Standard AI email generator & XLSX/PDF/CSV/JSON exports.
     • 30 days active access. Auto-locks at exact expiry until renewed.
   - Lifetime Plan: $100 One-Time (Permanent Access)
     • Permanent access — zero monthly renewal fees!
     • EXCLUSIVE: Google Maps Business Lead Generator.
     • EXCLUSIVE: AI Lead Research Agent.
     • Up to 500 cold emails per UTC day across connected Gmail accounts (Google fair-use cap).
     • Priority WhatsApp support directly from the Founder.
   - Custom Plans: Configurable duration, quotas, and module permissions set by Owner agreement.

3. HOW TO PURCHASE & ACTIVATE ACCOUNT:
   - Step 1: Sign in with Google on https://lead-scraper-mxs5.vercel.app/login.
   - Step 2: New accounts start in LOCKED status for safety.
   - Step 3: Message the Founder directly on WhatsApp at +923174383702 (https://wa.me/923174383702).
   - Step 4: Pay via Bank Transfer / EasyPaisa / JazzCash / Crypto / Card ($25 for Basic or $100 for Lifetime).
   - Step 5: The Founder instantly activates the account and all features unlock immediately!

4. CONTACT & WHATSAPP SUPPORT:
   - WhatsApp Support: +923174383702
   - Website: https://lead-scraper-mxs5.vercel.app
   - Keep answers clear, structured with markdown bullet points, and friendly.
`;

function detectLanguage(text: string): "urdu" | "roman_urdu" | "english" {
  const lower = text.toLowerCase();
  // Check for Arabic/Urdu unicode script
  if (/[\u0600-\u06FF]/.test(text)) {
    return "urdu";
  }
  // Check common Roman Urdu words
  const romanUrduWords = [
    "kya", "kia", "hai", "hain", "kese", "kaise", "kro", "karo", "muje", "mujhe",
    "batao", "btao", "tala", "chahiye", "kitna", "kitne", "paisa", "paise", "rupay",
    "krna", "karna", "acha", "theek", "shukriya", "bhai", "janab", "karo", "hoga"
  ];
  const words = lower.split(/\s+/);
  const matched = words.filter((w) => romanUrduWords.includes(w));
  if (matched.length >= 2 || (matched.length === 1 && words.length <= 4)) {
    return "roman_urdu";
  }
  return "english";
}

function getFallbackReply(message: string): { reply: string; suggested_actions: Array<{ label: string; url: string }> } {
  const lang = detectLanguage(message);
  const lower = message.toLowerCase();

  if (lang === "urdu") {
    return {
      reply: `**عثمان اے آئی جی ٹی ایم (USMAN AI GTM) میں خوش آمدید!**\n\n• **بیسک پلان ($25 / 30 دن)**: ویب لیڈ سرچ، روزانہ 10 کولڈ ای میلز (جی میل OAuth)، اور XLSX/PDF/CSV/JSON ایکسپورٹس۔\n• **لائف ٹائم پلان ($100 ایک بار)**: مستقل رسائی، گوگل میپس بزنس لیڈ جنریٹر، اے آئی لیڈ ریسرچ ایجنٹ، اور روزانہ 500 تک کولڈ ای میلز۔\n\nاکاؤنٹ ایکٹیویٹ کروانے کے لیے واٹس ایپ پر رابطہ کریں: **+923174383702**`,
      suggested_actions: [
        { label: "واٹس ایپ پر رابطہ کریں (+923174383702)", url: "https://wa.me/923174383702?text=%D8%B9%D8%AB%D9%85%D8%A7%D9%86%20%D8%A8%DA%BE%D8%A7%D8%A6%DB%8C%20%D8%A7%DA%A9%D8%A7%D8%A4%D9%86%D8%B7%20%D8%A7%DB%8C%DA%A9%D9%B9%DB%8C%D9%88%DB%8C%D9%B9%20%DA%A9%D8%B1%D9%88%D8%A7%D9%86%D8%A7%20%DB%81%DB%8C" },
        { label: "پلانز دیکھیں", url: "/pricing" },
      ],
    };
  }

  if (lang === "roman_urdu") {
    return {
      reply: `**USMAN AI GTM Plans & Activation:**\n\n• **Basic Plan ($25 / 30 Din)**: Web lead search, DNS MX email checking, XLSX/PDF/CSV/JSON exports aur Gmail OAuth integration (daily 10 cold emails cap).\n• **Lifetime Plan ($100 One-Time)**: Permanent access, Google Maps Lead Generator, AI Research Agent, daily up to 500 cold emails aur zero monthly fees!\n\nAccount activate karwane k liye WhatsApp per Founder se rabta karein: **+923174383702**`,
      suggested_actions: [
        { label: "WhatsApp per Rabta Karein (+923174383702)", url: "https://wa.me/923174383702?text=Hi%20Usman%2C%20account%20activate%20krwana%20hai" },
        { label: "Pricing Page", url: "/pricing" },
      ],
    };
  }

  if (lower.includes("price") || lower.includes("cost") || lower.includes("plan") || lower.includes("rate") || lower.includes("how much")) {
    return {
      reply: `**USMAN AI GTM Pricing & Capabilities:**\n\n• **Basic Plan ($25 / 30 Days)**:\n  - Multi-country web lead search (excludes Google Maps).\n  - Direct Gmail OAuth outreach (up to 10 cold emails per UTC day).\n  - Standard personalized email generator & XLSX/PDF/CSV/JSON exports.\n  - Auto-locks at exact 30-day expiry until renewed.\n\n• **Lifetime Plan ($100 One-Time — Recommended)**:\n  - Permanent access with zero monthly renewals.\n  - **Exclusive Google Maps Business Lead Generator** (local places + website contact discovery).\n  - **Exclusive AI Lead Research Agent** (company briefs & outreach proposals).\n  - Up to 500 Gmail outreach emails per UTC day + Multi-Gmail rotation.\n  - Priority Founder WhatsApp support.\n\nTo activate your account, submit payment proof inside Usage & Subscription or contact the Owner on WhatsApp (+923174383702).`,
      suggested_actions: [
        { label: "Activate via WhatsApp (+923174383702)", url: "https://wa.me/923174383702?text=Hi%20Usman%2C%20I%20want%20to%20activate%20my%20subscription" },
        { label: "View Pricing Plans", url: "/pricing" },
      ],
    };
  }

  if (lower.includes("activate") || lower.includes("lock") || lower.includes("unlock") || lower.includes("buy")) {
    return {
      reply: `**How to Activate Your Account:**\n\n1. Sign in with Google on USMAN AI GTM (accounts start in **LOCKED** status).\n2. Message the Founder directly on WhatsApp at **+923174383702**.\n3. Mention your registered email and chosen plan ($25 Basic 30-Day or $100 Lifetime).\n4. After payment verification, your account is immediately unlocked with full search and outreach access!`,
      suggested_actions: [
        { label: "Message Founder on WhatsApp (+923174383702)", url: "https://wa.me/923174383702?text=Hello%20Usman%2C%20I%20want%20to%20activate%20my%20account" },
        { label: "Go to Login", url: "/login" },
      ],
    };
  }

  return {
    reply: `Welcome to **USMAN AI GTM**! I am your AI Sales & Support Assistant.\n\nI can help you with:\n• **B2B Web Lead Search**: Discover public commercial emails & phones with DNS MX checks.\n• **Google Maps Lead Generator**: Local Places discovery (Lifetime & Maps-enabled plans).\n• **Gmail OAuth Outreach**: 1-to-1 outreach from your Gmail (10/day on Basic, up to 500/day on Lifetime).\n• **Account Activation**: Manual activation & payment verification via WhatsApp (**+923174383702**).\n\nWhat would you like to know?`,
    suggested_actions: [
      { label: "Contact Owner on WhatsApp (+923174383702)", url: "https://wa.me/923174383702" },
      { label: "View Plans & Pricing", url: "/pricing" },
    ],
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userMessage = String(body.message || "").trim();
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return NextResponse.json({ reply: "Please ask a question.", suggested_actions: [] }, { status: 400 });
    }

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();

    if (!apiKey || apiKey.length < 10) {
      const fallback = getFallbackReply(userMessage);
      return NextResponse.json(fallback);
    }

    // Build multi-turn Gemini conversation contents
    try {
      const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

      // Add system knowledge preamble to first turn
      const recentHistory = history.slice(-6); // Keep last 3 turns
      if (recentHistory.length > 0) {
        contents.push({
          role: "user",
          parts: [{ text: `[System Instruction]\n${SYSTEM_KNOWLEDGE}\n\n[Previous Conversation Start]\n${recentHistory[0].content}` }],
        });
        if (recentHistory[0].role === "assistant") {
          contents[0].role = "model";
        }
        for (let i = 1; i < recentHistory.length; i++) {
          const h = recentHistory[i];
          contents.push({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }],
          });
        }
        // Add current user message
        contents.push({
          role: "user",
          parts: [{ text: userMessage }],
        });
      } else {
        contents.push({
          role: "user",
          parts: [{ text: `${SYSTEM_KNOWLEDGE}\n\nUser Question: ${userMessage}` }],
        });
      }

      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contents }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          return NextResponse.json({
            reply: text,
            suggested_actions: [
              { label: "Chat on WhatsApp (+923174383702)", url: "https://wa.me/923174383702?text=Hello%20Usman%20AI%20Support" },
              { label: "View Pricing Plans", url: "/pricing" },
            ],
          });
        }
      }

      const fallback = getFallbackReply(userMessage);
      return NextResponse.json(fallback);
    } catch {
      const fallback = getFallbackReply(userMessage);
      return NextResponse.json(fallback);
    }
  } catch (err: any) {
    return NextResponse.json({
      reply: "I am currently online. For immediate assistance or account activation, please contact the Founder directly on WhatsApp (+923174383702).",
      suggested_actions: [
        { label: "Contact WhatsApp (+923174383702)", url: "https://wa.me/923174383702" },
      ],
    });
  }
}
