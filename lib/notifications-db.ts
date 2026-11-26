import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";
import { isAuthorizedOwner } from "@/lib/serverless-auth";

export interface SystemNotificationItem {
  id: number;
  workspace_id: number;
  user_id: number | null;
  is_admin_target: boolean;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  category: string;
  is_read: boolean;
  link: string | null;
  ref_type: string | null;
  ref_id: string | null;
  created_at: string;
}

export async function ensureNotificationsSchema() {
  if (!isNeonConfigured()) return;
  const sql = getNeonSql();
  if (!sql) return;
  try {
    await sql.query(`
      CREATE TABLE IF NOT EXISTS system_notifications (
        id SERIAL PRIMARY KEY,
        workspace_id INTEGER NOT NULL DEFAULT 1,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'info',
        category TEXT NOT NULL DEFAULT 'system',
        is_read INTEGER NOT NULL DEFAULT 0,
        link TEXT,
        created_at TEXT NOT NULL DEFAULT NOW()::text
      )
    `);
    await sql.query(`
      ALTER TABLE system_notifications
        ADD COLUMN IF NOT EXISTS user_id INTEGER,
        ADD COLUMN IF NOT EXISTS is_admin_target BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS ref_type TEXT,
        ADD COLUMN IF NOT EXISTS ref_id TEXT
    `);
  } catch (e) {
    console.warn("[Notifications] Schema ensure warning:", e);
  }
}

export async function createSystemNotification(input: {
  workspaceId?: number | null;
  userId?: number | null;
  isAdminTarget?: boolean;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  category: string;
  link?: string | null;
  refType?: string | null;
  refId?: string | null;
}): Promise<number | null> {
  if (!isNeonConfigured()) return null;
  const sql = getNeonSql();
  if (!sql) return null;
  await ensureNotificationsSchema();

  try {
    const res = await sql.query(
      `INSERT INTO system_notifications
         (workspace_id, user_id, is_admin_target, title, message, type, category, is_read, link, ref_type, ref_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10, NOW()::text)
       RETURNING id`,
      [
        Number(input.workspaceId) || 1,
        input.userId ? Number(input.userId) : null,
        Boolean(input.isAdminTarget),
        input.title.slice(0, 180),
        input.message.slice(0, 800),
        input.type || "info",
        input.category || "system",
        input.link || null,
        input.refType || null,
        input.refId || null,
      ]
    );
    return res?.[0]?.id ? Number(res[0].id) : null;
  } catch (e) {
    console.warn("[Notifications] Failed to create notification:", e);
    return null;
  }
}

/**
 * Emits at most one SUBSCRIPTION_EXPIRING notification per 24h when an active timed plan has <= 72h remaining.
 */
async function maybeGenerateExpiringNotification(userId: number, workspaceId: number) {
  const sql = getNeonSql();
  if (!sql || !userId) return;
  try {
    const uRows = await sql.query(
      `SELECT id, workspace_id, plan, plan_type, plan_label, status, subscription_expires_at, account_type, role
       FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    const u = uRows?.[0];
    if (!u || isAuthorizedOwner(u)) return;
    if (String(u.status || "").toUpperCase() !== "ACTIVE") return;
    const planUpper = String(u.plan_type || u.plan || "").toUpperCase();
    if (planUpper === "LIFETIME" || !u.subscription_expires_at) return;

    const expMs = new Date(u.subscription_expires_at).getTime();
    const diffMs = expMs - Date.now();
    if (!Number.isFinite(diffMs) || diffMs <= 0 || diffMs > 72 * 3600 * 1000) return;

    const recent = await sql.query(
      `SELECT id FROM system_notifications
       WHERE (user_id = $1 OR workspace_id = $2)
         AND category = 'subscription_expiring'
         AND created_at::timestamptz > NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [userId, workspaceId]
    );
    if (recent && recent.length > 0) return;

    const hrsLeft = Math.max(1, Math.round(diffMs / 3600000));
    await createSystemNotification({
      workspaceId,
      userId,
      isAdminTarget: false,
      title: "Subscription Expiring Soon",
      message: `Your ${u.plan_label || u.plan || "subscription"} expires in ~${hrsLeft} hour(s). Renew or extend cleanly on Usage & Subscription to prevent workspace lock.`,
      type: "warning",
      category: "subscription_expiring",
      link: "/app/subscription",
      refType: "user",
      refId: String(userId),
    });
  } catch {
    // Non-critical helper
  }
}

export async function listNotificationsForUser(caller: any, limit = 25): Promise<{
  notifications: SystemNotificationItem[];
  unreadCount: number;
  unreadPaymentRequestsCount: number;
}> {
  if (!caller || !isNeonConfigured()) {
    return { notifications: [], unreadCount: 0, unreadPaymentRequestsCount: 0 };
  }
  const sql = getNeonSql();
  if (!sql) return { notifications: [], unreadCount: 0, unreadPaymentRequestsCount: 0 };
  await ensureNotificationsSchema();

  const isOwner = isAuthorizedOwner(caller);
  const callerId = Number(caller.id || caller.sub) || 0;
  const workspaceId = Number(caller.workspace_id) || 1;
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);

  if (!isOwner && callerId > 0) {
    await maybeGenerateExpiringNotification(callerId, workspaceId);
  }

  let rows: any[] = [];
  let unreadCount = 0;
  let unreadPaymentRequestsCount = 0;

  if (isOwner) {
    rows = await sql.query(
      `SELECT id, workspace_id, user_id, COALESCE(is_admin_target, FALSE) AS is_admin_target,
              title, message, type, category, COALESCE(is_read, 0) AS is_read, link, ref_type, ref_id, created_at
       FROM system_notifications
       WHERE COALESCE(is_admin_target, FALSE) = TRUE
       ORDER BY id DESC
       LIMIT $1`,
      [safeLimit]
    );
    const cntRows = await sql.query(
      `SELECT COUNT(*)::int AS cnt FROM system_notifications
       WHERE COALESCE(is_admin_target, FALSE) = TRUE AND COALESCE(is_read, 0) = 0`
    );
    unreadCount = Number(cntRows?.[0]?.cnt || 0);

    const pendingPayRows = await sql.query(
      `SELECT COUNT(*)::int AS cnt FROM payment_submissions WHERE status IN ('PENDING', 'MORE_INFO_REQUIRED')`
    );
    unreadPaymentRequestsCount = Number(pendingPayRows?.[0]?.cnt || 0);
  } else {
    rows = await sql.query(
      `SELECT id, workspace_id, user_id, COALESCE(is_admin_target, FALSE) AS is_admin_target,
              title, message, type, category, COALESCE(is_read, 0) AS is_read, link, ref_type, ref_id, created_at
       FROM system_notifications
       WHERE COALESCE(is_admin_target, FALSE) = FALSE
         AND (
           (user_id IS NOT NULL AND user_id = $1)
           OR (user_id IS NULL AND workspace_id = $2)
         )
       ORDER BY id DESC
       LIMIT $3`,
      [callerId, workspaceId, safeLimit]
    );
    const cntRows = await sql.query(
      `SELECT COUNT(*)::int AS cnt FROM system_notifications
       WHERE COALESCE(is_admin_target, FALSE) = FALSE
         AND COALESCE(is_read, 0) = 0
         AND (
           (user_id IS NOT NULL AND user_id = $1)
           OR (user_id IS NULL AND workspace_id = $2)
         )`,
      [callerId, workspaceId]
    );
    unreadCount = Number(cntRows?.[0]?.cnt || 0);
  }

  return {
    notifications: (rows || []).map((r: any) => ({
      id: Number(r.id),
      workspace_id: Number(r.workspace_id || 1),
      user_id: r.user_id ? Number(r.user_id) : null,
      is_admin_target: Boolean(r.is_admin_target),
      title: String(r.title || ""),
      message: String(r.message || ""),
      type: (r.type || "info") as any,
      category: String(r.category || "system"),
      is_read: Number(r.is_read || 0) === 1,
      link: r.link || null,
      ref_type: r.ref_type || null,
      ref_id: r.ref_id || null,
      created_at: String(r.created_at || new Date().toISOString()),
    })),
    unreadCount,
    unreadPaymentRequestsCount,
  };
}

export async function markNotificationsRead(caller: any, notificationIds?: number[]): Promise<boolean> {
  if (!caller || !isNeonConfigured()) return false;
  const sql = getNeonSql();
  if (!sql) return false;
  await ensureNotificationsSchema();

  const isOwner = isAuthorizedOwner(caller);
  const callerId = Number(caller.id || caller.sub) || 0;
  const workspaceId = Number(caller.workspace_id) || 1;

  if (notificationIds && notificationIds.length > 0) {
    const cleanIds = notificationIds.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
    if (cleanIds.length === 0) return true;
    if (isOwner) {
      await sql.query(
        `UPDATE system_notifications SET is_read = 1
         WHERE id = ANY($1::int[]) AND COALESCE(is_admin_target, FALSE) = TRUE`,
        [cleanIds]
      );
    } else {
      await sql.query(
        `UPDATE system_notifications SET is_read = 1
         WHERE id = ANY($1::int[])
           AND COALESCE(is_admin_target, FALSE) = FALSE
           AND ((user_id IS NOT NULL AND user_id = $2) OR (user_id IS NULL AND workspace_id = $3))`,
        [cleanIds, callerId, workspaceId]
      );
    }
    return true;
  }

  if (isOwner) {
    await sql.query(
      `UPDATE system_notifications SET is_read = 1 WHERE COALESCE(is_admin_target, FALSE) = TRUE AND COALESCE(is_read, 0) = 0`
    );
  } else {
    await sql.query(
      `UPDATE system_notifications SET is_read = 1
       WHERE COALESCE(is_admin_target, FALSE) = FALSE
         AND COALESCE(is_read, 0) = 0
         AND ((user_id IS NOT NULL AND user_id = $1) OR (user_id IS NULL AND workspace_id = $2))`,
      [callerId, workspaceId]
    );
  }
  return true;
}
