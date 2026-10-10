"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  LayoutDashboard, Search, Sparkles, Mail, Database, LineChart,
  Users2, BarChart3, Bot, ChevronDown, Bell, Settings, LogOut,
  Menu, X, Command, MessageSquare, Shield, HelpCircle,
  CheckCircle2, ArrowRight, ExternalLink, SlidersHorizontal, Terminal, Target,
  Plug, Workflow
} from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, activeWorkspace, workspaces, switchWorkspace, logout } = useAuth();
  
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Campaign Verified", message: "Q4 Enterprise Cadence delivered 42 emails with 0 bounces.", time: "10m ago" },
    { id: 2, title: "Hot Prospect Detected", message: "Apex Global Tech reached 94/100 score.", time: "35m ago" },
    { id: 3, title: "SOC 2 Audit Telemetry", message: "Automated daily security audit completed successfully.", time: "2h ago" }
  ]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Strict Protected Route Guard: Non-authenticated visitors CANNOT access the dashboard
  useEffect(() => {
    if (!loading && !user) {
      const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
      if (!token) {
        router.push("/signup");
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

  const DEFAULT_ACTIONS = [
    { title: "Find Dentists in Lahore", subtitle: "Target local dental practices with public contact extraction", url: "/app/leads?q=dentists+in+lahore", badge: "LEAD DISCOVERY" },
    { title: "Create Cold Email Campaign", subtitle: "Launch 11-step personalized cold outreach wizard", url: "/app/outreach/campaigns/new", badge: "OUTREACH" },
    { title: "Connect Google / Gmail Account", subtitle: "Authorize multiple Gmail accounts via official OAuth", url: "/app/outreach/accounts", badge: "ACCOUNTS" },
    { title: "Deep Company Research", subtitle: "Synthesize firmographic, financial & tech evidence", url: "/app/research", badge: "RESEARCH" },
    { title: "Show Hot High-Intent Leads", subtitle: "Filter leads with score >= 85 and buying signals", url: "/app/leads?filter=hot", badge: "CRM" },
    { title: "Run Buying Intent Radar", subtitle: "Feature #19 / #201: Multi-signal buyer intent detection", url: "/app/features?id=19", badge: "INTENT" },
    { title: "Buying Committee Mapper", subtitle: "Feature #111: Identify C-level buyers, champions & blockers", url: "/app/features?id=111", badge: "BUYER INTEL" },
    { title: "Predictive Win Probability Model", subtitle: "Feature #501: Calculate mathematical close probability", url: "/app/features?id=501", badge: "REVENUE" },
    { title: "Outreach Inbox & AI Reply Analysis", subtitle: "Review prospect responses & approve AI replies", url: "/app/outreach/inbox", badge: "OUTREACH" },
    { title: "Deliverability & DNS Health", subtitle: "Verify SPF, DKIM, DMARC & suppression lists", url: "/app/outreach/deliverability", badge: "SECURITY" },
    { title: "Open 600+ Feature Library", subtitle: "Browse all enterprise capabilities by business intent", url: "/app/features", badge: "CAPABILITIES" }
  ];

  // Universal Search query execution
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(DEFAULT_ACTIONS.slice(0, 6));
      return;
    }

    const q = searchQuery.toLowerCase();
    const matchedStatic = DEFAULT_ACTIONS.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.badge.toLowerCase().includes(q)
    );

    // Dynamic numeric feature jump (e.g. "501" or "feature 111")
    const numMatch = q.match(/\d+/);
    if (numMatch) {
      const fid = parseInt(numMatch[0], 10);
      if (fid >= 1 && fid <= 600) {
        matchedStatic.unshift({
          title: `Open Feature #${fid}`,
          subtitle: `Launch Feature #${fid} in Universal Execution Studio`,
          url: `/app/features?id=${fid}`,
          badge: `FEATURE #${fid}`
        });
      }
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get<any[]>("/copilot/search", { q: searchQuery });
        const combined = [...matchedStatic, ...(res || [])];
        setSearchResults(combined);
      } catch {
        setSearchResults(matchedStatic);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }

  const mainNav: NavItem[] = [
    { name: "Home", href: "/app", icon: LayoutDashboard },
    { name: "Find Leads", href: "/app/leads", icon: Search },
    { name: "Research", href: "/app/research", icon: Bot },
    { name: "CRM", href: "/app/crm", icon: Database },
    { name: "Outreach", href: "/app/outreach", icon: Mail },
    { name: "Automation", href: "/app/workflows", icon: Workflow },
    { name: "Revenue", href: "/app/revenue", icon: LineChart },
    { name: "Customers", href: "/app/customers", icon: Users2 },
    { name: "Analytics", href: "/app/analytics", icon: BarChart3 },
    { name: "AI Copilot", href: "/app/copilot", icon: Sparkles },
  ];

  const moreNav: NavItem[] = [
    { name: "ABM Studio", href: "/app/abm", icon: Target },
    { name: "Sales Enablement", href: "/app/ai-agents", icon: Bot },
    { name: "Partners / Channel", href: "/app/integrations", icon: Plug },
    { name: "Integrations Hub", href: "/app/integrations", icon: Plug },
    { name: "Feature Library (600+)", href: "/app/features", icon: Terminal },
    { name: "Sending Accounts", href: "/app/outreach/accounts", icon: Mail },
    { name: "Admin Center", href: "/app/admin", icon: Shield },
  ];

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
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Redirecting to account creation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col md:flex-row antialiased">
      {/* SIDEBAR (Desktop) - Independent Scroll Container */}
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
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Enterprise SaaS</span>
            </div>
          </Link>

          {/* Primary Nav */}
          <nav className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-glow-sm font-bold"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* More Expandable Menu */}
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <button
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.04] transition-all"
            >
              <span>MORE TOOLS</span>
              <ChevronDown className={`h-3.5 w-3.5 transform transition-transform ${moreMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {moreMenuOpen && (
              <div className="mt-1 space-y-1 pl-2">
                {moreNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? "bg-blue-600/30 text-blue-400 font-bold"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom User & Settings Area */}
        <div className="pt-4 border-t border-white/[0.08] space-y-1">
          <Link
            href="/app/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              pathname === "/app/settings" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Settings & Vault</span>
          </Link>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
                <span>Search leads, deals, tools...</span>
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-slate-400">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right Top Bar Controls */}
          <div className="flex items-center gap-3">
            {/* Workspace Selector Dropdown */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.02] text-xs">
              <span className="text-slate-400">Workspace:</span>
              <select
                value={activeWorkspace?.id || 1}
                onChange={(e) => switchWorkspace(Number(e.target.value))}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id} className="bg-[#0c1017] text-white">
                    {w.name}
                  </option>
                ))}
              </select>
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
                {user?.full_name ? user.full_name[0].toUpperCase() : "A"}
              </div>
              <span className="text-xs font-semibold text-slate-200 hidden sm:inline">
                {user?.full_name || "Admin"}
              </span>
            </Link>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

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
                placeholder="Search across leads, deals, companies, and settings..."
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
              {searchResults.length > 0 ? (
                searchResults.map((item, idx) => (
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
                  Type to search leads, deals, or navigation pages...
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
              <nav className="space-y-1">
                {mainNav.concat(moreNav).map((item) => (
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
