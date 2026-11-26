import { NextResponse } from "next/server";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export interface RateLimitConfig {
  bucket: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds: number;
}

// Local in-memory fallback only used when Postgres is unavailable (e.g., unit tests/dev without DATABASE_URL)
const fallbackBuckets = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "unknown";
}

export async function consumeRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.floor(config.windowSeconds));
  const limit = Math.max(1, Math.floor(config.limit));
  const cleanId = String(config.identifier || "anon").toLowerCase().replace(/[^a-z0-9@._:-]/g, "_").slice(0, 120);
  const key = `${config.bucket}:${cleanId}`;

  if (isNeonConfigured()) {
    const sql = getNeonSql();
    if (sql) {
      try {
        const windowMs = windowSeconds * 1000;
        const rows = await sql.query(
          `INSERT INTO api_rate_limits (key, count, window_start, updated_at)
           VALUES ($1, 1, NOW(), NOW())
           ON CONFLICT (key) DO UPDATE SET
             count = CASE
               WHEN api_rate_limits.window_start < (NOW() - ($2 * INTERVAL '1 millisecond')) THEN 1
               ELSE api_rate_limits.count + 1
             END,
             window_start = CASE
               WHEN api_rate_limits.window_start < (NOW() - ($2 * INTERVAL '1 millisecond')) THEN NOW()
               ELSE api_rate_limits.window_start
             END,
             updated_at = NOW()
           RETURNING count,
             GREATEST(1, CEIL(EXTRACT(EPOCH FROM (window_start + ($2 * INTERVAL '1 millisecond') - NOW()))))::int AS retry_after`,
          [key, windowMs]
        );

        if (rows && rows.length > 0) {
          const count = Number(rows[0].count) || 1;
          const retryAfterSeconds = Math.max(1, Number(rows[0].retry_after) || windowSeconds);
          const allowed = count <= limit;
          return {
            allowed,
            remaining: Math.max(0, limit - count),
            limit,
            retryAfterSeconds: allowed ? 0 : retryAfterSeconds,
          };
        }
      } catch (err: any) {
        // If table hasn't been created yet in an isolated DB, gracefully fall through to in-memory
        if (!String(err?.message || "").includes("api_rate_limits")) {
          console.warn("[RateLimit DB fallback]:", err?.message);
        }
      }
    }
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const existing = fallbackBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    fallbackBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), limit, retryAfterSeconds: 0 };
  }
  existing.count += 1;
  const allowed = existing.count <= limit;
  const retryAfterSeconds = allowed ? 0 : Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    limit,
    retryAfterSeconds,
  };
}

export function rateLimitExceededResponse(retryAfterSeconds: number, message?: string) {
  const retry = Math.max(1, Math.ceil(retryAfterSeconds || 60));
  const detail =
    message || `Rate limit exceeded. Please wait ${retry} seconds before trying again.`;
  return NextResponse.json(
    {
      status: "error",
      code: "RATE_LIMIT_EXCEEDED",
      error: detail,
      detail,
      retry_after_seconds: retry,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retry),
        "Cache-Control": "no-store",
      },
    }
  );
}
