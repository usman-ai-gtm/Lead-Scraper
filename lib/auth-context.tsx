"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Workspace } from "./types";
import { api } from "./api";

interface AuthContextType {
  user: User | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  isLocked: boolean;
  refreshUser: () => Promise<User | null>;
  login: (email: string, pass: string) => Promise<void>;
  signup: (data: { email: string; pass: string; fullName: string; company?: string; workspaceName?: string }) => Promise<void>;
  changePassword: (oldPass: string, newPass: string) => Promise<void>;
  logout: () => void;
  switchWorkspace: (workspaceId: number) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  workspaces: [],
  activeWorkspace: null,
  loading: true,
  isLocked: false,
  refreshUser: async () => null,
  login: async () => {},
  signup: async () => {},
  changePassword: async () => {},
  logout: () => {},
  switchWorkspace: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const clearLocalSession = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("usman_gtm_token");
      localStorage.removeItem("usman_gtm_workspace_id");
      localStorage.removeItem("usman_gtm_user");
      localStorage.removeItem("usman_gtm_workspaces");
    }
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
  };

  const refreshUser = async (): Promise<User | null> => {
    try {
      const profile = await api.get<User>("/auth/me");
      if (profile && profile.id) {
        setUser(profile);
        if (typeof window !== "undefined") {
          localStorage.setItem("usman_gtm_user", JSON.stringify(profile));
          if (profile.workspace_id) {
            localStorage.setItem("usman_gtm_workspace_id", String(profile.workspace_id));
          }
        }
        return profile;
      }
    } catch (err: any) {
      if (err?.status === 401) {
        clearLocalSession();
      }
    }
    return null;
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("usman_gtm_token");
      const inAppRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/app");
      if (token || inAppRoute) {
        try {
          const profile = await api.get<User>("/auth/me");
          setUser(profile);
          localStorage.setItem("usman_gtm_user", JSON.stringify(profile));
          if (profile.workspace_id) {
            localStorage.setItem("usman_gtm_workspace_id", String(profile.workspace_id));
          }

          const wsList = await api.get<Workspace[]>("/auth/workspaces").catch(() => []);
          setWorkspaces(wsList);

          const savedWsId = String(profile.workspace_id || localStorage.getItem("usman_gtm_workspace_id") || "1");
          const targetWs = wsList.find((w) => String(w.id) === savedWsId) || wsList[0] || null;
          setActiveWorkspace(targetWs);
          if (targetWs) {
            localStorage.setItem("usman_gtm_workspace_id", String(targetWs.id));
          }
        } catch (e) {
          console.warn("Session expired or invalid, clearing local session");
          localStorage.removeItem("usman_gtm_token");
          localStorage.removeItem("usman_gtm_workspace_id");
          localStorage.removeItem("usman_gtm_user");
          localStorage.removeItem("usman_gtm_workspaces");
          setUser(null);
          setWorkspaces([]);
          setActiveWorkspace(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Real-time synchronization: Poll every 8s and auto-sync on window focus
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        refreshUser();
      }
    }, 3000);

    const onFocus = () => {
      refreshUser();
    };

    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user?.id]);

  const emailLower = String(user?.email || "").trim().toLowerCase();
  const usernameLower = String((user as any)?.username || "").trim().toLowerCase();
  const isOwner =
    user?.role === "SUPER_ADMIN" ||
    user?.role === "ADMIN" ||
    (user as any)?.account_type === "MASTER_OWNER" ||
    usernameLower === "master_owner_usman" ||
    emailLower === "master_owner@usmanai.internal" ||
    [
      "transaction000501@gmail.com",
      "admin@usmanai.com",
      "mu0602503@gmail.com",
      "admin@usmangtm.com",
      "selftest_founder_2026@usmanai.com",
    ].includes(emailLower);

  const planUpper = String(user?.plan_type || user?.plan || "").toUpperCase();
  const isPermanentLifetime =
    planUpper === "LIFETIME" ||
    planUpper === "OWNER_LIFETIME" ||
    (planUpper === "CUSTOM" && String(user?.custom_duration_unit || "").toLowerCase() === "lifetime");
  const isExpiredByClock = Boolean(
    user &&
      !isOwner &&
      !isPermanentLifetime &&
      user.subscription_expires_at &&
      !Number.isNaN(Date.parse(user.subscription_expires_at)) &&
      Date.parse(user.subscription_expires_at) <= Date.now()
  );

  const isLocked = Boolean(
    user &&
      !isOwner &&
      user.role !== "ADMIN" &&
      user.role !== "SUPER_ADMIN" &&
      (user as any)?.account_type !== "MASTER_OWNER" &&
      (user.status !== "ACTIVE" ||
        user.is_active === false ||
        user.isLocked === true ||
        isExpiredByClock)
  );

  const login = async (email: string, pass: string) => {
    const res = await api.post<{ access_token: string; user: User }>("/auth/login", {
      email,
      password: pass,
    });
    localStorage.setItem("usman_gtm_token", res.access_token);
    localStorage.setItem("usman_gtm_workspace_id", String(res.user.workspace_id));
    localStorage.setItem("usman_gtm_user", JSON.stringify(res.user));
    setUser(res.user);

    try {
      const wsList = await api.get<Workspace[]>("/auth/workspaces");
      setWorkspaces(wsList);
      const targetWs = wsList.find((w) => w.id === res.user.workspace_id) || wsList[0];
      setActiveWorkspace(targetWs);
      localStorage.setItem("usman_gtm_workspaces", JSON.stringify(wsList));
    } catch {
      const defaultWs: Workspace = {
        id: res.user.workspace_id || 1,
        name: "Enterprise Workspace",
        plan: "ENTERPRISE",
        ai_credits: 50000,
        search_credits: 25000,
        created_at: new Date().toISOString(),
      };
      setWorkspaces([defaultWs]);
      setActiveWorkspace(defaultWs);
      localStorage.setItem("usman_gtm_workspaces", JSON.stringify([defaultWs]));
    }
  };

  const signup = async (data: {
    email: string;
    pass: string;
    fullName: string;
    company?: string;
    workspaceName?: string;
  }) => {
    const res = await api.post<{ access_token: string; user: User; workspace?: Workspace }>("/auth/signup", {
      email: data.email,
      password: data.pass,
      full_name: data.fullName,
      company: data.company,
      workspace_name: data.workspaceName,
    });

    localStorage.setItem("usman_gtm_token", res.access_token);
    localStorage.setItem("usman_gtm_workspace_id", String(res.user.workspace_id));
    localStorage.setItem("usman_gtm_user", JSON.stringify(res.user));
    setUser(res.user);

    const newWs: Workspace = res.workspace || {
      id: res.user.workspace_id || 1,
      name: data.workspaceName || `${data.company || data.fullName}'s Workspace`,
      plan: "ENTERPRISE",
      ai_credits: 50000,
      search_credits: 25000,
      created_at: new Date().toISOString(),
    };

    setWorkspaces([newWs]);
    setActiveWorkspace(newWs);
    localStorage.setItem("usman_gtm_workspaces", JSON.stringify([newWs]));
  };

  const changePassword = async (oldPass: string, newPass: string) => {
    await api.post("/auth/change-password", {
      old_password: oldPass,
      new_password: newPass,
    });
    if (user) {
      const updatedUser = { ...user, must_change_password: false };
      setUser(updatedUser);
      localStorage.setItem("usman_gtm_user", JSON.stringify(updatedUser));
    }
  };

  const logout = () => {
    localStorage.removeItem("usman_gtm_token");
    localStorage.removeItem("usman_gtm_workspace_id");
    localStorage.removeItem("usman_gtm_user");
    localStorage.removeItem("usman_gtm_workspaces");
    setUser(null);
    window.location.href = "/login";
  };

  const switchWorkspace = (workspaceId: number) => {
    const target = workspaces.find((w) => w.id === workspaceId);
    if (target) {
      setActiveWorkspace(target);
      localStorage.setItem("usman_gtm_workspace_id", String(target.id));
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        activeWorkspace,
        loading,
        isLocked,
        refreshUser,
        login,
        signup,
        changePassword,
        logout,
        switchWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
