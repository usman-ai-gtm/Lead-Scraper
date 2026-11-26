"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { SelectedCityTarget } from "@/components/leads/MultiCitySelector";

export interface MapsJobState {
  id: string;
  workspace_id: number;
  status: "RUNNING" | "COMPLETED" | "CANCELLED" | "FAILED" | "TIMED_OUT";
  keyword: string;
  country: string;
  city: string;
  target_count: number;
  progress_count: number;
  progress_message: string;
  error_message?: string | null;
  search_record_id?: string | null;
  countries: string[];
  specific_cities_enabled: boolean;
  cities: Array<{ city: string; country: string }>;
  contact_requirement: "EMAIL_AND_PHONE" | "EMAIL_ONLY" | "PHONE_ONLY" | "EMAIL_OR_PHONE";
  candidates_processed: number;
  eligible_count: number;
  duplicates_skipped: number;
  missing_contact_skipped: number;
  errors_count: number;
  provider_errors: string[];
  country_stats: Record<
    string,
    { discovered: number; eligible: number; duplicates: number; missing_contact: number; errors?: number }
  >;
  live_leads: any[];
  current_target: string;
  shortfall_reason?: string | null;
  queue_total: number;
  queue_cursor: number;
}

interface StartMapsJobParams {
  keyword: string;
  countries: string[];
  specific_cities_enabled: boolean;
  cities: SelectedCityTarget[];
  requested_quantity: number;
  contact_requirement: "EMAIL_AND_PHONE" | "EMAIL_ONLY" | "PHONE_ONLY" | "EMAIL_OR_PHONE";
}

interface MapsJobContextValue {
  job: MapsJobState | null;
  isRunning: boolean;
  actionError: string | null;
  clearError: () => void;
  startJob: (params: StartMapsJobParams) => Promise<void>;
  cancelJob: () => Promise<void>;
  refreshJob: () => Promise<void>;
}

const MapsJobContext = createContext<MapsJobContextValue>({
  job: null,
  isRunning: false,
  actionError: null,
  clearError: () => {},
  startJob: async () => {},
  cancelJob: async () => {},
  refreshJob: async () => {},
});

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("usman_gtm_token");
    if (token && token !== "null" && token !== "undefined") {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

async function safeParseJsonResponse(res: Response): Promise<any> {
  const raw = await res.text();
  if (!raw) {
    throw new Error(`Server returned an empty response (HTTP ${res.status}).`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    const snippet = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
    throw new Error(`Server returned non-JSON response (HTTP ${res.status}): ${snippet || "Unexpected server error"}`);
  }
}

export function MapsJobProvider({ children }: { children: React.ReactNode }) {
  const { user, isLocked } = useAuth();
  const [job, setJob] = useState<MapsJobState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isSteppingRef = useRef(false);
  const cancelSignalRef = useRef(false);

  const isOwner =
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    user?.account_type === "MASTER_OWNER";
  const planUpper = String(user?.plan || "").toUpperCase();
  const canUseMaps = Boolean(
    user &&
      !isLocked &&
      (isOwner ||
        user?.google_maps_enabled ||
        user?.features?.google_maps ||
        planUpper === "LIFETIME" ||
        planUpper === "OWNER_LIFETIME")
  );

  const runStepLoop = useCallback(async (jobId: string) => {
    if (isSteppingRef.current) return;
    isSteppingRef.current = true;
    cancelSignalRef.current = false;

    try {
      let currentId: string | null = jobId;
      let safetyCounter = 0;

      while (currentId && !cancelSignalRef.current && safetyCounter < 180) {
        safetyCounter++;
        const res = await fetch("/api/leads/maps/job", {
          method: "POST",
          credentials: "include",
          headers: getAuthHeaders(),
          body: JSON.stringify({ action: "step", job_id: currentId }),
        });

        const data = await safeParseJsonResponse(res);
        if (!res.ok || data.status === "error") {
          throw new Error(data.message || "Maps extraction step failed.");
        }

        const updatedJob: MapsJobState | null = data.job || null;
        if (updatedJob) {
          setJob(updatedJob);
          if (updatedJob.status !== "RUNNING") {
            break;
          }
        } else {
          break;
        }
      }
    } catch (err: any) {
      setActionError(err?.message || "Google Maps research encountered an unexpected error.");
    } finally {
      isSteppingRef.current = false;
    }
  }, []);

  const refreshJob = useCallback(async () => {
    if (!canUseMaps) return;
    try {
      const res = await fetch("/api/leads/maps/job", {
        method: "GET",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await safeParseJsonResponse(res);
      if (data?.job) {
        setJob(data.job);
        if (data.job.status === "RUNNING" && !isSteppingRef.current && !cancelSignalRef.current) {
          void runStepLoop(data.job.id);
        }
      }
    } catch {
      // Non-blocking background restore
    }
  }, [canUseMaps, runStepLoop]);

  useEffect(() => {
    if (canUseMaps) {
      void refreshJob();
    } else {
      cancelSignalRef.current = true;
      setJob(null);
    }
  }, [canUseMaps, user?.id, refreshJob]);

  const startJob = async (params: StartMapsJobParams) => {
    setActionError(null);
    cancelSignalRef.current = false;

    const res = await fetch("/api/leads/maps/job", {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        action: "start",
        keyword: params.keyword,
        countries: params.countries,
        specific_cities_enabled: params.specific_cities_enabled,
        cities: params.cities.map((c) => ({ city: c.city, country: c.country })),
        requested_quantity: params.requested_quantity,
        contact_requirement: params.contact_requirement,
      }),
    });

    const data = await safeParseJsonResponse(res);
    if (!res.ok || data.status === "error") {
      const msg = data.message || "Could not start Google Maps search.";
      setActionError(msg);
      throw new Error(msg);
    }

    if (data.job) {
      setJob(data.job);
      void runStepLoop(data.job.id);
    }
  };

  const cancelJob = async () => {
    cancelSignalRef.current = true;
    const jobId = job?.id;
    try {
      const res = await fetch("/api/leads/maps/job", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "cancel", job_id: jobId }),
      });
      const data = await safeParseJsonResponse(res);
      if (data?.job) {
        setJob(data.job);
      } else if (job) {
        setJob({ ...job, status: "CANCELLED", progress_message: "Cancelled by user." });
      }
    } catch (err: any) {
      setActionError(err?.message || "Failed to send cancel request.");
    }
  };

  return (
    <MapsJobContext.Provider
      value={{
        job,
        isRunning: job?.status === "RUNNING",
        actionError,
        clearError: () => setActionError(null),
        startJob,
        cancelJob,
        refreshJob,
      }}
    >
      {children}
    </MapsJobContext.Provider>
  );
}

export function useMapsJob() {
  return useContext(MapsJobContext);
}
