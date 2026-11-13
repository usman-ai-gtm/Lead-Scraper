"use client";

import React from "react";
import Link from "next/link";
import { ClientProvisioningSection } from "@/components/admin/ClientProvisioningSection";
import { Users2, Shield, ArrowLeft } from "lucide-react";

export default function AdminClientsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/app/admin"
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Admin Center</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              Client Accounts
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">50-Client Seat Management</h1>
          <p className="text-xs text-slate-400">
            Provision dedicated client seats with isolated workspaces (0 initial leads) and single-use temporary credentials.
          </p>
        </div>
      </div>

      {/* Main 50-Client Provisioning & Management Component */}
      <ClientProvisioningSection />
    </div>
  );
}

