"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Send, PlusCircle, Workflow, Inbox,
  Mail, FileText, CheckSquare, ShieldCheck, BarChart3
} from "lucide-react";

export default function OutreachNav() {
  const pathname = usePathname();

  const links = [
    { name: "Overview", href: "/app/outreach", icon: LayoutDashboard },
    { name: "Campaigns", href: "/app/outreach/campaigns", icon: Send },
    { name: "New Campaign", href: "/app/outreach/campaigns/new", icon: PlusCircle, highlight: true },
    { name: "Sequences", href: "/app/outreach/sequences", icon: Workflow },
    { name: "Inbox & AI Replies", href: "/app/outreach/inbox", icon: Inbox },
    { name: "Gmail & Accounts", href: "/app/outreach/accounts", icon: Mail },
    { name: "Templates", href: "/app/outreach/templates", icon: FileText },
    { name: "Approvals", href: "/app/outreach/approvals", icon: CheckSquare },
    { name: "Deliverability", href: "/app/outreach/deliverability", icon: ShieldCheck },
    { name: "Analytics", href: "/app/outreach/analytics", icon: BarChart3 },
  ];

  return (
    <div className="border-b border-white/[0.08] bg-[#0c1017]/60 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 pt-4 pb-0 mb-6 backdrop-blur-md">
      <div className="flex items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              Enterprise Cadence Engine
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Multi-Gmail OAuth 2.0 Pool</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            OUTREACH COMMAND CENTER
          </h1>
          <p className="text-xs text-slate-400">
            Build, personalize, approve and manage high-quality B2B email campaigns across authorized sending accounts.
          </p>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1 border-t border-white/[0.04]">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm"
                  : link.highlight
                  ? "text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-blue-400" : ""}`} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
