import { NextResponse } from "next/server";
import {
  getNeonChatMessages,
  addNeonChatMessage,
  createNeonChatConversation,
} from "@/lib/neon-db";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const CONSULTATIVE_SYSTEM_PROMPT = `
You are the official Senior B2B Growth Consultant and AI Sales Specialist for USMAN AI GTM (Website: https://lead-scraper-mxs5.vercel.app/).
You represent the founder (Usman) and the platform.

CORE CONSULTATIVE BEHAVIOR & METHODOLOGY:
1. CONSULTATIVE FIRST: Do not just push product features blindly. First understand the customer's business:
   - What service or product do they sell?
   - Who is their Ideal Customer Profile (ICP)?
   - Which geographic market are they targeting?
   - Have they tried cold outreach before?
2. VALUE-DRIVEN RECOMMENDATIONS:
   - Match their specific business type with the exact USMAN AI GTM workflow that will bring them paying clients.
   - For local services (plumbers, realtors, dentists, restaurants, contractors) -> Recommend the Google Maps Lead Extractor ($100 Lifetime Plan) to get verified emails, phone numbers, and addresses.
   - For B2B agencies, software companies, consultancies, wholesalers -> Recommend the AI-Powered Lead Search with Natural Language Queries + Gmail OAuth Cold Email with our 10 proven templates.
   - Emphasize our permanent Account-Level Lead Deduplication (leads they already received or saved will never be returned again, saving them wasted searches).
3. PRICING & PLAN COMPARISON:
   - Basic Plan ($25 / 30 Days):
     • 5,000 verified leads per month.
     • Multi-source organic web search engine across 193 countries.
     • Account-level lead deduplication.
     • Direct personal Gmail cold outreach (500 free emails/day via Google OAuth).
     • Standard AI email copy generator.
     • 30 days active access (locks automatically upon expiry until renewed).
   - Lifetime Plan ($100 One-Time — BEST VALUE):
     • Permanent lifetime access — zero monthly renewal fees forever!
     • Unlimited search engine queries.
     • EXCLUSIVE: Google Maps Business Lead Generator (extract local leads with website email discovery).
     • EXCLUSIVE: AI Lead Research Agent (deep competitive intelligence).
     • Multi-Gmail account rotation.
     • Priority direct WhatsApp consultation with the Founder.
4. HOW TO ACTIVATE / BUY:
   - New accounts start in LOCKED status for safety.
   - To unlock or subscribe, message the Founder directly on WhatsApp at +923174383702 (https://wa.me/923174383702).
   - Supported payment methods: Bank Transfer, EasyPaisa, JazzCash, Crypto (USDT/BTC), or Card.
   - Instant manual activation after payment confirmation.
5. OBJECTION HANDLING:
   - "Why not Apollo or ZoomInfo?" -> USMAN AI GTM costs $100 ONCE for lifetime, versus $1,200+/year for Apollo. Plus, direct Gmail dispatch is free (500/day) with zero extra cold email tool costs.
   - "Are the leads fresh?" -> We query live public web and Google sources at search time, with strict email validation. We never sell stale static CSV dumps.
   - "Is my data private?" -> Strict tenant isolation. Your leads and Gmail connections are private to your workspace and never shared with other clients.
6. MULTILINGUAL FLUENCY:
   - Always respond in the EXACT language used by the user:
     • Urdu (اردو رسم الخط): Use courteous, professional Urdu.
     • Roman Urdu: Use natural Roman Urdu (e.g. "Aap ka business kis cheez ka hai?", "Basic plan $25 ka hai aur Lifetime $100 ka").
     • Arabic (العربية): Fluent, professional business Arabic.
     • Turkish (Türkçe): Polite, natural Turkish.
     • Romanian (Română): Professional Romanian.
     • French (Français): Professional French.
     • German (Deutsch): Professional German.
     • Spanish (Español): Professional Spanish.
     • English: Crisp, consultative British/American English.
7. ABSOLUTE CONFIDENTIALITY:
   - NEVER disclose backend database credentials, connection strings, JWT keys, API provider keys, or private customer data.
   - If asked, state that enterprise security policies keep internal infrastructure strictly protected.
`;

function detectUserLanguage(text: string): { code: string; label: string } {
  const lower = text.toLowerCase().trim();

  // Arabic or Urdu unicode script
  if (/[\u0600-\u06FF]/.test(text)) {
    // Distinguish Urdu from Arabic by common Urdu characters
    if (/[\u067E\u0686\u0698\u06AF\u06CC\u06D2]/.test(text) || lower.includes("ہیں") || lower.includes("کیا") || lower.includes("ہے")) {
      return { code: "ur", label: "Urdu (اردو)" };
    }
    return { code: "ar", label: "Arabic (العربية)" };
  }

  // Roman Urdu keywords
  const romanUrduWords = [
    "kya", "kia", "hai", "hain", "kese", "kaise", "kro", "karo", "muje", "mujhe",
    "batao", "btao", "tala", "chahiye", "kitna", "kitne", "paisa", "paise", "rupay",
    "krna", "karna", "acha", "theek", "shukriya", "bhai", "janab", "hoga", "lekin"
  ];
  const words = lower.split(/\s+/);
  const matchedUrdu = words.filter((w) => romanUrduWords.includes(w));
  if (matchedUrdu.length >= 2 || (matchedUrdu.length === 1 && words.length <= 4 && ["kya", "kaise", "kitna", "tala"].includes(words[0]))) {
    return { code: "ur-Latn", label: "Roman Urdu" };
  }

  // Turkish
  if (lower.includes("merhaba") || lower.includes("nasılsın") || lower.includes("fiyat") || lower.includes("ücret") || lower.includes("nasıl")) {
    return { code: "tr", label: "Turkish (Türkçe)" };
  }

  // Romanian
  if (lower.includes("bună") || lower.includes("buna") || lower.includes("salut") || lower.includes("preț") || lower.includes("pret") || lower.includes("cum pot")) {
    return { code: "ro", label: "Romanian (Română)" };
  }

  // French
  if (lower.includes("bonjour") || lower.includes("comment") || lower.includes("combien") || lower.includes("prix") || lower.includes("merci")) {
    return { code: "fr", label: "French (Français)" };
  }

  // German
  if (lower.includes("hallo") || lower.includes("guten") || lower.includes("preis") || lower.includes("kostet") || lower.includes("wie kann")) {
    return { code: "de", label: "German (Deutsch)" };
  }

  // Spanish
  if (lower.includes("hola") || lower.includes("cómo") || lower.includes("como") || lower.includes("cuánto") || lower.includes("precio") || lower.includes("gracias")) {
    return { code: "es", label: "Spanish (Español)" };
  }

  return { code: "en", label: "English" };
}

function getFallbackReply(message: string, langCode: string): { reply: string; suggested_actions: Array<{ label: string; url: string }> } {
  if (langCode === "ur") {
    return {
      reply: `**عثمان اے آئی جی ٹی ایم (USMAN AI GTM) میں خوش آمدید!**\n\nمیں آپ کا بزنس گروتھ اور سیلز کنسلٹنٹ ہوں۔ میں آپ کی مدد کر سکتا ہوں:\n\n• **بیسک پلان ($25 / 30 دن)**: 5,000 تصدیق شدہ بی ٹو بی لیڈز، آرگینک سرچ انجن، اور جی میل کولڈ ای میل۔\n• **لائف ٹائم پلان ($100 مستقل)**: گوگل میپس لیڈ جنریٹر، لامحدود سرچ، اور لائف ٹائم فری ایکسس۔\n\nاپنے بزنس کے بارے میں بتائیں تا کہ میں آپ کے لیے بہترین حکمتِ عملی تجویز کروں۔\nاکاؤنٹ ایکٹیویشن کے لیے بانی عثمان سے واٹس ایپ پر رابطہ کریں: **+923174383702**`,
      suggested_actions: [
        { label: "واٹس ایپ پر رابطہ کریں (+923174383702)", url: "https://wa.me/923174383702?text=Hello%20Usman%2C%20mujhe%20account%20activate%20krwana%20hai" },
        { label: "پلانز اور قیمت", url: "/pricing" }
      ]
    };
  }

  if (langCode === "ur-Latn") {
    return {
      reply: `**USMAN AI GTM Sales & Growth Consultant:**\n\nMain aapki help kar sakta hoon aapke business k mutabiq targeted leads dhoondne mein:\n\n• **Basic Plan ($25 / 30 Din)**: 5,000 verified leads, global web search, personal Gmail integration (500 free emails daily).\n• **Lifetime Plan ($100 One-Time)**: Google Maps Lead Generator, unlimited search, multi-Gmail rotation aur zero monthly fees!\n\nAap kis industry ya business k liye clients dhoond rahe hain? Mujhe batayein taakay main exact strategy suggest kar sakoon.\n\nAccount activate karwane k liye Founder se WhatsApp per rabta karein: **+923174383702**`,
      suggested_actions: [
        { label: "WhatsApp per Rabta (+923174383702)", url: "https://wa.me/923174383702?text=Hi%20Usman%2C%20account%20activate%20krna%20hai" },
        { label: "View Pricing Plans", url: "/pricing" }
      ]
    };
  }

  if (langCode === "tr") {
    return {
      reply: `**USMAN AI GTM'e Hoş Geldiniz!**\n\nB2B büyüme ve potansiyel müşteri bulma platformumuz hakkında size yardımcı olmaktan memnuniyet duyarım.\n\n• **Temel Plan ($25 / 30 Gün)**: 5.000 doğrulanmış B2B müşteri adayı, genel web araması ve Gmail entegrasyonu (günde 500 ücretsiz e-posta).\n• **Ömür Boyu Plan ($100 Tek Seferlik)**: Google Haritalar Müşteri Oluşturucu, sınırsız arama ve aylık yenileme ücreti yok!\n\nİşletmenizi ve hedef kitlenizi anlatın, size en uygun stratejiyi sunalım. WhatsApp üzerinden kurucu Usman ile iletişime geçin: **+923174383702**`,
      suggested_actions: [
        { label: "WhatsApp'tan Yazın (+923174383702)", url: "https://wa.me/923174383702" },
        { label: "Fiyatlandırma", url: "/pricing" }
      ]
    };
  }

  return {
    reply: `**Welcome to USMAN AI GTM!**\n\nI am your dedicated B2B Growth Consultant. To give you the highest-converting strategy, could you tell me a little about your business:\n1. **What services or products do you offer?**\n2. **Who is your ideal customer profile (industry, location, size)?**\n\n**Quick Overview of Plans:**\n• **Basic Plan ($25 / 30 Days)**: 5,000 verified leads, multi-channel web search, 500 free daily cold emails via Google OAuth.\n• **Lifetime Plan ($100 One-Time — Most Popular)**: Unlimited searches, Google Maps Local Scraper with email discovery, multi-Gmail rotation, and zero monthly renewal fees forever.\n\nTo activate your account instantly or discuss custom requirements, chat with the Founder on WhatsApp: **+923174383702**.`,
    suggested_actions: [
      { label: "Message Founder on WhatsApp (+923174383702)", url: "https://wa.me/923174383702" },
      { label: "Compare Plans & Pricing", url: "/pricing" },
      { label: "Find Leads", url: "/app/leads" }
    ]
  };
}

async function getVerifiedAuth(req: Request) {
  const currentUser = getCurrentUserFromRequest(req);
  const subCheck = await verifyClientActiveSubscription(currentUser, "ai_assistant");
  return { currentUser, subCheck };
}

export async function POST(req: Request) {
  try {
    const { currentUser, subCheck } = await getVerifiedAuth(req);
    if (!subCheck.allowed) {
      return NextResponse.json(
        { error: subCheck.message || "AI Assistant access restricted." },
        { status: subCheck.statusCode || 403 }
      );
    }
    const workspaceId = Number(subCheck.userRecord?.workspace_id || currentUser.workspace_id) || 1;
    const userId = Number(subCheck.userRecord?.id || currentUser.id) || 1;
    const body = await req.json().catch(() => ({}));
    const message = String(body.message || "").trim();
    let conversationId = body.conversation_id ? String(body.conversation_id).trim() : null;

    if (!message) {
      return NextResponse.json({ error: "Please provide a message" }, { status: 400 });
    }

    const detected = detectUserLanguage(message);

    // If conversation doesn't exist, create it in DB
    if (!conversationId) {
      const titleSnippet = message.length > 40 ? message.substring(0, 37) + "..." : message;
      const newConv = await createNeonChatConversation(
        workspaceId,
        userId || 1,
        titleSnippet,
        detected.code,
        { initial_intent: "growth_consultation" }
      );
      if (newConv && newConv.id) {
        conversationId = newConv.id;
      } else {
        conversationId = `conv_${Date.now()}`;
      }
    }

    // Save incoming user message in DB
    try {
      await addNeonChatMessage(conversationId, workspaceId, "user", message);
    } catch (dbErr) {
      console.warn("Could not persist user message:", dbErr);
    }

    // Load recent conversation history from DB
    let history: any[] = [];
    try {
      history = await getNeonChatMessages(conversationId, workspaceId);
    } catch (e) {
      history = [];
    }

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();

    if (!apiKey || apiKey.length < 10) {
      const fallback = getFallbackReply(message, detected.code);
      try {
        await addNeonChatMessage(conversationId, workspaceId, "assistant", fallback.reply, fallback.suggested_actions);
      } catch {}
      return NextResponse.json({
        conversation_id: conversationId,
        reply: fallback.reply,
        language: detected.label,
        suggested_actions: fallback.suggested_actions
      });
    }

    // Build Gemini contents with multi-turn history
    try {
      const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

      // System instruction in first turn
      const recentTurns = history.slice(-8); // Up to 8 messages
      if (recentTurns.length > 1) {
        // First message with system prompt prefix
        const first = recentTurns[0];
        contents.push({
          role: first.role === "assistant" ? "model" : "user",
          parts: [{ text: `[System Instruction]\n${CONSULTATIVE_SYSTEM_PROMPT}\n\n[Conversation Start]\n${first.content}` }]
        });

        for (let i = 1; i < recentTurns.length; i++) {
          const item = recentTurns[i];
          contents.push({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.content }]
          });
        }
      } else {
        contents.push({
          role: "user",
          parts: [{ text: `${CONSULTATIVE_SYSTEM_PROMPT}\n\nUser Question/Statement in ${detected.label}:\n${message}` }]
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
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            }
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (replyText) {
          const suggestedActions = [
            { label: "WhatsApp Founder (+923174383702)", url: "https://wa.me/923174383702" },
            { label: "Pricing & Plans", url: "/pricing" },
            { label: "Find Leads Now", url: "/app/leads" }
          ];

          try {
            await addNeonChatMessage(conversationId, workspaceId, "assistant", replyText, suggestedActions);
          } catch (dbErr) {
            console.warn("Could not save assistant message:", dbErr);
          }

          return NextResponse.json({
            conversation_id: conversationId,
            reply: replyText,
            language: detected.label,
            suggested_actions: suggestedActions
          });
        }
      }

      // If Gemini returned an error or empty text, use fallback
      const fallback = getFallbackReply(message, detected.code);
      try {
        await addNeonChatMessage(conversationId, workspaceId, "assistant", fallback.reply, fallback.suggested_actions);
      } catch {}
      return NextResponse.json({
        conversation_id: conversationId,
        reply: fallback.reply,
        language: detected.label,
        suggested_actions: fallback.suggested_actions
      });
    } catch (geminiErr) {
      console.error("Gemini Assistant error:", geminiErr);
      const fallback = getFallbackReply(message, detected.code);
      return NextResponse.json({
        conversation_id: conversationId,
        reply: fallback.reply,
        language: detected.label,
        suggested_actions: fallback.suggested_actions
      });
    }
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || "Failed to process message"
    }, { status: 500 });
  }
}
