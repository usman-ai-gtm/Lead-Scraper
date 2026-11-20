/**
 * USMAN AI GTM — Dedicated Gemini AI Email Assistant
 * 
 * STRICT COMPLIANCE RULES:
 * 1. This module is EXCLUSIVELY dedicated to email generation and follow-up composition.
 * 2. It is strictly prohibited from being used for lead search, web scraping, chatbot, or auth.
 * 3. Never exposes GEMINI_API_KEY to browser code (server-side execution only).
 * 4. Supports standard and AQ-prefixed Gemini API keys using the documented x-goog-api-key header.
 * 5. Uses verified available models (gemini-3.5-flash-lite / gemini-3.5-flash) with zero paid billing.
 * 6. Strict anti-hallucination guard: Never invents previous meetings, partnerships, or fake achievements.
 */

export interface SenderProfile {
  company_name: string;
  sender_name: string;
  sender_title?: string;
  sender_email?: string;
  website?: string;
  offer_description: string;
  value_proposition?: string;
  call_to_action?: string;
}

export interface RecipientLead {
  id?: number;
  business_name: string;
  domain?: string;
  website?: string;
  email: string;
  phone?: string;
  city?: string;
  country?: string;
  industry?: string;
  address?: string;
  notes?: string;
  search_keyword?: string;
}

export interface GeneratedEmailDraft {
  lead_id?: number;
  recipient_email: string;
  recipient_name: string;
  business_name: string;
  subject: string;
  greeting: string;
  body: string;
  call_to_action: string;
  signature: string;
  full_email: string;
  model_used: string;
  generated_at: string;
}

function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY || "";
  if (!key || key.startsWith("your_") || key.length < 10) {
    return null;
  }
  return key.trim();
}

/**
 * Test connectivity with Gemini API using the dedicated server-side secret.
 */
export async function testGeminiAssistantConnection(): Promise<{
  ok: boolean;
  status: string;
  model: string;
  message: string;
}> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      ok: false,
      status: "NOT_CONFIGURED",
      model: "None",
      message: "GEMINI_API_KEY is not configured in the server environment.",
    };
  }

  const model = "gemini-3.5-flash-lite";
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Respond with: READY" }] }],
        }),
      }
    );

    if (res.status === 200) {
      return {
        ok: true,
        status: "ACTIVE",
        model,
        message: "Gemini AI Email Assistant is authenticated and active on the free tier.",
      };
    }

    if (res.status === 429) {
      return {
        ok: false,
        status: "QUOTA_EXHAUSTED",
        model,
        message: "Gemini free-tier quota is currently exhausted. Please wait a few moments.",
      };
    }

    const err = await res.json().catch(() => ({}));
    return {
      ok: false,
      status: `ERROR_${res.status}`,
      model,
      message: err?.error?.message || `Gemini API returned status ${res.status}`,
    };
  } catch (e: any) {
    return {
      ok: false,
      status: "NETWORK_ERROR",
      model,
      message: e.message || "Failed to reach Google Gemini API endpoints.",
    };
  }
}

/**
 * Generate a personalized, natural B2B outreach email for a verified business lead.
 */
export async function generatePersonalizedEmail(
  lead: RecipientLead,
  sender: SenderProfile
): Promise<GeneratedEmailDraft> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const model = "gemini-3.5-flash-lite";

  const systemInstructions = `
You are the dedicated GeminiEmailAssistant for USMAN AI GTM.
Your only job is to write professional, natural, concise, and respectful B2B outreach emails.

STRICT ANTI-HALLUCINATION RULES:
1. NEVER invent past conversations, meetings, fake mutual contacts, customer claims, or unsupported awards.
2. If company information is limited, write a polite, neutral, well-researched business proposal based strictly on the recipient's industry and business name.
3. Keep the body short and readable (under 120 words). B2B decision makers respect concise messages.
4. No pushy sales jargon, no fake urgency ("Act now!", "URGENT"), no corporate buzzwords.
5. Provide a clear, low-pressure call to action (e.g. asking if they are open to a brief 10-minute introductory conversation).

You must respond ONLY with a valid JSON object matching this schema:
{
  "subject": "Professional email subject line (under 60 characters)",
  "greeting": "Personalized greeting (e.g. Hi Team at [Business Name], or Hi [Name],)",
  "body": "The core message paragraphs without the greeting or signature. Clear value proposition.",
  "call_to_action": "Polite low-friction closing question",
  "signature": "Professional sign-off"
}
`;

  const userPrompt = `
Sender Information:
- Company: ${sender.company_name || "Enterprise Services"}
- Sender Name: ${sender.sender_name || "Sales Team"}
- Sender Title: ${sender.sender_title || "Client Solutions"}
- Services Offered: ${sender.offer_description || sender.value_proposition || "B2B Solutions & Growth Services"}
- Sender Email: ${sender.sender_email || ""}

Recipient Business:
- Business Name: ${lead.business_name}
- Domain / Website: ${lead.domain || lead.website || "their official website"}
- Industry: ${lead.industry || "Commercial Business"}
- Location: ${[lead.city, lead.country].filter(Boolean).join(", ") || "Global"}
- Contact Email: ${lead.email}
- Context / Notes: ${lead.notes || lead.search_keyword || "Verified B2B Lead"}

Write a bespoke, personalized email for this business.
`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemInstructions}\n\n${userPrompt}` }] },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      }),
    }
  );

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Gemini free-tier quota is currently exhausted. Please try again in a few minutes.");
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Gemini generation failed (status ${res.status}).`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Gemini returned an empty response.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Clean potential markdown wrap
    const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleaned);
  }

  const subject = parsed.subject || `Inquiry for ${lead.business_name}`;
  const greeting = parsed.greeting || `Hi Team at ${lead.business_name},`;
  const bodyText = parsed.body || `I came across ${lead.business_name} and wanted to reach out regarding our solutions in ${sender.company_name}.`;
  const cta = parsed.call_to_action || "Would you be open to a brief conversation this week?";
  const signature = parsed.signature || `Best regards,\n${sender.sender_name}\n${sender.company_name}`;

  const fullEmail = `${greeting}\n\n${bodyText}\n\n${cta}\n\n${signature}`;

  return {
    lead_id: lead.id,
    recipient_email: lead.email,
    recipient_name: lead.business_name,
    business_name: lead.business_name,
    subject,
    greeting,
    body: bodyText,
    call_to_action: cta,
    signature,
    full_email: fullEmail,
    model_used: model,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Generate a polite, contextual follow-up email based on an earlier outreach message.
 */
export async function generateFollowupEmail(
  originalSubject: string,
  originalBody: string,
  lead: RecipientLead,
  sender: SenderProfile
): Promise<GeneratedEmailDraft> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const model = "gemini-3.5-flash-lite";

  const systemInstructions = `
You are the dedicated GeminiEmailAssistant for USMAN AI GTM.
Your role: Write a gentle, polite, and brief follow-up to an earlier email.

STRICT FOLLOW-UP RULES:
1. Subject should typically start with "Re: " followed by the original subject.
2. Acknowledge that they are busy.
3. Reiterate the core value proposition in 1-2 short sentences.
4. Keep the entire follow-up under 70 words.
5. Provide a respectful, zero-pressure way out (e.g. "If this isn't a priority right now, no worries at all.").

Respond ONLY with a JSON object:
{
  "subject": "Re: ...",
  "greeting": "Hi [Name/Team],",
  "body": "Brief follow-up body",
  "call_to_action": "Low friction question",
  "signature": "Sign-off"
}
`;

  const userPrompt = `
Recipient: ${lead.business_name} (${lead.email})
Original Subject: ${originalSubject}
Original Message:
${originalBody}

Sender: ${sender.sender_name} at ${sender.company_name}
Services: ${sender.offer_description}

Draft a respectful follow-up.
`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemInstructions}\n\n${userPrompt}` }] },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      }),
    }
  );

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Gemini free-tier quota is currently exhausted. Please try again in a few minutes.");
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Follow-up generation failed (status ${res.status}).`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = JSON.parse(rawText || "{}");

  const subject = parsed.subject || `Following up: ${originalSubject}`;
  const greeting = parsed.greeting || `Hi Team at ${lead.business_name},`;
  const bodyText = parsed.body || `I wanted to follow up briefly regarding my previous note to see if exploring ${sender.company_name}'s services aligns with your current priorities.`;
  const cta = parsed.call_to_action || "Let me know if you might have 5 minutes to connect, or if there's someone else on your team I should reach out to.";
  const signature = parsed.signature || `Best regards,\n${sender.sender_name}\n${sender.company_name}`;

  const fullEmail = `${greeting}\n\n${bodyText}\n\n${cta}\n\n${signature}`;

  return {
    lead_id: lead.id,
    recipient_email: lead.email,
    recipient_name: lead.business_name,
    business_name: lead.business_name,
    subject,
    greeting,
    body: bodyText,
    call_to_action: cta,
    signature,
    full_email: fullEmail,
    model_used: model,
    generated_at: new Date().toISOString(),
  };
}
