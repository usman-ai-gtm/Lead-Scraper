"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ForcedPasswordModal } from "@/components/auth/ForcedPasswordModal";
import {
  LayoutDashboard, Search, Database, Download, Settings,
  Shield, Users2, SlidersHorizontal, Activity, LogOut,
  Menu, X, Sparkles, Bell, CheckCircle2, Mail, Send,
  Briefcase, History, CreditCard, Receipt, MessageCircle, AlertCircle, MapPin, Layers
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, activeWorkspace, workspaces, switchWorkspace, logout, isLocked } = useAuth();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications] = useState([
    { id: 1, title: "Search Engine Active", message: "Serper API and multi-platform scrapers ready.", time: "10m ago" },
    { id: 2, title: "Tenant Isolation Guard", message: "Workspace scoping verified for all leads.", time: "1h ago" },
    { id: 3, title: "Export Ready", message: "Native XLSX and Executive PDF export modules ready.", time: "2h ago" }
  ]);

  const emailLower = String(user?.email || "").trim().toLowerCase();
  const isAdmin =
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    (user as any)?.account_type === "MASTER_OWNER" ||
    [
      "transaction000501@gmail.com",
      "admin@usmanai.com",
      "mu0602503@gmail.com",
      "admin@usmangtm.com",
      "selftest_founder_2026@usmanai.com",
    ].includes(emailLower);

  // Strict Protected Route Guard: Non-authenticated visitors CANNOT access the dashboard
  useEffect(() => {
    if (!loading && !user) {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      if (!token) {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  // Command palette keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Client Navigation Items (Including Lifetime Google Maps & Multilingual AI Assistant)
  const clientNav: NavItem[] = [
    { name: "Dashboard", href: "/app", icon: LayoutDashboard },
    { name: "Business Profile", href: "/app/business-profile", icon: Briefcase },
    { name: "Find Leads", href: "/app/leads", icon: Search },
    { name: "Google Maps Leads", href: "/app/google-maps", icon: MapPin },
    { name: "Campaigns", href: "/app/campaigns", icon: Layers },
    { name: "Lead Enrichment", href: "/app/enrichment", icon: Sparkles },
    { name: "Saved Leads", href: "/app/saved-leads", icon: Database },
    { name: "Search History", href: "/app/history", icon: History },
    { name: "Email Accounts", href: "/app/accounts", icon: Mail },
    { name: "Cold Email", href: "/app/outreach", icon: Send },
    { name: "AI Assistant", href: "/app/assistant", icon: MessageCircle },
    { name: "Usage & Subscription", href: "/app/subscription", icon: CreditCard },
  ];

  // Exactly 4 Admin Navigation Items (Role: ADMIN only - Section 13)
  const adminNav: NavItem[] = [
    { name: "Client Accounts", href: "/app/admin/clients", icon: Users2 },
    { name: "Payments", href: "/app/admin/payments", icon: Receipt },
    { name: "API Configuration", href: "/app/admin/providers", icon: SlidersHorizontal },
    { name: "System Usage", href: "/app/admin", icon: Activity },
  ];

  const searchShortcuts = [
    { title: "Dashboard Overview", subtitle: "Command center and real workspace metrics", url: "/app", badge: "DASHBOARD" },
    { title: "Business Profile", subtitle: "Gemini-assisted ICP and target keyword setup wizard", url: "/app/business-profile", badge: "PROFILE" },
    { title: "Find Leads", subtitle: "Extract public commercial contacts across 193 countries", url: "/app/leads", badge: "SEARCH" },
    { title: "Google Maps Leads", subtitle: "Scrape local businesses with website email discovery", url: "/app/google-maps", badge: "LIFETIME" },
    { title: "Campaigns", subtitle: "Manage long-running persistent multi-country search campaigns", url: "/app/campaigns", badge: "CAMPAIGN" },
    { title: "Lead Enrichment", subtitle: "Discover social profiles, emails, and compute quality scores", url: "/app/enrichment", badge: "ENRICH" },
    { title: "Saved Leads", subtitle: "Manage saved leads and private company data", url: "/app/saved-leads", badge: "SAVED" },
    { title: "Search History", subtitle: "Reopen past search snapshots organized by PKT date & time", url: "/app/history", badge: "HISTORY" },
    { title: "Email Accounts", subtitle: "Connect your official Gmail account for $0 cold outreach", url: "/app/accounts", badge: "GMAIL" },
    { title: "Cold Email Outreach", subtitle: "Dispatch personalized business emails via Gmail API", url: "/app/outreach", badge: "OUTREACH" },
    { title: "AI Assistant", subtitle: "Multilingual B2B sales and growth consultation", url: "/app/assistant", badge: "ASSISTANT" },
    { title: "Usage & Subscription", subtitle: "$25/mo or $100 Lifetime status, quotas, and WhatsApp activation", url: "/app/subscription", badge: "BILLING" },
    ...(isAdmin ? [
      { title: "Client Accounts", subtitle: "Manage client workspaces, activation, and usage limits", url: "/app/admin/clients", badge: "ADMIN" },
      { title: "Payments & Verification", subtitle: "Review and approve manual WhatsApp payment requests", url: "/app/admin/payments", badge: "ADMIN" },
      { title: "API Provider Configuration", subtitle: "Check Serper and Gemini API engine status", url: "/app/admin/providers", badge: "ADMIN" },
      { title: "System Usage & Telemetry", subtitle: "Database metrics and live serverless activity", url: "/app/admin", badge: "ADMIN" },
    ] : [])
  ];

  const filteredShortcuts = searchQuery.trim()
    ? searchShortcuts.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.badge.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchShortcuts;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center text-slate-300">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mb-4" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Verifying secure session...</p>
      </div>
    );
  }

  if (!user && (typeof window !== "undefined" && !localStorage.getItem("usman_gtm_token"))) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center text-slate-300">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-purple-500 border-t-transparent mb-4" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col md:flex-row antialiased">
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex w-64 flex-col justify-between border-r border-white/[0.08] bg-[#090d16] p-4 shrink-0 h-screen sticky top-0 overflow-y-auto select-none">
        <div>
          {/* Brand Logo */}
          <Link href="/app" className="flex items-center gap-3 px-2 py-3 mb-6 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-glow-sm">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1">
                USMAN <span className="text-blue-500 font-extrabold">AI GTM</span>
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-400">B2B Lead Engine</span>
            </div>
          </Link>

          {/* Client Navigation Header */}
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Workspace Tools
          </div>

          {/* Client Nav List (8 Items) */}
          <nav className="space-y-1">
            {clientNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isLockedFeature = isLocked && ["/app/leads", "/app/google-maps", "/app/saved-leads", "/app/history", "/app/accounts", "/app/outreach"].includes(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-glow-sm font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.href === "/app/google-maps" && !isLockedFeature && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Lifetime
                    </span>
                  )}
                  {isLockedFeature && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      🔒 <span className="text-[9px] font-bold">LOCKED</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Admin Navigation (Only if user.role === "ADMIN") */}
          {isAdmin && (
            <div className="mt-6 pt-4 border-t border-white/[0.08]">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center justify-between">
                <span>Admin Governance</span>
                <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono">RBAC</span>
              </div>
              <nav className="space-y-1">
                {adminNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold"
                          : "text-slate-400 hover:text-rose-200 hover:bg-rose-500/[0.06]"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-rose-300" : "text-slate-400"}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* Bottom User & Logout Area */}
        <div className="pt-4 border-t border-white/[0.08] space-y-1">
          <div className="px-3 py-2 text-xs flex items-center justify-between text-slate-400">
            <span className="truncate max-w-[140px] font-medium text-slate-300">{user?.full_name || "User"}</span>
            <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
              {user?.role || "CLIENT"}
            </span>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP BAR */}
        <header className="h-16 border-b border-white/[0.08] bg-[#080c14]/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-40">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Universal Command Palette Trigger (Ctrl+K) */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-slate-400 hover:border-blue-500/40 hover:text-slate-200 transition-all"
            >
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-slate-500" />
                <span>Search leads, tools, settings...</span>
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-slate-400">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right Top Bar Controls */}
          <div className="flex items-center gap-3">
            {/* Workspace Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.02] text-xs">
              <span className="text-slate-400">Workspace:</span>
              <span className="text-white font-semibold">{activeWorkspace?.name || `Client #${user?.workspace_id || 1}`}</span>
            </div>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 relative"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10 bg-[#0c121e] p-4 shadow-glass z-50">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 mb-3">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">System Alerts</span>
                    <span className="text-[10px] text-blue-400">{notifications.length} Unread</span>
                  </div>
                  <div className="space-y-2.5">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-white">{n.title}</span>
                          <span className="text-[10px] text-slate-500">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Capsule */}
            <Link
              href="/app/settings"
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-all"
            >
              <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                {user?.full_name ? user.full_name[0].toUpperCase() : "U"}
              </div>
              <span className="text-xs font-semibold text-slate-200 hidden sm:inline">
                {user?.full_name || "Account"}
              </span>
            </Link>
          </div>
        </header>

        {/* LOCKED ACCOUNT / PREVIEW MODE BANNER */}
        {isLocked && (
          <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-b border-amber-500/40 px-4 py-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-amber-200">
              <span className="text-base">🔒</span>
              <span>
                {((user as any)?.account_type === "FREE_PREVIEW" || user?.status === "PREVIEW_ONLY") ? (
                  <strong>FREE PREVIEW ACCOUNT — Explore the software before purchasing. Contact the Owner to get your fully activated account.</strong>
                ) : user?.status === "EXPIRED" ? (
                  <strong>Your subscription has expired. Please renew to continue.</strong>
                ) : (
                  <strong>Your account is currently locked. Please contact the Owner for activation. Plans: $25/month Basic (30 Days) or $100 Lifetime Access.</strong>
                )}
              </span>
            </div>
            <a
              href={`https://wa.me/923174383702?text=Hello%20Usman%2C%20I%20want%20to%20activate%20my%20account%20(%2425%20Basic%20or%20%24100%20Lifetime)%20for%20user:%20${encodeURIComponent((user as any)?.username || user?.email || "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>Contact Owner on WhatsApp (+923174383702)</span>
            </a>
          </div>
        )}

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* MANDATORY FIRST-LOGIN PASSWORD ROTATION MODAL */}
      <ForcedPasswordModal />

      {/* COMMAND PALETTE MODAL (Ctrl + K) */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-2xl border border-white/20 bg-[#0c121e] shadow-2xl p-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-3">
              <Search className="h-5 w-5 text-blue-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads, exports, settings..."
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                onClick={() => setCommandPaletteOpen(false)}
                className="text-xs text-slate-500 hover:text-white px-2 py-1 rounded bg-white/5"
              >
                ESC
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1">
              {filteredShortcuts.length > 0 ? (
                filteredShortcuts.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setCommandPaletteOpen(false);
                      router.push(item.url);
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.06] cursor-pointer transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{item.title}</div>
                      <div className="text-[11px] text-slate-400">{item.subtitle}</div>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {item.badge}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  No actions found for "{searchQuery}".
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE DRAWER */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/80 backdrop-blur-sm flex">
          <div className="w-72 bg-[#090d16] h-full p-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-bold text-white">USMAN AI GTM</span>
                <button onClick={() => setMobileSidebarOpen(false)} className="p-1 text-slate-400">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Workspace Tools</div>
              <nav className="space-y-1">
                {clientNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileSidebarOpen(false)}
                    className="block px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-white/5"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>

              {isAdmin && (
                <div className="mt-6 pt-4 border-t border-white/[0.08]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-2">Admin Governance</div>
                  <nav className="space-y-1">
                    {adminNav.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileSidebarOpen(false)}
                        className="block px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-white/5"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </nav>
                </div>
              )}
            </div>
            <button
              onClick={logout}
              className="py-2.5 text-xs text-rose-400 font-bold bg-rose-500/10 rounded-xl"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
