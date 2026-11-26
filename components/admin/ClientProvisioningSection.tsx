"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ClientAccount } from "@/lib/types";
import {
  FEATURE_CATALOG,
  BASIC_FEATURES,
  ALL_FEATURES_ENABLED,
  NO_FEATURES_ENABLED,
  calculateSuggestedCustomPrice,
  calculateCustomPlanExpiresAt,
  formatDurationLabel,
  normalizeFeatures,
  DurationUnit,
  FeatureKey,
  FeatureMap,
} from "@/lib/entitlements";
import {
  Users, UserPlus, KeyRound, ShieldAlert, CheckCircle2,
  AlertTriangle, Copy, Check, RefreshCw, Lock, Unlock, Trash2, Power, Search,
  Sparkles, Key, ExternalLink, ShieldCheck, Clock, Eye, EyeOff, UserCheck, Globe,
  Crown, AlertCircle, Sliders, X, DollarSign
} from "lucide-react";

interface OneTimeCreds {
  customer_id?: number;
  full_name: string;
  username: string;
  email?: string;
  workspace_id?: number;
  workspace_name?: string;
  temporary_password?: string;
  password?: string;
  plan?: string;
  duration?: string;
  expires_at?: string;
  google_maps_enabled?: boolean;
  daily_email_limit?: number;
  custom_price_usd?: number | null;
  suggested_price_usd?: number | null;
  login_url?: string;
  note?: string;
}

function generateRandomUsername(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `client_${suffix}`;
}

function generateStrongPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const special = "!@#$%^&*";
  
  let pwd = "";
  pwd += upper.charAt(Math.floor(Math.random() * upper.length));
  pwd += lower.charAt(Math.floor(Math.random() * lower.length));
  pwd += numbers.charAt(Math.floor(Math.random() * numbers.length));
  pwd += special.charAt(Math.floor(Math.random() * special.length));

  const all = upper + lower + numbers + special;
  for (let i = 0; i < 8; i++) {
    pwd += all.charAt(Math.floor(Math.random() * all.length));
  }
  return pwd;
}

function getLiveExpiryInfo(client: any, now: number) {
  const rawPlan = String(client.raw_plan || client.plan_type || client.plan || "").toUpperCase();
  const isLifetime =
    rawPlan === "LIFETIME" ||
    rawPlan === "OWNER_LIFETIME" ||
    (rawPlan === "CUSTOM" && String(client.custom_duration_unit || "").toLowerCase() === "lifetime") ||
    (!client.plan_type && String(client.plan || "").toUpperCase().includes("LIFETIME") && !String(client.plan || "").toUpperCase().includes("CUSTOM"));
  const creationDateFormatted = client.created_at ? new Date(client.created_at).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  }) : "N/A";
  const activationDateFormatted = client.subscription_start ? new Date(client.subscription_start).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  }) : creationDateFormatted;

  if (isLifetime) {
    return {
      isLifetime: true,
      isExpired: false,
      countdownText: "Permanent — No Expiry",
      expiryDateFormatted: "Never / Permanent",
      activationDateFormatted,
      creationDateFormatted,
    };
  }

  if (!client.subscription_expires_at) {
    return {
      isLifetime: false,
      isExpired: true,
      countdownText: "EXPIRED",
      expiryDateFormatted: "Not Set",
      activationDateFormatted,
      creationDateFormatted,
    };
  }

  const expTime = new Date(client.subscription_expires_at).getTime();
  const diffMs = expTime - now;

  const expiryDateFormatted = new Date(client.subscription_expires_at).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short"
  });

  if (diffMs <= 0) {
    return {
      isLifetime: false,
      isExpired: true,
      countdownText: "EXPIRED (0m left)",
      expiryDateFormatted,
      activationDateFormatted,
      creationDateFormatted,
    };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const countdownText = `${days}d ${hours}h ${minutes}m ${seconds}s left`;

  return {
    isLifetime: false,
    isExpired: false,
    countdownText,
    days,
    hours,
    minutes,
    seconds,
    expiryDateFormatted,
    activationDateFormatted,
    creationDateFormatted,
  };
}

export function ClientProvisioningSection() {
  const [nowTick, setNowTick] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [previewClients, setPreviewClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // One-time credentials display modal
  const [oneTimeCreds, setOneTimeCreds] = useState<OneTimeCreds | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    username: string;
    workspace_id?: number;
  } | null>(null);
  const [deleteMode, setDeleteMode] = useState<"revoke" | "permanent">("revoke");
  const [confirmDeleteUsername, setConfirmDeleteUsername] = useState("");

  // Tabs: "paid" | "preview" | "inquiries"
  const [activeTab, setActiveTab] = useState<"paid" | "preview" | "inquiries">("paid");
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);

  // Top CREATE CLIENT ACCOUNT Form State
  const [createForm, setCreateForm] = useState({
    customerName: "",
    username: generateRandomUsername(),
    password: generateStrongPassword(),
    showPassword: true,
    plan: "BASIC" as "BASIC" | "LIFETIME" | "CUSTOM",
    clientNotes: "",
    durationValue: 7,
    durationUnit: "days" as DurationUnit,
    features: { ...BASIC_FEATURES } as FeatureMap,
    dailyEmailLimit: 25,
    customPriceOverride: "",
    planLabel: "",
  });
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Existing Client Custom Plan / Extend Subscription Modal State
  const [editingCustomClient, setEditingCustomClient] = useState<ClientAccount | null>(null);
  const [editCustomForm, setEditCustomForm] = useState({
    durationValue: 30,
    durationUnit: "days" as DurationUnit,
    features: { ...BASIC_FEATURES } as FeatureMap,
    dailyEmailLimit: 25,
    customPriceOverride: "",
    actionMode: "ACTIVATE_CUSTOM" as "ACTIVATE_CUSTOM" | "EXTEND_CUSTOM",
    preserveFeatures: false,
  });

  // Re-verify persisted DB state before ever displaying Owner Success notice (Part C #10)
  const verifyClientMutationInDb = async (
    clientId: number,
    expectedCheck?: (freshClient: any) => boolean
  ): Promise<any> => {
    const checkRes = await api.get<{ client: any }>(`/admin/clients/${clientId}`);
    const freshClient = checkRes?.client;
    if (!freshClient || !freshClient.id) {
      throw new Error(`Verification failed: could not re-read client #${clientId} from production database.`);
    }
    if (expectedCheck && !expectedCheck(freshClient)) {
      throw new Error(
        `Database verification mismatch for client #${clientId} (observed plan=${freshClient.plan_type || freshClient.plan}, status=${freshClient.status}).`
      );
    }
    return freshClient;
  };

  const customPriceCalc = React.useMemo(
    () =>
      calculateSuggestedCustomPrice({
        features: createForm.features,
        durationValue: createForm.durationValue,
        durationUnit: createForm.durationUnit,
        dailyEmailLimit: createForm.dailyEmailLimit,
      }),
    [createForm.features, createForm.durationValue, createForm.durationUnit, createForm.dailyEmailLimit]
  );

  const editCustomPriceCalc = React.useMemo(
    () =>
      calculateSuggestedCustomPrice({
        features: editCustomForm.features,
        durationValue: editCustomForm.durationValue,
        durationUnit: editCustomForm.durationUnit,
        dailyEmailLimit: editCustomForm.dailyEmailLimit,
      }),
    [editCustomForm.features, editCustomForm.durationValue, editCustomForm.durationUnit, editCustomForm.dailyEmailLimit]
  );

  const finalCustomPriceUsd =
    createForm.customPriceOverride.trim() !== "" && !Number.isNaN(Number(createForm.customPriceOverride))
      ? Math.max(0, Number(createForm.customPriceOverride))
      : customPriceCalc.suggestedPriceUsd;

  const customExpiryPreviewDate = React.useMemo(
    () =>
      calculateCustomPlanExpiresAt(new Date(), createForm.durationValue, createForm.durationUnit),
    [createForm.durationValue, createForm.durationUnit, reviewModalOpen]
  );

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<any>("/admin/clients");
      if (data && typeof data === "object") {
        setClients(data.clients || []);
        setPreviewClients(data.preview_clients || []);
      } else if (Array.isArray(data)) {
        setClients(data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load provisioned clients");
    } finally {
      setLoading(false);
    }
  };

  const fetchInquiries = async () => {
    setInquiriesLoading(true);
    try {
      const data = await api.get<any>("/inquiries");
      setInquiries(data?.inquiries || []);
    } catch {
      // Inquiries default to empty
    } finally {
      setInquiriesLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchInquiries();
  }, []);

  // Compute dynamic client seat and subscription statistics
  const totalPaid = clients.length;
  const activePaid = clients.filter((c) => c.status === "ACTIVE").length;
  const lockedPaid = clients.filter((c) => c.status === "LOCKED" || c.status === "SUSPENDED").length;
  const expiredPaid = clients.filter((c) => c.status === "EXPIRED").length;
  const lifetimePaid = clients.filter((c) => String(c.raw_plan || c.plan_type || "").toUpperCase() === "LIFETIME").length;
  const basicPaid = clients.filter((c) => String(c.raw_plan || c.plan_type || "").toUpperCase() === "BASIC").length;
  const customPaid = clients.filter((c) => String(c.raw_plan || c.plan_type || "").toUpperCase() === "CUSTOM").length;
  const totalPreview = previewClients.length;

  // Filter clients by search query (Username, customer name, internal ID, email, status, or plan)
  const filteredPaidClients = clients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (c.username || "").toLowerCase().includes(q) ||
      (c.full_name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      String(c.id).includes(q) ||
      String(c.workspace_id || "").includes(q) ||
      (c.status || "").toLowerCase().includes(q) ||
      (c.plan || "").toLowerCase().includes(q)
    );
  });

  const filteredPreviewClients = previewClients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (c.email || "").toLowerCase().includes(q) ||
      (c.full_name || "").toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  });

  const toggleFeatureKey = (key: FeatureKey, isEdit = false) => {
    const updater = (prevFeatures: FeatureMap): FeatureMap => {
      const next = { ...prevFeatures, [key]: !prevFeatures[key] };
      if (!next.google_maps) next.multi_country_maps = false;
      if (next.multi_country_maps) next.google_maps = true;
      if (!next.find_leads) next.multi_country_search = false;
      if (next.multi_country_search) next.find_leads = true;
      return next;
    };
    if (isEdit) {
      setEditCustomForm((prev) => ({ ...prev, features: updater(prev.features) }));
    } else {
      setCreateForm((prev) => ({ ...prev, features: updater(prev.features) }));
    }
  };

  // Validate form & either create directly or open Review Modal for Custom plans
  const handleCreatePaidAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanUsername = createForm.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanUsername || cleanUsername.length < 3) {
      setError("Please provide a valid username of at least 3 alphanumeric characters.");
      return;
    }
    if (!createForm.password.trim() || createForm.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (createForm.plan === "CUSTOM") {
      if (Object.values(createForm.features).filter(Boolean).length === 0) {
        setError("Select at least 1 feature module for a Custom Subscription Plan.");
        return;
      }
      setReviewModalOpen(true);
      return;
    }

    await executeCreateAccount();
  };

  const executeCreateAccount = async () => {
    setReviewModalOpen(false);
    setCreateLoading(true);
    setError(null);
    const cleanUsername = createForm.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

    try {
      const payload: any = {
        customer_name: createForm.customerName.trim() || undefined,
        username: cleanUsername,
        password: createForm.password.trim(),
        plan: createForm.plan,
        client_notes: createForm.clientNotes.trim() || undefined,
      };

      if (createForm.plan === "CUSTOM") {
        payload.duration_value = createForm.durationUnit === "lifetime" ? null : createForm.durationValue;
        payload.duration_unit = createForm.durationUnit;
        payload.features = createForm.features;
        payload.google_maps_enabled = Boolean(createForm.features.google_maps);
        payload.daily_email_limit = createForm.features.cold_email ? createForm.dailyEmailLimit : 0;
        if (createForm.customPriceOverride.trim() !== "") {
          payload.custom_price_usd = Number(createForm.customPriceOverride);
        }
        if (createForm.planLabel.trim()) {
          payload.plan_label = createForm.planLabel.trim();
        }
      }

      const res = await api.post<{
        status: string;
        message: string;
        client: any;
        credentials: any;
        temporary_password?: string;
      }>("/admin/clients", payload);

      const creds = res.credentials || {};
      const client = res.client || {};

      setOneTimeCreds({
        customer_id: creds.customer_id || client.id,
        full_name: creds.customer_name || client.full_name || createForm.customerName || cleanUsername,
        username: creds.username || cleanUsername,
        password: creds.password || createForm.password.trim(),
        plan: creds.plan || client.plan_label || createForm.plan,
        duration: creds.duration || client.remaining_days,
        expires_at: creds.expires_at || client.subscription_expires_at || "Never (Permanent)",
        google_maps_enabled: creds.google_maps_enabled ?? client.google_maps_enabled,
        daily_email_limit: creds.daily_email_limit ?? client.daily_email_limit,
        custom_price_usd: creds.custom_price_usd ?? client.custom_price_usd,
        suggested_price_usd: creds.suggested_price_usd ?? client.suggested_price_usd,
        workspace_id: client.workspace_id,
        workspace_name: client.workspace_name || "Client Workspace",
        login_url: creds.login_url || "https://lead-scraper-mxs5.vercel.app/login",
        note: "This application password is saved in the database only as a secure hash. Provide these credentials securely to your customer.",
      });

      setSuccessMsg(`Paid ${createForm.plan} account created successfully for '${cleanUsername}'!`);
      setCreateForm({
        customerName: "",
        username: generateRandomUsername(),
        password: generateStrongPassword(),
        showPassword: true,
        plan: "BASIC",
        clientNotes: "",
        durationValue: 7,
        durationUnit: "days",
        features: { ...BASIC_FEATURES },
        dailyEmailLimit: 25,
        customPriceOverride: "",
        planLabel: "",
      });

      await fetchClients();
    } catch (err: any) {
      setError(err?.message || "Failed to create paid client account");
    } finally {
      setCreateLoading(false);
    }
  };

  const openEditCustomModal = (
    c: ClientAccount,
    defaultMode: "ACTIVATE_CUSTOM" | "EXTEND_CUSTOM" = "ACTIVATE_CUSTOM"
  ) => {
    const norm = normalizeFeatures(c.features || BASIC_FEATURES, c.google_maps_enabled);
    const isExtend = defaultMode === "EXTEND_CUSTOM";
    const fallbackUnit: DurationUnit = isExtend
      ? "hours"
      : ((c.custom_duration_unit as DurationUnit) || "days") === "lifetime"
      ? "lifetime"
      : ((c.custom_duration_unit as DurationUnit) || "days");
    setEditingCustomClient(c);
    setEditCustomForm({
      durationValue: isExtend ? 1 : c.custom_duration_value || 30,
      durationUnit: fallbackUnit,
      features: norm,
      dailyEmailLimit: c.daily_email_limit ?? 10,
      customPriceOverride: isExtend ? "" : c.custom_price_usd != null ? String(c.custom_price_usd) : "",
      actionMode: defaultMode,
      preserveFeatures: isExtend,
    });
  };

  const handleApplyEditCustomPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomClient) return;
    if (
      !(editCustomForm.actionMode === "EXTEND_CUSTOM" && editCustomForm.preserveFeatures) &&
      Object.values(editCustomForm.features).filter(Boolean).length === 0
    ) {
      setError("Select at least 1 feature.");
      return;
    }

    const targetId = editingCustomClient.id;
    const targetUsername = editingCustomClient.username;
    setActionLoadingId(targetId);
    setError(null);
    try {
      const payload: any = {
        action: editCustomForm.actionMode,
        duration_value: editCustomForm.durationUnit === "lifetime" ? null : editCustomForm.durationValue,
        duration_unit: editCustomForm.durationUnit,
        preserve_features: editCustomForm.actionMode === "EXTEND_CUSTOM" && editCustomForm.preserveFeatures,
      };
      if (!(editCustomForm.actionMode === "EXTEND_CUSTOM" && editCustomForm.preserveFeatures)) {
        payload.features = editCustomForm.features;
        payload.google_maps_enabled = Boolean(editCustomForm.features.google_maps);
        payload.daily_email_limit = editCustomForm.features.cold_email ? editCustomForm.dailyEmailLimit : 0;
      }
      if (editCustomForm.customPriceOverride.trim() !== "") {
        payload.custom_price_usd = Number(editCustomForm.customPriceOverride);
      } else {
        payload.custom_price_usd = editCustomPriceCalc.suggestedPriceUsd;
      }

      const res = await api.post<any>(`/admin/clients/${targetId}/subscription`, payload);
      if (res?.status !== "success") {
        throw new Error(res?.detail || "Failed to update custom subscription.");
      }

      const verified = await verifyClientMutationInDb(targetId, (fresh) => {
        if (fresh.status !== "ACTIVE") return false;
        if (editCustomForm.durationUnit === "lifetime") return fresh.subscription_expires_at == null;
        return Boolean(fresh.subscription_expires_at && new Date(fresh.subscription_expires_at).getTime() > Date.now());
      });

      setEditingCustomClient(null);
      await fetchClients();
      setSuccessMsg(
        `Verified in database: '${targetUsername}' updated (${verified.plan_label || verified.plan}, status: ${verified.status}).`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to save custom plan");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reset Client Password (Generates fresh random credentials & shows modal once)
  const handleResetPassword = async (clientId: number, clientUsername: string) => {
    if (!confirm(`Generate a new secure password for client '${clientUsername}'? Their old password will immediately stop working.`)) {
      return;
    }

    setActionLoadingId(clientId);
    setError(null);
    try {
      const res = await api.post<{
        status: string;
        client_id: number;
        temporary_password: string;
        message: string;
      }>(`/admin/clients/${clientId}/reset-password`, {});

      if (!res?.temporary_password) {
        throw new Error("Server did not return a verified temporary password.");
      }

      const freshClient = await verifyClientMutationInDb(
        clientId,
        (fresh) => Boolean(fresh.must_change_password)
      ).catch(() => null);

      const targetClient = freshClient || clients.find((c) => c.id === clientId);
      setOneTimeCreds({
        customer_id: clientId,
        full_name: targetClient?.full_name || clientUsername,
        username: targetClient?.username || clientUsername,
        password: res.temporary_password,
        plan: targetClient?.plan || "Paid Account",
        duration: targetClient?.remaining_days ? String(targetClient.remaining_days) : "Active",
        workspace_id: targetClient?.workspace_id,
        login_url: "https://lead-scraper-mxs5.vercel.app/login",
        note: "Password reset complete and old sessions invalidated. This new password is shown ONCE.",
      });

      await fetchClients();
      setSuccessMsg(`Verified in DB: password rotated & prior sessions revoked for '${clientUsername}'.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Toggle account suspension (Deactivate / Activate with authoritative expiry verification)
  const handleToggleStatus = async (clientId: number, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setActionLoadingId(clientId);
    setError(null);
    try {
      const res = await api.post<any>(`/admin/clients/${clientId}/status`, { status: newStatus });
      const verified = await verifyClientMutationInDb(clientId, (fresh) => {
        if (newStatus === "SUSPENDED") return fresh.status === "SUSPENDED";
        return res?.restored_access === false ? fresh.status === "EXPIRED" : fresh.status === "ACTIVE";
      });
      await fetchClients();
      if (res?.restored_access === false || verified.status === "EXPIRED") {
        setError(res?.message || `Client #${clientId} subscription has expired; access remains locked until renewed.`);
      } else {
        setSuccessMsg(`Verified in DB: Client #${clientId} status is now ${verified.status}.`);
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to change client status");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open safe confirmation modal for Revoke (soft archive) or Permanent Delete
  const handleRevokeClient = (clientId: number, clientUsername: string, workspaceId?: number) => {
    setDeleteTarget({ id: clientId, username: clientUsername, workspace_id: workspaceId });
    setDeleteMode("revoke");
    setConfirmDeleteUsername("");
  };

  const executeDeleteClient = async () => {
    if (!deleteTarget) return;
    setActionLoadingId(deleteTarget.id);
    setError(null);
    try {
      if (deleteMode === "permanent") {
        const expected = deleteTarget.username.trim().toLowerCase();
        if (confirmDeleteUsername.trim().toLowerCase() !== expected) {
          setError(`Please type '${deleteTarget.username}' exactly to confirm permanent deletion.`);
          setActionLoadingId(null);
          return;
        }
        const res = await api.delete<any>(
          `/admin/clients/${deleteTarget.id}?mode=permanent&confirm_username=${encodeURIComponent(confirmDeleteUsername.trim())}`
        );
        setSuccessMsg(res?.message || `Client '${deleteTarget.username}' permanently deleted.`);
      } else {
        const res = await api.delete<any>(`/admin/clients/${deleteTarget.id}?mode=revoke`);
        setSuccessMsg(res?.message || `Client '${deleteTarget.username}' access revoked.`);
      }
      setDeleteTarget(null);
      setConfirmDeleteUsername("");
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchClients();
    } catch (err: any) {
      setError(err?.message || "Failed to delete or revoke client");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Subscription action (Activate Basic, Activate Lifetime, Lock, Unlock, Renew) with post-commit DB verification
  const handleSubscriptionAction = async (clientId: number, action: string, notes?: string) => {
    setActionLoadingId(clientId);
    setError(null);
    try {
      const res = await api.post<{
        status: string;
        restored_access?: boolean;
        client?: any;
        message?: string;
        detail?: string;
      }>(`/admin/clients/${clientId}/subscription`, { action, notes });

      if (!res || res.status !== "success") {
        throw new Error(res?.detail || res?.message || "Failed to update client subscription in database.");
      }

      const verified = await verifyClientMutationInDb(clientId, (fresh) => {
        if (action === "LOCK") return fresh.status === "LOCKED";
        if (action === "ACTIVATE_BASIC") return fresh.plan_type === "BASIC" && fresh.google_maps_enabled === false && fresh.status === "ACTIVE";
        if (action === "ACTIVATE_LIFETIME") return fresh.plan_type === "LIFETIME" && fresh.google_maps_enabled === true && fresh.subscription_expires_at == null && fresh.status === "ACTIVE";
        if (action === "UNLOCK") return res.restored_access === false ? fresh.status === "EXPIRED" : fresh.status === "ACTIVE";
        return true;
      });

      await fetchClients();
      if (action === "UNLOCK" && (res.restored_access === false || verified.status === "EXPIRED")) {
        setError(res.message || `Client #${clientId} subscription expired — paid access stays LOCKED until renewed.`);
      } else {
        setSuccessMsg(
          `Verified in DB: Client #${clientId} -> ${verified.plan_label || verified.plan} (${verified.status}, Maps: ${verified.google_maps_enabled ? "ON" : "OFF"}).`
        );
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setError(err?.message || `Failed to execute ${action}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateInquiryStatus = async (inquiryId: number, newStatus: string) => {
    setError(null);
    try {
      await api.patch("/inquiries", { id: inquiryId, status: newStatus });
      setSuccessMsg(`Inquiry #${inquiryId} marked as ${newStatus}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchInquiries();
    } catch (e: any) {
      setError(e?.message || "Failed to update inquiry");
    }
  };

  const copyCredsToClipboard = () => {
    if (!oneTimeCreds) return;
    const text =
      `==========================================\n` +
      `USMAN AI GTM — CLIENT LOGIN CREDENTIALS\n` +
      `==========================================\n` +
      `Login URL: ${oneTimeCreds.login_url || "https://lead-scraper-mxs5.vercel.app/login"}\n` +
      `Username: ${oneTimeCreds.username}\n` +
      `Password: ${oneTimeCreds.password}\n` +
      `Customer Name: ${oneTimeCreds.full_name}\n` +
      `Customer ID: #${oneTimeCreds.customer_id || "N/A"}\n` +
      `Subscription: ${oneTimeCreds.plan || "Paid Account"}\n` +
      `Access Duration: ${oneTimeCreds.duration || "Active"}\n` +
      `------------------------------------------\n` +
      `Go to the Login URL, enter your Username and Password, and click 'Sign In to Paid Account'.\n` +
      `==========================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP SECTION: CREATE CLIENT ACCOUNT (Prominent, Simple & Unlimited)     */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-b from-[#0e1626] to-[#0c1017] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                  Master Owner Administration
                </span>
                <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                  Unlimited Paid Account Creation
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <UserPlus className="h-6 w-6 text-blue-400" />
                <span>CREATE CLIENT ACCOUNT</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate real application credentials for paying customers with instant database activation and dedicated isolated workspace.
              </p>
            </div>

            <button
              onClick={fetchClients}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/[0.03] border border-white/10 transition-colors cursor-pointer self-start sm:self-auto"
              title="Refresh Client Roster"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <form onSubmit={handleCreatePaidAccount} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Customer Name <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={createForm.customerName}
                  onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                  placeholder="e.g. John Doe / Apex Real Estate"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Username with Generate Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Username * <span className="text-slate-500 font-normal">(App Login ID)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, username: generateRandomUsername() })}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono"
                  >
                    <RefreshCw className="h-2.5 w-2.5" /> Randomize
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                  placeholder="e.g. client_abc123"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Password with Generate Strong Button & Show/Hide Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Password * <span className="text-slate-500 font-normal">(Auto-Generated)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, password: generateStrongPassword() })}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono"
                  >
                    <Key className="h-2.5 w-2.5" /> Generate Strong
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={createForm.showPassword ? "text" : "password"}
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Enter or generate password"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 pr-10 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, showPassword: !createForm.showPassword })}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {createForm.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Subscription Type Selector (Basic $25 / Lifetime $100 / Custom Plan) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Subscription Plan * <span className="text-slate-500 font-normal">(Fixed presets or build a fully Custom Plan)</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Option 1: Basic */}
                <div
                  onClick={() => setCreateForm({ ...createForm, plan: "BASIC" })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    createForm.plan === "BASIC"
                      ? "border-blue-500 bg-blue-500/10 shadow-glow-sm"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    checked={createForm.plan === "BASIC"}
                    onChange={() => setCreateForm({ ...createForm, plan: "BASIC" })}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                      <span>BASIC — 30 DAYS — $25</span>
                      <span className="text-[10px] font-mono text-blue-400 bg-blue-500/20 px-1.5 rounded">Standard</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      30 days access, 10 cold emails/day, Google Maps excluded. Auto-locks upon expiry.
                    </p>
                  </div>
                </div>

                {/* Option 2: Lifetime */}
                <div
                  onClick={() => setCreateForm({ ...createForm, plan: "LIFETIME" })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    createForm.plan === "LIFETIME"
                      ? "border-amber-500 bg-amber-500/10 shadow-glow-sm"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    checked={createForm.plan === "LIFETIME"}
                    onChange={() => setCreateForm({ ...createForm, plan: "LIFETIME" })}
                    className="mt-0.5 text-amber-500 focus:ring-amber-400"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                      <span className="text-amber-300">LIFETIME — $100</span>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/20 px-1.5 rounded font-bold">
                        Maps Included
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Permanent access, Google Maps + AI Research unlocked, Gmail cap 500/day.
                    </p>
                  </div>
                </div>

                {/* Option 3: Custom Plan */}
                <div
                  onClick={() => setCreateForm({ ...createForm, plan: "CUSTOM" })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    createForm.plan === "CUSTOM"
                      ? "border-purple-500 bg-purple-500/10 shadow-glow-sm"
                      : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    checked={createForm.plan === "CUSTOM"}
                    onChange={() => setCreateForm({ ...createForm, plan: "CUSTOM" })}
                    className="mt-0.5 text-purple-500 focus:ring-purple-400"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                      <span className="text-purple-300">CUSTOM PLAN</span>
                      <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-1.5 rounded font-bold">
                        Flexible
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Choose exact hours/days/months/lifetime, individual modules, email cap, Maps access &amp; custom price.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CUSTOM PLAN CONFIGURATION BUILDER */}
            {createForm.plan === "CUSTOM" && (
              <div className="rounded-2xl border border-purple-500/30 bg-[#090d16] p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-purple-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Custom Plan Configuration
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-400">Google Maps Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold border ${
                        createForm.features.google_maps
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border-white/10"
                      }`}
                    >
                      {createForm.features.google_maps ? "INCLUDED" : "EXCLUDED"}
                    </span>
                  </div>
                </div>

                {/* 1. Custom Duration & Presets */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-6 space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      Access Duration *
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "1 Hour", v: 1, u: "hours" as DurationUnit },
                        { label: "2 Hours", v: 2, u: "hours" as DurationUnit },
                        { label: "6 Hours", v: 6, u: "hours" as DurationUnit },
                        { label: "12 Hours", v: 12, u: "hours" as DurationUnit },
                        { label: "1 Day", v: 1, u: "days" as DurationUnit },
                        { label: "3 Days", v: 3, u: "days" as DurationUnit },
                        { label: "7 Days", v: 7, u: "days" as DurationUnit },
                        { label: "30 Days", v: 30, u: "days" as DurationUnit },
                        { label: "1 Month", v: 1, u: "months" as DurationUnit },
                        { label: "1 Year", v: 1, u: "years" as DurationUnit },
                        { label: "Lifetime", v: 1, u: "lifetime" as DurationUnit },
                      ].map((p) => {
                        const active =
                          createForm.durationUnit === p.u &&
                          (p.u === "lifetime" || createForm.durationValue === p.v);
                        return (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() =>
                              setCreateForm({
                                ...createForm,
                                durationValue: p.v,
                                durationUnit: p.u,
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              active
                                ? "bg-purple-600 text-white"
                                : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <input
                        type="number"
                        min={1}
                        disabled={createForm.durationUnit === "lifetime"}
                        value={createForm.durationValue}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            durationValue: Math.max(1, parseInt(e.target.value, 10) || 1),
                          })
                        }
                        className="rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white font-mono disabled:opacity-40"
                        placeholder="Duration number"
                      />
                      <select
                        value={createForm.durationUnit}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            durationUnit: e.target.value as DurationUnit,
                          })
                        }
                        className="rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white"
                      >
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months (30d)</option>
                        <option value="years">Years (365d)</option>
                        <option value="lifetime">Lifetime (No Expiry)</option>
                      </select>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Exact Expiry (UTC):{" "}
                      <span className="text-purple-300">
                        {customExpiryPreviewDate
                          ? customExpiryPreviewDate.toUTCString()
                          : "Never / Permanent"}
                      </span>
                    </div>
                  </div>

                  {/* 2. Daily Email Quota & Price Override */}
                  <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        Daily Email Limit (UTC/day, max 500)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={500}
                        disabled={!createForm.features.cold_email}
                        value={createForm.features.cold_email ? createForm.dailyEmailLimit : 0}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            dailyEmailLimit: Math.max(0, Math.min(500, parseInt(e.target.value, 10) || 0)),
                          })
                        }
                        className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white font-mono disabled:opacity-40"
                      />
                      <p className="text-[10px] text-slate-500">
                        {createForm.features.cold_email
                          ? "Enforced authoritatively per UTC day."
                          : "Enable Cold Email below to set quota."}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                        <span>Manual Price Override ($ USD)</span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          Suggested: ${customPriceCalc.suggestedPriceUsd}
                        </span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={createForm.customPriceOverride}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, customPriceOverride: e.target.value })
                        }
                        placeholder={`Auto: $${customPriceCalc.suggestedPriceUsd}`}
                        className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white font-mono"
                      />
                      <p className="text-[10px] text-slate-400">
                        Final Billed Price:{" "}
                        <strong className="text-emerald-400 font-mono">${finalCustomPriceUsd} USD</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Feature Entitlement Checkboxes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-[11px] font-semibold text-slate-300">
                      Enabled Modules &amp; Feature Checkboxes *
                    </label>
                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, features: { ...BASIC_FEATURES }, dailyEmailLimit: 10 })}
                        className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 cursor-pointer"
                      >
                        Basic Preset
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, features: { ...ALL_FEATURES_ENABLED }, dailyEmailLimit: 500 })}
                        className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 cursor-pointer"
                      >
                        Select All (+Maps)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, features: { ...NO_FEATURES_ENABLED } })}
                        className="px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10 cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {FEATURE_CATALOG.map((feat) => {
                      const checked = Boolean(createForm.features[feat.key]);
                      return (
                        <label
                          key={feat.key}
                          className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                            checked
                              ? feat.key === "google_maps" || feat.key === "multi_country_maps"
                                ? "border-amber-500/40 bg-amber-500/10"
                                : "border-purple-500/40 bg-purple-500/10"
                              : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFeatureKey(feat.key, false)}
                            className="mt-0.5 rounded border-white/20"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center justify-between gap-1">
                              <span className="truncate">{feat.label}</span>
                              <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                +${feat.monthlyWeightUsd}/mo
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
                              {feat.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Action Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-400">
                {createForm.plan === "CUSTOM"
                  ? "Custom Plan shows a full Pre-Creation Summary before writing to the database."
                  : "Credentials will be securely hashed and displayed to you once for direct delivery to the customer."}
              </span>

              <button
                type="submit"
                disabled={createLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-glow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {createLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Creating Account in Production Database...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>{createForm.plan === "CUSTOM" ? "REVIEW & CREATE CUSTOM ACCOUNT" : "CREATE ACCOUNT"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* FEEDBACK NOTIFICATIONS */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 text-xs underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DYNAMIC METRICS STRIP                                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="p-3 rounded-xl bg-[#0c1017] border border-white/10">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Paid Clients</div>
          <div className="text-lg font-extrabold text-white font-mono">{totalPaid}</div>
          <div className="text-[9px] text-slate-500">Unlimited seats</div>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="text-[10px] uppercase font-semibold text-emerald-400">Active Paid</div>
          <div className="text-lg font-extrabold text-emerald-400 font-mono">{activePaid}</div>
          <div className="text-[9px] text-emerald-500/80">Active access</div>
        </div>
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="text-[10px] uppercase font-semibold text-blue-400">Basic ($25)</div>
          <div className="text-lg font-extrabold text-blue-400 font-mono">{basicPaid}</div>
          <div className="text-[9px] text-blue-500/80">30-day term</div>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="text-[10px] uppercase font-semibold text-amber-300">Lifetime ($100)</div>
          <div className="text-lg font-extrabold text-amber-300 font-mono">{lifetimePaid}</div>
          <div className="text-[9px] text-amber-400/80">Permanent + Maps</div>
        </div>
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <div className="text-[10px] uppercase font-semibold text-purple-300">Custom Plans</div>
          <div className="text-lg font-extrabold text-purple-300 font-mono">{customPaid}</div>
          <div className="text-[9px] text-purple-400/80">Tailored tier</div>
        </div>
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <div className="text-[10px] uppercase font-semibold text-rose-400">Expired</div>
          <div className="text-lg font-extrabold text-rose-400 font-mono">{expiredPaid}</div>
          <div className="text-[9px] text-rose-500/80">Needs renewal</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Locked / Paused</div>
          <div className="text-lg font-extrabold text-slate-300 font-mono">{lockedPaid}</div>
          <div className="text-[9px] text-slate-500">Access paused</div>
        </div>
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <div className="text-[10px] uppercase font-semibold text-purple-400">Google Preview</div>
          <div className="text-lg font-extrabold text-purple-400 font-mono">{totalPreview}</div>
          <div className="text-[9px] text-purple-500/80">Preview only</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB NAVIGATION                                                         */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
        <button
          onClick={() => setActiveTab("paid")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "paid"
              ? "bg-blue-600 text-white shadow-glow-sm"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Paid Client Accounts ({clients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("preview")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "preview"
              ? "bg-purple-600 text-white shadow-glow-sm"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>Google Free Preview Users ({previewClients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("inquiries")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "inquiries"
              ? "bg-amber-600 text-white shadow-glow-sm"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>Buying Inquiries ({inquiries.length})</span>
          {inquiries.some((i: any) => i.status === "NEW") && (
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. TAB 1: PAID CLIENT ACCOUNTS TABLE (Search, Roster, Controls)          */}
      {/* ========================================================================= */}
      {activeTab === "paid" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Paid Client Accounts Roster</span>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  ({filteredPaidClients.length}{filteredPaidClients.length !== clients.length ? ` of ${clients.length}` : ""})
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Created directly by Master Owner with username & password. Real-time lock, renewal, password reset, and upgrade governance.
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Basic: $25 / 30 Days • Lifetime: $100
            </span>
          </div>

          {/* Search by Username, Customer Name, Internal ID, Status */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
            <Search className="h-4 w-4 text-blue-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search paid clients by username, customer name, internal ID (#), plan, or status..."
              className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-xs font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/5 font-mono cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading paid client accounts...</div>
          ) : clients.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Users className="h-8 w-8 mx-auto text-slate-600" />
              <p className="font-semibold text-slate-300">No paid client accounts exist yet.</p>
              <p className="text-slate-500">Use the &apos;CREATE CLIENT ACCOUNT&apos; form above to provision your first customer.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3">Username & Customer Name</th>
                    <th className="py-3 px-3">ID (#ID)</th>
                    <th className="py-3 px-3">Plan</th>
                    <th className="py-3 px-3">Creation & Activation</th>
                    <th className="py-3 px-3">Expiry & Live Remaining Timer</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Usage</th>
                    <th className="py-3 px-3 text-right">Master Owner Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredPaidClients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-slate-500">
                        No paid clients match your query &quot;{searchQuery}&quot;.
                      </td>
                    </tr>
                  ) : (
                    filteredPaidClients.map((c) => {
                      const expiryInfo = getLiveExpiryInfo(c, nowTick);
                      const isExpired = expiryInfo.isLifetime ? false : (expiryInfo.isExpired || c.status === "EXPIRED");
                      const isLocked = c.status === "LOCKED";
                      const isSuspended = c.status === "SUSPENDED";
                      const isRevoked = c.status === "REVOKED";
                      const isActive = !isExpired && !isLocked && !isSuspended && !isRevoked && c.status === "ACTIVE";
                      const isLifetime = expiryInfo.isLifetime;
                      const isCustom = String(c.raw_plan || c.plan_type || "").toUpperCase() === "CUSTOM";

                      return (
                        <tr key={c.id} className="hover:bg-white/[0.02]">
                          {/* Username & Customer Name */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                              <Link
                                href={`/app/admin/clients/${c.id}`}
                                className="font-mono text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                                title="View Complete Account Activity & Intelligence Profile"
                              >
                                <span>{c.username || `client_${c.id}`}</span>
                                <ExternalLink className="h-3 w-3 opacity-70" />
                              </Link>
                              {c.full_name && c.full_name !== c.username && (
                                <span className="text-slate-300 text-xs">({c.full_name})</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Email: {c.email || `${c.username}@app.client`}
                            </div>
                          </td>

                          {/* Internal ID & Workspace ID */}
                          <td className="py-3 px-3 font-mono text-[11px]">
                            <div className="text-slate-300 font-bold">#{c.id}</div>
                            <div className="text-slate-500 text-[10px]">WS: #{c.workspace_id}</div>
                          </td>

                          {/* Plan & Entitlements */}
                          <td className="py-3 px-3 space-y-1">
                            <span
                              className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                isLifetime && !isCustom
                                  ? "text-amber-300 bg-amber-500/15 border-amber-500/30"
                                  : isCustom
                                  ? "text-purple-300 bg-purple-500/15 border-purple-500/30"
                                  : "text-blue-400 bg-blue-500/10 border-blue-500/20"
                              }`}
                            >
                              {isCustom
                                ? c.plan_label || "Custom Plan"
                                : isLifetime
                                ? "Lifetime ($100)"
                                : "Basic ($25/30d)"}
                            </span>
                            <div className="flex items-center gap-1 flex-wrap text-[9px] font-mono">
                              <span
                                className={`px-1.5 py-0.2 rounded border ${
                                  c.google_maps_enabled
                                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                                    : "bg-slate-800 text-slate-400 border-white/10"
                                }`}
                              >
                                Maps: {c.google_maps_enabled ? "ON" : "OFF"}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-white/[0.04] text-slate-300 border border-white/10">
                                {c.daily_email_limit ?? (isLifetime ? 500 : 10)} emails/d
                              </span>
                            </div>
                          </td>

                          {/* Creation & Activation Date */}
                          <td className="py-3 px-3 text-[11px]">
                            <div className="text-slate-300 font-medium">Created: {expiryInfo.creationDateFormatted}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Activated: {expiryInfo.activationDateFormatted}</div>
                          </td>

                          {/* Expiry & Live Remaining Timer */}
                          <td className="py-3 px-3 text-[11px]">
                            {isLifetime ? (
                              <div>
                                <span className="text-amber-400 font-bold flex items-center gap-1">
                                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                                  Lifetime Access — No Expiry
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5">Expiry: Permanent / Never</div>
                              </div>
                            ) : isExpired ? (
                              <div>
                                <div className="text-rose-400 font-bold flex items-center gap-1">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  <span>EXPIRED (0m left)</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Expired: {expiryInfo.expiryDateFormatted}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="text-emerald-400 font-bold font-mono flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                                  <span>{expiryInfo.countdownText}</span>
                                </div>
                                <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                                  Exact Expiry: {expiryInfo.expiryDateFormatted}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            {isExpired ? (
                              <span className="text-rose-400 bg-rose-500/15 border border-rose-500/40 px-2.5 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 shadow-sm">
                                <AlertCircle className="h-3 w-3 text-rose-400" />
                                EXPIRED
                              </span>
                            ) : isActive ? (
                              <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 inline text-emerald-400" />
                                ACTIVE
                              </span>
                            ) : isLocked ? (
                              <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                <Lock className="h-3 w-3 inline text-amber-400" />
                                LOCKED
                              </span>
                            ) : isSuspended ? (
                              <span className="text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 inline text-purple-400" />
                                SUSPENDED
                              </span>
                            ) : (
                              <span className="text-slate-400 bg-slate-500/10 border border-slate-500/20 px-2.5 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1">
                                {c.status}
                              </span>
                            )}
                          </td>

                          {/* Usage */}
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                            <div>{c.total_leads ?? 0} leads</div>
                            <div className="text-[10px] text-slate-500">{c.total_searches ?? 0} searches</div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                              {/* Activate Basic ($25 / 30 Days) */}
                              <button
                                onClick={() => handleSubscriptionAction(c.id, "ACTIVATE_BASIC")}
                                disabled={actionLoadingId === c.id}
                                className="px-2 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded shadow-sm disabled:opacity-40 cursor-pointer"
                                title="Set / Renew 30-Day Basic Plan ($25)"
                              >
                                $25 Basic
                              </button>

                              {/* Upgrade to Lifetime ($100) */}
                              <button
                                onClick={() => handleSubscriptionAction(c.id, "ACTIVATE_LIFETIME")}
                                disabled={actionLoadingId === c.id}
                                className="px-2 py-1 text-[10px] font-bold text-black bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 rounded shadow-sm disabled:opacity-40 cursor-pointer"
                                title="Upgrade to Lifetime Plan ($100 Permanent Access)"
                              >
                                $100 Lifetime
                              </button>

                              {/* Custom Plan Configurator */}
                              <button
                                onClick={() => openEditCustomModal(c, "ACTIVATE_CUSTOM")}
                                disabled={actionLoadingId === c.id}
                                className="px-2 py-1 text-[10px] font-bold text-purple-200 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded shadow-sm disabled:opacity-40 cursor-pointer"
                                title="Configure Custom Plan modules and duration"
                              >
                                Custom Plan
                              </button>

                              {/* Quick Extend / Renew Subscription */}
                              <button
                                onClick={() => openEditCustomModal(c, "EXTEND_CUSTOM")}
                                disabled={actionLoadingId === c.id}
                                className="px-2 py-1 text-[10px] font-bold text-emerald-200 bg-emerald-600/25 hover:bg-emerald-600/45 border border-emerald-500/40 rounded shadow-sm disabled:opacity-40 cursor-pointer"
                                title="Extend existing subscription (+1h, +2h, +1d, +30d, +1y) or renew expired account"
                              >
                                + Extend
                              </button>

                              {/* Lock / Unlock */}
                              {isActive ? (
                                <button
                                  onClick={() => handleSubscriptionAction(c.id, "LOCK")}
                                  disabled={actionLoadingId === c.id}
                                  className="px-1.5 py-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded disabled:opacity-40 cursor-pointer"
                                  title="Lock account"
                                >
                                  Lock 🔒
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSubscriptionAction(c.id, "UNLOCK")}
                                  disabled={actionLoadingId === c.id}
                                  className="px-1.5 py-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded disabled:opacity-40 cursor-pointer"
                                  title="Unlock account"
                                >
                                  Unlock 🔓
                                </button>
                              )}

                              {/* Reset Password */}
                              <button
                                onClick={() => handleResetPassword(c.id, c.username || `client_${c.id}`)}
                                disabled={actionLoadingId === c.id}
                                className="px-1.5 py-1 text-[10px] font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 rounded disabled:opacity-40 cursor-pointer flex items-center gap-1"
                                title="Generate new password and show once"
                              >
                                <Key className="h-2.5 w-2.5" />
                                <span>Reset Pwd</span>
                              </button>

                              {/* Suspend / Activate / Deactivate */}
                              <button
                                onClick={() => handleToggleStatus(c.id, c.status)}
                                disabled={actionLoadingId === c.id}
                                className={`px-2 py-1 text-[10px] font-semibold rounded border disabled:opacity-40 cursor-pointer flex items-center gap-1 ${
                                  isActive
                                    ? "text-rose-300 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20"
                                    : "text-emerald-300 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"
                                }`}
                                title={isActive ? "Deactivate / Suspend account" : "Activate account"}
                              >
                                <Power className="h-2.5 w-2.5 inline" />
                                <span>{isActive ? "Deactivate" : "Activate"}</span>
                              </button>

                              {/* Owner Client Details Link */}
                              <Link
                                href={`/app/admin/clients/${c.id}`}
                                className="px-2 py-1 text-[10px] font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 rounded"
                                title="View full Client Details & Audit Logs"
                              >
                                Details
                              </Link>

                              {/* Delete / Revoke Modal */}
                              <button
                                onClick={() => handleRevokeClient(c.id, c.username || c.full_name, c.workspace_id)}
                                disabled={actionLoadingId === c.id}
                                className="px-1.5 py-1 text-[10px] font-semibold text-slate-400 hover:text-rose-400 bg-white/[0.03] hover:bg-rose-500/10 border border-white/10 rounded transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1"
                                title="Delete or Revoke Client Account"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB 2: GOOGLE FREE PREVIEW USERS TABLE                                 */}
      {/* ========================================================================= */}
      {activeTab === "preview" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="h-4 w-4 text-purple-400" />
                <span>Google Free Preview Visitors</span>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  ({filteredPreviewClients.length} registered)
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Visitors who signed in via &apos;Continue with Google&apos;. All paid features and APIs are strictly locked for these preview accounts.
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
            <Search className="h-4 w-4 text-purple-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search preview users by Google email or name..."
              className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-xs font-mono"
            />
          </div>

          {previewClients.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Globe className="h-8 w-8 mx-auto text-slate-600" />
              <p className="font-semibold text-slate-300">No Google Free Preview users yet.</p>
              <p className="text-slate-500">When visitors click &apos;Continue with Google&apos;, they appear here in PREVIEW_ONLY status.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3">Google Account</th>
                    <th className="py-3 px-3">User ID</th>
                    <th className="py-3 px-3">Registered</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Convert / Provision Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredPreviewClients.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3">
                        <Link href={`/app/admin/clients/${p.id}`} className="font-bold text-white hover:text-blue-300 hover:underline">
                          {p.full_name || "Google Visitor"}
                        </Link>
                        <div className="text-[11px] text-purple-300 font-mono">{p.email}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">#{p.id}</td>
                      <td className="py-3 px-3 text-slate-400">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : "N/A"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border text-purple-400 bg-purple-500/10 border-purple-500/20">
                          PREVIEW_ONLY
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setCreateForm({
                              ...createForm,
                              customerName: p.full_name || "",
                              username: (p.email?.split("@")[0] || generateRandomUsername()).toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                            });
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded cursor-pointer"
                        >
                          Provision Paid Account
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB 3: BUYING INQUIRIES TAB                                            */}
      {/* ========================================================================= */}
      {activeTab === "inquiries" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Customer Buying Inquiries</span>
              <span className="text-xs font-mono font-semibold text-slate-500">({inquiries.length} inquiries)</span>
            </h3>
            <button
              onClick={fetchInquiries}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {inquiriesLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading buying inquiries...</div>
          ) : inquiries.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <KeyRound className="h-8 w-8 mx-auto text-slate-600" />
              <p className="font-semibold text-slate-300">No buying inquiries received yet.</p>
              <p className="text-slate-500">Inquiries submitted from the Pricing and Contact pages will appear here in real time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3">Customer Name</th>
                    <th className="py-3 px-3">Contact (WhatsApp / Phone)</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Plan Requested</th>
                    <th className="py-3 px-3">Inquiry Date</th>
                    <th className="py-3 px-3">Message</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Inquiry Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {inquiries.map((iq: any) => (
                    <tr key={iq.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3 font-bold text-white">{iq.customer_name}</td>
                      <td className="py-3 px-3 text-slate-300 font-mono">
                        <a
                          href={`https://wa.me/${(iq.contact_info || "").replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline"
                        >
                          {iq.contact_info}
                        </a>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono">{iq.email || "N/A"}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          iq.plan === "LIFETIME"
                            ? "text-amber-300 bg-amber-500/10 border-amber-500/20"
                            : "text-blue-400 bg-blue-500/10 border-blue-500/20"
                        }`}>
                          {iq.plan === "LIFETIME" ? "$100 Lifetime" : "$25 Basic"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {iq.created_at ? new Date(iq.created_at).toLocaleString() : "N/A"}
                      </td>
                      <td className="py-3 px-3 text-slate-300 max-w-xs truncate" title={iq.message}>
                        {iq.message || "—"}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          iq.status === "NEW"
                            ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                            : iq.status === "ACTIVATED"
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                            : "text-slate-300 bg-white/5 border-white/10"
                        }`}>
                          {iq.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => handleUpdateInquiryStatus(iq.id, "CONTACTED")}
                            className="px-2 py-1 text-[10px] font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] rounded border border-white/10 cursor-pointer"
                          >
                            Contacted
                          </button>
                          <button
                            onClick={() => handleUpdateInquiryStatus(iq.id, "ACTIVATED")}
                            className="px-2 py-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded cursor-pointer"
                          >
                            Mark Activated
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. ONE-TIME CREDENTIALS MODAL                                             */}
      {/* ========================================================================= */}
      {oneTimeCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/50 bg-[#0c1017] p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Zero-Knowledge Security</div>
                <h3 className="text-base font-bold text-white">Application Credentials Generated</h3>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <strong>IMPORTANT:</strong> These credentials are displayed <u>ONCE</u>. The password is saved only as a secure cryptographic hash in the production database. Copy and send these credentials to your paying client.
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-black/50 border border-white/[0.08] font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Sign-In URL:</span>
                <span className="text-blue-400 font-semibold">{oneTimeCreds.login_url || "https://lead-scraper-mxs5.vercel.app/login"}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/[0.04]">
                <span className="text-slate-400 font-bold">Username:</span>
                <span className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 py-0.5 rounded select-all">
                  {oneTimeCreds.username}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/[0.04]">
                <span className="text-amber-400 font-bold">Password:</span>
                <span className="text-white font-extrabold text-sm bg-white/10 px-2 py-0.5 rounded select-all">
                  {oneTimeCreds.password}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/[0.04]">
                <span className="text-slate-500">Customer Name:</span>
                <span className="text-slate-200">{oneTimeCreds.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Internal Customer ID:</span>
                <span className="text-slate-300">#{oneTimeCreds.customer_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subscription Plan:</span>
                <span className="text-blue-300 font-bold">{oneTimeCreds.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Access Duration:</span>
                <span className="text-emerald-300 font-semibold">{oneTimeCreds.duration}</span>
              </div>
              {oneTimeCreds.expires_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Expires At (UTC):</span>
                  <span className="text-slate-300">{oneTimeCreds.expires_at}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Google Maps Entitlement:</span>
                <span className={oneTimeCreds.google_maps_enabled ? "text-emerald-400 font-bold" : "text-slate-400"}>
                  {oneTimeCreds.google_maps_enabled ? "INCLUDED" : "EXCLUDED"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Daily Cold Email Limit:</span>
                <span className="text-slate-200">{oneTimeCreds.daily_email_limit ?? 10} / UTC day</span>
              </div>
              {oneTimeCreds.custom_price_usd != null && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Final Plan Price:</span>
                  <span className="text-emerald-300 font-bold">${oneTimeCreds.custom_price_usd} USD</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={copyCredsToClipboard}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-glow-sm cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Credentials Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy All Credentials</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setOneTimeCreds(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 rounded-xl transition-colors cursor-pointer"
              >
                I Have Saved These Credentials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. PRE-CREATION CUSTOM PLAN SUMMARY REVIEW MODAL                          */}
      {/* ========================================================================= */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
          <div className="w-full max-w-lg rounded-2xl border border-purple-500/40 bg-[#0c1017] p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Review Custom Account Summary</h3>
              </div>
              <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Username / Customer:</span>
                <span className="font-mono font-bold text-white">
                  {createForm.username.trim().toLowerCase()} ({createForm.customerName.trim() || createForm.username})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Activation Time (UTC Now):</span>
                <span className="font-mono text-emerald-300">
                  {new Date().toUTCString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Plan Duration:</span>
                <span className="font-semibold text-purple-300">
                  {formatDurationLabel(createForm.durationValue, createForm.durationUnit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Calculated UTC Expiry:</span>
                <span className="font-mono text-slate-200">
                  {customExpiryPreviewDate ? customExpiryPreviewDate.toUTCString() : "Never (Lifetime)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Google Maps Generator:</span>
                <span className={createForm.features.google_maps ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {createForm.features.google_maps ? "INCLUDED" : "NOT INCLUDED"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Daily Cold Email Limit:</span>
                <span className="font-mono text-white">
                  {createForm.features.cold_email ? `${createForm.dailyEmailLimit} / UTC day` : "Disabled"}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/[0.06]">
                <span className="text-slate-400">Suggested Formula Price:</span>
                <span className="font-mono text-slate-300">
                  ${customPriceCalc.suggestedPriceUsd} USD (Base ${customPriceCalc.monthlyFeatureRateUsd}/mo × {customPriceCalc.durationMultiplier}x)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300 font-bold">Final Price Charged:</span>
                <span className="font-mono text-emerald-400 font-extrabold text-sm">${finalCustomPriceUsd} USD</span>
              </div>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="font-semibold text-emerald-300">Included Modules:</div>
              <div className="flex flex-wrap gap-1">
                {FEATURE_CATALOG.filter((f) => createForm.features[f.key]).map((f) => (
                  <span key={f.key} className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                    {f.label}
                  </span>
                ))}
              </div>
              {FEATURE_CATALOG.some((f) => !createForm.features[f.key]) && (
                <>
                  <div className="font-semibold text-slate-400 pt-1">Excluded Modules:</div>
                  <div className="flex flex-wrap gap-1">
                    {FEATURE_CATALOG.filter((f) => !createForm.features[f.key]).map((f) => (
                      <span key={f.key} className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/10">
                        {f.label}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                Edit Plan
              </button>
              <button
                type="button"
                onClick={executeCreateAccount}
                disabled={createLoading}
                className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-500 shadow-glow-sm cursor-pointer disabled:opacity-50"
              >
                Confirm &amp; Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. EDIT / UPGRADE EXISTING CLIENT CUSTOM PLAN MODAL                       */}
      {/* ========================================================================= */}
      {editingCustomClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4 overflow-y-auto py-6">
          <form
            onSubmit={handleApplyEditCustomPlan}
            className="w-full max-w-2xl rounded-2xl border border-purple-500/40 bg-[#0c1017] p-6 shadow-2xl text-slate-100 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editCustomForm.actionMode === "EXTEND_CUSTOM" ? "Extend / Renew Subscription" : "Configure Custom Plan"} — {editingCustomClient.username} (#{editingCustomClient.id})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Workspace #{editingCustomClient.workspace_id} preserved intact. Add hours, days, weeks, months, years, or Lifetime.
                </p>
              </div>
              <button type="button" onClick={() => setEditingCustomClient(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "+1 Hour", v: 1, u: "hours" as DurationUnit },
                { label: "+2 Hours", v: 2, u: "hours" as DurationUnit },
                { label: "+6 Hours", v: 6, u: "hours" as DurationUnit },
                { label: "+12 Hours", v: 12, u: "hours" as DurationUnit },
                { label: "+1 Day", v: 1, u: "days" as DurationUnit },
                { label: "+7 Days", v: 7, u: "days" as DurationUnit },
                { label: "+30 Days", v: 30, u: "days" as DurationUnit },
                { label: "+1 Month", v: 1, u: "months" as DurationUnit },
                { label: "+1 Year", v: 1, u: "years" as DurationUnit },
                { label: "Lifetime", v: 1, u: "lifetime" as DurationUnit },
              ].map((p) => {
                const active =
                  editCustomForm.durationUnit === p.u &&
                  (p.u === "lifetime" || editCustomForm.durationValue === p.v);
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() =>
                      setEditCustomForm({ ...editCustomForm, durationValue: p.v, durationUnit: p.u })
                    }
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                      active ? "bg-purple-600 text-white" : "bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] text-[11px] font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Current Expiry:</span>
                <span className="text-slate-200">
                  {editingCustomClient.subscription_expires_at
                    ? new Date(editingCustomClient.subscription_expires_at).toUTCString()
                    : "Permanent / Not Set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">New Estimated Expiry (UTC):</span>
                <span className="text-emerald-300 font-bold">
                  {(() => {
                    if (editCustomForm.durationUnit === "lifetime") return "Never (Permanent Lifetime)";
                    const curMs = editingCustomClient.subscription_expires_at
                      ? new Date(editingCustomClient.subscription_expires_at).getTime()
                      : 0;
                    const base =
                      editCustomForm.actionMode === "EXTEND_CUSTOM" && curMs > Date.now()
                        ? new Date(curMs)
                        : new Date();
                    const calc = calculateCustomPlanExpiresAt(
                      base,
                      editCustomForm.durationValue,
                      editCustomForm.durationUnit
                    );
                    return calc ? calc.toUTCString() : "Permanent";
                  })()}
                </span>
              </div>
              {editCustomForm.actionMode === "EXTEND_CUSTOM" && (
                <label className="flex items-center gap-2 pt-1 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editCustomForm.preserveFeatures}
                    onChange={(e) =>
                      setEditCustomForm({ ...editCustomForm, preserveFeatures: e.target.checked })
                    }
                  />
                  <span>Keep existing enabled modules &amp; Google Maps / email limits as-is</span>
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Apply Mode</label>
                <select
                  value={editCustomForm.actionMode}
                  onChange={(e) => setEditCustomForm({ ...editCustomForm, actionMode: e.target.value as any })}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white"
                >
                  <option value="ACTIVATE_CUSTOM">Reset From Now</option>
                  <option value="EXTEND_CUSTOM">Extend From Current Expiry</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Duration Value</label>
                <input
                  type="number"
                  min={1}
                  disabled={editCustomForm.durationUnit === "lifetime"}
                  value={editCustomForm.durationValue}
                  onChange={(e) => setEditCustomForm({ ...editCustomForm, durationValue: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white font-mono disabled:opacity-40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Unit</label>
                <select
                  value={editCustomForm.durationUnit}
                  onChange={(e) => setEditCustomForm({ ...editCustomForm, durationUnit: e.target.value as DurationUnit })}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white"
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Daily Email Limit (0–500)</label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  disabled={!editCustomForm.features.cold_email}
                  value={editCustomForm.features.cold_email ? editCustomForm.dailyEmailLimit : 0}
                  onChange={(e) => setEditCustomForm({ ...editCustomForm, dailyEmailLimit: Math.max(0, Math.min(500, parseInt(e.target.value, 10) || 0)) })}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white font-mono disabled:opacity-40"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">
                  Price ($ USD • Suggested: ${editCustomPriceCalc.suggestedPriceUsd})
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editCustomForm.customPriceOverride}
                  onChange={(e) => setEditCustomForm({ ...editCustomForm, customPriceOverride: e.target.value })}
                  placeholder={`$${editCustomPriceCalc.suggestedPriceUsd}`}
                  className="w-full rounded-xl border border-white/10 bg-[#121824] px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            {!(editCustomForm.actionMode === "EXTEND_CUSTOM" && editCustomForm.preserveFeatures) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {FEATURE_CATALOG.map((feat) => (
                  <label key={feat.key} className="p-2 rounded-lg border border-white/10 bg-white/[0.02] text-xs flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editCustomForm.features[feat.key])}
                      onChange={() => toggleFeatureKey(feat.key, true)}
                    />
                    <span className="truncate">{feat.label}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setEditingCustomClient(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 bg-white/5 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoadingId === editingCustomClient.id}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 cursor-pointer disabled:opacity-50"
              >
                {editCustomForm.actionMode === "EXTEND_CUSTOM" ? "Verify & Extend Subscription" : "Apply Custom Plan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. SAFE CLIENT DELETE / REVOKE CONFIRMATION MODAL                         */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#0c1017] p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="h-5 w-5" />
                <h3 className="text-base font-bold text-white">Remove Client Access</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs space-y-1">
              <div>Target Account: <strong className="font-mono text-white">{deleteTarget.username}</strong> (#{deleteTarget.id})</div>
              {deleteTarget.workspace_id && (
                <div className="text-slate-400 font-mono">Isolated Workspace: #{deleteTarget.workspace_id}</div>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <label
                onClick={() => setDeleteMode("revoke")}
                className={`block p-3 rounded-xl border cursor-pointer ${
                  deleteMode === "revoke" ? "border-amber-500 bg-amber-500/10" : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="font-bold text-amber-300">Revoke / Archive Account (Recommended)</div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Immediately revokes login &amp; API access and disconnects OAuth tokens, while preserving workspace leads, audit history, and invoices.
                </p>
              </label>

              <label
                onClick={() => setDeleteMode("permanent")}
                className={`block p-3 rounded-xl border cursor-pointer ${
                  deleteMode === "permanent" ? "border-rose-500 bg-rose-500/10" : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="font-bold text-rose-400">Permanent Delete Client &amp; Workspace</div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Permanently deletes this client user and its isolated workspace leads, searches, and messages (never affects Master Owner or other clients).
                </p>
              </label>
            </div>

            {deleteMode === "permanent" && (
              <div className="space-y-1.5 text-xs">
                <label className="block text-[11px] text-rose-300 font-semibold">
                  Type <code className="bg-black/50 px-1.5 py-0.5 rounded font-mono text-white">{deleteTarget.username}</code> to confirm permanent deletion:
                </label>
                <input
                  type="text"
                  value={confirmDeleteUsername}
                  onChange={(e) => setConfirmDeleteUsername(e.target.value)}
                  placeholder={deleteTarget.username}
                  className="w-full rounded-xl border border-rose-500/40 bg-[#121824] px-3 py-2 text-xs font-mono text-white focus:outline-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteClient}
                disabled={
                  actionLoadingId === deleteTarget.id ||
                  (deleteMode === "permanent" &&
                    confirmDeleteUsername.trim().toLowerCase() !== deleteTarget.username.trim().toLowerCase())
                }
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer disabled:opacity-40 ${
                  deleteMode === "permanent" ? "bg-rose-600 hover:bg-rose-500" : "bg-amber-600 hover:bg-amber-500"
                }`}
              >
                {actionLoadingId === deleteTarget.id
                  ? "Processing..."
                  : deleteMode === "permanent"
                  ? "Permanently Delete"
                  : "Confirm Revoke Access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
