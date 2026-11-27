"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, X, AlertCircle } from "lucide-react";

export interface VoiceCaptureResult {
  transcript?: string;
  audioBase64?: string;
  audioMime?: string;
}

interface VoiceCaptureButtonProps {
  label?: string;
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

export function VoiceCaptureButton({
  label = "Describe Your Business",
  languageBcp47 = "en-US",
  disabled = false,
  compact = false,
  onLiveTranscript,
  onCaptureComplete,
  onError,
}: VoiceCaptureButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [livePreview, setLivePreview] = useState("");
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const liveTranscriptRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupMedia = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch {}
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      cleanupMedia();
    };
  }, []);

  const handleStart = async () => {
    if (disabled || isRecording) return;
    setPermissionError(null);
    setLivePreview("");
    liveTranscriptRef.current = "";
    cancelledRef.current = false;
    chunksRef.current = [];

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      const msg = "Microphone capture is not supported in this browser. Please type your description instead.";
      setPermissionError(msg);
      onError?.(msg);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const chosenMime = mimeCandidates.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) || "";
      const recorder = new MediaRecorder(stream, chosenMime ? { mimeType: chosenMime } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        const wasCancelled = cancelledRef.current;
        const mime = recorder.mimeType || chosenMime || "audio/webm";
        const recordedChunks = [...chunksRef.current];
        const capturedText = liveTranscriptRef.current.trim();
        cleanupMedia();
        setIsRecording(false);
        setSeconds(0);

        if (wasCancelled) return;

        const blob = new Blob(recordedChunks, { type: mime });
        let audioBase64 = "";
        if (blob.size > 200 && blob.size <= 8 * 1024 * 1024) {
          const buf = await blob.arrayBuffer();
          audioBase64 = arrayBufferToBase64(buf);
        }

        onCaptureComplete({
          transcript: capturedText || undefined,
          audioBase64: audioBase64 || undefined,
          audioMime: mime.split(";")[0],
        });
      };

      // Optional browser live transcript preview (graceful fallback if unavailable)
      try {
        const w = window as any;
        const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (SpeechRec) {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = languageBcp47 || "en-US";
          rec.onresult = (event: any) => {
            let full = "";
            for (let i = 0; i < event.results.length; i++) {
              full += event.results[i][0]?.transcript || "";
              full += " ";
            }
            const clean = full.trim();
            liveTranscriptRef.current = clean;
            setLivePreview(clean);
            onLiveTranscript?.(clean);
          };
          rec.onerror = () => {
            // Audio capture continues cleanly even if browser speech service errors
          };
          rec.start();
          recognitionRef.current = rec;
        }
      } catch {}

      recorder.start(250);
      setIsRecording(true);
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
    } catch (err: any) {
      cleanupMedia();
      const denied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
      const msg = denied
        ? "Microphone permission was declined. Please allow microphone access or type in the text box."
        : "Unable to access microphone. Please use the text box instead.";
      setPermissionError(msg);
      onError?.(msg);
    }
  };

  const handleStop = () => {
    cancelledRef.current = false;
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      } else {
        cleanupMedia();
        setIsRecording(false);
      }
    } catch {
      cleanupMedia();
      setIsRecording(false);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    setLivePreview("");
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      } else {
        cleanupMedia();
        setIsRecording(false);
      }
    } catch {
      cleanupMedia();
      setIsRecording(false);
    }
  };

  if (isRecording) {
    return (
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Listening ({Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")})</span>
          </span>
          <button
            type="button"
            onClick={handleStop}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>Stop &amp; Process</span>
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

  return (
    <div className="space-y-1.5">
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
      {permissionError && (
        <div className="text-[11px] text-amber-300 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{permissionError}</span>
        </div>
      )}
    </div>
  );
}
