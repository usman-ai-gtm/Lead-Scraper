"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_token") : null;
    const userRaw = typeof window !== "undefined" ? localStorage.getItem("usman_gtm_user") : null;
    if (token && userRaw) {
      try {
        const u = JSON.parse(userRaw);
        if (u.role === "SUPER_ADMIN" || u.role === "ADMIN" || u.account_type === "MASTER_OWNER") {
          router.replace("/app/admin/clients");
          return;
        }
      } catch {}
    }
    router.replace("/admin/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-slate-400 text-xs">
      Redirecting to Master Owner Portal...
    </div>
  );
}
