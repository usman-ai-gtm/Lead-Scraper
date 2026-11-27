"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  X,
  AlertCircle,
  RefreshCw,
  Check,
  RotateCcw,
  Loader2,
  Edit3,
} from "lucide-react";

export interface VoiceCaptureResult {
  transcript?: string;
  detectedLanguage?: string;
  isRtl?: boolean;
  audioBase64?: string;
  audioMime?: string;
}

interface VoiceCaptureButtonProps {
  label?: string;
  applyButtonLabel?: string;
  languageHint?: string;
  languageBcp47?: string;
  disabled?: boolean;
  compact?: boolean;
  onLiveTranscript?: (text: string) => void;
  onCaptureComplete: (result: VoiceCaptureResult) => void;
  onError?: (message: string) => void;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

function formatMicrophoneError(err: any, permState?: PermissionState | null): { message: string; isPermissionDenied: boolean } {
  const name = String(err?.name || "");
  const rawMsg = String(err?.message || "").toLowerCase();

  if (
    permState === "denied" ||
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    rawMsg.includes("permission") ||
    rawMsg.includes("not allowed")
  ) {
    return {
      isPermissionDenied: true,
      message:
        "Browser microphone permission is blocked or declined. Allow Microphone access for this site in your browser site settings, then click Retry.",
    };
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      isPermissionDenied: false,
      message: "No microphone was detected on this device. Connect a microphone, type directly, or use ChatGPT Voice below.",
    };
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      isPermissionDenied: false,
      message:
        "Your microphone is currently busy in another app or tab. Close other audio/voice apps and tap Retry.",
    };
  }

  if (name === "SecurityError") {
    return {
      isPermissionDenied: false,
      message: "Voice recording requires a secure HTTPS connection.",
    };
  }

  if (name === "AbortError") {
    return {
      isPermissionDenied: false,
      message: "Microphone startup was interrupted. Tap Retry to try again.",
    };
  }

  return {
    isPermissionDenied: false,
    message: "Unable to start microphone recording cleanly. You can type directly or use ChatGPT Voice instead.",
  };
}

export function VoiceCaptureButton({
  label = "Speak",
  applyButtonLabel = "Use Recognized Text",
  languageHint = "auto",
  languageBcp47 = "en-US",
  disabled = false,
  compact = false,
  onLiveTranscript,
  onCaptureComplete,
  onError,
}: VoiceCaptureButtonProps) {
  const [phase, setPhase] = useState<"idle" | "recording" | "processing" | "review">("idle");
  const [seconds, setSeconds] = useState(0);
  const [livePreview, setLivePreview] = useState("");
  const [recognizedDraft, setRecognizedDraft] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState<string>("");
  const [isRtlDraft, setIsRtlDraft] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string; isPermissionDenied: boolean } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const liveTranscriptRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAudioRef = useRef<{ base64?: string; mime?: string }>({});

  const releaseAllMedia = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      releaseAllMedia();
    };
  }, []);

  const transcribeAudioOnServer = async (audioBase64: string, audioMime: string) => {
    setPhase("processing");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("usman_gtm_token");
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const wsId = localStorage.getItem("usman_gtm_workspace_id");
        if (wsId) headers["X-Workspace-Id"] = wsId;
      }

      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        headers,
        body: JSON.stringify({
          audioBase64,
          audioMime,
          languageHint,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.detail ||
          data?.error ||
          "Speech service returned an error. You can type directly or use ChatGPT Voice below.";
        setErrorInfo({ message: msg, isPermissionDenied: false });
        setPhase("idle");
        onError?.(msg);
        return;
      }

      const transcript = String(data?.transcript || "").trim();
      if (!transcript || data?.recognized === false) {
        const warn =
          data?.warning ||
          data?.detail ||
          "No clear speech was detected. Speak closer to the microphone, type directly, or use ChatGPT Voice.";
        setErrorInfo({ message: warn, isPermissionDenied: false });
        setPhase("idle");
        onError?.(warn);
        return;
      }

      setDetectedLanguage(String(data?.detected_language || ""));
      setIsRtlDraft(Boolean(data?.is_rtl));
      setRecognizedDraft(transcript);
      onLiveTranscript?.(transcript);
      setPhase("review");
    } catch {
      const msg = "Network error while sending audio for speech recognition. Check your connection and retry.";
      setErrorInfo({ message: msg, isPermissionDenied: false });
      setPhase("idle");
      onError?.(msg);
    }
  };

  const handleStart = async () => {
    if (disabled || phase === "recording" || phase === "processing") return;
    setErrorInfo(null);
    setLivePreview("");
    setRecognizedDraft("");
    setDetectedLanguage("");
    liveTranscriptRef.current = "";
    cancelledRef.current = false;
    chunksRef.current = [];
    lastAudioRef.current = {};

    if (typeof window !== "undefined" && !window.isSecureContext) {
      const msg = "Voice input requires a secure HTTPS website connection.";
      setErrorInfo({ message: msg, isPermissionDenied: false });
      onError?.(msg);
      return;
    }

    const canGetUserMedia = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
    const hasMediaRecorder = typeof window !== "undefined" && typeof MediaRecorder !== "undefined";
    const w = typeof window !== "undefined" ? (window as any) : {};
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!canGetUserMedia && !SpeechRec) {
      const msg =
        "This browser does not support voice recording APIs. Please type in the box or use ChatGPT Voice instead.";
      setErrorInfo({ message: msg, isPermissionDenied: false });
      onError?.(msg);
      return;
    }

    // Check current browser permission state cleanly if supported
    let permState: PermissionState | null = null;
    try {
      if (navigator.permissions?.query) {
        const pStatus = await navigator.permissions.query({ name: "microphone" as PermissionName });
        permState = pStatus.state;
      }
    } catch {}

    // Primary cross-platform path: getUserMedia + MediaRecorder (avoids concurrent SpeechRecognition hardware lockouts on Android/Edge)
    if (canGetUserMedia && hasMediaRecorder) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;

        const mimeCandidates = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/ogg;codecs=opus",
          "audio/ogg",
        ];
        const chosenMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
        const recorder = new MediaRecorder(stream, chosenMime ? { mimeType: chosenMime } : undefined);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
        };

        recorder.onstop = async () => {
          const wasCancelled = cancelledRef.current;
          const mime = (recorder.mimeType || chosenMime || "audio/webm").split(";")[0];
          const recordedChunks = [...chunksRef.current];
          releaseAllMedia();
          setSeconds(0);

          if (wasCancelled) {
            setPhase("idle");
            return;
          }

          const blob = new Blob(recordedChunks, { type: mime });
          if (blob.size <= 150) {
            const msg = "Captured recording was empty. Please speak after pressing Record, or type in the text box.";
            setErrorInfo({ message: msg, isPermissionDenied: false });
            setPhase("idle");
            onError?.(msg);
            return;
          }
          if (blob.size > 8 * 1024 * 1024) {
            const msg = "Recording exceeded maximum length. Please keep recordings under 90 seconds.";
            setErrorInfo({ message: msg, isPermissionDenied: false });
            setPhase("idle");
            onError?.(msg);
            return;
          }

          const buf = await blob.arrayBuffer();
          const base64 = arrayBufferToBase64(buf);
          lastAudioRef.current = { base64, mime };
          await transcribeAudioOnServer(base64, mime);
        };

        recorder.onerror = () => {
          releaseAllMedia();
          const msg = "Audio recording stopped unexpectedly. Tap Retry or type directly.";
          setErrorInfo({ message: msg, isPermissionDenied: false });
          setPhase("idle");
          onError?.(msg);
        };

        recorder.start(250);
        setPhase("recording");
        setSeconds(0);
        timerRef.current = setInterval(() => {
          setSeconds((s) => {
            if (s >= 89) {
              handleStop();
              return 90;
            }
            return s + 1;
          });
        }, 1000);
        return;
      } catch (err: any) {
        releaseAllMedia();
        setPhase("idle");
        const parsed = formatMicrophoneError(err, permState);
        setErrorInfo(parsed);
        onError?.(parsed.message);
        return;
      }
    }

    // Secondary fallback only when MediaRecorder is unavailable: standalone SpeechRecognition
    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = languageBcp47 || "en-US";
        rec.onresult = (event: any) => {
          let full = "";
          for (let i = 0; i < event.results.length; i++) {
            full += (event.results[i][0]?.transcript || "") + " ";
          }
          const clean = full.trim();
          liveTranscriptRef.current = clean;
          setLivePreview(clean);
        };
        rec.onerror = (ev: any) => {
          const code = String(ev?.error || "");
          releaseAllMedia();
          setPhase("idle");
          const denied = code === "not-allowed" || code === "service-not-allowed";
          const msg = denied
            ? "Browser speech permission was denied. Allow microphone access in browser settings or use ChatGPT Voice."
            : code === "no-speech"
            ? "No speech was heard. Please retry or type directly."
            : `Speech recognition encountered an error (${code || "unknown"}). Try typing or ChatGPT Voice.`;
          setErrorInfo({ message: msg, isPermissionDenied: denied });
          onError?.(msg);
        };
        rec.onend = () => {
          const wasCancelled = cancelledRef.current;
          const captured = liveTranscriptRef.current.trim();
          releaseAllMedia();
          setSeconds(0);
          if (wasCancelled) {
            setPhase("idle");
            return;
          }
          if (captured) {
            setRecognizedDraft(captured);
            setPhase("review");
          } else {
            setPhase("idle");
          }
        };
        rec.start();
        recognitionRef.current = rec;
        setPhase("recording");
        setSeconds(0);
        timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      } catch (err: any) {
        releaseAllMedia();
        setPhase("idle");
        const parsed = formatMicrophoneError(err, permState);
        setErrorInfo(parsed);
        onError?.(parsed.message);
      }
    }
  };

  const handleStop = () => {
    cancelledRef.current = false;
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.requestData();
        } catch {}
        mediaRecorderRef.current.stop();
        return;
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        return;
      }
    } catch {}
    releaseAllMedia();
    setPhase("idle");
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    setLivePreview("");
    setRecognizedDraft("");
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        return;
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        return;
      }
    } catch {}
    releaseAllMedia();
    setPhase("idle");
    setSeconds(0);
  };

  const handleConfirmDraft = () => {
    const clean = recognizedDraft.trim();
    if (!clean) return;
    setPhase("idle");
    setRecognizedDraft("");
    onCaptureComplete({
      transcript: clean,
      detectedLanguage: detectedLanguage || undefined,
      isRtl: isRtlDraft,
      audioBase64: lastAudioRef.current.base64,
      audioMime: lastAudioRef.current.mime,
    });
  };

  if (phase === "recording") {
    return (
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Recording ({Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")})</span>
          </span>
          <button
            type="button"
            onClick={handleStop}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>Stop Recording</span>
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-slate-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <X className="h-3 w-3" />
            <span>Cancel</span>
          </button>
        </div>
        {livePreview && (
          <div dir="auto" className="text-[11px] text-slate-300 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5">
            {livePreview}
          </div>
        )}
      </div>
    );
  }

  if (phase === "processing") {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/35 text-xs font-semibold text-indigo-200">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
        <span>Processing recorded speech...</span>
      </div>
    );
  }

  if (phase === "review") {
    return (
      <div className="rounded-xl border border-emerald-500/35 bg-[#09121e] p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
            <Edit3 className="h-3.5 w-3.5" />
            <span>Review &amp; Edit Recognized Speech</span>
          </div>
          {detectedLanguage && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-200">
              {detectedLanguage}
            </span>
          )}
        </div>
        <textarea
          dir={isRtlDraft ? "rtl" : "auto"}
          rows={3}
          value={recognizedDraft}
          onChange={(e) => setRecognizedDraft(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none leading-relaxed"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleConfirmDraft}
            disabled={!recognizedDraft.trim()}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{applyButtonLabel}</span>
          </button>
          <button
            type="button"
            onClick={handleStart}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-slate-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Record Again</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRecognizedDraft("");
              setPhase("idle");
            }}
            className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleStart}
          disabled={disabled}
          className={
            compact
              ? "px-3 py-2 rounded-xl border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              : "px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-glow-sm inline-flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          }
        >
          <Mic className="h-4 w-4" />
          <span>{label}</span>
        </button>

        {errorInfo && (
          <button
            type="button"
            onClick={handleStart}
            disabled={disabled}
            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry Mic</span>
          </button>
        )}
      </div>

      {errorInfo && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 space-y-1.5">
          <div className="flex items-start gap-1.5 font-medium">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
            <span>{errorInfo.message}</span>
          </div>
          {errorInfo.isPermissionDenied && (
            <ul className="text-[10px] text-slate-300 list-disc list-inside space-y-0.5 pl-1">
              <li><strong>Desktop Chrome / Edge:</strong> Click the lock/tune icon to the left of the URL bar → set <em>Microphone</em> to <em>Allow</em> → tap <strong>Retry Mic</strong>.</li>
              <li><strong>Android Chrome:</strong> Tap the lock/tune icon next to the URL → <em>Permissions</em> → turn on <em>Microphone</em> (also verify OS Chrome app mic permission).</li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
