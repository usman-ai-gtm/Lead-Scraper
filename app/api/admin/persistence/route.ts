import { proxyToBackend } from "@/lib/backend-proxy";

export async function GET(req: Request) {
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  const isNeon = dbUrl.toLowerCase().includes("neon.tech");
  const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
  const configured = Boolean(dbUrl);

  const fallback = {
    mode: configured ? "cloud_database" : (isVercel ? "serverless_local" : "local_sqlite"),
    driver: isNeon
      ? "Neon PostgreSQL (Serverless Cloud Hosted)"
      : isPostgres
      ? "PostgreSQL (Cloud Hosted)"
      : isVercel
      ? "Vercel Serverless (Ephemeral / LocalStorage Fallback)"
      : "SQLite 3 (Local Embedded)",
    configured,
    message: configured
      ? "Authoritative cloud database configured via DATABASE_URL."
      : (isVercel
        ? "Running on Vercel Serverless. External DATABASE_URL is required for multi-tenant cloud persistence."
        : "Running on local SQLite. In serverless deployments without DATABASE_URL, persistent multi-user data requires an external database connection.")
  };
  return proxyToBackend("/api/admin/persistence", req, fallback);
}
