import { NextResponse } from "next/server";
import { getCurrentUserFromRequest, isAuthorizedOwner } from "@/lib/serverless-auth";
import { getNeonSql, isNeonConfigured } from "@/lib/neon-db";

export const dynamic = "force-dynamic";

/**
 * Public endpoint to submit a buying inquiry (from Pricing or Contact pages)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const customerName = String(body.customer_name || body.name || "").trim();
    const contactInfo = String(body.contact_info || body.whatsapp || body.phone || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const plan = String(body.plan || "BASIC").toUpperCase();
    const message = String(body.message || "").trim();

    if (!customerName || (!contactInfo && !email)) {
      return NextResponse.json(
        { error: "Customer name and either phone/WhatsApp or email are required." },
        { status: 400 }
      );
    }

    if (!isNeonConfigured()) {
      return NextResponse.json(
        { error: "Database service unavailable." },
        { status: 503 }
      );
    }

    const sql = getNeonSql();
    if (!sql) {
      return NextResponse.json(
        { error: "Database connection failed." },
        { status: 503 }
      );
    }

    const validPlan = plan === "LIFETIME" ? "LIFETIME" : "BASIC";

    const result = await sql`
      INSERT INTO subscription_inquiries (customer_name, contact_info, email, plan, message, status, created_at, updated_at)
      VALUES (${customerName}, ${contactInfo || email}, ${email || null}, ${validPlan}, ${message || null}, 'NEW', NOW(), NOW())
      RETURNING id, customer_name, contact_info, email, plan, status, created_at
    `;

    return NextResponse.json({
      success: true,
      inquiry: result[0],
      message: "Buying inquiry recorded. Owner will review and activate your subscription.",
    });
  } catch (err: any) {
    console.error("[Inquiries POST] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to record inquiry." },
      { status: 500 }
    );
  }
}

/**
 * Owner-only endpoint to view and manage buying inquiries
 */
export async function GET(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json(
        { error: "Forbidden: Owner / Administrator authorization required." },
        { status: 403 }
      );
    }

    if (!isNeonConfigured()) {
      return NextResponse.json({ inquiries: [] });
    }

    const sql = getNeonSql();
    if (!sql) return NextResponse.json({ inquiries: [] });

    const inquiries = await sql`
      SELECT id, customer_name, contact_info, email, plan, message, status, notes, created_at, updated_at
      FROM subscription_inquiries
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({
      inquiries,
      total: inquiries.length,
    });
  } catch (err: any) {
    console.error("[Inquiries GET] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to retrieve inquiries." },
      { status: 500 }
    );
  }
}

/**
 * Owner endpoint to update inquiry status (e.g. CONTACTED, ACTIVATED, REJECTED)
 */
export async function PATCH(req: Request) {
  try {
    const user = getCurrentUserFromRequest(req);
    if (!user || !isAuthorizedOwner(user)) {
      return NextResponse.json(
        { error: "Forbidden: Owner / Administrator authorization required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const inquiryId = Number(body.id);
    const newStatus = String(body.status || "NEW").toUpperCase();
    const notes = body.notes ? String(body.notes) : null;

    if (!inquiryId) {
      return NextResponse.json({ error: "Inquiry ID is required." }, { status: 400 });
    }

    const sql = getNeonSql();
    if (!sql) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    const updated = await sql`
      UPDATE subscription_inquiries
      SET status = ${newStatus}, notes = COALESCE(${notes}, notes), updated_at = NOW()
      WHERE id = ${inquiryId}
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      inquiry: updated[0] || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update inquiry." }, { status: 500 });
  }
}
