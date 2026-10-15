import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
  const fallback = {
    mode: isVercel ? "serverless_local" : "local_sqlite",
    driver: isVercel ? "Vercel Serverless (Ephemeral / LocalStorage Fallback)" : "SQLite 3 (Local Embedded)",
    configured: false,
    message: isVercel
      ? "Running on Vercel Serverless. External DATABASE_URL is required for multi-tenant cloud persistence."
      : "Running on local SQLite. In serverless deployments without DATABASE_URL, persistent multi-user data requires an external database connection."
  };
  return proxyToBackend("/api/admin/persistence", req, fallback);
}
