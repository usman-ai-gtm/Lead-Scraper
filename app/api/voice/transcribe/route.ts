import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, verifyClientActiveSubscription } from "@/lib/serverless-auth";
import { isRtlLanguage } from "@/lib/business-profile-ai";
import { consumeRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function getSpeechApiKey(): string | null {
  const k = (process.env.GEMINI_API_KEY || "").trim();
  if (!k || k.startsWith("your_") || k.length < 10) return null;
  return k;
}

export async function POST(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error_code: "AUTH_REQUIRED", detail: "Please sign in before using voice transcription." },
        { status: 401 }
      );
    }

    const subCheck = await verifyClientActiveSubscription(user);
    if (!subCheck.allowed) {
      return NextResponse.json(
        {
          error_code: "SUBSCRIPTION_REQUIRED",
          detail: subCheck.message || "Active subscription required to use voice transcription.",
        },
        { status: subCheck.statusCode || 403 }
      );
    }

    const workspaceId = Number(subCheck.userRecord?.workspace_id || user.workspace_id) || 1;
    const rl = await consumeRateLimit({
      bucket: "voice_transcribe",
      identifier: String(workspaceId),
      limit: 30,
      windowSeconds: 300,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(
        rl.retryAfterSeconds,
        `Voice request limit reached. Please retry in ${rl.retryAfterSeconds} seconds.`
      );
    }

    const body = await req.json().catch(() => ({}));
    const audioBase64 = typeof body.audioBase64 === "string" ? body.audioBase64.trim() : "";
    const audioMime = typeof body.audioMime === "string" ? body.audioMime.trim().split(";")[0] : "audio/webm";
    const languageHint = typeof body.languageHint === "string" ? body.languageHint.trim() : "auto";

    if (!audioBase64 || audioBase64.length < 120) {
      return NextResponse.json(
        {
          error_code: "EMPTY_AUDIO",
          recognized: false,
          detail: "No microphone audio was captured. Speak clearly after starting recording, or use typing / ChatGPT Voice.",
        },
        { status: 400 }
      );
    }

    if (audioBase64.length > 11_000_000) {
      return NextResponse.json(
        {
          error_code: "AUDIO_TOO_LARGE",
          recognized: false,
          detail: "Recording is too long. Keep voice clips under 90 seconds.",
        },
        { status: 400 }
      );
    }

    const apiKey = getSpeechApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          error_code: "SPEECH_PROVIDER_NOT_CONFIGURED",
          recognized: false,
          detail:
            "Server speech transcription service is not configured. Check server GEMINI_API_KEY configuration or use typing / Use ChatGPT Voice Instead.",
        },
        { status: 503 }
      );
    }

    const promptText = `Listen carefully to this voice recording in ANY language (including English, Urdu, Hindi, Punjabi, German, Arabic, Chinese, French, Spanish, Persian, Bengali, Pashto, Balochi, Turkish, etc.).
Language hint selected by user (may be "auto"): ${languageHint || "auto"}.

Rules:
1. Transcribe the exact spoken words accurately in the original language spoken by the user (do NOT lose proper nouns, business names, numbers, emails, cities, or services).
2. If the recording contains only silence, static noise, or unintelligible sound with no clear human speech, return "recognized": false and "transcript": "".
3. If the language appears to be a dialect or rare regional language you cannot transcribe reliably, return "recognized": false with an honest warning explaining that automatic transcription for that speech could not be verified.
4. Never invent, expand, or guess words that were not spoken.

Respond strictly as JSON:
{
  "recognized": true,
  "transcript": "Verbatim transcript in spoken language",
  "detected_language": "Language name (e.g. Urdu, English, Hindi, Punjabi, German, Arabic, Chinese, French, Spanish, Persian, Bengali)",
  "is_rtl": false,
  "confidence_note": ""
}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 16000);

    let res: Response;
    try {
      res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: promptText },
                  {
                    inline_data: {
                      mime_type: audioMime || "audio/webm",
                      data: audioBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        }
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const upstreamStatus = res.status;
      if (upstreamStatus === 401 || upstreamStatus === 403) {
        return NextResponse.json(
          {
            error_code: "SPEECH_PROVIDER_AUTH_ERROR",
            recognized: false,
            detail:
              "Speech service authentication failed on the server. Please verify the configured speech API key or use typing / ChatGPT Voice.",
          },
          { status: 502 }
        );
      }
      if (upstreamStatus === 429) {
        return NextResponse.json(
          {
            error_code: "SPEECH_PROVIDER_RATE_LIMIT",
            recognized: false,
            detail: "Speech service quota is temporarily busy. Wait a few seconds and retry, or use typing / ChatGPT Voice.",
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        {
          error_code: "SPEECH_PROVIDER_ERROR",
          recognized: false,
          detail: `Speech processing encountered a temporary provider error (HTTP ${upstreamStatus}). Please retry or use typing / ChatGPT Voice.`,
        },
        { status: 502 }
      );
    }

    const data = await res.json().catch(() => null);
    const rawOut = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!rawOut) {
      return NextResponse.json(
        {
          error_code: "NO_TRANSCRIPT_RETURNED",
          recognized: false,
          detail: "Could not hear clear speech in the recording. Please speak closer to the microphone or try ChatGPT Voice.",
        },
        { status: 200 }
      );
    }

    const parsed = JSON.parse(rawOut);
    const transcript = String(parsed?.transcript || "").trim();
    const recognized = parsed?.recognized !== false && transcript.length > 0;
    const detectedLanguage = String(parsed?.detected_language || (languageHint !== "auto" ? languageHint : "Auto"));

    return NextResponse.json({
      status: recognized ? "success" : "unrecognized",
      recognized,
      transcript,
      detected_language: detectedLanguage,
      is_rtl: Boolean(parsed?.is_rtl || isRtlLanguage(transcript) || isRtlLanguage(detectedLanguage)),
      warning: !recognized
        ? String(
            parsed?.confidence_note ||
              "Speech could not be recognized clearly. Try speaking closer to the microphone, choose a specific language, or use Use ChatGPT Voice Instead."
          )
        : undefined,
    });
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    return NextResponse.json(
      {
        error_code: isAbort ? "SPEECH_TIMEOUT" : "SPEECH_INTERNAL_ERROR",
        recognized: false,
        detail: isAbort
          ? "Speech transcription timed out. Please try a shorter recording or use ChatGPT Voice."
          : "Unable to complete speech transcription due to a network or server error. You can type or use ChatGPT Voice.",
      },
      { status: isAbort ? 504 : 500 }
    );
  }
}
