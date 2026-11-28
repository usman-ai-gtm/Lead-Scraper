/**
 * USMAN AI GTM — Server-Side Intelligent Email Outreach Engine
 *
 * Security & Honesty Rules:
 * 1. Secrets remain strictly server-side; never expose internal provider/model identifiers to customers.
 * 2. Uses customer's authoritative Business Profile + real company evidence.
 * 3. Supports separate instruction language (including spoken audio) vs email output language & tone.
 * 4. Strict anti-hallucination: never invents people's names, meetings, or unverified claims.
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
  snippet?: string;
  search_keyword?: string;
  positive_signals?: string;
  enrichment_data?: Record<string, any>;
}

export interface EmailAssistantOptions {
  businessProfile?: any | null;
  customInstruction?: string;
  instructionAudioBase64?: string;
  instructionAudioMime?: string;
  templateName?: string;
  outputLanguage?: string;
  tone?: string;
  templateMode?: boolean;
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
  recognized_instruction?: string;
}

function getAiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY || "";
  if (!key || key.startsWith("your_") || key.length < 10) return null;
  return key.trim();
}

export async function testGeminiAssistantConnection(): Promise<{
  ok: boolean;
  status: string;
  model: string;
  message: string;
}> {
  const apiKey = getAiApiKey();
  if (!apiKey) {
    return {
      ok: false,
      status: "NOT_CONFIGURED",
      model: "Unconfigured",
      message: "Email intelligence key is not configured on the server.",
    };
  }

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
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
        model: "Smart Outreach Engine",
        message: "Intelligent Email Assistant is connected and ready.",
      };
    }

    if (res.status === 429) {
      return {
        ok: false,
        status: "QUOTA_EXHAUSTED",
        model: "Smart Outreach Engine",
        message: "Outreach drafting rate limit reached temporarily. Please retry in a moment.",
      };
    }

    return {
      ok: false,
      status: `ERROR_${res.status}`,
      model: "Smart Outreach Engine",
      message: `Email generation service returned HTTP ${res.status}`,
    };
  } catch (e: any) {
    return {
      ok: false,
      status: "NETWORK_ERROR",
      model: "Smart Outreach Engine",
      message: e.message || "Failed to reach outreach drafting service.",
    };
  }
}

export async function generatePersonalizedEmail(
  lead: RecipientLead,
  sender: SenderProfile,
  options?: EmailAssistantOptions
): Promise<GeneratedEmailDraft> {
  const apiKey = getAiApiKey();
  if (!apiKey) {
    throw new Error("Smart outreach assistant is not configured on the server.");
  }

  const profile = options?.businessProfile;
  const senderCompany = profile?.business_name || sender.company_name || "Our Team";
  const senderOffer =
    profile?.products_services ||
    profile?.ai_summary ||
    sender.offer_description ||
    "B2B business solutions";
  const senderDiff = profile?.differentiator || sender.value_proposition || "";
  const senderGoal = profile?.outreach_goal || sender.call_to_action || "Explore a relevant conversation";

  const requestedOutputLang =
    options?.outputLanguage && options.outputLanguage !== "Auto"
      ? options.outputLanguage
      : profile?.preferred_outreach_language && profile.preferred_outreach_language !== "Match Prospect Country"
      ? profile.preferred_outreach_language
      : "Auto-select based on customer instruction and recipient country (default English unless German/Urdu/Arabic requested)";

  const requestedTone = options?.tone || profile?.preferred_tone || "Professional";

  const systemInstructions = `
You are the Personalized Outreach Assistant for USMAN AI GTM.
Generate a genuine, concise, individually tailored B2B email based strictly on the sender's Business Profile, user instruction (which may be typed OR in the attached audio clip in ANY language like German, Urdu, Hindi, Arabic, Punjabi, or English), and the recipient company's real facts.

CRITICAL LANGUAGE & HONESTY RULES:
1. Distinguish INSTRUCTION language (what the customer spoke/wrote) from OUTPUT EMAIL language: "${requestedOutputLang}". Write the final email exclusively in the requested output language (if the customer spoke in German asking for a German email, write fluent German!).
2. Requested Tone: ${requestedTone}.
3. NEVER invent human names (greetings like "Hi Team at ${lead.business_name}," or localized equivalent are preferred when no verified contact name is supplied).
4. NEVER invent past conversations, meetings, awards, or unverified problems.
5. Keep email concise (75–125 words), respectful, and practical.
${options?.templateName ? `6. Structural template intent: "${options.templateName}".` : ""}
${options?.templateMode ? `7. Reusable Template Mode: Use clean placeholders like {{business_name}}, {{contact_name}}, {{city}}, and {{sender_name}} ONLY where natural for a reusable workspace template.` : ""}

Respond strictly in valid JSON matching:
{
  "recognized_instruction": "Concise English or original summary of what the user asked (if audio/instruction provided)",
  "subject": "Email subject line under 65 characters in output language",
  "greeting": "Greeting in output language",
  "body": "Core message paragraphs without greeting or signature",
  "call_to_action": "Polite closing question in output language",
  "signature": "Clean professional sign-off"
}`;

  const observedFacts = [
    lead.website || lead.domain ? `Website: ${lead.website || lead.domain}` : "",
    lead.industry ? `Industry: ${lead.industry}` : "",
    [lead.city, lead.country].filter(Boolean).join(", ") ? `Location: ${[lead.city, lead.country].filter(Boolean).join(", ")}` : "",
    lead.snippet ? `Description: ${lead.snippet}` : "",
    lead.positive_signals ? `Signals: ${lead.positive_signals}` : "",
    lead.notes ? `Notes: ${lead.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n- ");

  const userPrompt = `
SENDER BUSINESS PROFILE:
- Company: ${senderCompany}
- Sender Name: ${sender.sender_name || senderCompany}
- Products / Services: ${senderOffer}
- What makes us different: ${senderDiff || "N/A"}
- Goal: ${senderGoal}

RECIPIENT BUSINESS:
- Business Name: ${lead.business_name}
- Email: ${lead.email}
${observedFacts ? `- ${observedFacts}` : ""}

${options?.customInstruction ? `USER INSTRUCTION:\n"""\n${options.customInstruction}\n"""` : "Write a personalized outreach email matching the Business Profile and recipient details."}
`;

  const parts: any[] = [{ text: `${systemInstructions}\n\n${userPrompt}` }];
  if (options?.instructionAudioBase64 && options.instructionAudioBase64.length > 100) {
    parts.push({
      inline_data: {
        mime_type: options.instructionAudioMime || "audio/webm",
        data: options.instructionAudioBase64,
      },
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.5,
        },
      }),
    }
  );
  clearTimeout(timer);

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Drafting rate limit reached temporarily. Please wait a few moments.");
    }
    throw new Error(`Email drafting failed (HTTP ${res.status}).`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Email assistant returned an empty response.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleaned);
  }

  const subject = parsed.subject || `Introduction for ${lead.business_name}`;
  const greeting = parsed.greeting || `Hi Team at ${lead.business_name},`;
  const bodyText =
    parsed.body ||
    `I came across ${lead.business_name} and wanted to introduce how ${senderCompany} supports businesses with ${senderOffer}.`;
  const cta = parsed.call_to_action || "Would you be open to a brief conversation this week?";
  const signature = parsed.signature || `Best regards,\n${sender.sender_name || senderCompany}`;
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
    model_used: "Smart Outreach Engine",
    generated_at: new Date().toISOString(),
    ...(parsed.recognized_instruction ? { recognized_instruction: String(parsed.recognized_instruction) } : {}),
  };
}

export async function generateFollowupEmail(
  originalSubject: string,
  originalBody: string,
  lead: RecipientLead,
  sender: SenderProfile,
  options?: { businessProfile?: any | null; outputLanguage?: string; tone?: string }
): Promise<GeneratedEmailDraft> {
  const apiKey = getAiApiKey();
  if (!apiKey) {
    throw new Error("Smart outreach assistant is not configured on the server.");
  }

  const profile = options?.businessProfile;
  const senderCompany = profile?.business_name || sender.company_name || "Our Team";
  const senderOffer = profile?.products_services || sender.offer_description || "our business services";
  const outLang = options?.outputLanguage || profile?.preferred_outreach_language || "Same as original email";
  const tone = options?.tone || profile?.preferred_tone || "Professional";

  const systemInstructions = `
You are the Personalized Follow-Up Assistant for USMAN AI GTM.
Write a gentle, brief, zero-pressure follow-up in "${outLang}" with a "${tone}" tone.
Rules:
1. Keep under 75 words.
2. Start Subject cleanly ("Re: ..." when appropriate).
3. Never invent fake urgency or fake previous calls.
Respond strictly as JSON:
{
  "subject": "Follow-up subject",
  "greeting": "Greeting",
  "body": "Brief follow-up paragraph",
  "call_to_action": "Polite opt-out or 5-minute chat check",
  "signature": "Sign-off"
}`;

  const userPrompt = `
Recipient: ${lead.business_name} (${lead.email})
Original Subject: ${originalSubject}
Original Body: ${originalBody}
Sender: ${sender.sender_name || senderCompany} at ${senderCompany}
Services: ${senderOffer}`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${systemInstructions}\n\n${userPrompt}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.5,
        },
      }),
    }
  );

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Drafting rate limit reached temporarily. Please wait a few moments.");
    }
    throw new Error(`Follow-up generation failed (HTTP ${res.status}).`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = JSON.parse((rawText || "{}").replace(/```json/gi, "").replace(/```/g, "").trim());

  const subject = parsed.subject || `Re: ${originalSubject}`;
  const greeting = parsed.greeting || `Hi Team at ${lead.business_name},`;
  const bodyText =
    parsed.body ||
    `Wanted to follow up briefly on my earlier note regarding ${senderCompany}'s ${senderOffer}.`;
  const cta = parsed.call_to_action || "Let me know if this is worth a brief chat or if timing isn't right.";
  const signature = parsed.signature || `Best regards,\n${sender.sender_name || senderCompany}`;

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
    full_email: `${greeting}\n\n${bodyText}\n\n${cta}\n\n${signature}`,
    model_used: "Smart Outreach Engine",
    generated_at: new Date().toISOString(),
  };
}
