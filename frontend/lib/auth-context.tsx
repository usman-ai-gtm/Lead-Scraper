"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Workspace } from "./types";
import { api } from "./api";

interface AuthContextType {
  user: User | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (data: { email: string; pass: string; fullName: string; company?: string; workspaceName?: string }) => Promise<void>;
  logout: () => void;
  switchWorkspace: (workspaceId: number) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  workspaces: [],
  activeWorkspace: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  switchWorkspace: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("usman_gtm_token");
      if (token) {
        try {
          const profile = await api.get<User>("/auth/me");
          setUser(profile);

          const wsList = await api.get<Workspace[]>("/auth/workspaces");
          setWorkspaces(wsList);

          const savedWsId = localStorage.getItem("usman_gtm_workspace_id");
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
        login,
        signup,
        logout,
        switchWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
